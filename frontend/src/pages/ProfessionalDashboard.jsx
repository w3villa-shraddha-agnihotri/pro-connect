
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProfilePicture from "../components/ProfilePicture";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const initialServiceForm = {
  title: "",
  description: "",
  price: "",
};

function MetricCard({ label, value, description, icon }) {
  return (
    <div className="h-full min-h-[132px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg text-indigo-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
    </div>
  );
}

export default function ProfessionalDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    logout,
    hasActiveSubscription,
    subscriptionLoading,
  } = useAuth();

  // Lock professional features while subscription is inactive
  // or while subscription status is still loading.
  const isSubscriptionLocked =
    subscriptionLoading || !hasActiveSubscription;

  const servicesSectionRef = useRef(null);

  const [available, setAvailable] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState(null);
  const [serviceError, setServiceError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [serviceSuccess, setServiceSuccess] = useState("");
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [requestCount, setRequestCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    if (location.hash === "#my-services") {
      servicesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [location.hash]);

  // Load request and connection counts.
  useEffect(() => {
    let cancelled = false;

    async function loadRequestCount() {
      try {
        const [reqRes, connRes] = await Promise.all([
          fetch(`${API_URL}/api/connections/received`, {
            credentials: "include",
          }),
          fetch(`${API_URL}/api/connections/connected`, {
            credentials: "include",
          }),
        ]);

        if (!cancelled && reqRes.ok) {
          const data = await reqRes.json();
          const requests = data.requests || [];

          setRequestCount(
            requests.filter(
              (request) => request.status === "PENDING"
            ).length
          );
        }

        if (!cancelled && connRes.ok) {
          const connData = await connRes.json();
          setConnectedCount(
            connData.connectedCustomers?.length || 0
          );
        }
      } catch (error) {
        console.error(
          "Unable to load request and connection count:",
          error
        );
      }
    }

    loadRequestCount();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load saved availability and services from backend.
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoadingDashboard(true);
      setDashboardError("");

      try {
        const response = await fetch(
          `${API_URL}/api/professional-dashboard`,
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load dashboard."
          );
        }

        if (!cancelled) {
          setAvailable(data.is_available ?? true);
          setServices(data.services || []);
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardError(
            error.message || "Unable to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login?role=PROFESSIONAL");
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  // Update availability.
  const handleAvailabilityToggle = async () => {
    if (
      isSubscriptionLocked ||
      savingAvailability ||
      loadingDashboard
    ) {
      return;
    }

    const previousValue = available;
    const nextValue = !previousValue;

    setSavingAvailability(true);
    setDashboardError("");
    setAvailable(nextValue);

    try {
      const response = await fetch(
        `${API_URL}/api/professional-dashboard/availability`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_available: nextValue }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update availability."
        );
      }

      setAvailable(data.is_available);
    } catch (error) {
      setAvailable(previousValue);
      setDashboardError(
        error.message || "Could not update availability."
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleServiceInput = (event) => {
    const { name, value } = event.target;

    setServiceForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create a service through backend.
  const handleAddService = async (event) => {
    event.preventDefault();

    if (isSubscriptionLocked) return;

    setServiceError("");
    setServiceSuccess("");

    if (!serviceForm.title.trim()) {
      setServiceError("Please enter a service name.");
      return;
    }

    if (
      serviceForm.price !== "" &&
      (!Number.isFinite(Number(serviceForm.price)) ||
        Number(serviceForm.price) < 0)
    ) {
      setServiceError(
        "Please enter a valid non-negative price."
      );
      return;
    }

    setSavingService(true);

    try {
      const response = await fetch(
        `${API_URL}/api/professional-dashboard/services`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not add service."
        );
      }

      setServices((previous) => [
        data.service,
        ...previous,
      ]);

      setServiceForm(initialServiceForm);
      setShowServiceForm(false);
      setServiceSuccess("Service added successfully.");
    } catch (error) {
      setServiceError(
        error.message || "Could not add service."
      );
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (isSubscriptionLocked) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) return;

    setDeletingServiceId(id);
    setServiceError("");
    setServiceSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/professional-dashboard/services/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not delete service."
        );
      }

      setServices((previous) =>
        previous.filter((service) => service.id !== id)
      );

      setServiceSuccess("Service deleted successfully.");
    } catch (error) {
      setServiceError(
        error.message || "Could not delete service."
      );
    } finally {
      setDeletingServiceId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Page heading and availability */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-700">
                  PROFESSIONAL WORKSPACE
                </p>

                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome, {user?.name || "Professional"}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage your professional profile, publish your
                  services, and keep your availability up to date.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Hire status
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={available}
                  disabled={
                    isSubscriptionLocked ||
                    savingAvailability ||
                    loadingDashboard
                  }
                  onClick={handleAvailabilityToggle}
                  title={
                    isSubscriptionLocked
                      ? "Active subscription required"
                      : "Change availability"
                  }
                  className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    available
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span
                    className={`relative h-5 w-9 rounded-full transition ${
                      available
                        ? "bg-emerald-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                        available ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>

                  {savingAvailability
                    ? "Saving..."
                    : loadingDashboard
                    ? "Loading..."
                    : available
                    ? "Available for hire"
                    : "Unavailable"}
                </button>
              </div>
            </div>
          </section>

          {isSubscriptionLocked && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  Active subscription required
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  You can explore customers, but other professional
                  dashboard features require an active subscription.
                </p>
              </div>

              <Link
                to="/subscription-plans"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View Plans
              </Link>
            </div>
          )}

          {dashboardError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {dashboardError}
            </div>
          )}

          {/* Dashboard metrics */}
          <section className="mt-7">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A quick look at your professional activity.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loadingDashboard ? (
                <>
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                </>
              ) : (
                <>
                  {/* Services listed - locked */}
                  <button
                    type="button"
                    disabled={isSubscriptionLocked}
                    onClick={() =>
                      servicesSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    title={
                      isSubscriptionLocked
                        ? "Active subscription required"
                        : "View your services"
                    }
                    className="w-full cursor-pointer rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <MetricCard
                      label="Services listed"
                      value={services.length}
                      description="Your published offerings"
                      icon="▤"
                    />
                  </button>

                  {/* Client requests - locked */}
                  <Link
                    to="/professional/requests"
                    aria-disabled={isSubscriptionLocked}
                    onClick={(event) => {
                      if (isSubscriptionLocked) {
                        event.preventDefault();
                      }
                    }}
                    title={
                      isSubscriptionLocked
                        ? "Active subscription required"
                        : "View client requests"
                    }
                    className={`block rounded-xl transition ${
                      isSubscriptionLocked
                        ? "pointer-events-none cursor-not-allowed opacity-50"
                        : "hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <MetricCard
                      label="Client requests"
                      value={requestCount}
                      description="Pending requests · View all"
                      icon="↗"
                    />
                  </Link>

                  {/* Connected customers - locked */}
                  <Link
                    to="/connections?tab=customers"
                    aria-disabled={isSubscriptionLocked}
                    onClick={(event) => {
                      if (isSubscriptionLocked) {
                        event.preventDefault();
                      }
                    }}
                    title={
                      isSubscriptionLocked
                        ? "Active subscription required"
                        : "View connected customers"
                    }
                    className={`block rounded-xl transition ${
                      isSubscriptionLocked
                        ? "pointer-events-none cursor-not-allowed opacity-50"
                        : "hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <MetricCard
                      label="Connected customers"
                      value={connectedCount}
                      description="Active partnerships · Manage"
                      icon="👥"
                    />
                  </Link>

                  {/* Find customers - always accessible */}
                  <Link
                    to="/professional/find-customers"
                    className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <MetricCard
                      label="Find customers"
                      value="Explore"
                      description="Discover customers"
                      icon="⌕"
                    />
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* Main dashboard content */}
          <section className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">

            {/* Profile card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Professional profile
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your account information
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg text-indigo-700">
                  ♙
                </span>
              </div>

              {/* Professional Profile Picture */}
              <div className="flex flex-col items-center border-b border-slate-100 pb-6">
                <ProfilePicture
                  size="xl"
                  editable={!isSubscriptionLocked}
                  showRemove={!isSubscriptionLocked}
                />

                <h3 className="mt-3 text-base font-bold text-slate-900">
                  {user?.name || "Professional"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Your Professional Profile Picture
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Full name
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-800">
                    {user?.name || "Not provided"}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Business email
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-800">
                    {user?.email || "Not provided"}
                  </p>
                </div>

                {user?.phone && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Phone number
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {user.phone}
                    </p>
                  </div>
                )}

                {user?.address && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Location
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      📍 {user.address}
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Account role
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {user?.role || "PROFESSIONAL"}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Verification
                  </p>

                  <p
                    className={`mt-1 text-sm font-medium ${
                      user?.is_verified
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {user?.is_verified
                      ? "Verified professional"
                      : "Verification pending"}
                  </p>
                </div>
              </div>

              {/* Edit profile - locked */}
              <Link
                to="/professional/profile"
                aria-disabled={isSubscriptionLocked}
                onClick={(event) => {
                  if (isSubscriptionLocked) {
                    event.preventDefault();
                  }
                }}
                title={
                  isSubscriptionLocked
                    ? "Active subscription required"
                    : "Edit your profile"
                }
                className={`mt-6 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isSubscriptionLocked
                    ? "pointer-events-none cursor-not-allowed bg-slate-300 text-slate-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                Edit profile

                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>

              {/* Sign out remains accessible */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleSignOut}
                className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>

            {/* Services */}
            <div
              id="my-services"
              ref={servicesSectionRef}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    My services
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage the services customers can hire you for.
                  </p>
                </div>

                {/* Add service - locked */}
                <button
                  type="button"
                  disabled={isSubscriptionLocked}
                  onClick={() => {
                    setServiceError("");
                    setServiceSuccess("");
                    setShowServiceForm((previous) => !previous);
                  }}
                  title={
                    isSubscriptionLocked
                      ? "Active subscription required"
                      : "Add a service"
                  }
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showServiceForm ? "Close form" : "+ Add service"}
                </button>
              </div>

              {serviceSuccess && (
                <p
                  role="status"
                  className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
                  {serviceSuccess}
                </p>
              )}

              {serviceError && (
                <p
                  role="alert"
                  className="mt-4 text-sm text-red-600"
                >
                  {serviceError}
                </p>
              )}

              {/* Add service form */}
              {showServiceForm && !isSubscriptionLocked && (
                <form
                  onSubmit={handleAddService}
                  className="mt-5 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    Add a new service
                  </h3>

                  <div>
                    <label
                      htmlFor="service-title"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Service name *
                    </label>

                    <input
                      id="service-title"
                      name="title"
                      required
                      maxLength={150}
                      value={serviceForm.title}
                      onChange={handleServiceInput}
                      placeholder="e.g. Website development"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="service-description"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>

                    <textarea
                      id="service-description"
                      name="description"
                      rows={3}
                      maxLength={5000}
                      value={serviceForm.description}
                      onChange={handleServiceInput}
                      placeholder="Describe what you offer..."
                      className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="service-price"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Price (₹, optional)
                    </label>

                    <input
                      id="service-price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.price}
                      onChange={handleServiceInput}
                      placeholder="e.g. 2500"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSubscriptionLocked || savingService}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingService ? "Saving..." : "Save service"}
                    </button>

                    <button
                      type="button"
                      disabled={isSubscriptionLocked || savingService}
                      onClick={() => {
                        setShowServiceForm(false);
                        setServiceError("");
                        setServiceForm(initialServiceForm);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Saved service list */}
              <div className="mt-5">
                {loadingDashboard ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-20 rounded-lg bg-slate-100" />
                    <div className="h-20 rounded-lg bg-slate-100" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 px-5 py-10 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600">
                      +
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-slate-800">
                      No services added yet
                    </h3>

                    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Add your first service to describe your expertise
                      and what customers can hire you for.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <article
                        key={service.id}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-slate-900">
                            {service.title}
                          </h3>

                          {service.description && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                              {service.description}
                            </p>
                          )}

                          <p className="mt-2 text-sm font-semibold text-indigo-700">
                            {service.price != null
                              ? `₹${Number(
                                  service.price
                                ).toLocaleString("en-IN")}`
                              : "Price on request"}
                          </p>
                        </div>

                        {/* Delete service - locked */}
                        <button
                          type="button"
                          disabled={
                            isSubscriptionLocked ||
                            deletingServiceId === service.id
                          }
                          onClick={() =>
                            handleDeleteService(service.id)
                          }
                          title={
                            isSubscriptionLocked
                              ? "Active subscription required"
                              : "Delete service"
                          }
                          className="self-start rounded-md px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
                        >
                          {deletingServiceId === service.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
