import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/auth";

type AppShellProps = {
  user: AuthUser;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const displayName = user.name || user.email;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/apps" className="text-lg font-bold text-ink">
            Daily Apps Lab
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{displayName}</span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-ink hover:bg-[#f6f8fb]"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
