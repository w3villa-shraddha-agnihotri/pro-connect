import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_MAP_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "550px",
};

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfessionalSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-slate-200" />
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 h-3 w-full rounded bg-slate-100" />
      <div className="mt-3 h-3 w-3/4 rounded bg-slate-100" />
      <div className="mt-6 h-10 rounded-lg bg-slate-100" />
    </div>
  );
}

export default function Professionals() {
  const { user, hasActiveSubscription, subscriptionLoading } = useAuth();
const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } =
  useJsApiLoader({
    id: "proconnect-google-map",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
  });
  const isCustomer = user?.role?.toUpperCase() === "CUSTOMER";

  const canViewProfiles =
    !isCustomer ||
    (!subscriptionLoading && hasActiveSubscription);

  const [professionals, setProfessionals] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map view state
  const [viewMode, setViewMode] = useState("list");
  const [mapProfessionals, setMapProfessionals] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProfessionals() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/professionals`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load professionals.");
        }

        setProfessionals(
          Array.isArray(data) ? data : data.professionals || []
        );
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

    fetchProfessionals();

    return () => controller.abort();
  }, []);

  // Fetch only same-city verified professionals for the customer's map.
  useEffect(() => {
    if (viewMode !== "map" || !isCustomer || !canViewProfiles) {
      return undefined;
    }

    const controller = new AbortController();

    async function fetchMapProfessionals() {
      try {
        setMapLoading(true);
        setMapError("");
        setSelectedProfessional(null);

        const response = await fetch(`${API_URL}/api/professionals/map`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          const locationError =
            data.code === "LOCATION_REQUIRED"
              ? "Please save your city and state in your Customer Dashboard before opening the map."
              : data.message || "Unable to load professionals on the map.";

          throw new Error(locationError);
        }

        setMapProfessionals(
          Array.isArray(data.professionals) ? data.professionals : []
        );
        setCustomerLocation(data.customerLocation || null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setMapError(err.message || "Unable to load map professionals.");
          setMapProfessionals([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setMapLoading(false);
        }
      }
    }

    fetchMapProfessionals();

    return () => controller.abort();
  }, [viewMode, isCustomer, canViewProfiles]);

  // Center the map on the customer's saved city/state.
  const handleMapLoad = (map) => {
    if (!customerLocation?.city || !customerLocation?.state) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      {
        address: `${customerLocation.city}, ${customerLocation.state}, India`,
      },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          const center = {
            lat: location.lat(),
            lng: location.lng(),
          };

          setMapCenter(center);
          map.panTo(center);
          map.setZoom(12);
        }
      }
    );
  };

  const filteredProfessionals = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return professionals;

    return professionals.filter((professional) =>
      (professional.name || "").toLowerCase().includes(query)
    );
  }, [professionals, search]);

  // Only use real, saved GPS coordinates for professional markers.
  const mappedProfessionals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mapProfessionals.filter((professional) => {
      const latitude = professional.latitude;
      const longitude = professional.longitude;

      const hasValidCoordinates =
        latitude !== null &&
        latitude !== undefined &&
        longitude !== null &&
        longitude !== undefined &&
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude)) &&
        Number(latitude) >= -90 &&
        Number(latitude) <= 90 &&
        Number(longitude) >= -180 &&
        Number(longitude) <= 180;

      const matchesSearch =
        !query || (professional.name || "").toLowerCase().includes(query);

      return hasValidCoordinates && matchesSearch;
    });
  }, [mapProfessionals, search]);

  const professionalsWithoutCoordinates = mapProfessionals.length -
    mapProfessionals.filter((professional) => {
      const lat = professional.latitude;
      const lng = professional.longitude;

      return (
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined &&
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng)) &&
        Number(lat) >= -90 &&
        Number(lat) <= 90 &&
        Number(lng) >= -180 &&
        Number(lng) <= 180
      );
    }).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex-1 text-slate-900">
        {/* Page heading */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                ProConnect Marketplace
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Find the right professional
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Explore professionals, discover their expertise, and find the
                right person for your next project.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Web Development",
                  "Graphic Design",
                  "Digital Marketing",
                  "UI/UX Design",
                ].map((category) => (
                  <span
                    key={category}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 sm:text-sm"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Professionals listing */}
        <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Explore professionals
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse profiles and learn more about the people behind the
              services.
            </p>
          </div>

          {/* Search */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <label
              htmlFor="professional-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search by name
            </label>

            <div className="relative max-w-xl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>

              <input
                id="professional-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Enter a professional's name..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* List / Map toggle */}
          {isCustomer && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">
                  Find professionals near you
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  View professionals in your saved city on Google Maps.
                </p>
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  List View
                </button>

                <button
                  type="button"
                  disabled={!canViewProfiles}
                  onClick={() => setViewMode("map")}
                  title={
                    !canViewProfiles
                      ? "Active subscription required"
                      : "Show nearby professionals on map"
                  }
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "map"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Map View {!canViewProfiles ? "🔒" : "📍"}
                </button>
              </div>
            </div>
          )}

          {/* Loading state for original professionals list */}
          {loading && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <ProfessionalSkeleton key={item} />
              ))}
            </div>
          )}

          {/* Error state for original professionals list */}
          {!loading && error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-white p-6"
            >
              <h3 className="font-semibold text-slate-900">
                Unable to load professionals
              </h3>

              <p className="mt-2 text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {!loading && !error && (
            <>
              <div className="mt-7 flex items-center justify-between border-b border-slate-200 pb-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {viewMode === "map" && isCustomer
                      ? mappedProfessionals.length
                      : filteredProfessionals.length}
                  </span>{" "}
                  {(
                    viewMode === "map" && isCustomer
                      ? mappedProfessionals.length
                      : filteredProfessionals.length
                  ) === 1
                    ? "professional"
                    : "professionals"}{" "}
                  found
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {viewMode === "map" && isCustomer ? (
                <div className="mt-5">
                  {mapLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
                      Loading nearby professionals...
                    </div>
                  ) : mapError ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-amber-200 bg-white p-6"
                    >
                      <h3 className="font-semibold text-slate-900">
                        Unable to show nearby professionals
                      </h3>
                      <p className="mt-2 text-sm text-amber-800">
                        {mapError}
                      </p>
                      {mapError.toLowerCase().includes("location") && (
                        <Link
                          to="/customer/dashboard"
                          className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          Complete Your Profile
                        </Link>
                      )}
                    </div>
                  ) : !GOOGLE_MAPS_API_KEY ? (
                    <div className="rounded-xl border border-amber-200 bg-white p-6 text-sm text-amber-800">
                      Google Maps API key is missing. Add
                      VITE_GOOGLE_MAPS_API_KEY to your frontend .env file and
                      restart the Vite server.
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-600">
                          Showing professionals in{" "}
                          <strong>
                            {customerLocation?.city || "your city"}
                            {customerLocation?.state
                              ? `, ${customerLocation.state}`
                              : ""}
                          </strong>
                        </p>
                        <p className="text-xs text-slate-500">
                          {mappedProfessionals.length} with GPS coordinates
                        </p>
                      </div>

                     {googleMapsLoadError ? (
  <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
    Google Maps failed to load. Please check your API key and Google Maps
    API configuration.
  </div>
) : !isGoogleMapsLoaded ? (
  <div className="flex h-[550px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
    Loading Google Map...
  </div>
) : (
  <GoogleMap
    mapContainerStyle={MAP_CONTAINER_STYLE}
    center={mapCenter}
    zoom={5}
    onLoad={handleMapLoad}
    options={{
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    }}
  >
    {mappedProfessionals.map((professional) => (
      <MarkerF
        key={professional.id}
        position={{
          lat: Number(professional.latitude),
          lng: Number(professional.longitude),
        }}
        title={professional.name || "Professional"}
        onClick={() => setSelectedProfessional(professional)}
      />
    ))}

    {selectedProfessional && (
      <InfoWindowF
        position={{
          lat: Number(selectedProfessional.latitude),
          lng: Number(selectedProfessional.longitude),
        }}
        onCloseClick={() => setSelectedProfessional(null)}
      >
        <div className="max-w-56 p-1">
          <h3 className="font-semibold text-slate-900">
            {selectedProfessional.name || "Professional"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {selectedProfessional.domain || "Digital Professional"}
          </p>
          <Link
            to={`/professionals/${selectedProfessional.id}`}
            className="mt-3 inline-block text-sm font-semibold text-indigo-600"
          >
            View Profile →
          </Link>
        </div>
      </InfoWindowF>
    )}
  </GoogleMap>
)}

                      {mappedProfessionals.length === 0 && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          No professionals with saved GPS coordinates were
                          found in your city.
                        </div>
                      )}

                      {professionalsWithoutCoordinates > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          {professionalsWithoutCoordinates} professional(s)
                          have not saved GPS coordinates, so they are not
                          shown as map markers.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : filteredProfessionals.length > 0 ? (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProfessionals.map((professional) => (
                    <article
                      key={professional.id}
                      className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        {professional.profile_image_url ? (
                          <img
                            src={professional.profile_image_url}
                            alt={professional.name || "Professional"}
                            className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700">
                            {getInitials(professional.name) || "P"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-base font-semibold text-slate-900">
                            {professional.name || "Professional"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {professional.professional_profile?.domain ||
                              professional.domain ||
                              "Digital Professional"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex-1 border-t border-slate-100 pt-4">
                        <p className="text-sm leading-6 text-slate-600">
                          {professional.professional_profile?.bio ||
                            professional.bio ||
                            "View this professional's profile to learn more about their expertise and services."}
                        </p>
                      </div>

                      {canViewProfiles ? (
                        <Link
                          to={`/professionals/${professional.id}`}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-600 hover:bg-indigo-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          View profile
                          <span aria-hidden="true">→</span>
                        </Link>
                      ) : (
                        <div className="mt-5">
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
                          >
                            View profile
                            <span aria-hidden="true">🔒</span>
                          </button>

                          <p className="mt-2 text-center text-xs text-amber-700">
                            Subscribe to view professional profiles.
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <circle cx="10.5" cy="10.5" r="6.5" />
                      <path d="m15.5 15.5 4 4" />
                    </svg>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {search
                      ? "No matching professionals"
                      : "No professionals available yet"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {search
                      ? "Try searching with a different name."
                      : "Professionals will appear here when eligible profiles are available."}
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
