"use server";

import type { Prisma } from "@prisma/client";
import { DataForSeoClient } from "@/lib/seo/dataforseo";
import {
  encryptCredentials,
  maskLogin,
  type DataForSeoCredentials
} from "@/lib/seo/credentials";
import { runSeoRefreshStep } from "@/lib/seo/refresh";
import {
  seoSettingsSchema,
  type SeoSettingsInput
} from "@/lib/seo/settings";
import {
  getSeoCredentialsStatus,
  getSeoDashboardData,
  saveSeoCredentialsRecord,
  upsertSeoSingleton
} from "@/lib/seo/storage";
import type {
  SeoActionResult,
  SeoDashboardData,
  SeoRefreshStep
} from "@/lib/seo/types";
import { requireCurrentUser } from "@/lib/auth";

type SaveSeoSetupInput = {
  settings: SeoSettingsInput;
  credentials?: Partial<DataForSeoCredentials>;
};

function flattenFieldErrors(
  errors: Record<string, string[] | undefined>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1])
    )
  );
}

function isCredentialPair(credentials?: Partial<DataForSeoCredentials>) {
  return Boolean(credentials?.login?.trim() || credentials?.password?.trim());
}

export async function saveSeoSetupAction(
  input: SaveSeoSetupInput
): Promise<SeoActionResult<SeoDashboardData>> {
  const user = await requireCurrentUser();
  const parsed = seoSettingsSchema.safeParse(input.settings);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted setup fields.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors)
    };
  }

  const credentials = input.credentials;

  if (isCredentialPair(credentials)) {
    const login = credentials?.login?.trim() ?? "";
    const password = credentials?.password ?? "";

    if (!login || !password) {
      return {
        status: "error",
        message: "Enter both DataForSEO API login and API password.",
        fieldErrors: {
          credentials: ["Enter both DataForSEO API login and API password."]
        }
      };
    }

    try {
      const client = new DataForSeoClient({ login, password });
      await client.validateCredentials();
      await saveSeoCredentialsRecord(user.id, {
        encrypted: encryptCredentials({ login, password }),
        loginHint: maskLogin(login),
        validatedAt: new Date().toISOString()
      });
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not validate DataForSEO credentials.",
        fieldErrors: {
          credentials: ["Could not validate these credentials."]
        }
      };
    }
  }

  await upsertSeoSingleton(
    user.id,
    "settings",
    parsed.data as unknown as Prisma.InputJsonValue
  );

  return {
    status: "success",
    message: "SEO setup saved.",
    data: await getSeoDashboardData(user.id)
  };
}

export async function getSeoDashboardAction(): Promise<
  SeoActionResult<SeoDashboardData>
> {
  const user = await requireCurrentUser();

  return {
    status: "success",
    data: await getSeoDashboardData(user.id)
  };
}

export async function runSeoRefreshStepAction(
  step: SeoRefreshStep
): Promise<SeoActionResult<SeoDashboardData>> {
  const user = await requireCurrentUser();
  const credentials = await getSeoCredentialsStatus(user.id);

  if (!credentials.configured) {
    return {
      status: "error",
      message: "Add and validate DataForSEO credentials before refreshing.",
      fieldErrors: {
        credentials: ["DataForSEO credentials are required."]
      }
    };
  }

  return runSeoRefreshStep(user.id, step);
}
