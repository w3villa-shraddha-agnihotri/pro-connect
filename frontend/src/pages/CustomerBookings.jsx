
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/sent`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to load bookings."
        );
      }

      const requests = Array.isArray(data)
        ? data
        : data.requests || data.connections || data.data || [];

      // Show only requests accepted by the professional.
      const acceptedBookings = requests.filter(
        (booking) =>
          String(booking.status || "").toUpperCase() === "ACCEPTED"
      );

      setBookings(acceptedBookings);
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getProfessional = (booking) =>
    booking.professional ||
    booking.professional_user ||
    booking.receiver ||
    {};

  const getSkills = (professional, booking) => {
    const skills = professional.skills || booking.skills || [];

    if (!Array.isArray(skills)) return [];

    return skills
      .map((skill) =>
        typeof skill === "string"
          ? skill
          : skill.name || skill.skill_name || ""
      )
      .filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
              Customer Dashboard
            </p>

            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              My Bookings
            </h1>

            <p className="mt-2 text-slate-600">
              View professionals who have accepted your requests.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-3 pt-2">
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                    <div className="h-6 w-24 rounded-full bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchBookings}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty accepted bookings */}
        {!loading && !error && bookings.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path
                  d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              No accepted bookings yet
            </h2>

            <p className="mt-2 text-slate-500">
              When a professional accepts your request, their details will
              appear here.
            </p>

            <Link
              to="/professionals"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Explore Professionals
            </Link>
          </div>
        )}

        {/* Accepted bookings only */}
        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="mb-6 rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Accepted Bookings
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {bookings.length}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {bookings.map((booking, index) => {
                const professional = getProfessional(booking);

                const professionalId =
                  professional.id ||
                  booking.professional_id ||
                  booking.professionalId;

                const name =
                  professional.name ||
                  professional.full_name ||
                  professional.username ||
                  "Professional";

                const image =
                  professional.profile_image ||
                  professional.profileImage ||
                  professional.avatar ||
                  "";

                const skills = getSkills(professional, booking);

                return (
                  <article
                    key={booking.id || booking.connection_id || index}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="p-6">
                      {/* Professional details */}
                      <div className="flex items-start gap-4">
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            className="h-20 w-20 shrink-0 rounded-2xl border border-slate-100 object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h2 className="break-words text-lg font-bold text-slate-900">
                            {name}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Professional
                          </p>

                          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            ACCEPTED
                          </span>
                        </div>
                      </div>

                      {/* Accepted message */}
                      <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-3">
                        <p className="text-sm font-semibold text-green-800">
                          Request accepted!
                        </p>

                        <p className="mt-1 text-sm text-green-700">
                          This professional has accepted your request.
                        </p>
                      </div>

                      {/* Skills */}
                      {skills.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-sm font-semibold text-slate-700">
                            Skills
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, skillIndex) => (
                              <span
                                key={`${skill}-${skillIndex}`}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Request description */}
                      {booking.description && (
                        <div className="mt-5">
                          <p className="text-sm font-semibold text-slate-700">
                            Your Request
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {booking.description}
                          </p>
                        </div>
                      )}

                      {/* Request date */}
                      {booking.created_at && (
                        <p className="mt-4 text-xs text-slate-400">
                          Requested on{" "}
                          {new Date(
                            booking.created_at
                          ).toLocaleDateString()}
                        </p>
                      )}

                      {/* Profile button */}
                      <div className="mt-6 border-t border-slate-100 pt-4">
                        {professionalId ? (
                          <Link
                            to={`/professionals/${professionalId}`}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                          >
                            View Professional Profile
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Professional profile link is unavailable.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
