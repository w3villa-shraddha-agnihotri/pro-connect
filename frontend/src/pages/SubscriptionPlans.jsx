
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PLANS = [
  {
    id: "TEN_DAYS",
    name: "10 Days",
    price: 100,
    duration: "10 days of access",
    description: "A short-term plan to get started.",
    features: [
      "Access to your ProConnect account",
      "Subscription valid for 10 days",
      "Manual renewal",
    ],
  },
  {
    id: "ONE_MONTH",
    name: "1 Month",
    price: 300,
    duration: "1 month of access",
    description: "Flexible access for regular use.",
    features: [
      "Access to your ProConnect account",
      "Subscription valid for 1 month",
      "Manual renewal",
    ],
    popular: true,
  },
  {
    id: "THREE_MONTHS",
    name: "3 Months",
    price: 500,
    duration: "3 months of access",
    description: "Longer access at the best overall value.",
    features: [
      "Access to your ProConnect account",
      "Subscription valid for 3 months",
      "Manual renewal",
    ],
  },
];

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState("");

const { user } = useAuth();

const role = user?.role?.toUpperCase();

const handleGoToDashboard = () => {
  if (role === "PROFESSIONAL") {
    navigate("/professional/dashboard");
  } else if (role === "ADMIN") {
    navigate("/admin/dashboard");
  } else {
    navigate("/customer/dashboard");
  }
};
  const [error, setError] = useState("");

  const handlePayment = async (plan) => {
    if (loadingPlan) return;

    setLoadingPlan(plan.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/payments/create-checkout-session`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: plan.id }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to start checkout. Please try again."
        );
      }

      if (!data.url) {
        throw new Error("Checkout URL was not returned by the server.");
      }

      // Stripe hosts the payment page.
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while starting your payment."
      );
      setLoadingPlan("");
    }
  };

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={handleGoToDashboard}
          className="mb-8 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
            ← Back to Dashboard

        </button>

        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            ProConnect Membership
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose your subscription plan
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Choose a plan that works for you. Pay securely through
            Stripe and renew manually whenever your plan expires.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                plan.popular
                  ? "border-indigo-500 ring-2 ring-indigo-100"
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <span className="mb-4 self-start rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Popular plan
                </span>
              )}

              <h2 className="text-xl font-bold text-slate-900">
                {plan.name}
              </h2>

              <p className="mt-2 min-h-10 text-sm text-slate-500">
                {plan.description}
              </p>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">
                  ₹{plan.price}
                </span>
                <p className="mt-2 text-sm text-slate-500">
                  {plan.duration}
                </p>
              </div>

              <div className="mb-6 h-px bg-slate-200" />

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-slate-700"
                  >
                    <span className="font-bold text-green-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handlePayment(plan)}
                disabled={Boolean(loadingPlan)}
                className={`w-full rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }`}
              >
                {loadingPlan === plan.id
                  ? "Redirecting to Stripe..."
                  : "Choose Plan"}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          Your subscription should activate only after the server verifies
          successful payment. Plans do not renew automatically.
        </p>
      </div>
    </div>
    <Footer/>
    </>
  );
}
