"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import type { AuthFormState } from "@/lib/validation";
import { signupSchema } from "@/lib/validation";

export async function signupAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true }
  });

  if (existingUser) {
    return {
      status: "error",
      message: "An account with that email already exists.",
      fieldErrors: {
        email: ["Use a different email or sign in instead."]
      }
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user: { id: string };

  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name || null,
        passwordHash
      },
      select: { id: true }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: "An account with that email already exists.",
        fieldErrors: {
          email: ["Use a different email or sign in instead."]
        }
      };
    }

    throw error;
  }

  await setSessionCookie(user.id);
  redirect("/apps");
}
