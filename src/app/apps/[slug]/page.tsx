import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { countAppRecords } from "@/lib/app-records";
import { getDailyApp } from "@/lib/apps";
import { requireCurrentUser } from "@/lib/auth";

type AppDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: AppDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const app = getDailyApp(slug);

  return {
    title: app ? app.name : "App not found"
  };
}

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const user = await requireCurrentUser();
  const { slug } = await params;
  const app = getDailyApp(slug);

  if (!app) {
    notFound();
  }

  const recordCount = await countAppRecords({
    userId: user.id,
    appSlug: app.slug
  });

  return (
    <AppShell user={user}>
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8">
        <Link href="/apps" className="text-sm font-semibold text-[#096b68]">
          Back to apps
        </Link>
        <h1 className="mt-5 text-4xl font-bold text-ink">{app.name}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {app.description}
        </p>
        <div className="mt-8 rounded-md border border-dashed border-[#b7d7d3] bg-[#f4fbfa] p-5">
          <p className="text-base font-semibold text-ink">
            This app is coming soon.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The shared routing, authentication, and database foundation is ready
            for this mini-app to start storing account-scoped records.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#096b68]">
            Saved records for this app: {recordCount}
          </p>
        </div>
      </section>
    </AppShell>
  );
}
