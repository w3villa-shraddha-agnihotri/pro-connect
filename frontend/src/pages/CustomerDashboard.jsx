

import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import Navbar from "../components/Navbar";

import Footer from "../components/Footer";

import ProfilePicture from "../components/ProfilePicture";

const API_URL = (

  import.meta.env.VITE_API_URL || "http://localhost:5000"

).replace(/\/+$/, "");



export default function CustomerDashboard() {

  const navigate = useNavigate();



  const {

    user,

    logout,

    refreshUser,
    hasActiveSubscription,

    subscriptionLoading,

  } = useAuth();



  const isCustomer = user?.role?.toUpperCase() === "CUSTOMER";



  const canAccessCustomerFeatures =

    !isCustomer || (!subscriptionLoading && hasActiveSubscription);



  const [loggingOut, setLoggingOut] = useState(false);

  const [savedProfessionals, setSavedProfessionals] = useState([]);

  const [requests, setRequests] = useState([]);

  const [loadingSaved, setLoadingSaved] = useState(true);

  // Customer address and map location
  const [locationForm, setLocationForm] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null,
    longitude: null,
  });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!user) return;

    setLocationForm({
      street: user.street || "",
      city: user.city || "",
      state: user.state || "",
      pincode: user.pincode || "",
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
    });
  }, [user]);



  // Load dashboard data only when subscription access is available.

  useEffect(() => {

    let cancelled = false;



    async function loadDashboardData() {

      if (!user) {

        setLoadingSaved(false);

        return;

      }



      if (subscriptionLoading) {

        setLoadingSaved(true);

        return;

      }



      if (!canAccessCustomerFeatures) {

        setSavedProfessionals([]);

        setRequests([]);

        setLoadingSaved(false);

        return;

      }



      try {

        setLoadingSaved(true);



        const [savedRes, reqRes] = await Promise.all([

          fetch(`${API_URL}/api/connections/saved/list`, {

            credentials: "include",

          }),

          fetch(`${API_URL}/api/connections/sent`, {

            credentials: "include",

          }),

        ]);



        if (!cancelled && savedRes.ok) {

          const savedData = await savedRes.json();



          setSavedProfessionals(

            Array.isArray(savedData.saved) ? savedData.saved : []

          );

        }



        if (!cancelled && reqRes.ok) {

          const reqData = await reqRes.json();



          setRequests(

            Array.isArray(reqData.requests) ? reqData.requests : []

          );

        }

      } catch (err) {

        console.error("Dashboard data load error:", err);

      } finally {

        if (!cancelled) {

          setLoadingSaved(false);

        }

      }

    }



    loadDashboardData();



    return () => {

      cancelled = true;

    };

  }, [user, subscriptionLoading, canAccessCustomerFeatures]);



  const handleLocationInputChange = (e) => {
    const { name, value } = e.target;
    setLocationForm((previous) => ({ ...previous, [name]: value }));
    setLocationMessage("");
    setLocationError("");
  };

  const handleGetCurrentLocation = () => {
    setLocationError("");
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm((previous) => ({
          ...previous,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationMessage("Current coordinates detected. Save your location to apply the update.");
        setLocating(false);
      },
      (error) => {
        let message = "Unable to detect location. Please try again.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please allow location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Your current location is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocationError("");
    setLocationMessage("");

    if (!locationForm.city.trim() || !locationForm.state.trim()) {
      setLocationError("City and State are required.");
      return;
    }

    setSavingLocation(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/me/address`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...locationForm,
          street: locationForm.street.trim(),
          city: locationForm.city.trim(),
          state: locationForm.state.trim(),
          pincode: locationForm.pincode.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save your location.");
      }

      await refreshUser();
      setLocationMessage("Your location has been saved successfully.");
    } catch (error) {
      setLocationError(error.message || "Unable to save your location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSignOut = async () => {

    setLoggingOut(true);



    try {

      await logout();

      navigate("/login?role=CUSTOMER");

    } catch (error) {

      console.error("Logout error:", error);

    } finally {

      setLoggingOut(false);

    }

  };



  const activeBookingsCount = requests.filter(

    (r) => r.status === "PENDING"

  ).length;



  const connectedProfessionalsCount = requests.filter(

    (r) => r.status === "ACCEPTED" || r.status === "HIRED" || r.status === "COMPLETED"

  ).length;



  const completedServicesCount = requests.filter(

    (r) => r.status === "COMPLETED"

  ).length;



  const activityItems = [

    {

      label: "Connected Professionals",

      value: loadingSaved ? "..." : String(connectedProfessionalsCount),

      description: "Your active network & partners",

      icon: "🤝",

      color: "bg-indigo-50 text-indigo-700",

      route: "/connections?tab=professionals",

      restricted: false,

    },

    {

      label: "Active Requests",

      value: loadingSaved ? "..." : String(activeBookingsCount),

      description: "Pending requests awaiting response",

      icon: "📅",

      color: "bg-blue-50 text-blue-700",

      route: "/customer/active-requests",

      restricted: true,

    },

    {

      label: "Completed Services",

      value: loadingSaved ? "..." : String(completedServicesCount),

      description: "Your service history",

      icon: "✓",

      color: "bg-emerald-50 text-emerald-700",

      restricted: false,

    },

    {

      label: "Saved Professionals",

      value: loadingSaved ? "..." : String(savedProfessionals.length),

      description: "Your favorite professionals",

      icon: "♡",

      color: "bg-violet-50 text-violet-700",

      route: "/customer/saved-professionals",

      restricted: true,

    },

  ];



  const services = [

    {

      name: "Web Development",

      description: "Websites & web apps",

      icon: "💻",

      color: "bg-blue-50",

    },

    {

      name: "Graphic Design",

      description: "Branding & creatives",

      icon: "🎨",

      color: "bg-violet-50",

    },

    {

      name: "Video Editing",

      description: "Videos & short-form content",

      icon: "🎬",

      color: "bg-rose-50",

    },

    {

      name: "Digital Marketing",

      description: "SEO & social media",

      icon: "📈",

      color: "bg-emerald-50",

    },

    {

      name: "Content Writing",

      description: "Blogs & website copy",

      icon: "✍️",

      color: "bg-amber-50",

    },

    {

      name: "UI/UX Design",

      description: "App & website experiences",

      icon: "🖌️",

      color: "bg-indigo-50",

    },

  ];



  return (

    <div className="flex min-h-screen flex-col bg-slate-50">

      <Navbar />



      <main className="flex-1">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">



          {/* Welcome banner */}

          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-9 lg:p-10">

            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />



            <div className="pointer-events-none absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-white/5" />



            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div className="max-w-2xl">

                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">

                  <span>👤</span>

                  Customer Dashboard

                </span>



                <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">

                  Welcome back, {user?.name || "Customer"}!

                </h1>



                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">

                  Find trusted professionals, explore services, and keep

                  track of your service journey in one place.

                </p>

              </div>



              <Link

                to="/professionals"

                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"

              >

                Find Professionals

                <span aria-hidden="true">→</span>

              </Link>

            </div>

          </section>



          {/* Dashboard metrics */}

          <section className="mt-8">

            <div className="mb-4">

              <h2 className="text-xl font-bold text-slate-900">

                Your Activity

              </h2>



              <p className="mt-1 text-sm text-slate-500">

                A quick overview of your account.

              </p>

            </div>



            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

              {activityItems.map((item) => {

                const isLocked =

                  isCustomer &&

                  item.restricted &&

                  !canAccessCustomerFeatures;



                return (

                  <div

                    key={item.label}

                    onClick={

                      item.route && !isLocked

                        ? () => navigate(item.route)

                        : undefined

                    }

                    aria-disabled={isLocked}

                    title={

                      isLocked

                        ? "Active subscription required"

                        : ""

                    }

                    className={`rounded-2xl border p-5 sm:p-6 ${

                      isLocked

                        ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"

                        : item.route

                          ? "cursor-pointer border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"

                          : "border-slate-200 bg-white shadow-sm"

                    }`}

                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-sm font-medium text-slate-500">

                          {item.label}

                        </p>



                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">

                          {item.value}

                        </p>



                        <p className="mt-2 text-xs text-slate-400">

                          {item.description}

                        </p>

                      </div>



                      <div className="flex items-center gap-2">

                        {isLocked && <span>🔒</span>}



                        <span

                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${item.color}`}

                        >

                          {item.icon}

                        </span>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </section>



          {/* Main content */}

          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">



            {/* Account overview */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">

                  👤

                </div>



                <div>

                  <h2 className="font-bold text-slate-900">

                    Account Overview

                  </h2>



                  <p className="mt-0.5 text-xs text-slate-500">

                    Your profile information

                  </p>

                </div>

              </div>



{/* Profile Picture */}

<div className="flex flex-col items-center border-b border-slate-100 pb-6">

  <ProfilePicture

    size="xl"

    editable={true}

    showRemove={true}

  />



  <h3 className="mt-3 text-base font-bold text-slate-900">

    {user?.name || "Customer"}

  </h3>



  <p className="mt-1 text-xs text-slate-500">

    Your Profile Picture

  </p>

</div>



              <div className="mt-6 space-y-4">

                <div className="border-b border-slate-100 pb-3">

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">

                    Full Name

                  </p>



                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">

                    {user?.name || "Not provided"}

                  </p>

                </div>



                <div className="border-b border-slate-100 pb-3">

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">

                    Email Address

                  </p>



                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">

                    {user?.email || "Not provided"}

                  </p>

                </div>



                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">

                      Account Role

                    </p>



                    <p className="mt-1 text-sm font-semibold text-slate-800">

                      {user?.role || "CUSTOMER"}

                    </p>

                  </div>



                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">

                    Customer

                  </span>

                </div>



                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">

                      Email Status

                    </p>



                    <p className="mt-1 text-sm font-semibold text-slate-800">

                      {user?.is_verified

                        ? "Verified"

                        : "Pending verification"}

                    </p>

                  </div>



                  <span

                    className={`rounded-full px-3 py-1 text-xs font-semibold ${

                      user?.is_verified

                        ? "bg-emerald-50 text-emerald-700"

                        : "bg-amber-50 text-amber-700"

                    }`}

                  >

                    {user?.is_verified ? "✓ Verified" : "Pending"}

                  </span>

                </div>

              </div>



              {/* Customer location for Nearby Professionals map */}
              <form onSubmit={handleSaveLocation} className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">Your Location</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Save your city and current coordinates so professionals can find your approximate location on the map. Your full street address will not be shown on the map.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="customer-street" className="mb-1 block text-xs font-medium text-slate-600">Street / Area (optional)</label>
                    <input id="customer-street" name="street" type="text" value={locationForm.street} onChange={handleLocationInputChange} placeholder="Street or area" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="customer-city" className="mb-1 block text-xs font-medium text-slate-600">City *</label>
                      <input id="customer-city" name="city" type="text" required value={locationForm.city} onChange={handleLocationInputChange} placeholder="Enter city" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label htmlFor="customer-state" className="mb-1 block text-xs font-medium text-slate-600">State *</label>
                      <input id="customer-state" name="state" type="text" required value={locationForm.state} onChange={handleLocationInputChange} placeholder="Enter state" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customer-pincode" className="mb-1 block text-xs font-medium text-slate-600">Pincode (optional)</label>
                    <input id="customer-pincode" name="pincode" type="text" inputMode="numeric" value={locationForm.pincode} onChange={handleLocationInputChange} placeholder="Enter pincode" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>

                  <button type="button" onClick={handleGetCurrentLocation} disabled={locating} className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                    {locating ? "Detecting location..." : "◎ Use Current Location"}
                  </button>

                  {locationForm.latitude != null && locationForm.longitude != null && (
                    <p className="text-xs text-slate-500">
                      Coordinates detected: {locationForm.latitude.toFixed(5)}, {locationForm.longitude.toFixed(5)}
                    </p>
                  )}

                  {locationError && <p role="alert" className="text-sm text-red-600">{locationError}</p>}
                  {locationMessage && <p role="status" className="text-sm text-emerald-700">{locationMessage}</p>}

                  <button type="submit" disabled={savingLocation || locating} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {savingLocation ? "Saving Location..." : "Save Location"}
                  </button>
                </div>
              </form>


              <button
                type="button"
                disabled={loggingOut}

                onClick={handleSignOut}

                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"

              >

                <span aria-hidden="true">↪</span>

                {loggingOut ? "Signing out..." : "Sign Out"}

              </button>

            </div>



            {/* Services */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 sm:p-7">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-xl font-bold text-slate-900">

                    Explore Services

                  </h2>



                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    Discover categories and find a professional for your needs.

                  </p>

                </div>



                {canAccessCustomerFeatures ? (

                  <Link

                    to="/services"

                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"

                  >

                    All services <span aria-hidden="true">→</span>

                  </Link>

                ) : (

                  <span

                    aria-disabled="true"

                    title="Active subscription required"

                    className="cursor-not-allowed text-sm font-semibold text-slate-400"

                  >

                    All services 🔒

                  </span>

                )}

              </div>



              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

                {services.map((item) => (

                  <button

                    key={item.name}

                    type="button"

                    disabled={!canAccessCustomerFeatures}

                    onClick={() => navigate("/professionals")}

                    title={

                      !canAccessCustomerFeatures

                        ? "Active subscription required"

                        : ""

                    }

                    className={`group flex items-center gap-3 rounded-xl border p-4 text-left ${

                      canAccessCustomerFeatures

                        ? "border-slate-200 transition hover:border-blue-300 hover:bg-blue-50/50"

                        : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"

                    }`}

                  >

                    <span

                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${item.color}`}

                    >

                      {item.icon}

                    </span>



                    <span className="min-w-0 flex-1">

                      <span className="block text-sm font-semibold text-slate-800">

                        {item.name}

                      </span>



                      <span className="mt-1 block text-xs text-slate-400">

                        {item.description}

                      </span>

                    </span>



                    {canAccessCustomerFeatures ? (

                      <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">

                        →

                      </span>

                    ) : (

                      <span>🔒</span>

                    )}

                  </button>

                ))}

              </div>



              {/* Browse professionals */}

              <div className="mt-6 rounded-xl bg-slate-50 p-4 sm:flex sm:items-center sm:justify-between">

                <div>

                  <p className="font-semibold text-slate-800">

                    Ready to get started?

                  </p>



                  <p className="mt-1 text-sm text-slate-500">

                    Browse professionals and explore available services.

                  </p>

                </div>



                <Link

                  to="/professionals"

                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:mt-0"

                >

                  Browse Professionals

                </Link>

              </div>

            </div>

          </section>

        </div>

      </main>



      <Footer />

    </div>

  );

}
