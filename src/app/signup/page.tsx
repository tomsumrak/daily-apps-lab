import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign up"
};

export default async function SignupPage() {
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
        <h1 className="mt-4 text-3xl font-bold text-ink">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use one account for every daily app in the lab.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}
