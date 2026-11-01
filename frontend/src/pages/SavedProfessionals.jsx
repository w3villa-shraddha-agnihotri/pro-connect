
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function SavedProfessionals() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const loadSavedProfessionals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/saved/list`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load saved professionals.");
      }

      setSaved(Array.isArray(data.saved) ? data.saved : []);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedProfessionals();
  }, [loadSavedProfessionals]);

  const handleRemove = async (professionalId) => {
    if (removingId !== null) return;

    setRemovingId(professionalId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/saved/${professionalId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove saved professional.");
      }

      setSaved((previous) =>
        previous.filter(
          (item) => item.professional_id !== professionalId
        )
      );
    } catch (err) {
      setError(err.message || "Unable to remove saved professional.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <Link
            to="/customer/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                YOUR COLLECTION
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Saved Professionals
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Find and revisit professionals you have saved.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
              {saved.length} {saved.length === 1 ? "professional" : "professionals"}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
              <button
                type="button"
                onClick={loadSavedProfessionals}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="h-14 w-14 rounded-xl bg-slate-200" />
                  <div className="mt-4 h-5 w-36 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-24 rounded bg-slate-100" />
                  <div className="mt-5 h-9 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : saved.length === 0 ? (
            <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-700">
                ♡
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No saved professionals yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Browse professionals and save profiles you want to revisit.
              </p>
              <Link
                to="/professionals"
                className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Browse professionals
              </Link>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((item) => {
                const professional = item.professional;
                if (!professional) return null;

                const id = professional.id ?? item.professional_id;
                const profile = professional.professional_profile;

                return (
                  <article
                    key={item.id ?? id}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {professional.profile_image ? (
                        <img
                          src={professional.profile_image}
                          alt={professional.name || "Professional"}
                          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700">
                          {getInitials(professional.name) || "P"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h2 className="break-words font-semibold text-slate-900">
                          {professional.name || "Professional"}
                        </h2>
                        <p className="mt-1 text-sm text-indigo-700">
                          {profile?.domain || "Digital Professional"}
                        </p>
                        {profile?.experience_years != null && (
                          <p className="mt-1 text-xs text-slate-500">
                            {profile.experience_years}{" "}
                            {profile.experience_years === 1 ? "year" : "years"}{" "}
                            of experience
                          </p>
                        )}
                      </div>
                    </div>

                    {profile?.bio && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                        {profile.bio}
                      </p>
                    )}

                    <div className="mt-auto flex gap-3 pt-5">
                      <Link
                        to={`/professionals/${id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        View profile
                      </Link>

                      <button
                        type="button"
                        disabled={removingId !== null}
                        onClick={() => handleRemove(item.professional_id)}
                        className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === item.professional_id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
