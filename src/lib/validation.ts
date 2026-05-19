import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().trim().max(80, "Name must be 80 characters or fewer."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string()
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords must match.",
        path: ["confirmPassword"]
      });
    }
  });

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Enter your password.")
});

export type AuthFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialAuthFormState: AuthFormState = {
  status: "idle"
};
