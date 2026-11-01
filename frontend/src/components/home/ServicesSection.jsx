
import { Link } from "react-router-dom";

const services = [
  {
    icon: "💻",
    title: "Web Development",
    description:
      "Build responsive websites, web applications, and powerful digital experiences.",
    color: "bg-blue-50",
    iconColor: "text-blue-700",
  },
  {
    icon: "🎨",
    title: "Graphic Design",
    description:
      "Create memorable logos, brand identities, and engaging visual content.",
    color: "bg-violet-50",
    iconColor: "text-violet-700",
  },
  {
    icon: "🎬",
    title: "Video Editing",
    description:
      "Turn raw footage into engaging videos, reels, and promotional content.",
    color: "bg-rose-50",
    iconColor: "text-rose-700",
  },
  {
    icon: "📈",
    title: "Digital Marketing",
    description:
      "Grow your online presence through SEO and social media campaigns.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
  {
    icon: "✍️",
    title: "Content Writing",
    description:
      "Get compelling website copy, blog posts, and professional content.",
    color: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    icon: "🖌️",
    title: "UI/UX Design",
    description:
      "Design intuitive interfaces and user-friendly digital products.",
    color: "bg-indigo-50",
    iconColor: "text-indigo-700",
  },
];

function ServicesSection() {
  return (
    <section
      id="services"
      className="scroll-mt-24 bg-slate-50 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Explore the Marketplace
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Find the right talent for{" "}
            <span className="text-blue-600">your next project</span>
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg">
            From development to creative work, connect with independent
            digital professionals who can bring your ideas to life.
          </p>
        </div>

        {/* Service Cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl sm:p-7"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${service.color} ${service.iconColor}`}
                >
                  {service.icon}
                </div>

                <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
                  ↗
                </span>
              </div>

              <h3 className="mt-6 text-xl font-bold text-slate-900 transition group-hover:text-blue-700">
                {service.title}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">
                {service.description}
              </p>

              <Link
                to="/professionals"
                className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-800"
              >
                Explore professionals
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-blue-100 bg-white p-6 text-center sm:flex-row sm:p-8 sm:text-left">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Have a project in mind?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Discover skilled freelancers for your next big idea.
            </p>
          </div>

          <Link
            to="/professionals"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Find a Professional
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
