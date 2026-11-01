
const steps = [
  {
    number: "01",
    title: "Find a Professional",
    description:
      "Search and discover professionals based on your requirements.",
  },
  {
    number: "02",
    title: "View Their Profile",
    description:
      "Explore their skills, experience, services and professional details.",
  },
  {
    number: "03",
    title: "Connect & Get Started",
    description:
      "Choose the right professional and start working together.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-[var(--border)] bg-white scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
            Simple Process
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            How ProConnect works
          </h2>

          <p className="mt-4 text-[var(--text-secondary)]">
            Find the right professional in just a few simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative text-center"
            >
              {/* Number */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] font-bold text-white">
                {step.number}
              </div>

              {/* Title */}
              <h3 className="mt-5 text-lg font-semibold">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default HowItWorks;
