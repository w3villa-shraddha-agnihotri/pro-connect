
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function ProfessionalRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [removingConnection, setRemovingConnection] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/received`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load request.");
      }

      const found = (data.requests || []).find(
        (item) => String(item.id) === String(id)
      );

      if (!found) {
        throw new Error(
          "Request not found, or you do not have permission to view it."
        );
      }

      setRequest(found);
    } catch (err) {
      setError(err.message || "Unable to load request details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  async function updateStatus(status) {
    if (!request || updating || request.status !== "PENDING") {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${status.toLowerCase()} this request?`
    );

    if (!confirmed) return;

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/${request.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update request.");
      }

      setRequest(data.request);
      setSuccess(
        status === "ACCEPTED"
          ? "Request accepted successfully."
          : "Request rejected successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to update request.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCompleteService() {
    if (!request || request.status !== "HIRED" || completing) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to mark this service as completed?"
    );

    if (!confirmed) return;

    setCompleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/${request.id}/complete`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to complete service.");
      }

      setRequest(data.request);
      setSuccess("Service marked as completed successfully.");
    } catch (err) {
      setError(err.message || "Unable to complete service.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleRemoveConnection() {
    if (!request || removingConnection) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove connection with ${request.customer?.name || "this customer"}? Both of you will be disconnected, and this customer will reappear in suggestions.`
    );

    if (!confirmed) return;

    setRemovingConnection(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/connections/${request.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }

      setSuccess("Connection removed successfully. Navigating to connections...");
      setTimeout(() => {
        navigate("/connections?tab=customers");
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to remove connection.");
    } finally {
      setRemovingConnection(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse rounded-xl bg-white p-8 shadow-sm">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="mt-6 h-4 w-full rounded bg-slate-100" />
          <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/professional/requests"
          className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          ← Back to all requests
        </Link>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!request ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8">
            <h1 className="text-xl font-semibold text-slate-900">
              Request unavailable
            </h1>

            <button
              type="button"
              onClick={() => navigate("/professional/requests")}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Return to requests
            </button>
          </div>
        ) : (
          <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                Connection request #{request.id}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {request.customer?.profile_image ? (
                  <img
                    src={request.customer.profile_image}
                    alt={request.customer.name || "Customer"}
                    className="h-16 w-16 rounded-full border border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                    {(request.customer?.name || "C")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {request.customer?.name || "Customer"}
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Sent on{" "}
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )
                      : "Date unavailable"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    request.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-700"
                      : request.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : request.status === "HIRED"
                          ? "bg-indigo-100 text-indigo-700"
                          : request.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {request.status}
                </span>
              </div>
            </div>

            <div className="space-y-7 p-6 sm:p-8">
              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Project description
                </h2>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {request.description}
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Required skills
                </h2>

                {request.skills?.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
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
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-sm font-semibold text-slate-800">
                  Request status
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {request.status === "PENDING"
                    ? "This request is awaiting your response."
                    : request.status === "ACCEPTED"
                      ? "You accepted this request. The customer can hire you now."
                      : request.status === "HIRED"
                        ? "You are currently working on this service."
                        : request.status === "COMPLETED"
                          ? "This service has been completed."
                          : request.status === "REJECTED"
                            ? "You rejected this request."
                            : "Request status unavailable."}
                </p>
              </section>

              {success && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                >
                  {success}
                </div>
              )}

              {request.status === "PENDING" && (
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => updateStatus("ACCEPTED")}
                    className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "✓ Accept Request"}
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => updateStatus("REJECTED")}
                    className="rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "✕ Reject Request"}
                  </button>
                </div>
              )}

              {request.status === "HIRED" && (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={handleCompleteService}
                    disabled={completing}
                    className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {completing ? "Completing..." : "✓ Complete Service"}
                  </button>

                  <p className="text-sm text-slate-500">
                    Mark the service as completed when your work is finished.
                  </p>
                </div>
              )}

              {request.status === "COMPLETED" && (
                <div className="border-t border-slate-100 pt-5">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-800">
                      ✓ Service Completed
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      This service is finished. The Complete Service action is
                      no longer available for this request.
                    </p>
                  </div>
                </div>
              )}

              {request.status === "REJECTED" && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-sm font-medium text-slate-600">
                    This request has been rejected.
                  </p>
                </div>
              )}

              {request.status === "ACCEPTED" && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-500">
                    Waiting for the customer to hire you.
                  </p>
                </div>
              )}

              {["ACCEPTED", "HIRED", "COMPLETED"].includes(request.status) && (
                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={handleRemoveConnection}
                    disabled={removingConnection}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <span>🗑️</span>
                    <span>
                      {removingConnection
                        ? "Removing..."
                        : "Remove Connection"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
