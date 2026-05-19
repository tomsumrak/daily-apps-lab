"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { initialAuthFormState } from "@/lib/validation";
import { signinAction } from "./actions";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-sm text-[#b42318]">{errors[0]}</p>;
}

export function SigninForm() {
  const [state, formAction] = useActionState(signinAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div className="rounded-md border border-[#fecdca] bg-[#fffbfa] px-4 py-3 text-sm text-[#b42318]">
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-[#d9e4ff]"
          required
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-ink"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-[#d9e4ff]"
          required
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>

      <p className="text-center text-sm text-muted">
        Need an account?{" "}
        <Link href="/signup" className="font-semibold text-ink hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
