import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SigninForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign in"
};

export default async function SigninPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/apps");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
        <Link href="/" className="text-sm font-semibold text-[#096b68]">
          Daily Apps Lab
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Sign in to reach your apps dashboard.
        </p>
        <div className="mt-8">
          <SigninForm />
        </div>
      </section>
    </main>
  );
}
