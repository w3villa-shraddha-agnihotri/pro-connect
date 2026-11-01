
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ user: propUser = null, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const {
    user: authUser,
    logout: authLogout,
    hasActiveSubscription,
    subscriptionLoading,
  } = useAuth();

  const user = propUser || authUser;
  const isLoggedIn = Boolean(user);
  const role = user?.role?.toUpperCase();

  const isCustomer = role === "CUSTOMER";
  const isProfessional = role === "PROFESSIONAL";

  const isCustomerFeatureLocked =
    isCustomer && (subscriptionLoading || !hasActiveSubscription);

  const isProfessionalFeatureLocked =
    isProfessional && (subscriptionLoading || !hasActiveSubscription);

  const handleLogout = async () => {
    const currentRole =
      role === "PROFESSIONAL" ? "PROFESSIONAL" : "CUSTOMER";

    if (onLogout) {
      await onLogout();
    } else if (authLogout) {
      await authLogout();
    }

    setMenuOpen(false);
    navigate(`/login?role=${currentRole}`);
  };

  const handleNavClick = (e, to) => {
    setMenuOpen(false);

    if (typeof to !== "string" || !to.includes("#")) {
      return;
    }

    const [path, hash] = to.split("#");
    const currentPath = window.location.pathname;

    if (!path || path === currentPath) {
      const element = document.getElementById(hash);

      if (element) {
        e.preventDefault();

        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.history.pushState(null, "", `#${hash}`);
      }
    }
  };

  const publicLinks = [
    { label: "Home", to: "/" },
    { label: "Professionals", to: "/professionals" },
    { label: "How It Works", to: "/#how-it-works" },
    { label: "Services", to: "/#services" },
    { label: "About", to: "/#about" },
  ];

  const roleLinks =
    role === "PROFESSIONAL"
      ? [
          {
            label: "Dashboard",
            to: "/professional/dashboard",
          },
          {
            label: "My Services",
            to: "/professional/dashboard#my-services",
            locked: isProfessionalFeatureLocked,
          },
          {
            label: "My Bookings",
            to: "/professional/my-bookings",
            locked: isProfessionalFeatureLocked,
          },
          {
            label: "Subscription Plans",
            to: "/subscription-plans",
          },
          {
            label: "My Subscription",
            to: "/my-subscription",
          },
        ]
      : [
          { label: "Dashboard", to: "/customer/dashboard" },
          {
            label: "My Connections",
            to: "/connections?tab=professionals",
          },
          {
            label: "Hired Professionals",
            to: "/customer/bookings",
            locked: isCustomerFeatureLocked,
          },
          {
            label: "Subscription Plans",
            to: "/subscription-plans",
          },
          {
            label: "My Subscription",
            to: "/my-subscription",
          },
        ];

  const links = isLoggedIn ? roleLinks : publicLinks;

  const renderNavLink = (link, mobile = false) => {
    if (link.locked) {
      return (
        <span
          key={link.to}
          title="Active subscription required"
          aria-disabled="true"
          className={`cursor-not-allowed select-none text-sm font-medium text-slate-400 ${
            mobile ? "block" : ""
          }`}
        >
          {link.label} 🔒
        </span>
      );
    }

    return (
      <Link
        key={link.to}
        to={link.to}
        onClick={(e) => handleNavClick(e, link.to)}
        className={
          mobile
            ? "text-sm font-medium text-[var(--text-primary)] hover:text-[var(--primary)]"
            : "text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        }
      >
        {link.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-lg font-bold text-white">
            P
          </div>

          <span className="text-xl font-bold tracking-tight">
            Pro<span className="text-[var(--primary)]">Connect</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => renderNavLink(link))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-dark)]"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="max-w-36 truncate text-sm font-medium text-[var(--text-primary)]">
                  {user.name || user.email}
                </span>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    role === "PROFESSIONAL"
                      ? "border border-purple-200 bg-purple-50 text-purple-700"
                      : "border border-blue-200 bg-blue-50 text-blue-700"
                  }`}
                >
                  {role === "PROFESSIONAL" ? "Professional" : "Customer"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--border)] bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((link) => renderNavLink(link, true))}

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-[var(--text-primary)]"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="break-all text-sm font-medium text-[var(--text-primary)]">
                    {user.name || user.email}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      role === "PROFESSIONAL"
                        ? "border border-purple-200 bg-purple-50 text-purple-700"
                        : "border border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {role === "PROFESSIONAL" ? "Professional" : "Customer"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="self-start text-sm font-semibold text-red-600"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
