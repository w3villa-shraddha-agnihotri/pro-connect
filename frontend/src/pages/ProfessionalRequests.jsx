
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function ProfessionalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [removingId, setRemovingId] = useState(null);

  const navigate = useNavigate();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/received`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load requests.");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRemoveConnection = async (requestId, customerName) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove connection with ${customerName || "this customer"}? Both of you will be disconnected, and this customer will reappear in suggestions.`
    );
    if (!confirmed) return;

    try {
      setRemovingId(requestId);
      const response = await fetch(`${API_URL}/api/connections/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(err.message || "Unable to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const pendingCount = requests.filter(
    (request) => request.status === "PENDING"
  ).length;

  const filteredRequests =
    filter === "ALL"
      ? requests
      : requests.filter((request) => request.status === filter);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/professional/dashboard"
          className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Professional workspace
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Client Requests
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review customer requirements and respond to their requests.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh requests"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total requests",
              value: requests.length,
              color: "text-indigo-700",
            },
            {
              label: "Pending",
              value: pendingCount,
              color: "text-amber-600",
            },
            {
              label: "Accepted",
              value: requests.filter((r) => r.status === "ACCEPTED").length,
              color: "text-emerald-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {[
            { label: "All requests", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "Accepted", value: "ACCEPTED" },
            { label: "Rejected", value: "REJECTED" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filter === item.value
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((item) => (
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
        ) : filteredRequests.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-3xl">📩</div>

            <h2 className="mt-3 font-semibold text-slate-800">
              {requests.length === 0
                ? "No connection requests yet"
                : "No requests in this category"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {requests.length === 0
                ? "Requests sent by customers will appear here."
                : "Choose another filter to view requests."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 items-center gap-3">
                    {request.customer?.profile_image ? (
                      <img
                        src={request.customer.profile_image}
                        alt={request.customer.name || "Customer"}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-700">
                        {(request.customer?.name || "C")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900">
                        {request.customer?.name || "Customer"}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Request #{request.id} ·{" "}
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Date unavailable"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === "ACCEPTED"
                        ? "bg-emerald-50 text-emerald-700"
                        : request.status === "REJECTED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Project requirements
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {request.description}
                  </p>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Required skills
                  </h3>

                  {request.skills?.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No specific skills provided.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    Review the complete request before responding.
                  </p>

                  <div className="flex items-center gap-2">
                    {["ACCEPTED", "HIRED", "COMPLETED"].includes(request.status) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveConnection(
                            request.id,
                            request.customer?.name
                          )
                        }
                        disabled={removingId === request.id}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {removingId === request.id ? "Removing..." : "Remove Connection"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/professional/requests/${request.id}`)
                      }
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
