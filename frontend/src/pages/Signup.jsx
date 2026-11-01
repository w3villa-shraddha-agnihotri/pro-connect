
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function Signup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleQuery = searchParams.get("role")?.toUpperCase();
  const initialRole =
    roleQuery === "PROFESSIONAL" || roleQuery === "PROFFESIONAL"
      ? "PROFESSIONAL"
      : "CUSTOMER";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "PROFESSIONAL") {
        navigate("/professional/dashboard", { replace: true });
      } else {
        navigate("/customer/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (roleQuery === "PROFESSIONAL" || roleQuery === "PROFFESIONAL") {
      setFormData((prev) => ({
        ...prev,
        role: "PROFESSIONAL",
      }));
    } else if (roleQuery === "CUSTOMER") {
      setFormData((prev) => ({
        ...prev,
        role: "CUSTOMER",
      }));
    }
  }, [roleQuery]);

  const setRole = (newRole) => {
    setFormData((prev) => ({ ...prev, role: newRole }));
    setSearchParams({ role: newRole });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/auth/google?role=${formData.role}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, password, confirmPassword, role } = formData;

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setSuccess(
        data.message ||
          "Account created! Please check your email to verify your account."
      );

      // Keep the selected role intact instead of resetting to CUSTOMER
      setFormData((prev) => ({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: prev.role,
      }));
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] bg-slate-50 px-4 py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        {/* Left section */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 to-indigo-900 p-10 text-white md:flex">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-4 py-2 text-sm">
              Welcome to ProConnect
            </span>

            <h1 className="mt-8 text-4xl font-bold leading-tight">
              Find the right professionals for your needs.
            </h1>

            <p className="mt-5 leading-7 text-blue-100">
              Connect with trusted professionals, explore services, and
              build meaningful connections—all in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <p className="text-lg font-medium">
              One platform. Endless possibilities.
            </p>
            <p className="mt-2 text-sm text-blue-100">
              Create your account and get started today.
            </p>
          </div>
        </div>

        {/* Signup form */}
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Get started
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Create your account
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Enter your details to join ProConnect.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <p className="font-semibold">Registration successful!</p>
              <p className="mt-1">{success}</p>
              <p className="mt-2">
                Open the verification link sent to your email before signing
                in.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/login?role=${formData.role}`)}
                className="mt-3 font-semibold text-green-800 underline"
              >
                Go to Sign in as {formData.role === "PROFESSIONAL" ? "Professional" : "Customer"}
              </button>
            </div>
          )}

          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              I want to join as
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setRole("CUSTOMER")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  formData.role === "CUSTOMER"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👤</span> Customer
              </button>
              <button
                type="button"
                onClick={() => setRole("PROFESSIONAL")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  formData.role === "PROFESSIONAL"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>💼</span> Professional
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formData.role === "CUSTOMER"
                ? "Looking to find, explore, and hire trusted service professionals."
                : "Looking to showcase services, manage client bookings, and grow."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.26-8.28 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>

            Continue with Google as {formData.role === "PROFESSIONAL" ? "Professional" : "Customer"}
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm text-slate-500">or sign up with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating account..."
                : `Create ${formData.role === "PROFESSIONAL" ? "Professional" : "Customer"} Account`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to={`/login?role=${formData.role}`}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </p>

        </div>
      </div>
      
    </section>
  );
}
