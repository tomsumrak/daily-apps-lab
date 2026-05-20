import type { Prisma } from "@prisma/client";
import {
  createAppRecord,
  listAppRecords,
  updateAppRecord
} from "@/lib/app-records";
import {
  decryptCredentials,
  type DataForSeoCredentials,
  type EncryptedCredentialBlob
} from "@/lib/seo/credentials";
import { defaultSeoSettings, normalizeSeoSettings } from "@/lib/seo/settings";
import {
  SEO_APP_SLUG,
  type SeoCluster,
  type SeoCompetitor,
  type SeoCompetitorPage,
  type SeoCredentialsStatus,
  type SeoDashboardData,
  type SeoKeywordRow,
  type SeoOpportunity,
  type SeoPageKeyword,
  type SeoRecordType,
  type SeoRefreshStatus,
  type SeoRoadmapItem,
  type SeoSettings
} from "@/lib/seo/types";

type CredentialRecordData = {
  encrypted: EncryptedCredentialBlob;
  loginHint: string;
  validatedAt: string;
};

const emptyRefreshStatus: SeoRefreshStatus = {
  status: "idle",
  currentStep: null,
  startedAt: null,
  finishedAt: null,
  lastSuccessfulRefreshAt: null,
  message: null
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRefreshStatus(value: unknown): SeoRefreshStatus {
  if (!isRecord(value)) {
    return emptyRefreshStatus;
  }

  return {
    status:
      value.status === "running" ||
      value.status === "success" ||
      value.status === "error"
        ? value.status
        : "idle",
    currentStep:
      typeof value.currentStep === "string"
        ? (value.currentStep as SeoRefreshStatus["currentStep"])
        : null,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
    lastSuccessfulRefreshAt:
      typeof value.lastSuccessfulRefreshAt === "string"
        ? value.lastSuccessfulRefreshAt
        : null,
    message: typeof value.message === "string" ? value.message : null
  };
}

function asCredentialsStatus(value: unknown): SeoCredentialsStatus {
  if (!isRecord(value)) {
    return {
      configured: false,
      loginHint: null,
      validatedAt: null
    };
  }

  return {
    configured: Boolean(value.encrypted),
    loginHint: typeof value.loginHint === "string" ? value.loginHint : null,
    validatedAt:
      typeof value.validatedAt === "string" ? value.validatedAt : null
  };
}

async function getSingletonRecord(userId: string, recordType: SeoRecordType) {
  const [record] = await listAppRecords({
    userId,
    appSlug: SEO_APP_SLUG,
    recordType,
    take: 1
  });

  return record ?? null;
}

export async function getSeoSingleton<T>(
  userId: string,
  recordType: SeoRecordType
): Promise<T | null> {
  const record = await getSingletonRecord(userId, recordType);
  return record ? (record.data as T) : null;
}

export async function upsertSeoSingleton(
  userId: string,
  recordType: SeoRecordType,
  data: Prisma.InputJsonValue
) {
  const existing = await getSingletonRecord(userId, recordType);

  if (existing) {
    return updateAppRecord({
      userId,
      appSlug: SEO_APP_SLUG,
      id: existing.id,
      data
    });
  }

  return createAppRecord({
    userId,
    appSlug: SEO_APP_SLUG,
    recordType,
    data
  });
}

export async function getSeoSettings(userId: string): Promise<SeoSettings> {
  const stored = await getSeoSingleton<unknown>(userId, "settings");
  return stored ? normalizeSeoSettings(stored) : defaultSeoSettings;
}

export async function getSeoCredentialsStatus(
  userId: string
): Promise<SeoCredentialsStatus> {
  const stored = await getSeoSingleton<unknown>(userId, "credentials");
  return asCredentialsStatus(stored);
}

export async function getSeoCredentials(
  userId: string
): Promise<DataForSeoCredentials | null> {
  const stored = await getSeoSingleton<unknown>(userId, "credentials");

  if (!isRecord(stored) || !isRecord(stored.encrypted)) {
    return null;
  }

  return decryptCredentials(stored.encrypted as EncryptedCredentialBlob);
}

export async function saveSeoCredentialsRecord(
  userId: string,
  data: CredentialRecordData
) {
  await upsertSeoSingleton(
    userId,
    "credentials",
    data as unknown as Prisma.InputJsonValue
  );
}

export async function getSeoDashboardData(
  userId: string
): Promise<SeoDashboardData> {
  const [
    settings,
    credentials,
    refresh,
    competitors,
    competitorKeywords,
    seedIdeas,
    opportunities,
    clusters,
    roadmap,
    competitorPages,
    pageKeywords
  ] = await Promise.all([
    getSeoSettings(userId),
    getSeoCredentialsStatus(userId),
    getSeoSingleton<unknown>(userId, "refresh"),
    getSeoSingleton<unknown>(userId, "competitors"),
    getSeoSingleton<unknown>(userId, "competitorKeywords"),
    getSeoSingleton<unknown>(userId, "seedIdeas"),
    getSeoSingleton<unknown>(userId, "opportunities"),
    getSeoSingleton<unknown>(userId, "clusters"),
    getSeoSingleton<unknown>(userId, "roadmap"),
    getSeoSingleton<unknown>(userId, "competitorPages"),
    getSeoSingleton<unknown>(userId, "pageKeywords")
  ]);

  return {
    settings,
    credentials,
    refresh: asRefreshStatus(refresh),
    competitors: asArray<SeoCompetitor>(competitors),
    competitorKeywords: asArray<SeoKeywordRow>(competitorKeywords),
    seedIdeas: asArray<SeoKeywordRow>(seedIdeas),
    opportunities: asArray<SeoOpportunity>(opportunities),
    clusters: asArray<SeoCluster>(clusters),
    roadmap: asArray<SeoRoadmapItem>(roadmap),
    competitorPages: asArray<SeoCompetitorPage>(competitorPages),
    pageKeywords: asArray<SeoPageKeyword>(pageKeywords)
  };
}

export function refreshStatusForStep(
  previous: SeoRefreshStatus,
  currentStep: SeoRefreshStatus["currentStep"],
  message: string
): SeoRefreshStatus {
  const now = new Date().toISOString();

  return {
    ...previous,
    status: "running",
    currentStep,
    startedAt: previous.status === "running" && previous.startedAt ? previous.startedAt : now,
    finishedAt: null,
    message
  };
}

export function refreshStatusSuccess(
  previous: SeoRefreshStatus,
  message: string
): SeoRefreshStatus {
  const now = new Date().toISOString();

  return {
    ...previous,
    status: "success",
    currentStep: null,
    finishedAt: now,
    lastSuccessfulRefreshAt: now,
    message
  };
}

export function refreshStatusError(
  previous: SeoRefreshStatus,
  message: string
): SeoRefreshStatus {
  return {
    ...previous,
    status: "error",
    currentStep: null,
    finishedAt: new Date().toISOString(),
    message
  };
}

export function getEmptyRefreshStatus() {
  return { ...emptyRefreshStatus };
}
