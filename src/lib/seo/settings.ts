import { z } from "zod";
import type {
  SeoManualCompetitor,
  SeoSeedKeyword,
  SeoSettings
} from "@/lib/seo/types";

const domainPattern = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

const activeCompetitorSchema = z.object({
  domain: z
    .string()
    .trim()
    .transform(stripDomainUrl)
    .refine((value) => value === "" || domainPattern.test(value), {
      message: "Use a bare domain like example.com."
    }),
  notes: z.string().trim().max(240, "Notes must be 240 characters or fewer."),
  active: z.boolean()
});

const seedKeywordSchema = z.object({
  keyword: z.string().trim().max(120, "Keyword must be 120 characters or fewer."),
  notes: z.string().trim().max(240, "Notes must be 240 characters or fewer."),
  active: z.boolean()
});

export const seoSettingsSchema = z
  .object({
    targetDomain: z
      .string()
      .trim()
      .transform(stripDomainUrl)
      .refine((value) => domainPattern.test(value), {
        message: "Use a bare domain like example.com."
      }),
    locationCode: z.coerce.number().int().positive(),
    locationName: z.string().trim().min(1).max(80),
    languageCode: z.string().trim().min(2).max(12).toLowerCase(),
    languageName: z.string().trim().min(1).max(80),
    topPagesPerCompetitor: z.coerce.number().int().min(1).max(200),
    pageKwLimit: z.coerce.number().int().min(1).max(200),
    pagesToEnrich: z.coerce.number().int().min(1).max(50),
    minPageEtv: z.coerce.number().min(0).max(1_000_000),
    maxCompetitors: z.coerce.number().int().min(1).max(50),
    kwLimitPerCompetitor: z.coerce.number().int().min(10).max(1000),
    seedSuggestionsLimit: z.coerce.number().int().min(10).max(500),
    minSearchVolume: z.coerce.number().int().min(0).max(100_000),
    pullSerpInfo: z.boolean(),
    includeClickstream: z.boolean(),
    weights: z.object({
      volume: z.coerce.number().min(0).max(1),
      lowDifficulty: z.coerce.number().min(0).max(1),
      competitorProof: z.coerce.number().min(0).max(1),
      intent: z.coerce.number().min(0).max(1),
      trend: z.coerce.number().min(0).max(1)
    }),
    highThreshold: z.coerce.number().int().min(50).max(100),
    mediumThreshold: z.coerce.number().int().min(20).max(99),
    manualCompetitors: z.array(activeCompetitorSchema).max(100),
    seedKeywords: z.array(seedKeywordSchema).max(100)
  })
  .superRefine((settings, ctx) => {
    if (settings.mediumThreshold >= settings.highThreshold) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Medium threshold must be lower than high threshold.",
        path: ["mediumThreshold"]
      });
    }

    const weightTotal = Object.values(settings.weights).reduce(
      (sum, value) => sum + value,
      0
    );

    if (weightTotal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one scoring weight must be greater than zero.",
        path: ["weights"]
      });
    }
  })
  .transform((settings) => ({
    ...settings,
    manualCompetitors: settings.manualCompetitors
      .map((row) => ({
        ...row,
        domain: stripDomainUrl(row.domain)
      }))
      .filter((row) => row.domain || row.notes),
    seedKeywords: settings.seedKeywords
      .map((row) => ({
        ...row,
        keyword: row.keyword.trim()
      }))
      .filter((row) => row.keyword || row.notes)
  }));

export type SeoSettingsInput = z.input<typeof seoSettingsSchema>;

export const defaultSeoSettings: SeoSettings = {
  targetDomain: "",
  locationCode: 2840,
  locationName: "United States",
  languageCode: "en",
  languageName: "English",
  topPagesPerCompetitor: 50,
  pageKwLimit: 25,
  pagesToEnrich: 10,
  minPageEtv: 0,
  maxCompetitors: 10,
  kwLimitPerCompetitor: 250,
  seedSuggestionsLimit: 100,
  minSearchVolume: 50,
  pullSerpInfo: true,
  includeClickstream: false,
  weights: {
    volume: 0.35,
    lowDifficulty: 0.3,
    competitorProof: 0.2,
    intent: 0.1,
    trend: 0.05
  },
  highThreshold: 75,
  mediumThreshold: 50,
  manualCompetitors: [
    {
      domain: "turbotenant.com",
      notes: "Closest functional comp",
      active: true
    },
    {
      domain: "avail.co",
      notes: "Mid-market overlap",
      active: true
    },
    {
      domain: "hemlane.com",
      notes: "",
      active: true
    },
    {
      domain: "innago.com",
      notes: "",
      active: true
    },
    {
      domain: "doorloop.com",
      notes: "",
      active: false
    }
  ],
  seedKeywords: [
    {
      keyword: "tenant screening",
      notes: "Highest-intent product term",
      active: true
    },
    {
      keyword: "rent collection software",
      notes: "",
      active: true
    },
    {
      keyword: "lease agreement template",
      notes: "Top of funnel",
      active: true
    },
    {
      keyword: "property management software",
      notes: "Broad but competitive",
      active: true
    },
    {
      keyword: "online rental application",
      notes: "",
      active: false
    }
  ]
};

export function normalizeSeoSettings(input: unknown): SeoSettings {
  const parsed = seoSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : defaultSeoSettings;
}

export function stripDomainUrl(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function ensureSetupRows<T extends SeoManualCompetitor | SeoSeedKeyword>(
  rows: T[],
  blank: T,
  minRows = 5
) {
  const next = [...rows];
  while (next.length < minRows) {
    next.push({ ...blank });
  }
  return next;
}
