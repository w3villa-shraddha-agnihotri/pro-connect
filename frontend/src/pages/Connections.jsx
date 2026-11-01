import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const STATUS_BADGES = {
  ACCEPTED: {
    label: "Connected (Accepted)",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200",
    dot: "bg-emerald-500",
  },
  HIRED: {
    label: "Active Booking (Hired)",
    badge: "bg-blue-50 text-blue-700 ring-blue-200 border-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Service Completed",
    badge: "bg-purple-50 text-purple-700 ring-purple-200 border-purple-200",
    dot: "bg-purple-500",
  },
};

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = (user?.role || "").toUpperCase();
  const isProfessional = role === "PROFESSIONAL";

  // Tab: 'professionals' or 'customers'
  const initialTab =
    searchParams.get("tab") || (isProfessional ? "customers" : "professionals");
  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [connectedProfessionals, setConnectedProfessionals] = useState([]);
  const [connectedCustomers, setConnectedCustomers] = useState([]);

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Remove connection modal state
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/connections/connected`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load connections.");
      }

      setConnectedProfessionals(data.connectedProfessionals || []);
      setConnectedCustomers(data.connectedCustomers || []);
    } catch (err) {
      console.error("Load connections error:", err);
      setError(err.message || "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Remove Connection Handler
  const handleRemoveConnection = async () => {
    if (!confirmTarget) return;

    setRemovingId(confirmTarget.id);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/connections/${confirmTarget.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove connection.");
      }

      // Remove from state immediately
      setConnectedProfessionals((prev) =>
        prev.filter((c) => c.id !== confirmTarget.id)
      );
      setConnectedCustomers((prev) =>
        prev.filter((c) => c.id !== confirmTarget.id)
      );

      const removedName =
        confirmTarget.connected_user?.name || "The selected contact";

      setSuccessMessage(
        `Connection with ${removedName} has been removed. You are now disconnected, and you can find each other again in suggestions.`
      );
      setConfirmTarget(null);
    } catch (err) {
      console.error("Remove connection error:", err);
      setError(err.message || "Failed to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const downloadAttachment = async (connection) => {
    if (!connection.attachment_url) return;

    try {
      const response = await fetch(`${API_URL}${connection.attachment_url}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to download document.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;

      const filename =
        connection.attachment_url.split("/").pop() || "attachment.pdf";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err.message || "Failed to download document.");
    }
  };

  // Filter current list
  const currentList =
    activeTab === "professionals"
      ? connectedProfessionals
      : connectedCustomers;

  const filteredConnections = useMemo(() => {
    return currentList.filter((conn) => {
      const userObj = conn.connected_user || {};
      const name = (userObj.name || "").toLowerCase();
      const email = (userObj.email || "").toLowerCase();
      const address = (userObj.address || "").toLowerCase();
      const domain = (
        userObj.professional_profile?.domain || ""
      ).toLowerCase();
      const skills = (conn.skills || []).join(" ").toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        address.includes(query) ||
        domain.includes(query) ||
        skills.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || conn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [currentList, searchQuery, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link
              to={
                isProfessional
                  ? "/professional/dashboard"
                  : "/customer/dashboard"
              }
              className="hover:text-indigo-600"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Connections</span>
          </div>

          {/* Header Banner */}
          <div className="mt-4 flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
                🤝 Network & Partnerships
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                My Connections
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                View and manage all your connected professionals and customers.
                Stay in touch, review shared project requirements, or disconnect
                anytime.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadConnections}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20 disabled:opacity-50"
              >
                <span>↻</span>
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              {isProfessional ? (
                <Link
                  to="/professional/find-customers"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-slate-100"
                >
                  Find Customers →
                </Link>
              ) : (
                <Link
                  to="/professionals"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-slate-100"
                >
                  Find Professionals →
                </Link>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="font-bold hover:text-red-900"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="font-bold hover:text-emerald-950"
              >
                ×
              </button>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Total Connected
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  👥
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {connectedProfessionals.length + connectedCustomers.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Active accepted connections
              </p>
            </div>

            <div
              onClick={() => handleTabChange("professionals")}
              className={`cursor-pointer rounded-2xl border p-5 shadow-xs transition hover:border-blue-300 ${
                activeTab === "professionals"
                  ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Connected Professionals
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  💼
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-blue-700">
                {connectedProfessionals.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Verified expert service partners
              </p>
            </div>

            <div
              onClick={() => handleTabChange("customers")}
              className={`cursor-pointer rounded-2xl border p-5 shadow-xs transition hover:border-purple-300 ${
                activeTab === "customers"
                  ? "border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Connected Customers
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  🙋
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-purple-700">
                {connectedCustomers.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Clients who partnered with you
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Active Bookings
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  ⚡
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-emerald-700">
                {[...connectedProfessionals, ...connectedCustomers].filter(
                  (c) => c.status === "HIRED"
                ).length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Currently engaged services
              </p>
            </div>
          </div>

          {/* Tab Navigation & Controls */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Tab Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("professionals")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    activeTab === "professionals"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>💼 Connected Professionals</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      activeTab === "professionals"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {connectedProfessionals.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("customers")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    activeTab === "customers"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>🙋 Connected Customers</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      activeTab === "customers"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {connectedCustomers.length}
                  </span>
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "All Statuses", value: "ALL" },
                  { label: "Connected", value: "ACCEPTED" },
                  { label: "Hired", value: "HIRED" },
                  { label: "Completed", value: "COMPLETED" },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatusFilter(f.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === f.value
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab} by name, city, skill, domain...`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {filteredConnections.length}
                </span>{" "}
                of {currentList.length} {activeTab}
              </p>
            </div>
          </div>

          {/* Connection Cards Grid */}
          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-5 w-40 rounded bg-slate-200" />
                        <div className="h-4 w-28 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="h-4 w-full rounded bg-slate-100" />
                      <div className="h-4 w-3/4 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                  {activeTab === "professionals" ? "💼" : "🙋"}
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {currentList.length === 0
                    ? `No connected ${activeTab} yet`
                    : `No matching ${activeTab} found`}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {currentList.length === 0
                    ? activeTab === "professionals"
                      ? "Explore top verified professionals and send connection requests to collaborate on your projects."
                      : "Connect with prospective customers or review incoming client requests to build your client list."
                    : "Try adjusting your search criteria or resetting status filters."}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {searchQuery || statusFilter !== "ALL" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                      }}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear Filters
                    </button>
                  ) : activeTab === "professionals" ? (
                    <Link
                      to="/professionals"
                      className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Explore Professionals
                    </Link>
                  ) : (
                    <Link
                      to="/professional/find-customers"
                      className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Discover Customers
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredConnections.map((conn) => {
                  const targetUser = conn.connected_user || {};
                  const isTargetProfessional =
                    conn.connected_user_role === "PROFESSIONAL";
                  const profile = targetUser.professional_profile || {};
                  const statusInfo = STATUS_BADGES[conn.status] || {
                    label: conn.status,
                    badge: "bg-slate-100 text-slate-700 border-slate-200",
                    dot: "bg-slate-400",
                  };

                  return (
                    <article
                      key={conn.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div>
                        {/* Top Profile Bar */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {targetUser.profile_image ? (
                              <img
                                src={targetUser.profile_image}
                                alt={targetUser.name}
                                className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover shadow-xs"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-xs ${
                                  isTargetProfessional
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {targetUser.name?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">
                                  {targetUser.name || "User"}
                                </h3>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    isTargetProfessional
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                                >
                                  {isTargetProfessional
                                    ? "Professional"
                                    : "Customer"}
                                </span>
                              </div>

                              <p className="mt-0.5 text-sm font-medium text-slate-600">
                                {profile.domain ||
                                  (isTargetProfessional
                                    ? "Professional Expert"
                                    : "Registered Client")}
                              </p>

                              {targetUser.address && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                  <span>📍</span>
                                  <span>{targetUser.address}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`}
                            />
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Experience & Bio if Professional */}
                        {isTargetProfessional &&
                          profile.experience_years != null && (
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="rounded-md bg-slate-100 px-2 py-1">
                                ⏱️ {profile.experience_years} years experience
                              </span>
                            </div>
                          )}

                        {profile.bio && (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                            {profile.bio}
                          </p>
                        )}

                        {/* Description Message from Request */}
                        {conn.description && (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs">
                            <p className="font-semibold text-slate-600">
                              Shared Note / Requirements:
                            </p>
                            <p className="mt-1 line-clamp-3 text-slate-600">
                              "{conn.description}"
                            </p>
                          </div>
                        )}

                        {/* Skill Tags */}
                        {conn.skills && conn.skills.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {conn.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Attachment Download */}
                        {conn.attachment_url && (
                          <button
                            type="button"
                            onClick={() => downloadAttachment(conn)}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>📎</span>
                            <span>Download Shared Document</span>
                          </button>
                        )}

                        {/* Contact info */}
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {targetUser.email && (
                              <span className="flex items-center gap-1">
                                <span>✉️</span>
                                <span className="font-medium text-slate-700">
                                  {targetUser.email}
                                </span>
                              </span>
                            )}
                            {targetUser.phone && (
                              <span className="flex items-center gap-1">
                                <span>📞</span>
                                <span className="font-medium text-slate-700">
                                  {targetUser.phone}
                                </span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span>📅</span>
                              <span>Connected: {formatDate(conn.created_at)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        {isTargetProfessional ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/professionals/${targetUser.id}`)
                            }
                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <span>View Profile</span>
                            <span>→</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Direction:{" "}
                            {conn.direction === "CUSTOMER_TO_PROFESSIONAL"
                              ? "Initiated by Customer"
                              : "Initiated by You"}
                          </span>
                        )}

                        {/* Remove Connection Button */}
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(conn)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100/80"
                        >
                          <span>🗑️</span>
                          <span>Remove Connection</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Confirm Remove Connection */}
        {confirmTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-600">
                ⚠️
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Remove Connection?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Are you sure you want to remove your connection with{" "}
                <span className="font-bold text-slate-900">
                  {confirmTarget.connected_user?.name || "this user"}
                </span>
                ?
              </p>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs leading-5 text-amber-900">
                <p className="font-semibold">💡 What happens next:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>Both of you will be completely disconnected.</li>
                  <li>
                    This profile will immediately reappear in suggestions &
                    explore searches.
                  </li>
                  <li>
                    Either party will be free to send a new connection request in
                    the future.
                  </li>
                  <li>Historical activity records are preserved safely.</li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  disabled={removingId != null}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRemoveConnection}
                  disabled={removingId != null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  {removingId ? "Removing..." : "Yes, Remove Connection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
