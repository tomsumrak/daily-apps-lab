import Link from "next/link";

const features = [
  {
    title: "One login",
    description: "Sign in once and move between every small app in the library."
  },
  {
    title: "Saved data",
    description: "Future app records are scoped to your account and app."
  },
  {
    title: "Growing app library",
    description: "New tools can be added under the same dashboard and routes."
  },
  {
    title: "Simple experiments",
    description: "Useful mini-apps can start small without becoming separate products."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_430px]">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase text-[#096b68]">
            Daily Apps Lab
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] text-ink sm:text-6xl">
            Small useful apps under one account.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            A shared home for practical daily tools, saved data, and lightweight
            experiments that all live inside one full-stack app platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#25314a]"
            >
              Sign up
            </Link>
            <Link
              href="/signin"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
            >
              Sign in
            </Link>
            <Link
              href="/apps"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#b7d7d3] bg-[#ebf7f5] px-5 py-3 text-sm font-semibold text-[#096b68] transition hover:border-[#096b68]"
            >
              View apps
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="rounded-md border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Apps dashboard</p>
                <p className="text-xs text-muted">Four starter experiments</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-[#14b8a6]" />
            </div>
            <div className="grid gap-3 p-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-md border border-line bg-[#fbfcfd] p-4"
                >
                  <h2 className="text-base font-semibold text-ink">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
