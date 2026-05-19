"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { initialAuthFormState } from "@/lib/validation";
import { signupAction } from "./actions";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-sm text-[#b42318]">{errors[0]}</p>;
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div className="rounded-md border border-[#fecdca] bg-[#fffbfa] px-4 py-3 text-sm text-[#b42318]">
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-ink">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-[#d9e4ff]"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

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
          autoComplete="new-password"
          className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-[#d9e4ff]"
          required
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-semibold text-ink"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-[#d9e4ff]"
          required
        />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </div>

      <SubmitButton pendingLabel="Creating account...">Sign up</SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
