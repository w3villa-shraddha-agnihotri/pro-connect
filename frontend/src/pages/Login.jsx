
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading, loginUser, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isVerified = searchParams.get("verified") === "true";
  const oauthError = searchParams.get("error");
  const roleQuery = searchParams.get("role")?.toUpperCase();

  const [selectedRole, setSelectedRole] = useState(
    roleQuery === "PROFESSIONAL" || roleQuery === "PROFFESIONAL"
      ? "PROFESSIONAL"
      : "CUSTOMER"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleMismatch, setRoleMismatch] = useState(null);

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
      setSelectedRole("PROFESSIONAL");
    } else if (roleQuery === "CUSTOMER") {
      setSelectedRole("CUSTOMER");
    }
  }, [roleQuery]);

  const handleRoleSelect = (role) => {
    const normalized =
      role === "PROFFESIONAL" || role === "PROFESSIONAL"
        ? "PROFESSIONAL"
        : "CUSTOMER";
    setSelectedRole(normalized);
    setError("");
    setRoleMismatch(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("role", normalized);
      return next;
    });
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google?role=${selectedRole}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRoleMismatch(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.roleMismatch && data.registeredRole) {
          setRoleMismatch(data.registeredRole);
        }
        throw new Error(data.message || "Failed to log in.");
      }

      // Immediately update auth context with user data from login response
      if (data.user) {
        loginUser(data.user);
      }
      refreshUser().catch(() => {});

      const finalRole = (data.user?.role || selectedRole).toUpperCase();

      if (finalRole === "PROFESSIONAL") {
        navigate("/professional/dashboard", { replace: true });
      } else if (finalRole === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/customer/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  
return (
  <section className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    {/* Background decoration */}
    <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

    <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-10 text-white lg:flex xl:p-12">
        <div className="absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-10 top-32 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl font-extrabold text-blue-700 shadow-lg">
              P
            </span>
            <span className="text-2xl font-bold tracking-tight">
              ProConnect
            </span>
          </Link>

          <div className="mt-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Your next connection starts here
            </span>

            <h2 className="mt-7 max-w-md text-4xl font-bold leading-tight xl:text-5xl">
              Connect with the right people.
              <span className="mt-2 block text-blue-200">
                Build something great.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-base leading-7 text-blue-100">
              Discover trusted professionals, explore their expertise,
              and manage your journey with ProConnect.
            </p>
          </div>
        </div>

        <div className="relative mt-14 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <p className="text-sm leading-6 text-blue-50">
            “Great connections create great opportunities.”
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-600 bg-amber-200 text-sm font-bold text-slate-800">
                C
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-600 bg-emerald-200 text-sm font-bold text-slate-800">
                P
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-600 bg-violet-200 text-sm font-bold text-slate-800">
                +
              </div>
            </div>
            <span className="text-sm text-blue-100">
              Customers and professionals, together.
            </span>
          </div>
        </div>
      </div>

      {/* Login form */}
      <div className="p-6 sm:p-9 lg:p-10 xl:p-12">
        <div className="mb-8 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-extrabold text-white">
              P
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Pro<span className="text-blue-600">Connect</span>
            </span>
          </Link>
        </div>

        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sign in to your account
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your details to continue to ProConnect.
          </p>
        </div>

        {/* Role selection */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Continue as
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect("CUSTOMER")}
              aria-pressed={selectedRole === "CUSTOMER"}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                selectedRole === "CUSTOMER"
                  ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">👤</span>
              Customer
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("PROFESSIONAL")}
              aria-pressed={selectedRole === "PROFESSIONAL"}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                selectedRole === "PROFESSIONAL"
                  ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">💼</span>
              Professional
            </button>
          </div>
        </div>

        {/* Status messages */}
        {isVerified && (
          <div
            role="status"
            className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            <span className="text-lg">✓</span>
            <p>
              Email verified successfully! You can now log in to your
              ProConnect account.
            </p>
          </div>
        )}

        {oauthError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            Google sign-in failed. Please try again.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            <p>{error}</p>

            {roleMismatch && (
              <button
                type="button"
                onClick={() => handleRoleSelect(roleMismatch)}
                className="mt-2 block font-semibold underline underline-offset-4 hover:text-red-900"
              >
                Switch to{" "}
                {roleMismatch === "PROFESSIONAL"
                  ? "Professional"
                  : "Customer"}{" "}
                login
              </button>
            )}
          </div>
        )}

        {/* Google login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
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

          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Email and password form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : `Sign in as ${
                  selectedRole === "PROFESSIONAL"
                    ? "Professional"
                    : "Customer"
                }`}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link
            to={`/signup?role=${selectedRole}`}
            className="font-bold text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
          >
            Sign up as{" "}
            {selectedRole === "PROFESSIONAL" ? "Professional" : "Customer"}
          </Link>
        </p>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure sign-in to your ProConnect account
        </p>
      </div>
    </div>
  </section>
);

}

export default Login;
