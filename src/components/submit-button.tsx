"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
};

export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#25314a] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
