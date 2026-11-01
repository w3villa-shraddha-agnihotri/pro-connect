import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { message: text || `Request failed (${response.status})` };
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6">
      <div className="h-20 w-20 rounded-xl bg-slate-200" />
      <div className="mt-5 h-6 w-48 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-32 rounded bg-slate-100" />
      <div className="mt-8 h-24 rounded-lg bg-slate-100" />
    </div>
  );
}

export default function ProfessionalDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [connectionRequest, setConnectionRequest] = useState(null);
  const [hiring, setHiring] = useState(false);
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState([""]);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [removingConnection, setRemovingConnection] = useState(false);

  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the professional's public profile.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProfessional() {
      if (!id) {
        setError("Professional ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setProfessional(null);

      try {
        const response = await fetch(
          `${API_URL}/api/professionals/${encodeURIComponent(id)}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load this professional."
          );
        }

        setProfessional(data.professional || data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to connect to the server.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfessional();

    return () => controller.abort();
  }, [id]);

  // Load existing connection request.
  useEffect(() => {
    const userRole = (user?.role || "").toUpperCase();

    if (!id || (userRole !== "CUSTOMER" && userRole !== "USER")) {
      setConnectionRequest(null);
      return;
    }

    let cancelled = false;

    async function loadConnectionRequest() {
      try {
        const response = await fetch(
          `${API_URL}/api/connections/status-with/${encodeURIComponent(id)}`,
          { credentials: "include" }
        );

        const data = await readResponse(response);

        if (response.ok && data.success) {
          if (!cancelled) {
            setConnectionRequest(data.request || null);
          }
          return;
        }

        // Fallback check on /api/connections/sent.
        const fallbackResponse = await fetch(
          `${API_URL}/api/connections/sent`,
          { credentials: "include" }
        );

        const fallbackData = await readResponse(fallbackResponse);

        const requests = Array.isArray(fallbackData.requests)
          ? fallbackData.requests
          : [];

        const existingRequest = requests.find(
          (request) =>
            String(
              request.professional_id ?? request.professional?.id
            ) === String(id)
        );

        if (!cancelled) {
          setConnectionRequest(existingRequest || null);
        }
      } catch (err) {
        console.error("Unable to load connection request:", err);
      }
    }

    loadConnectionRequest();

    return () => {
      cancelled = true;
    };
  }, [id, user?.id, user?.role]);

  const handleHire = async () => {
    if (!connectionRequest?.id || hiring) return;

    const currentStatus = connectionRequest.status;

    if (!["ACCEPTED", "COMPLETED"].includes(currentStatus)) {
      setRequestError(
        "This professional cannot be hired in the current status."
      );
      return;
    }

    setHiring(true);
    setRequestError("");
    setRequestMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/${connectionRequest.id}/hire`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to hire professional.");
      }

      setConnectionRequest(data.request);

      setRequestMessage(
        currentStatus === "COMPLETED"
          ? "Professional hired again successfully."
          : "Professional hired successfully."
      );
    } catch (err) {
      console.error("HIRE ERROR:", err);
      setRequestError(err.message || "Unable to hire professional.");
    } finally {
      setHiring(false);
    }
  };

  // Remove connection without deleting historical database records.
  const handleRemoveConnection = async () => {
    if (!connectionRequest?.id || removingConnection) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this connection? Once removed, this professional will appear in your suggestions, and you can send a new connection request."
    );

    if (!confirmed) return;

    setRemovingConnection(true);
    setRequestError("");
    setRequestMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/${connectionRequest.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove connection.");
      }

      setConnectionRequest(null);

      setRequestMessage(
        "Connection removed successfully. You can now send a fresh connection request or find this professional in suggestions."
      );
    } catch (err) {
      console.error("Remove connection error:", err);
      setRequestError(err.message || "Failed to remove connection.");
    } finally {
      setRemovingConnection(false);
    }
  };

  // Check whether the current customer has already saved this profile.
  useEffect(() => {
    let cancelled = false;

    async function checkSavedProfile() {
      const userRole = (user?.role || "").toUpperCase();

      if ((userRole !== "CUSTOMER" && userRole !== "USER") || !id) {
        setProfileSaved(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/connections/saved/list`,
          { credentials: "include" }
        );

        const data = await readResponse(response);

        if (!response.ok) {
          console.error(
            "Unable to load saved profiles:",
            data.message || response.status
          );
          return;
        }

        const savedItems = Array.isArray(data.saved) ? data.saved : [];

        if (!cancelled) {
          setProfileSaved(
            savedItems.some(
              (item) => String(item.professional_id) === String(id)
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unable to check saved profile:", err);
        }
      }
    }

    checkSavedProfile();

    return () => {
      cancelled = true;
    };
  }, [id, user?.role]);

  const handleSendRequest = async (event) => {
    event.preventDefault();

    setRequestMessage("");
    setRequestError("");

    const skills = [
      ...new Set(
        requiredSkills.map((skill) => skill.trim()).filter(Boolean)
      ),
    ];

    if (description.trim().length < 10) {
      setRequestError(
        "Please describe your project in at least 10 characters."
      );
      return;
    }

    if (skills.length > 5) {
      setRequestError("You can add a maximum of 5 skills.");
      return;
    }

    if (!Number.isFinite(Number(id))) {
      setRequestError("Invalid professional ID.");
      return;
    }

    setSendingRequest(true);

    try {
      const response = await fetch(`${API_URL}/api/connections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: Number(id),
          description: description.trim(),
          skills,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        if (response.status === 409) {
          // Refresh the current connection state if a duplicate exists.
          const refreshResponse = await fetch(
            `${API_URL}/api/connections/status-with/${encodeURIComponent(id)}`,
            { credentials: "include" }
          );

          const refreshData = await readResponse(refreshResponse);

          if (refreshResponse.ok && refreshData.success) {
            setConnectionRequest(refreshData.request || null);
          }
        }

        throw new Error(data.message || "Unable to send request.");
      }

      setConnectionRequest(data.request || null);
      setRequestMessage("Connection request sent successfully.");
      setDescription("");
      setRequiredSkills([""]);
    } catch (err) {
      setRequestError(err.message || "Unable to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!id || savingProfile) return;

    setSavingProfile(true);
    setRequestError("");
    setRequestMessage("");

    try {
      const method = profileSaved ? "DELETE" : "POST";

      const response = await fetch(
        `${API_URL}/api/connections/saved/${encodeURIComponent(id)}`,
        {
          method,
          credentials: "include",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            (profileSaved
              ? "Unable to remove saved profile."
              : "Unable to save profile.")
        );
      }

      if (profileSaved) {
        setProfileSaved(false);
        setRequestMessage("Professional profile removed from saved list.");
      } else {
        setProfileSaved(true);
        setRequestMessage("Professional profile saved to your dashboard.");
      }
    } catch (err) {
      setRequestError(
        err.message ||
          (profileSaved
            ? "Unable to remove saved profile."
            : "Unable to save profile.")
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const profile = professional?.professional_profile;
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];

  const services = Array.isArray(professional?.services)
    ? professional.services
    : [];

  const userRole = (user?.role || "").toUpperCase();

  const isCustomerViewingAnotherProfile =
    (userRole === "CUSTOMER" || userRole === "USER") &&
    String(user?.id) !== String(professional?.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <Link
            to="/professionals"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            <span aria-hidden="true">←</span>
            Back to professionals
          </Link>

          {loading && (
            <div className="mt-6 space-y-5">
              <DetailSkeleton />
              <DetailSkeleton />
            </div>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-white p-6"
            >
              <h1 className="text-lg font-semibold text-slate-900">
                Profile unavailable
              </h1>

              <p className="mt-2 text-sm text-red-600">{error}</p>

              <Link
                to="/professionals"
                className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Browse professionals
              </Link>
            </div>
          )}

          {!loading && !error && professional && (
            <>
              {/* Profile header */}
              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {professional.profile_image_url ? (
  <img
    src={professional.profile_image_url}
    alt={professional.name || "Professional"}
    className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 object-cover"
    loading="lazy"
    onError={(event) => {
      event.currentTarget.style.display = "none";
    }}
  />
) : (
  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl font-semibold text-indigo-700">
    {getInitials(professional.name) || "P"}
  </div>
)}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-indigo-700">
                      ProConnect Professional
                    </p>

                    <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      {professional.name || "Professional"}
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                      {profile?.domain || "Digital Professional"}
                    </p>

                    {profile?.experience_years != null && (
                      <p className="mt-3 text-sm text-slate-500">
                        {profile.experience_years}{" "}
                        {profile.experience_years === 1 ? "year" : "years"} of
                        experience
                      </p>
                    )}
                  </div>

                  {profile?.portfolio_url && (
                    <a
                      href={profile.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    >
                      View portfolio ↗
                    </a>
                  )}
                </div>
              </section>

              {/* Customer actions */}
              {isCustomerViewingAnotherProfile && (
                <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Work with this professional
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Describe your project so the professional can decide
                        whether it matches their expertise.
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                      <button
                        type="button"
                        disabled={savingProfile}
                        onClick={handleSaveProfile}
                        title={
                          profileSaved
                            ? "Click to remove from saved list"
                            : "Save this professional"
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          profileSaved
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                        }`}
                      >
                        {savingProfile
                          ? "Saving..."
                          : profileSaved
                            ? "✓ Profile saved"
                            : "☆ Save profile"}
                      </button>

                      {connectionRequest?.status === "ACCEPTED" && (
                        <button
                          type="button"
                          onClick={handleHire}
                          disabled={hiring}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {hiring ? "Hiring..." : "Hire"}
                        </button>
                      )}

                      {connectionRequest?.status === "HIRED" && (
                        <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                          ✓ Currently Hired
                        </span>
                      )}

                      {connectionRequest?.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={handleHire}
                          disabled={hiring}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {hiring ? "Hiring Again..." : "Hire Again"}
                        </button>
                      )}

                      {connectionRequest &&
                        connectionRequest.status !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={handleRemoveConnection}
                            disabled={removingConnection}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {removingConnection
                              ? "Removing..."
                              : "Remove Connection"}
                          </button>
                        )}
                    </div>
                  </div>

                  {requestError && (
                    <p role="alert" className="mt-4 text-sm text-red-600">
                      {requestError}
                    </p>
                  )}

                  {requestMessage && (
                    <p role="status" className="mt-3 text-sm text-emerald-700">
                      {requestMessage}
                    </p>
                  )}

                  {connectionRequest &&
                    connectionRequest.status !== "REJECTED" && (
                      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-medium text-emerald-800">
                          {connectionRequest.status === "PENDING"
                            ? connectionRequest.direction ===
                              "PROFESSIONAL_TO_CUSTOMER"
                              ? (
                                <span>
                                  This professional has sent you a connection
                                  request. You can accept or reject it in{" "}
                                  <Link
                                    to="/customer/received-requests"
                                    className="font-semibold underline hover:text-emerald-950"
                                  >
                                    Received Requests
                                  </Link>
                                  .
                                </span>
                              )
                              : "Connection request already sent."
                            : connectionRequest.status === "ACCEPTED"
                              ? "Your connection request has been accepted. You can hire this professional using the button above."
                              : connectionRequest.status === "HIRED"
                                ? "You have hired this professional."
                                : connectionRequest.status === "COMPLETED"
                                  ? "This service has been marked as completed."
                                  : "A connection request already exists."}
                        </p>
                      </div>
                    )}

                  {(!connectionRequest ||
                    connectionRequest.status === "REJECTED") && (
                    <form
                      onSubmit={handleSendRequest}
                      className="mt-6 space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="project-description"
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          What do you want to build? *
                        </label>

                        <textarea
                          id="project-description"
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={5}
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          placeholder="Example: I need a responsive e-commerce website with product listings, cart, checkout and an admin dashboard..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />

                        <p className="mt-1 text-right text-xs text-slate-400">
                          {description.length}/2000 characters
                        </p>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-slate-700">
                            Required skills
                          </label>

                          <span className="text-xs text-slate-500">
                            Maximum 5 skills
                          </span>
                        </div>

                        <div className="space-y-3">
                          {requiredSkills.map((skill, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                maxLength={80}
                                value={skill}
                                onChange={(event) => {
                                  const next = [...requiredSkills];
                                  next[index] = event.target.value;
                                  setRequiredSkills(next);
                                }}
                                placeholder={`Skill ${index + 1}, e.g. React.js`}
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />

                              {requiredSkills.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRequiredSkills((previous) =>
                                      previous.filter((_, i) => i !== index)
                                    )
                                  }
                                  aria-label={`Remove skill ${index + 1}`}
                                  className="rounded-lg border border-slate-200 px-3 text-slate-500 hover:bg-slate-50 hover:text-red-600"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {requiredSkills.length < 5 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRequiredSkills((previous) => [
                                ...previous,
                                "",
                              ])
                            }
                            className="mt-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                          >
                            + Add another skill
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={sendingRequest}
                        className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {sendingRequest
                          ? "Sending request..."
                          : "Send connection request"}
                      </button>
                    </form>
                  )}
                </section>
              )}

              {/* About and skills */}
              <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    About
                  </h2>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {profile?.bio ||
                      "This professional has not added a bio yet."}
                  </p>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Skills &amp; expertise
                  </h2>

                  {skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill.id || skill.name}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      No skills have been added yet.
                    </p>
                  )}
                </section>
              </div>

              {/* Services */}
              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Services
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Services offered by this professional.
                  </p>
                </div>

                {services.length > 0 ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {services.map((service) => (
                      <article
                        key={service.id}
                        className="rounded-lg border border-slate-200 p-5"
                      >
                        <h3 className="font-semibold text-slate-900">
                          {service.title}
                        </h3>

                        {service.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {service.description}
                          </p>
                        )}

                        <p className="mt-4 text-sm font-semibold text-indigo-700">
                          {service.price != null
                            ? `₹${Number(service.price).toLocaleString("en-IN")}`
                            : "Price on request"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                    <p className="text-sm text-slate-600">
                      No services have been listed yet.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}