import type { DataForSeoCredentials } from "@/lib/seo/credentials";
import type { SeoSettings } from "@/lib/seo/types";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com/v3";

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: unknown[];
  }>;
};

type DataForSeoRequestPayload = Record<string, unknown>;

export class DataForSeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataForSeoError";
  }
}

function authHeader(credentials: DataForSeoCredentials) {
  return `Basic ${Buffer.from(
    `${credentials.login}:${credentials.password}`,
    "utf8"
  ).toString("base64")}`;
}

function withCredentialHint(message: string) {
  if (/not authorized|unauthorized|login details|api-access/i.test(message)) {
    return `${message} Use the DataForSEO API login and raw API password from API Access, not the account password or a pre-encoded Authorization value.`;
  }

  return message;
}

function assertOkPayload(payload: DataForSeoResponse) {
  if (payload.status_code && payload.status_code >= 40000) {
    throw new DataForSeoError(
      withCredentialHint(
        payload.status_message || `DataForSEO returned ${payload.status_code}.`
      )
    );
  }

  for (const task of payload.tasks ?? []) {
    if (task.status_code && task.status_code >= 40000) {
      throw new DataForSeoError(
        withCredentialHint(
          task.status_message ||
            `DataForSEO task returned ${task.status_code}.`
        )
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resultItems(payload: DataForSeoResponse) {
  assertOkPayload(payload);
  return (payload.tasks ?? [])
    .flatMap((task) => task.result ?? [])
    .flatMap((result) =>
      isRecord(result) && Array.isArray(result.items) ? result.items : result
    );
}

export class DataForSeoClient {
  private readonly authorization: string;

  constructor(credentials: DataForSeoCredentials) {
    this.authorization = authHeader(credentials);
  }

  async validateCredentials() {
    const payload = await this.request<DataForSeoResponse>(
      "/appendix/user_data",
      {
        method: "GET"
      }
    );

    assertOkPayload(payload);
    return payload;
  }

  async competitorsDomain(settings: SeoSettings) {
    return this.postLabs("competitors_domain", {
      target: settings.targetDomain,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.maxCompetitors,
      order_by: ["intersections,desc"]
    });
  }

  async rankedKeywordsForDomain(domain: string, settings: SeoSettings) {
    return this.postLabs("ranked_keywords", {
      target: domain,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.kwLimitPerCompetitor,
      ignore_synonyms: false,
      include_serp_info: settings.pullSerpInfo,
      filters: [
        ["keyword_data.keyword_info.search_volume", ">=", settings.minSearchVolume]
      ],
      order_by: ["keyword_data.keyword_info.search_volume,desc"]
    });
  }

  async keywordSuggestions(seed: string, settings: SeoSettings) {
    return this.postLabs("keyword_suggestions", {
      keyword: seed,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.seedSuggestionsLimit,
      include_serp_info: settings.pullSerpInfo,
      filters: [["keyword_info.search_volume", ">=", settings.minSearchVolume]],
      order_by: ["keyword_info.search_volume,desc"]
    });
  }

  async relatedKeywords(seed: string, settings: SeoSettings) {
    return this.postLabs("related_keywords", {
      keyword: seed,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.seedSuggestionsLimit,
      include_serp_info: settings.pullSerpInfo,
      filters: [
        ["keyword_data.keyword_info.search_volume", ">=", settings.minSearchVolume]
      ],
      order_by: ["keyword_data.keyword_info.search_volume,desc"]
    });
  }

  async relevantPagesForDomain(domain: string, settings: SeoSettings) {
    return this.postLabs("relevant_pages", {
      target: domain,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.topPagesPerCompetitor,
      order_by: ["metrics.organic.etv,desc"]
    });
  }

  async rankedKeywordsForPage(pageUrl: string, settings: SeoSettings) {
    return this.postLabs("ranked_keywords", {
      target: pageUrl,
      language_name: settings.languageName,
      location_name: settings.locationName,
      language_code: settings.languageCode,
      location_code: settings.locationCode,
      limit: settings.pageKwLimit,
      ignore_synonyms: false,
      include_serp_info: settings.pullSerpInfo,
      filters: [
        ["keyword_data.keyword_info.search_volume", ">=", settings.minSearchVolume]
      ],
      order_by: ["keyword_data.keyword_info.search_volume,desc"]
    });
  }

  private async postLabs(endpoint: string, payload: DataForSeoRequestPayload) {
    const response = await this.request<DataForSeoResponse>(
      `/dataforseo_labs/google/${endpoint}/live`,
      {
        method: "POST",
        body: JSON.stringify([payload])
      }
    );

    return resultItems(response);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${DATAFORSEO_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: this.authorization,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "status_message" in payload &&
        typeof payload.status_message === "string"
          ? payload.status_message
          : `DataForSEO request failed with HTTP ${response.status}.`;
      throw new DataForSeoError(withCredentialHint(message));
    }

    return payload as T;
  }
}
