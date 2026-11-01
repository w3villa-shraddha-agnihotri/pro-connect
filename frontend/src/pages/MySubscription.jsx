
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000")
  .replace(/\/+$/, "");

const PLAN_NAMES = {
  TEN_DAYS: "10 Days",
  ONE_MONTH: "1 Month",
  THREE_MONTHS: "3 Months",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MySubscription() {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);

  const paymentStatus = searchParams.get("payment");

  const loadSubscription = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/payments/subscription`, {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        window.location.assign("/login");
        return null;
      }
      throw new Error(data.message || "Unable to load subscription.");
    }

    const current = data.subscription ?? data;
    setSubscription(
      current && current.id ? current : null
    );
    return current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        setLoading(true);
        setError("");

        // Stripe webhook may take a moment to activate the subscription.
        const shouldCheckPayment = paymentStatus === "success";

        for (let attempt = 0; attempt < (shouldCheckPayment ? 6 : 1); attempt++) {
          if (attempt > 0) {
            await new Promise((resolve) => {
              timer = setTimeout(resolve, 2000);
            });
          }

          if (cancelled) return;

          const response = await fetch(
            `${API_URL}/api/payments/subscription`,
            { credentials: "include" }
          );

          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) {
              window.location.assign("/login");
              return;
            }
            throw new Error(data.message || "Unable to load subscription.");
          }

          const current = data.subscription ?? data;
          const valid = current && current.id ? current : null;

          if (!cancelled) setSubscription(valid);

          if (valid || !shouldCheckPayment) break;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load subscription.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingPayment(false);
        }
      }
    }

    if (paymentStatus === "success") setCheckingPayment(true);
    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentStatus]);

  const now = new Date();
  const isActive =
    subscription?.status === "ACTIVE" &&
    subscription?.expires_at &&
    new Date(subscription.expires_at) > now;

  return (
    <>
    <Navbar/>
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/subscription-plans"
          className="font-medium text-indigo-700 hover:underline"
        >
          ← Subscription plans
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          My Subscription
        </h1>
        <p className="mt-2 text-slate-600">
          Check your current plan and expiry date.
        </p>

        {paymentStatus === "success" && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {checkingPayment
              ? "Payment received by Stripe. Confirming your subscription..."
              : isActive
                ? "Your payment was successful and your subscription is active."
                : "Payment returned successfully, but subscription activation is still pending. Refresh this page shortly."}
          </div>
        )}

        {paymentStatus === "cancelled" && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Checkout was cancelled. No subscription has been activated by this page.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-slate-600">
            Loading subscription...
          </div>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Current plan
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isActive ? "Active" : "Expired / No active plan"}
              </span>
            </div>

            {subscription ? (
              <>
                <p className="mt-6 text-3xl font-extrabold text-slate-900">
                  {PLAN_NAMES[subscription.plan] || subscription.plan}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Started on</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(subscription.started_at)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Expires on</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(subscription.expires_at)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-5 text-slate-600">
                You don't have an active subscription yet.
              </p>
            )}

            <Link
              to="/subscription-plans"
              className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              {isActive ? "Renew / Change Plan" : "Choose a Plan"}
            </Link>
          </section>
        )}
      </div>
    </main>
    <Footer/>
    </>
  );
}
