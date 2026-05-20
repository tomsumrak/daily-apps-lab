export const SEO_APP_SLUG = "seo-opportunity";

export const SEO_RECORD_TYPES = [
  "settings",
  "credentials",
  "refresh",
  "competitors",
  "competitorKeywords",
  "seedIdeas",
  "opportunities",
  "clusters",
  "roadmap",
  "competitorPages",
  "pageKeywords"
] as const;

export type SeoRecordType = (typeof SEO_RECORD_TYPES)[number];

export type SeoActiveListItem = {
  active: boolean;
  notes: string;
};

export type SeoManualCompetitor = SeoActiveListItem & {
  domain: string;
};

export type SeoSeedKeyword = SeoActiveListItem & {
  keyword: string;
};

export type SeoScoringWeights = {
  volume: number;
  lowDifficulty: number;
  competitorProof: number;
  intent: number;
  trend: number;
};

export type SeoSettings = {
  targetDomain: string;
  locationCode: number;
  locationName: string;
  languageCode: string;
  languageName: string;
  topPagesPerCompetitor: number;
  pageKwLimit: number;
  pagesToEnrich: number;
  minPageEtv: number;
  maxCompetitors: number;
  kwLimitPerCompetitor: number;
  seedSuggestionsLimit: number;
  minSearchVolume: number;
  pullSerpInfo: boolean;
  includeClickstream: boolean;
  weights: SeoScoringWeights;
  highThreshold: number;
  mediumThreshold: number;
  manualCompetitors: SeoManualCompetitor[];
  seedKeywords: SeoSeedKeyword[];
};

export type SeoCredentialsStatus = {
  configured: boolean;
  loginHint: string | null;
  validatedAt: string | null;
};

export type SeoRefreshStep =
  | "competitors"
  | "competitorKeywords"
  | "seedIdeas"
  | "competitorPages"
  | "pageKeywords"
  | "buildDashboard";

export type SeoRefreshStatus = {
  status: "idle" | "running" | "success" | "error";
  currentStep: SeoRefreshStep | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  message: string | null;
};

export type SeoCompetitor = {
  pulledAt: string;
  source: "Manual" | "Discovered";
  domain: string;
  organicKw: number;
  etv: number;
  sharedKw: number;
  sharedEtv: number;
  avgPos: number;
  paidCost: number;
  notes: string;
};

export type SeoKeywordSource = "Competitor Ranked Keywords" | "Seed Suggestions" | "Related Keywords" | "Page Keywords";

export type SeoKeywordRow = {
  competitor: string;
  seedKeyword: string;
  sourceType: string;
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: string;
  keywordDifficulty: number;
  rank: number | null;
  url: string;
  serpTitle: string;
  intent: string;
  serpFeatures: string[];
  monthlyTrend: number;
  yearlyTrend: number;
  source: SeoKeywordSource;
  pulledAt: string;
  checkUrl: string;
};

export type SeoOpportunity = {
  id: string;
  keyword: string;
  cluster: string;
  sources: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  bestRank: number;
  competitorCount: number;
  intent: string;
  score: number;
  tier: "P0" | "P1" | "P2" | "P3";
  tierLabel: string;
  contentType: string;
  whyItMatters: string;
  bestUrl: string;
  bestCompetitor: string;
  serpFeatures: string[];
  status: string;
  owner: string;
  publishDate: string | null;
  monthlyTrend: number;
  yearlyTrend: number;
  notes: string;
};

export type SeoCluster = {
  name: string;
  keywords: number;
  volume: number;
  avgDiff: number;
  maxScore: number;
  priority: "P0" | "P1" | "P2" | "P3";
  notes: string;
};

export type SeoRoadmapItem = {
  id: string;
  priority: "P0" | "P1" | "P2" | "P3";
  cluster: string;
  targetKeyword: string;
  recommendedSlug: string;
  contentType: string;
  searchVolume: number;
  difficulty: number;
  intent: string;
  draftTitle: string;
  status: string;
  owner: string;
  publishDate: string | null;
  notes: string;
  sourceUrl: string;
};

export type SeoCompetitorPage = {
  id: string;
  competitorDomain: string;
  pageUrl: string;
  pageType: string;
  urlPath: string;
  etv: number;
  rankings: number;
  pos1: number;
  pos23: number;
  pos410: number;
  pos1120: number;
  paidCost: number;
  newRanks: number;
  up: number;
  down: number;
  lost: number;
  clickstreamEtv: number;
  source: string;
  pulledAt: string;
  notes: string;
};

export type SeoPageKeyword = SeoKeywordRow & {
  pageUrl: string;
  pageType: string;
  pageRank: number | null;
  keywordEtv: number;
  paidTrafficCost: number;
  rankChange: number | null;
  urlOnSerp: string;
  notes: string;
};

export type SeoDashboardData = {
  settings: SeoSettings;
  credentials: SeoCredentialsStatus;
  refresh: SeoRefreshStatus;
  competitors: SeoCompetitor[];
  competitorKeywords: SeoKeywordRow[];
  seedIdeas: SeoKeywordRow[];
  opportunities: SeoOpportunity[];
  clusters: SeoCluster[];
  roadmap: SeoRoadmapItem[];
  competitorPages: SeoCompetitorPage[];
  pageKeywords: SeoPageKeyword[];
};

export type SeoActionResult<T = SeoDashboardData> =
  | {
      status: "success";
      data: T;
      message?: string;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      data?: T;
    };
