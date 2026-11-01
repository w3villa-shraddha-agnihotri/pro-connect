
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function CustomerReceivedRequests() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/connections/customer-received`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load requests.");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateStatus(id, status) {
    try {
      setUpdatingId(id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/connections/${id}/customer-status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update request.");
      }

      setRequests((previous) =>
        previous.map((request) =>
          request.id === id
            ? { ...request, status: data.request.status }
            : request
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeConnection(id) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this connection? Both of you will be disconnected."
    );
    if (!confirmed) return;

    try {
      setUpdatingId(id);
      setError("");

      const response = await fetch(`${API_URL}/api/connections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }

      setRequests((previous) => previous.filter((req) => req.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function downloadAttachment(request) {
    try {
      const response = await fetch(
        `${API_URL}${request.attachment_url}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download document.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `professional-document-${request.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar user={user} />

      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              ProConnect
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Professional Connection Requests
            </h1>
            <p className="mt-2 text-slate-600">
              Review professionals who want to connect with you.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Loading requests...
            </p>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              You have not received any professional requests yet.
            </div>
          ) : (
            <div className="space-y-5">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {request.professional?.profile_image ? (
                        <img
                          src={request.professional.profile_image}
                          alt={request.professional.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                          {request.professional?.name?.charAt(0)?.toUpperCase() || "P"}
                        </div>
                      )}

                      <div>
                        <h2 className="font-semibold text-slate-900">
                          {request.professional?.name || "Professional"}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {request.professional?.professional_profile?.domain ||
                            "Professional"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        request.status === "ACCEPTED"
                          ? "bg-green-100 text-green-700"
                          : request.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Introduction
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {request.description}
                    </p>
                  </div>

                  {request.attachment_url && (
                    <button
                      type="button"
                      onClick={() => downloadAttachment(request)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Download Attached Document
                    </button>
                  )}

                  {request.status === "PENDING" && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        disabled={updatingId === request.id}
                        onClick={() => updateStatus(request.id, "ACCEPTED")}
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {updatingId === request.id ? "Updating..." : "Accept"}
                      </button>

                      <button
                        disabled={updatingId === request.id}
                        onClick={() => updateStatus(request.id, "REJECTED")}
                        className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {request.status === "ACCEPTED" && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold text-emerald-700">
                        ✓ Connected
                      </span>
                      <button
                        type="button"
                        disabled={updatingId === request.id}
                        onClick={() => removeConnection(request.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {updatingId === request.id ? "Removing..." : "Remove Connection"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
