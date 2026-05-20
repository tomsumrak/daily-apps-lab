import type { Prisma } from "@prisma/client";
import { DataForSeoClient } from "@/lib/seo/dataforseo";
import {
  buildSeoDashboardRows,
  normalizeCompetitorPages,
  normalizeCompetitors,
  normalizeKeywordRows,
  normalizePageKeywords
} from "@/lib/seo/pipeline";
import {
  getEmptyRefreshStatus,
  getSeoCredentials,
  getSeoDashboardData,
  getSeoSettings,
  getSeoSingleton,
  refreshStatusError,
  refreshStatusForStep,
  refreshStatusSuccess,
  upsertSeoSingleton
} from "@/lib/seo/storage";
import type {
  SeoActionResult,
  SeoCompetitor,
  SeoCompetitorPage,
  SeoDashboardData,
  SeoKeywordRow,
  SeoPageKeyword,
  SeoRefreshStatus,
  SeoRefreshStep
} from "@/lib/seo/types";

const STEP_MESSAGES: Record<SeoRefreshStep, string> = {
  competitors: "Discovering and merging competitor domains.",
  competitorKeywords: "Pulling ranked keywords for competitors.",
  seedIdeas: "Expanding active seed keywords.",
  competitorPages: "Pulling top competitor pages.",
  pageKeywords: "Pulling page-level ranked keywords.",
  buildDashboard: "Building opportunities, clusters, and roadmap."
};

async function getStoredRefresh(userId: string): Promise<SeoRefreshStatus> {
  const stored = await getSeoSingleton<SeoRefreshStatus>(userId, "refresh");
  return stored ?? getEmptyRefreshStatus();
}

async function saveRefreshStatus(userId: string, status: SeoRefreshStatus) {
  await upsertSeoSingleton(
    userId,
    "refresh",
    status as unknown as Prisma.InputJsonValue
  );
}

async function withRefreshError(
  userId: string,
  previous: SeoRefreshStatus,
  error: unknown
): Promise<SeoActionResult> {
  const message =
    error instanceof Error
      ? error.message
      : "The DataForSEO refresh failed unexpectedly.";
  await saveRefreshStatus(userId, refreshStatusError(previous, message));

  return {
    status: "error",
    message,
    data: await getSeoDashboardData(userId)
  } as SeoActionResult;
}

async function getClient(userId: string) {
  const credentials = await getSeoCredentials(userId);

  if (!credentials) {
    throw new Error("Add and validate DataForSEO credentials before refreshing.");
  }

  return new DataForSeoClient(credentials);
}

function asInputJson<T>(data: T) {
  return data as unknown as Prisma.InputJsonValue;
}

export async function runSeoRefreshStep(
  userId: string,
  step: SeoRefreshStep
): Promise<SeoActionResult<SeoDashboardData>> {
  const settings = await getSeoSettings(userId);
  const previous = await getStoredRefresh(userId);
  const running = refreshStatusForStep(previous, step, STEP_MESSAGES[step]);
  await saveRefreshStatus(userId, running);

  try {
    const client = await getClient(userId);
    const pulledAt = new Date().toISOString();

    if (step === "competitors") {
      const items = await client.competitorsDomain(settings);
      const competitors = normalizeCompetitors(
        items,
        settings.manualCompetitors,
        pulledAt,
        settings.targetDomain
      ).slice(0, settings.maxCompetitors);

      await upsertSeoSingleton(userId, "competitors", asInputJson(competitors));
    }

    if (step === "competitorKeywords") {
      const competitors =
        (await getSeoSingleton<SeoCompetitor[]>(userId, "competitors")) ?? [];
      const rows: SeoKeywordRow[] = [];

      for (const competitor of competitors.slice(0, settings.maxCompetitors)) {
        const items = await client.rankedKeywordsForDomain(
          competitor.domain,
          settings
        );
        rows.push(
          ...normalizeKeywordRows(
            items,
            "Competitor Ranked Keywords",
            pulledAt,
            {
              competitor: competitor.domain
            }
          )
        );
      }

      await upsertSeoSingleton(
        userId,
        "competitorKeywords",
        asInputJson(rows)
      );
    }

    if (step === "seedIdeas") {
      const seeds = settings.seedKeywords.filter(
        (seed) => seed.active && seed.keyword
      );
      const rows: SeoKeywordRow[] = [];

      for (const seed of seeds) {
        const suggestions = await client.keywordSuggestions(
          seed.keyword,
          settings
        );
        rows.push(
          ...normalizeKeywordRows(suggestions, "Seed Suggestions", pulledAt, {
            seedKeyword: seed.keyword,
            sourceType: "Keyword Suggestions"
          })
        );

        const related = await client.relatedKeywords(seed.keyword, settings);
        rows.push(
          ...normalizeKeywordRows(related, "Related Keywords", pulledAt, {
            seedKeyword: seed.keyword,
            sourceType: "Related Keywords"
          })
        );
      }

      await upsertSeoSingleton(userId, "seedIdeas", asInputJson(rows));
    }

    if (step === "competitorPages") {
      const competitors =
        (await getSeoSingleton<SeoCompetitor[]>(userId, "competitors")) ?? [];
      const pages: SeoCompetitorPage[] = [];

      for (const competitor of competitors.slice(0, settings.maxCompetitors)) {
        const items = await client.relevantPagesForDomain(
          competitor.domain,
          settings
        );
        pages.push(
          ...normalizeCompetitorPages(items, competitor.domain, pulledAt).filter(
            (page) => page.etv >= settings.minPageEtv
          )
        );
      }

      await upsertSeoSingleton(userId, "competitorPages", asInputJson(pages));
    }

    if (step === "pageKeywords") {
      const pages =
        (await getSeoSingleton<SeoCompetitorPage[]>(
          userId,
          "competitorPages"
        )) ?? [];
      const pagesByDomain = new Map<string, SeoCompetitorPage[]>();
      const rows: SeoPageKeyword[] = [];

      for (const page of pages) {
        const existing = pagesByDomain.get(page.competitorDomain) ?? [];
        existing.push(page);
        pagesByDomain.set(page.competitorDomain, existing);
      }

      for (const group of pagesByDomain.values()) {
        const selectedPages = [...group]
          .sort((a, b) => b.etv - a.etv)
          .slice(0, settings.pagesToEnrich);

        for (const page of selectedPages) {
          const items = await client.rankedKeywordsForPage(
            page.pageUrl,
            settings
          );
          rows.push(...normalizePageKeywords(items, page, pulledAt));
        }
      }

      await upsertSeoSingleton(userId, "pageKeywords", asInputJson(rows));
    }

    if (step === "buildDashboard") {
      const [
        competitors,
        competitorKeywords,
        seedIdeas,
        competitorPages,
        pageKeywords
      ] = await Promise.all([
        getSeoSingleton<SeoCompetitor[]>(userId, "competitors"),
        getSeoSingleton<SeoKeywordRow[]>(userId, "competitorKeywords"),
        getSeoSingleton<SeoKeywordRow[]>(userId, "seedIdeas"),
        getSeoSingleton<SeoCompetitorPage[]>(userId, "competitorPages"),
        getSeoSingleton<SeoPageKeyword[]>(userId, "pageKeywords")
      ]);

      const built = buildSeoDashboardRows({
        settings,
        competitors: competitors ?? [],
        competitorKeywords: competitorKeywords ?? [],
        seedIdeas: seedIdeas ?? [],
        competitorPages: competitorPages ?? [],
        pageKeywords: pageKeywords ?? []
      });

      await Promise.all([
        upsertSeoSingleton(
          userId,
          "opportunities",
          asInputJson(built.opportunities)
        ),
        upsertSeoSingleton(userId, "clusters", asInputJson(built.clusters)),
        upsertSeoSingleton(userId, "roadmap", asInputJson(built.roadmap)),
        upsertSeoSingleton(
          userId,
          "pageKeywords",
          asInputJson(built.pageKeywords)
        )
      ]);

      await saveRefreshStatus(
        userId,
        refreshStatusSuccess(running, "SEO dashboard refresh completed.")
      );

      return {
        status: "success",
        message: "SEO dashboard refresh completed.",
        data: await getSeoDashboardData(userId)
      };
    }

    await saveRefreshStatus(userId, running);

    return {
      status: "success",
      message: STEP_MESSAGES[step],
      data: await getSeoDashboardData(userId)
    };
  } catch (error) {
    return withRefreshError(userId, running, error);
  }
}
