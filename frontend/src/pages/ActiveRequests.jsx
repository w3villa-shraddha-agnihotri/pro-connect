
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  COMPLETED: "bg-blue-50 text-blue-700 ring-blue-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

function getStatus(status) {
  return String(status || "PENDING").toUpperCase();
}

function getProfessional(request) {
  return (
    request?.professional ||
    request?.receiver ||
    request?.toUser ||
    request?.recipient ||
    request?.professional_user ||
    request?.professionalUser ||
    request
  );
}

function getProfessionalId(request) {
  const professional = getProfessional(request);

  return (
    professional?.id ||
    professional?.user_id ||
    professional?.userId ||
    professional?.professional_id ||
    professional?.professionalId ||
    request?.professional_id ||
    request?.professionalId ||
    request?.receiver_id ||
    request?.receiverId ||
    null
  );
}

function getProfessionalName(request) {
  const professional = getProfessional(request);

  return (
    professional?.name ||
    professional?.full_name ||
    professional?.fullName ||
    professional?.username ||
    professional?.business_name ||
    professional?.businessName ||
    "Professional"
  );
}

function getProfessionalImage(request) {
  const professional = getProfessional(request);

  return (
    professional?.profile_image ||
    professional?.profileImage ||
    professional?.avatar ||
    professional?.image ||
    professional?.photo ||
    professional?.profile_picture ||
    professional?.profilePicture ||
    ""
  );
}

function getProfessionalService(request) {
  const professional = getProfessional(request);

  return (
    professional?.service_name ||
    professional?.serviceName ||
    professional?.profession ||
    professional?.specialization ||
    professional?.category ||
    request?.service_name ||
    request?.serviceName ||
    request?.service?.name ||
    "Professional Service"
  );
}

function getRequestDate(request) {
  return (
    request?.created_at ||
    request?.createdAt ||
    request?.requested_at ||
    request?.requestedAt ||
    request?.date ||
    null
  );
}

function formatDate(value) {
  if (!value) return "Date not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ title, value, icon, color, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function ActiveRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [removingId, setRemovingId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/connections/sent`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Please log in again to view your requests."
            : "Unable to load requests. Please try again."
        );
      }

      const data = await response.json();

      setRequests(data.requests || []);
    } catch (err) {
      console.error("Active requests error:", err);
      setError(
        err.message || "Something went wrong while loading requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter(
        (request) => getStatus(request.status) === "PENDING"
      ).length,
      accepted: requests.filter(
        (request) => getStatus(request.status) === "ACCEPTED"
      ).length,
      completed: requests.filter(
        (request) => getStatus(request.status) === "COMPLETED"
      ).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const name = getProfessionalName(request).toLowerCase();
      const service = getProfessionalService(request).toLowerCase();
      const status = getStatus(request.status);

      const matchesSearch =
        !query || name.includes(query) || service.includes(query);

      const matchesStatus =
        selectedStatus === "ALL" || status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, selectedStatus]);

  // Open the profile belonging to the professional who received this request.
  const openProfessionalProfile = (request) => {
    const professionalId = getProfessionalId(request);

    if (!professionalId) {
      console.error(
        "Professional ID is missing from this request:",
        request
      );
      return;
    }

    navigate(`/professionals/${professionalId}`);
  };

  const handleCardKeyDown = (event, request) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProfessionalProfile(request);
    }
  };

  const handleRemoveConnection = async (event, request) => {
    event.stopPropagation();
    const name = getProfessionalName(request);
    const confirmed = window.confirm(
      `Are you sure you want to remove connection with ${name}? Both of you will be disconnected, and this professional will immediately reappear in suggestions.`
    );
    if (!confirmed) return;

    try {
      setRemovingId(request.id);
      const response = await fetch(`${API_URL}/api/connections/${request.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      alert(err.message || "Unable to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {/* Page heading */}
          <div className="mb-8">
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  <span>📋</span>
                  Requests
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  My Active Requests
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Track the professionals you have contacted and check the
                  latest status of your service requests.
                </p>
              </div>

              <Link
                to="/professionals"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Find Professionals
              </Link>
            </div>
          </div>

          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Requests"
              value={counts.total}
              icon="📋"
              color="bg-blue-50 text-blue-700"
              description="All requests sent"
            />

            <StatCard
              title="Pending"
              value={counts.pending}
              icon="⏳"
              color="bg-amber-50 text-amber-700"
              description="Awaiting a response"
            />

            <StatCard
              title="Accepted"
              value={counts.accepted}
              icon="✓"
              color="bg-emerald-50 text-emerald-700"
              description="Requests accepted"
            />

            <StatCard
              title="Completed"
              value={counts.completed}
              icon="🎉"
              color="bg-violet-50 text-violet-700"
              description="Completed services"
            />
          </section>

          {/* Search and filters */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search professional or service..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All", value: "ALL" },
                  { label: "Pending", value: "PENDING" },
                  { label: "Accepted", value: "ACCEPTED" },
                  { label: "Completed", value: "COMPLETED" },
                  { label: "Rejected", value: "REJECTED" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedStatus(filter.value)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      selectedStatus === filter.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {loading ? "..." : filteredRequests.length}
                </span>{" "}
                requests
              </p>

              <button
                type="button"
                onClick={loadRequests}
                disabled={loading}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <span>↻</span>
                Refresh
              </button>
            </div>
          </section>

          {/* Requests list */}
          <section className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <LoadingCard key={item} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
                <div className="text-4xl">⚠️</div>

                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  Could not load requests
                </h2>

                <p className="mt-2 text-sm text-slate-500">{error}</p>

                <button
                  type="button"
                  onClick={loadRequests}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  {requests.length === 0 ? "📨" : "🔎"}
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  {requests.length === 0
                    ? "No requests yet"
                    : "No matching requests"}
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {requests.length === 0
                    ? "When you send a request to a professional, it will appear here."
                    : "Try a different search term or select another status filter."}
                </p>

                {requests.length === 0 ? (
                  <Link
                    to="/professionals"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Browse Professionals
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSelectedStatus("ALL");
                    }}
                    className="mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filteredRequests.map((request, index) => {
                  const name = getProfessionalName(request);
                  const image = getProfessionalImage(request);
                  const status = getStatus(request.status);
                  const service = getProfessionalService(request);
                  const date = getRequestDate(request);
                  const professionalId = getProfessionalId(request);

                  const key =
                    request.id ||
                    request.request_id ||
                    request.connection_id ||
                    `${name}-${date || index}`;

                  return (
                    <article
                      key={key}
                      role="link"
                      tabIndex={0}
                      aria-label={`View ${name}'s profile`}
                      onClick={() => openProfessionalProfile(request)}
                      onKeyDown={(event) =>
                        handleCardKeyDown(event, request)
                      }
                      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6 ${
                        professionalId
                          ? "cursor-pointer hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-700">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="break-words text-lg font-bold text-slate-900">
                              {name}
                            </h2>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                STATUS_STYLES[status] ||
                                "bg-slate-100 text-slate-600 ring-slate-200"
                              }`}
                            >
                              {status.replaceAll("_", " ")}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {service}
                          </p>

                          <p className="mt-3 text-xs text-slate-400">
                            Request sent: {formatDate(date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Request status
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {status === "PENDING"
                                ? "Waiting for professional response"
                                : status === "ACCEPTED"
                                  ? "Your request has been accepted"
                                  : status === "COMPLETED"
                                    ? "Service marked as completed"
                                    : status === "REJECTED"
                                      ? "Request was declined"
                                      : status === "CANCELLED"
                                        ? "Request was cancelled"
                                        : "Check your request status"}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleRemoveConnection(e, request)}
                              disabled={removingId === request.id}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <span>🗑️</span>
                              <span>
                                {removingId === request.id
                                  ? "Removing..."
                                  : "Remove"}
                              </span>
                            </button>

                            <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                              View Profile
                              <span aria-hidden="true">→</span>
                            </span>
                          </div>
                        </div>

                        {!professionalId && (
                          <p className="mt-3 text-xs text-amber-600">
                            Professional profile ID is unavailable for this request.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
