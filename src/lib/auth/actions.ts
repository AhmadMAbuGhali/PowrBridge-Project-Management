"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/config";
import { registerUser } from "@/lib/auth/register";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const callbackUrl = String(formData.get("callbackUrl") || "/app");
  const redirectTo =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/app";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return { success: true };
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await registerUser(parsed.data);
  } catch (error) {
    logger.error("register_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create your account",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }

  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
