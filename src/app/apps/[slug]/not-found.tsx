import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 text-center shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase text-[#096b68]">
          Daily Apps Lab
        </p>
        <h1 className="mt-4 text-3xl font-bold text-ink">App not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          That mini-app is not registered in the app library.
        </p>
        <Link
          href="/apps"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#25314a]"
        >
          Back to apps
        </Link>
      </section>
    </main>
  );
}
