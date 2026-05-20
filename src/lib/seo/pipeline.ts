import type { SeoManualCompetitor, SeoSettings } from "@/lib/seo/types";
import type {
  SeoCluster,
  SeoCompetitor,
  SeoCompetitorPage,
  SeoKeywordRow,
  SeoKeywordSource,
  SeoOpportunity,
  SeoPageKeyword,
  SeoRoadmapItem
} from "@/lib/seo/types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(source: unknown, path: string): unknown {
  if (!isRecord(source)) {
    return null;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return null;
    }

    return current[key];
  }, source);
}

function firstPath(source: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = getPath(source, path);

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asOptionalNumber(value: unknown) {
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item) => item.length > 0);
  }

  const raw = asString(value);
  return raw
    ? raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function urlPath(value: string) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value.replace(/^https?:\/\/[^/]+/i, "") || "/";
  }
}

function pageTypeFromUrl(value: string) {
  const path = urlPath(value).toLowerCase();

  if (path.includes("calculator")) {
    return "Tool";
  }

  if (path.includes("template") || path.includes("form")) {
    return "Resource";
  }

  if (path.includes("blog") || path.includes("guide")) {
    return "Blog";
  }

  return "Landing";
}

function stableId(parts: string[]) {
  let hash = 0;
  const input = parts.join("|").toLowerCase();

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function inferCluster(keyword: string) {
  const value = keyword.toLowerCase();
  const clusters: Array<[string, string[]]> = [
    ["Tenant Screening", ["tenant screening", "background check", "credit check", "screen tenants"]],
    ["Lease Agreements", ["lease", "rental agreement", "addendum"]],
    ["Rent Collection", ["rent collection", "rent payment", "late rent", "ledger"]],
    ["Eviction Process", ["eviction", "notice to vacate", "evict"]],
    ["Property Management SaaS", ["property management software", "landlord software", "management app"]],
    ["Landlord Insurance", ["insurance"]],
    ["Security Deposits", ["security deposit"]],
    ["Rental Applications", ["rental application", "application form"]],
    ["Maintenance Requests", ["maintenance request", "maintenance checklist"]],
    ["Property Accounting", ["accounting", "bookkeeping", "schedule e", "cash flow"]],
    ["Tenant Communication", ["tenant communication", "communicate with tenants"]],
    ["Rental Listings", ["rental listing", "list rental", "rent estimate"]]
  ];

  const match = clusters.find(([, needles]) =>
    needles.some((needle) => value.includes(needle))
  );

  if (match) {
    return match[0];
  }

  return titleCase(keyword.split(/\s+/).slice(0, 2).join(" ")) || "General";
}

function inferContentType(keyword: string, intent: string) {
  const value = keyword.toLowerCase();

  if (value.includes("calculator")) {
    return "Calculator";
  }

  if (value.includes("template") || value.includes("form") || value.includes("pdf")) {
    return "Tool/Template";
  }

  if (value.includes("best") || value.includes("vs") || value.includes("compare")) {
    return "Comparison";
  }

  if (intent.toLowerCase().includes("commercial")) {
    return "Landing Page";
  }

  return "Guide";
}

function inferIntent(item: unknown) {
  return (
    asString(
      firstPath(item, [
        "search_intent_info.main_intent",
        "keyword_data.search_intent_info.main_intent",
        "intent"
      ])
    ) || "Informational"
  );
}

function trendFromItem(item: unknown, kind: "monthly" | "yearly") {
  const path =
    kind === "monthly"
      ? ["keyword_info.monthly_searches.0.search_volume", "keyword_data.keyword_info.monthly_searches.0.search_volume"]
      : ["keyword_info.monthly_searches.11.search_volume", "keyword_data.keyword_info.monthly_searches.11.search_volume"];
  const current = asNumber(firstPath(item, path), 0);
  const previous = asNumber(
    firstPath(item, [
      "keyword_info.monthly_searches.1.search_volume",
      "keyword_data.keyword_info.monthly_searches.1.search_volume"
    ]),
    0
  );

  if (!current || !previous) {
    return 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function normalizeCompetitors(
  items: unknown[],
  manualCompetitors: SeoManualCompetitor[],
  pulledAt: string,
  targetDomain = ""
): SeoCompetitor[] {
  const byDomain = new Map<string, SeoCompetitor>();
  const normalizedTargetDomain = normalizeDomain(targetDomain);

  for (const item of items) {
    const domain = normalizeDomain(
      asString(firstPath(item, ["domain", "target", "url", "page_address"]))
    );

    if (!domain || domain === normalizedTargetDomain) {
      continue;
    }

    byDomain.set(domain, {
      pulledAt,
      source: "Discovered",
      domain,
      organicKw: Math.round(
        asNumber(
          firstPath(item, [
            "full_domain_metrics.organic.count",
            "full_domain_metrics.organic.keyword_count",
            "metrics.organic.count",
            "metrics.organic.keyword_count"
          ])
        )
      ),
      etv: Math.round(
        asNumber(
          firstPath(item, [
            "full_domain_metrics.organic.etv",
            "metrics.organic.etv",
            "organic_etv"
          ])
        )
      ),
      sharedKw: Math.round(asNumber(firstPath(item, ["intersections", "shared_keywords"]))),
      sharedEtv: Math.round(
        asNumber(firstPath(item, ["metrics.organic.etv", "shared_etv"]))
      ),
      avgPos: asNumber(
        firstPath(item, ["avg_position", "metrics.organic.pos_avg"]),
        0
      ),
      paidCost: Math.round(
        asNumber(
          firstPath(item, [
            "full_domain_metrics.paid.etv",
            "metrics.paid.etv",
            "paid_cost"
          ])
        )
      ),
      notes: ""
    });
  }

  for (const manual of manualCompetitors.filter((item) => item.active && item.domain)) {
    const domain = normalizeDomain(manual.domain);

    if (domain === normalizedTargetDomain) {
      continue;
    }

    const existing = byDomain.get(domain);

    byDomain.set(domain, {
      pulledAt,
      source: existing ? existing.source : "Manual",
      domain,
      organicKw: existing?.organicKw ?? 0,
      etv: existing?.etv ?? 0,
      sharedKw: existing?.sharedKw ?? 0,
      sharedEtv: existing?.sharedEtv ?? 0,
      avgPos: existing?.avgPos ?? 0,
      paidCost: existing?.paidCost ?? 0,
      notes: manual.notes
    });
  }

  return [...byDomain.values()].sort((a, b) => b.etv - a.etv);
}

export function normalizeKeywordRows(
  items: unknown[],
  source: SeoKeywordSource,
  pulledAt: string,
  context: {
    competitor?: string;
    seedKeyword?: string;
    sourceType?: string;
  } = {}
): SeoKeywordRow[] {
  return items
    .map((item) => {
      const keyword = asString(
        firstPath(item, ["keyword_data.keyword", "keyword", "keyword_info.keyword"])
      );
      const keywordInfoPath = "keyword_data.keyword_info";
      const propertiesPath = "keyword_data.keyword_properties";
      const serpItem = firstPath(item, [
        "ranked_serp_element.serp_item",
        "serp_item",
        "item"
      ]);

      return {
        competitor: context.competitor ?? "",
        seedKeyword: context.seedKeyword ?? "",
        sourceType: context.sourceType ?? "",
        keyword,
        searchVolume: Math.round(
          asNumber(
            firstPath(item, [
              `${keywordInfoPath}.search_volume`,
              "keyword_info.search_volume",
              "search_volume"
            ])
          )
        ),
        cpc: asNumber(
          firstPath(item, [`${keywordInfoPath}.cpc`, "keyword_info.cpc", "cpc"])
        ),
        competition: asNumber(
          firstPath(item, [
            `${keywordInfoPath}.competition`,
            "keyword_info.competition",
            "competition"
          ])
        ),
        competitionLevel: asString(
          firstPath(item, [
            `${keywordInfoPath}.competition_level`,
            "keyword_info.competition_level",
            "competition_level"
          ])
        ),
        keywordDifficulty: Math.round(
          asNumber(
            firstPath(item, [
              `${propertiesPath}.keyword_difficulty`,
              "keyword_properties.keyword_difficulty",
              "keyword_difficulty"
            ])
          )
        ),
        rank: asOptionalNumber(firstPath(serpItem, ["rank_group", "rank_absolute", "rank"])),
        url: asString(firstPath(serpItem, ["url", "breadcrumb"])),
        serpTitle: asString(firstPath(serpItem, ["title", "subtitle"])),
        intent: inferIntent(item),
        serpFeatures: [
          ...asStringArray(firstPath(item, ["serp_info.serp_item_types"])),
          ...asStringArray(firstPath(item, ["serp_features"]))
        ],
        monthlyTrend: trendFromItem(item, "monthly"),
        yearlyTrend: trendFromItem(item, "yearly"),
        source,
        pulledAt,
        checkUrl: asString(
          firstPath(item, [
            "keyword_data.serp_info.check_url",
            "serp_info.check_url",
            "check_url"
          ])
        )
      };
    })
    .filter((row) => row.keyword && row.searchVolume > 0);
}

export function normalizeCompetitorPages(
  items: unknown[],
  competitorDomain: string,
  pulledAt: string
): SeoCompetitorPage[] {
  return items
    .map((item) => {
      const pageUrl = asString(
        firstPath(item, ["page_address", "url", "target", "page_url"])
      );
      const path = urlPath(pageUrl);
      const domain = normalizeDomain(competitorDomain);

      return {
        id: stableId([domain, pageUrl]),
        competitorDomain: domain,
        pageUrl,
        pageType: pageTypeFromUrl(pageUrl),
        urlPath: path,
        etv: Math.round(
          asNumber(
            firstPath(item, ["metrics.organic.etv", "organic_etv", "etv"])
          )
        ),
        rankings: Math.round(
          asNumber(
            firstPath(item, ["metrics.organic.count", "rankings", "keywords_count"])
          )
        ),
        pos1: Math.round(
          asNumber(firstPath(item, ["metrics.organic.pos_1", "pos_1", "pos1"]))
        ),
        pos23: Math.round(
          asNumber(firstPath(item, ["metrics.organic.pos_2_3", "pos_2_3", "pos23"]))
        ),
        pos410: Math.round(
          asNumber(firstPath(item, ["metrics.organic.pos_4_10", "pos_4_10", "pos410"]))
        ),
        pos1120: Math.round(
          asNumber(firstPath(item, ["metrics.organic.pos_11_20", "pos_11_20", "pos1120"]))
        ),
        paidCost: Math.round(
          asNumber(firstPath(item, ["metrics.paid.etv", "paid_cost", "paid_etv"]))
        ),
        newRanks: Math.round(
          asNumber(firstPath(item, ["metrics.organic.is_new", "new_rankings", "newRanks"]))
        ),
        up: Math.round(asNumber(firstPath(item, ["metrics.organic.is_up", "up"]))),
        down: Math.round(
          asNumber(firstPath(item, ["metrics.organic.is_down", "down"]))
        ),
        lost: Math.round(
          asNumber(firstPath(item, ["metrics.organic.is_lost", "lost"]))
        ),
        clickstreamEtv: Math.round(
          asNumber(firstPath(item, ["metrics.organic.clickstream_etv", "clickstream_etv"]))
        ),
        source: "DataForSEO Relevant Pages",
        pulledAt,
        notes: ""
      };
    })
    .filter((row) => row.pageUrl);
}

export function normalizePageKeywords(
  items: unknown[],
  page: SeoCompetitorPage,
  pulledAt: string
): SeoPageKeyword[] {
  return normalizeKeywordRows(items, "Page Keywords", pulledAt, {
    competitor: page.competitorDomain,
    sourceType: page.pageType
  }).map((row) => ({
    ...row,
    pageUrl: page.pageUrl,
    pageType: page.pageType,
    pageRank: row.rank,
    keywordEtv: Math.round(row.searchVolume * 0.08),
    paidTrafficCost: Math.round(row.cpc * row.searchVolume * 0.02),
    rankChange: null,
    urlOnSerp: row.url,
    notes: ""
  }));
}

function tierForScore(score: number, settings: SeoSettings, volume: number, difficulty: number) {
  if (score >= settings.highThreshold) {
    return "P0" as const;
  }

  if (score >= settings.mediumThreshold) {
    return "P1" as const;
  }

  if (difficulty < 40 && volume > 2000) {
    return "P2" as const;
  }

  return "P3" as const;
}

function tierLabel(tier: SeoOpportunity["tier"]) {
  return {
    P0: "High Priority",
    P1: "Strong",
    P2: "Quick Win",
    P3: "Watchlist"
  }[tier];
}

function intentScore(intent: string) {
  const value = intent.toLowerCase();

  if (value.includes("transactional")) {
    return 100;
  }

  if (value.includes("commercial")) {
    return 85;
  }

  if (value.includes("navigational")) {
    return 35;
  }

  return 55;
}

function scoreOpportunity(
  settings: SeoSettings,
  row: {
    volume: number;
    difficulty: number;
    competitorCount: number;
    intent: string;
    yearlyTrend: number;
  },
  maxVolume: number
) {
  const weights = settings.weights;
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const volumeScore =
    maxVolume > 0
      ? (Math.log10(row.volume + 1) / Math.log10(maxVolume + 1)) * 100
      : 0;
  const lowDifficultyScore = Math.max(0, 100 - row.difficulty);
  const competitorProofScore = Math.min(100, row.competitorCount * 18);
  const trendScore = Math.max(0, Math.min(100, 50 + row.yearlyTrend / 2));

  return Math.round(
    (volumeScore * weights.volume +
      lowDifficultyScore * weights.lowDifficulty +
      competitorProofScore * weights.competitorProof +
      intentScore(row.intent) * weights.intent +
      trendScore * weights.trend) /
      totalWeight
  );
}

export function buildSeoDashboardRows({
  settings,
  competitorKeywords,
  seedIdeas,
  pageKeywords,
  competitorPages
}: {
  settings: SeoSettings;
  competitors: SeoCompetitor[];
  competitorKeywords: SeoKeywordRow[];
  seedIdeas: SeoKeywordRow[];
  competitorPages: SeoCompetitorPage[];
  pageKeywords: SeoPageKeyword[];
}) {
  const allKeywordRows: SeoKeywordRow[] = [
    ...competitorKeywords,
    ...seedIdeas,
    ...pageKeywords
  ].filter((row) => row.searchVolume >= settings.minSearchVolume);
  const groups = new Map<string, SeoKeywordRow[]>();

  for (const row of allKeywordRows) {
    const key = row.keyword.toLowerCase();
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const maxVolume = Math.max(1, ...allKeywordRows.map((row) => row.searchVolume));
  const opportunities: SeoOpportunity[] = [...groups.entries()].map(
    ([keywordKey, rows]) => {
      const sortedByRank = [...rows].sort(
        (a, b) => (a.rank ?? 999) - (b.rank ?? 999)
      );
      const highestVolume = Math.max(...rows.map((row) => row.searchVolume));
      const difficulty = Math.round(
        rows.reduce((sum, row) => sum + row.keywordDifficulty, 0) / rows.length
      );
      const cpc =
        rows.reduce((sum, row) => sum + row.cpc, 0) / Math.max(rows.length, 1);
      const competitorSet = new Set(
        rows
          .map((row) => row.competitor)
          .filter((competitor) => competitor.length > 0)
      );
      const intent =
        rows.find((row) => /commercial|transactional/i.test(row.intent))?.intent ??
        rows[0]?.intent ??
        "Informational";
      const best = sortedByRank[0];
      const score = scoreOpportunity(
        settings,
        {
          volume: highestVolume,
          difficulty,
          competitorCount: competitorSet.size,
          intent,
          yearlyTrend: Math.round(
            rows.reduce((sum, row) => sum + row.yearlyTrend, 0) / rows.length
          )
        },
        maxVolume
      );
      const tier = tierForScore(score, settings, highestVolume, difficulty);
      const keyword = rows[0]?.keyword ?? keywordKey;
      const contentType = inferContentType(keyword, intent);
      const cluster = inferCluster(keyword);

      return {
        id: stableId([keyword]),
        keyword,
        cluster,
        sources: [...new Set(rows.map((row) => row.source))].join(", "),
        volume: highestVolume,
        difficulty,
        cpc,
        competition:
          rows.reduce((sum, row) => sum + row.competition, 0) /
          Math.max(rows.length, 1),
        bestRank: best?.rank ?? 0,
        competitorCount: competitorSet.size,
        intent,
        score,
        tier,
        tierLabel: tierLabel(tier),
        contentType,
        whyItMatters:
          competitorSet.size > 0
            ? `${competitorSet.size} competitor${competitorSet.size === 1 ? "" : "s"} already rank for this demand.`
            : "Seed-driven opportunity with measurable search demand.",
        bestUrl: best?.url || "",
        bestCompetitor: best?.competitor || "",
        serpFeatures: [
          ...new Set(rows.flatMap((row) => row.serpFeatures).filter(Boolean))
        ].slice(0, 6),
        status: "Backlog",
        owner: "—",
        publishDate: null,
        monthlyTrend: Math.round(
          rows.reduce((sum, row) => sum + row.monthlyTrend, 0) / rows.length
        ),
        yearlyTrend: Math.round(
          rows.reduce((sum, row) => sum + row.yearlyTrend, 0) / rows.length
        ),
        notes: ""
      };
    }
  );

  opportunities.sort((a, b) => b.score - a.score || b.volume - a.volume);

  const clusterMap = new Map<string, SeoOpportunity[]>();
  for (const opportunity of opportunities) {
    const existing = clusterMap.get(opportunity.cluster) ?? [];
    existing.push(opportunity);
    clusterMap.set(opportunity.cluster, existing);
  }

  const clusters: SeoCluster[] = [...clusterMap.entries()]
    .map(([name, rows]) => {
      const maxScore = Math.max(...rows.map((row) => row.score));
      const priority = tierForScore(
        maxScore,
        settings,
        rows.reduce((sum, row) => sum + row.volume, 0),
        rows.reduce((sum, row) => sum + row.difficulty, 0) / rows.length
      );

      return {
        name,
        keywords: rows.length,
        volume: rows.reduce((sum, row) => sum + row.volume, 0),
        avgDiff: Math.round(
          rows.reduce((sum, row) => sum + row.difficulty, 0) / rows.length
        ),
        maxScore,
        priority,
        notes: ""
      };
    })
    .sort((a, b) => b.volume - a.volume);

  const scheduleStart = new Date();
  scheduleStart.setDate(scheduleStart.getDate() + ((8 - scheduleStart.getDay()) % 7 || 7));
  const roadmap: SeoRoadmapItem[] = opportunities.slice(0, 300).map((row, index) => {
    const date = new Date(scheduleStart);
    date.setDate(scheduleStart.getDate() + index * 7);
    const publishDate = date.toISOString().slice(0, 10);

    return {
      id: row.id,
      priority: row.tier,
      cluster: row.cluster,
      targetKeyword: row.keyword,
      recommendedSlug: slugify(row.keyword),
      contentType: row.contentType,
      searchVolume: row.volume,
      difficulty: row.difficulty,
      intent: row.intent,
      draftTitle: draftTitle(row.keyword, row.contentType),
      status: row.score >= settings.highThreshold ? "Drafting" : "Backlog",
      owner: "—",
      publishDate,
      notes: row.whyItMatters,
      sourceUrl: row.bestUrl
    };
  });

  const opportunityDates = new Map(
    roadmap.map((row) => [row.id, row.publishDate] as const)
  );
  const opportunitiesWithDates = opportunities.map((row) => ({
    ...row,
    publishDate: opportunityDates.get(row.id) ?? null
  }));

  const pageUrlSet = new Set(competitorPages.map((page) => page.pageUrl));
  const pageKeywordsScoped = pageKeywords.filter((row) => pageUrlSet.has(row.pageUrl));

  return {
    opportunities: opportunitiesWithDates,
    clusters,
    roadmap,
    pageKeywords: pageKeywordsScoped
  };
}

function draftTitle(keyword: string, contentType: string) {
  const title = titleCase(keyword);

  if (contentType === "Comparison") {
    return `Best ${title}: Options, Pricing, and Features`;
  }

  if (contentType === "Tool/Template") {
    return `${title}: Free Template and Landlord Guide`;
  }

  if (contentType === "Calculator") {
    return `${title}: Calculator and Methodology`;
  }

  return `${title}: Complete Guide`;
}
