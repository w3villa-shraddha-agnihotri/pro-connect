
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function MyBookings() {
  const { user } = useAuth();

  const role = user?.role?.toUpperCase();
  const isCustomer = role === "CUSTOMER";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemoveTarget, setConfirmRemoveTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleRemoveConnection = async (booking) => {
    if (!booking) return;

    setRemovingId(booking.id);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/api/connections/${booking.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }

      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      setSuccessMessage(
        "Connection removed successfully. This profile will now appear in your suggestions to send requests again."
      );
      setConfirmRemoveTarget(null);
    } catch (err) {
      console.error("Remove connection error:", err);
      setError(err.message || "Unable to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const loadBookings = useCallback(async () => {
    if (!role) return;

    setLoading(true);
    setError("");

    try {
      const endpoint = isCustomer
  ? "/api/connections/hired"
  : "/api/connections/received";

      const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || "Unable to load bookings.");
}

const hiredRequests = isCustomer
  ? data.professionals || []
  : (data.requests || []).filter(
      (request) => request.status === "HIRED"
    );

setBookings(hiredRequests);
    } catch (err) {
      console.error("My Bookings error:", err);
      setError(err.message || "Unable to load bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [role, isCustomer]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const dashboardPath = isCustomer
    ? "/customer/dashboard"
    : "/professional/dashboard";

  if (!role) {
    return (
     
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="text-center text-slate-600">Loading account...</p>
      </main>
      
    
    );
  }

  return (
     <>
    <Navbar />

    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        <Link
          to={dashboardPath}
          className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {isCustomer ? "Customer workspace" : "Professional workspace"}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              My Bookings
            </h1>

            <p className="mt-2 text-slate-600">
              {isCustomer
                ? "View professionals you have hired and their service details."
                : "View customers who have hired you and whose services are in progress."}
            </p>
          </div>

          <button
            type="button"
            onClick={loadBookings}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh bookings"}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {isCustomer ? "Currently Hired Professionals" : "Recently Hired Clients"}
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {loading ? "—" : bookings.length}
          </p>
        </div>

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between"
          >
            <p>✓ {successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={loadBookings}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="mt-4 h-4 w-full rounded bg-slate-100" />
                <div className="mt-3 h-4 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : !error && bookings.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <span className="text-2xl">📋</span>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {isCustomer
                ? "No hired professionals yet"
                : "No hired clients yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {isCustomer
                ? "When you hire a professional, their details will appear here."
                : "When a customer hires you, their booking details will appear here. Completed services will automatically disappear."}
            </p>

            <Link
              to={
                isCustomer
                  ? "/professionals"
                  : "/professional/requests"
              }
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              {isCustomer ? "Find Professionals" : "View Client Requests"}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {bookings.map((booking) => {
              const person = isCustomer
                ? booking.professional || {}
                : booking.customer || {};

              const profile = person.professional_profile || {};
              const skills = Array.isArray(booking.skills)
                ? booking.skills
                : [];

              return (
                <article
                  key={booking.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    {person.profile_image ? (
                      <img
                        src={person.profile_image}
                        alt={person.name || "Profile"}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
                        {(person.name || (isCustomer ? "P" : "C"))
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-semibold text-slate-900">
                        {person.name || (isCustomer ? "Professional" : "Client")}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Booking #{booking.id}
                      </p>

                      {isCustomer && (
                        <>
                          <p className="mt-1 text-sm font-medium text-indigo-600">
                            {profile.domain || "Professional"}
                          </p>

                          {profile.experience_years != null && (
                            <p className="mt-1 text-xs text-slate-500">
                              {profile.experience_years} years experience
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      HIRED
                    </span>
                  </div>

                  {isCustomer && profile.bio && (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-slate-700">
                        About Professional
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {isCustomer ? "Your project requirements" : "Client requirements"}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                      {booking.description || "No description provided."}
                    </p>
                  </div>

                  {skills.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {isCustomer ? "Required skills" : "Required skills"}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <span
                            key={skill.id || `${skill.name}-${index}`}
                            className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.updated_at && (
                    <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      Last updated: {formatDate(booking.updated_at)}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    {isCustomer ? (
                      <Link
                        to={`/professionals/${person.id}`}
                        className="inline-flex items-center text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        View Professional Profile →
                      </Link>
                    ) : (
                      <Link
                        to={`/professional/requests/${booking.id}`}
                        className="inline-flex items-center text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        View Booking Details →
                      </Link>
                    )}

                    <button
                      type="button"
                      disabled={removingId === booking.id}
                      onClick={() => setConfirmRemoveTarget(booking)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                    >
                      {removingId === booking.id ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          Removing...
                        </>
                      ) : (
                        <>✕ Remove Connection</>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal to Remove Connection */}
        {confirmRemoveTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl">
                ⚠️
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Remove Connection?
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Are you sure you want to remove connection with{" "}
                <span className="font-semibold text-slate-900">
                  {(isCustomer
                    ? confirmRemoveTarget.professional?.name
                    : confirmRemoveTarget.customer?.name) || "this user"}
                </span>
                ?
              </p>

              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 border border-slate-100">
                💡 Both of you will be disconnected, and this profile will immediately reappear in suggestions so you can send a new connection request in the future.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveTarget(null)}
                  disabled={removingId != null}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveConnection(confirmRemoveTarget)}
                  disabled={removingId != null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {removingId ? "Removing..." : "Yes, Remove Connection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    <Footer/>
  </>

  );
}
