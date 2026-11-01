
import { Link } from "react-router-dom";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">

        {/* Left Content */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-[var(--primary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            Connect. Collaborate. Grow.
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            Find the right{" "}
            <span className="text-[var(--primary)]">
              professional
            </span>{" "}
            for your needs.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            ProConnect makes it easier to discover trusted professionals,
            explore their expertise, and connect with the right person for
            your project or service needs.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/professionals"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[var(--primary-dark)]"
            >
              Find a Professional
              <span className="ml-2">→</span>
            </Link>

            <Link
              to="/signup?role=PROFESSIONAL"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-white px-6 py-3.5 font-semibold text-[var(--text-primary)] transition hover:bg-slate-50"
            >
              Join as a Professional
            </Link>
          </div>

          {/* Trust Points */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--text-muted)]">
            <span>✓ Professional Profiles</span>
            <span>✓ Easy Discovery</span>
            <span>✓ Secure Platform</span>
          </div>
        </div>

        {/* Right Visual */}
        <div className="relative">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-100 blur-3xl" />

          <div className="relative rounded-2xl border border-[var(--border)] bg-slate-50 p-5 shadow-xl">

            {/* Search Card */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-sm font-medium text-[var(--text-muted)]">
                  What are you looking for?
                </p>

                <div className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3">
                  <span className="text-lg">⌕</span>

                  <span className="text-sm text-[var(--text-muted)]">
                    Search professionals...
                  </span>
                </div>
              </div>

              {/* Professional */}
              <div className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-semibold text-[var(--primary)]">
                    AK
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      Aman Kumar
                    </h3>

                    <p className="text-sm text-[var(--text-muted)]">
                      Full Stack Developer
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    Available
                  </span>
                </div>

                {/* Skills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs">
                    React
                  </span>

                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs">
                    Node.js
                  </span>

                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs">
                    PostgreSQL
                  </span>
                </div>

                <button className="mt-4 w-full rounded-lg bg-[var(--primary-light)] py-2.5 text-sm font-semibold text-[var(--primary)]">
                  View Profile
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold">
                  500+
                </p>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Professionals
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold">
                  10+
                </p>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Service Categories
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

export default HeroSection;
