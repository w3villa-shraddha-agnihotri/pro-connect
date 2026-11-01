
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";

const router = express.Router();

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");

const PLANS = {
  TEN_DAYS: {
    name: "ProConnect - 10 Days",
    amount: 10000,
    days: 10,
  },
  ONE_MONTH: {
    name: "ProConnect - 1 Month",
    amount: 30000,
    months: 1,
  },
  THREE_MONTHS: {
    name: "ProConnect - 3 Months",
    amount: 50000,
    months: 3,
  },
};

function addPlanDuration(startDate, plan) {
  const result = new Date(startDate);

  if (plan.days) {
    result.setUTCDate(result.getUTCDate() + plan.days);
    return result;
  }

  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + plan.months);

  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
}

// Authenticate using the same cookie and JWT payload as your login routes.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.proconnect_token;

    if (!token) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.userId) },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    if (!["CUSTOMER", "PROFESSIONAL"].includes(user.role)) {
      return res.status(403).json({
        message: "Your account cannot purchase this plan.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Your session is invalid or expired.",
      });
    }

    console.error("Payment authentication error:", error.message);

    return res.status(500).json({
      message: "Authentication failed.",
    });
  }
}

// IMPORTANT: This route must be registered before express.json().
// Stripe signature verification requires the unmodified request body.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is missing.");
      return res.status(500).send("Webhook not configured.");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        webhookSecret
      );
    } catch (error) {
      console.error("Stripe signature verification failed.");
      return res.status(400).send("Invalid webhook signature.");
    }

    try {
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;

        await prisma.payment.updateMany({
          where: {
            stripe_session_id: session.id,
            status: "PENDING",
          },
          data: { status: "EXPIRED" },
        });

        return res.status(200).json({ received: true });
      }

      if (event.type !== "checkout.session.completed") {
        return res.status(200).json({ received: true });
      }

      const session = event.data.object;

      // Only activate access after Stripe confirms actual payment.
      if (session.payment_status !== "paid") {
        return res.status(200).json({
          received: true,
          message: "Payment has not been confirmed as paid.",
        });
      }

      const paymentId = Number(session.metadata?.paymentRecordId);
      const userId = Number(session.metadata?.userId);
      const planId = session.metadata?.plan;
      const plan = PLANS[planId];

      if (
        !Number.isSafeInteger(paymentId) ||
        !Number.isSafeInteger(userId) ||
        !plan
      ) {
        return res.status(400).json({
          message: "Invalid payment metadata.",
        });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      // Verify the Checkout Session's amount and currency.
      if (
        session.mode !== "payment" ||
        session.currency !== "inr" ||
        session.amount_total !== plan.amount ||
        Number(session.client_reference_id) !== userId
      ) {
        console.error("Stripe session validation failed:", session.id);
        return res.status(400).json({
          message: "Payment details did not pass verification.",
        });
      }

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment) {
          throw new Error("Payment record not found.");
        }

        if (
          payment.user_id !== userId ||
          payment.stripe_session_id !== session.id ||
          Math.round(payment.amount * 100) !== plan.amount
        ) {
          throw new Error("Payment record does not match Stripe session.");
        }

        // Makes repeated webhook deliveries safe.
        if (payment.status === "SUCCEEDED") {
          return;
        }

        if (payment.status !== "PENDING") {
          throw new Error("Payment is not in a payable state.");
        }

        const now = new Date();

        const activeSubscription = await tx.subscription.findFirst({
          where: {
            user_id: userId,
            status: "ACTIVE",
            expires_at: { gt: now },
          },
          orderBy: { expires_at: "desc" },
        });

        // Manual renewal extends access from the current expiry date.
        const startDate = activeSubscription
          ? new Date(activeSubscription.expires_at)
          : now;

        const expiryDate = addPlanDuration(startDate, plan);

        let subscription;

        if (activeSubscription) {
          subscription = await tx.subscription.update({
            where: { id: activeSubscription.id },
            data: {
              plan: planId,
              expires_at: expiryDate,
              payment_id: paymentIntentId || session.id,
            },
          });
        } else {
          subscription = await tx.subscription.create({
            data: {
              user_id: userId,
              plan: planId,
              status: "ACTIVE",
              started_at: startDate,
              expires_at: expiryDate,
              payment_id: paymentIntentId || session.id,
            },
          });
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            subscription_id: subscription.id,
            stripe_payment_id: paymentIntentId || session.id,
            status: "SUCCEEDED",
          },
        });
      });

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error.message);

      // A 500 response lets Stripe retry the webhook.
      return res.status(500).json({
        message: "Payment event processing failed.",
      });
    }
  }
);

// Parse JSON for the regular payment APIs after the raw webhook route.
router.use(express.json());

// Create a pending payment and Stripe Checkout Session.
router.post("/create-checkout-session", requireAuth, async (req, res) => {
  let payment = null;

  try {
    const planId = req.body?.plan;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({
        message: "Please select a valid plan.",
      });
    }

    payment = await prisma.payment.create({
      data: {
        user_id: req.user.id,
        amount: plan.amount / 100,
        status: "PENDING",
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      client_reference_id: String(req.user.id),
      line_items: [
        {
          price_data: {
            currency: "inr",
            unit_amount: plan.amount,
            product_data: {
              name: plan.name,
              description: "ProConnect subscription access",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentRecordId: String(payment.id),
        userId: String(req.user.id),
        plan: planId,
      },
      success_url:
  `${FRONTEND_URL}/my-subscription?payment=success` +
  "&session_id={CHECKOUT_SESSION_ID}",
cancel_url: `${FRONTEND_URL}/my-subscription?payment=cancelled`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripe_session_id: session.id },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout creation failed:", error.message);

    if (payment) {
      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
      } catch (updateError) {
        console.error("Could not update payment status:", updateError.message);
      }
    }

    return res.status(500).json({
      message: "Unable to start checkout. Please try again.",
    });
  }
});

// Return the current user's active subscription.
router.get("/subscription", requireAuth, async (req, res) => {
  try {
    const now = new Date();

    await prisma.subscription.updateMany({
      where: {
        user_id: req.user.id,
        status: "ACTIVE",
        expires_at: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: req.user.id,
        status: "ACTIVE",
        expires_at: { gt: now },
      },
      orderBy: { expires_at: "desc" },
    });

    return res.json({
      active: Boolean(subscription),
      subscription,
    });
  } catch (error) {
    console.error("Subscription lookup failed:", error.message);

    return res.status(500).json({
      message: "Unable to fetch subscription status.",
    });
  }
});

export default router;
