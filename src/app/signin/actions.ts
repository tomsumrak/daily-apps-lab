"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AuthFormState } from "@/lib/validation";
import { signinSchema } from "@/lib/validation";

const GENERIC_SIGNIN_ERROR = "Email or password is incorrect.";

export async function signinAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter your email and password.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (!user) {
    return {
      status: "error",
      message: GENERIC_SIGNIN_ERROR
    };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return {
      status: "error",
      message: GENERIC_SIGNIN_ERROR
    };
  }

  await setSessionCookie(user.id);
  redirect("/apps");
}
