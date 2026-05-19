import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth";
import { dailyApps } from "@/lib/apps";

export const metadata: Metadata = {
  title: "Apps"
};

export default async function AppsPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell user={user}>
      <section>
        <p className="text-sm font-semibold uppercase text-[#096b68]">
          Apps dashboard
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-ink">Daily apps</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Pick a tool from the shared library. Each future app can save
              account-scoped records without becoming a separate service.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {dailyApps.map((app) => (
          <Link
            key={app.slug}
            href={`/apps/${app.slug}`}
            className="group rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#096b68] hover:shadow-soft"
          >
            <div className="flex min-h-36 flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">{app.name}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {app.description}
                </p>
              </div>
              <span className="mt-5 text-sm font-semibold text-[#096b68]">
                Open app
              </span>
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
