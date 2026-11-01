
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer id="about" className="border-t border-[var(--border)] bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <Link to="/" className="text-xl font-bold tracking-tight">
              Pro<span className="text-[var(--primary)]">Connect</span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
              Connecting customers with trusted professionals for their
              projects, services and everyday needs.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Platform
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  to="/professionals"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  Find Professionals
                </Link>
              </li>

              <li>
                <Link
                  to="/signup?role=PROFESSIONAL"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  Join as Professional
                </Link>
              </li>

              <li>
                <Link
                  to="/pricing"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Company
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="/#about"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  About Us
                </a>
              </li>

              <li>
                <a
                  href="/#how-it-works"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  How It Works
                </a>
              </li>

              <li>
                <Link
                  to="/faq"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Account
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  to="/login"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  Login
                </Link>
              </li>

              <li>
                <Link
                  to="/signup"
                  className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 ProConnect. All rights reserved.
          </p>

          <div className="flex gap-5">
            <Link
              to="/privacy"
              className="text-sm text-[var(--text-muted)] transition hover:text-[var(--primary)]"
            >
              Privacy
            </Link>

            <Link
              to="/terms"
              className="text-sm text-[var(--text-muted)] transition hover:text-[var(--primary)]"
            >
              Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
