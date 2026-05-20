"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import Link from "next/link";
import {
  runSeoRefreshStepAction,
  saveSeoSetupAction
} from "@/app/apps/seo-opportunity/actions";
import type {
  SeoCluster,
  SeoCompetitor,
  SeoCompetitorPage,
  SeoDashboardData,
  SeoOpportunity,
  SeoPageKeyword,
  SeoRefreshStep,
  SeoRoadmapItem,
  SeoSeedKeyword,
  SeoSettings
} from "@/lib/seo/types";

type SeoDashboardClientProps = {
  initialData: SeoDashboardData;
  userLabel: string;
};

type Route =
  | { view: "overview" }
  | { view: "opportunities" }
  | { view: "competitors" }
  | { view: "competitor"; domain: string }
  | { view: "clusters" }
  | { view: "cluster"; name: string }
  | { view: "roadmap" }
  | { view: "pages" }
  | { view: "page"; id: string };

const refreshSteps: SeoRefreshStep[] = [
  "competitors",
  "competitorKeywords",
  "seedIdeas",
  "competitorPages",
  "pageKeywords",
  "buildDashboard"
];

const refreshLabels: Record<SeoRefreshStep, string> = {
  competitors: "Competitors",
  competitorKeywords: "Competitor keywords",
  seedIdeas: "Seed ideas",
  competitorPages: "Competitor pages",
  pageKeywords: "Page keywords",
  buildDashboard: "Dashboard"
};

function fmtNum(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return Math.round(value).toLocaleString();
}

function fmtMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return `$${Math.round(value).toLocaleString()}`;
}

function dateLabel(value: string | null) {
  if (!value) {
    return "Not refreshed";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function targetDomainLabel(value: string) {
  return value.trim() || "No target domain";
}

function tierLabel(tier: SeoOpportunity["tier"] | SeoCluster["priority"]) {
  return {
    P0: "High Priority",
    P1: "Strong",
    P2: "Quick Win",
    P3: "Watchlist"
  }[tier];
}

export function SeoDashboardClient({
  initialData,
  userLabel
}: SeoDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [route, setRoute] = useState<Route>({ view: "overview" });
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStep, setActiveStep] = useState<SeoRefreshStep | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData.credentials.configured) {
      setSetupOpen(true);
    }
  }, [initialData.credentials.configured]);

  function go(next: Route | { view: "opportunity"; id: string }) {
    if (next.view === "opportunity") {
      setDrawerId(next.id);
      return;
    }

    setRoute(next);
    setDrawerId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runFullRefresh() {
    setIsRefreshing(true);
    setNotice(null);

    for (const step of refreshSteps) {
      setActiveStep(step);
      const result = await runSeoRefreshStepAction(step);

      if (result.data) {
        setData(result.data);
      }

      if (result.status === "error") {
        setNotice(result.message);
        setIsRefreshing(false);
        setActiveStep(null);
        return;
      }
    }

    setNotice("SEO dashboard refresh completed.");
    setIsRefreshing(false);
    setActiveStep(null);
  }

  const activeOpportunity = drawerId
    ? data.opportunities.find((opportunity) => opportunity.id === drawerId) ?? null
    : null;

  return (
    <div className="seo-app" data-screen-label={route.view}>
      <Sidebar
        data={data}
        route={route}
        go={go}
        userLabel={userLabel}
        onSetup={() => setSetupOpen(true)}
        onRefresh={runFullRefresh}
        isRefreshing={isRefreshing}
      />
      <main className="seo-main">
        {notice && (
          <div className="seo-notice">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}
        {isRefreshing && (
          <RefreshProgress activeStep={activeStep} data={data} />
        )}
        {route.view === "overview" && <Overview data={data} go={go} />}
        {route.view === "opportunities" && (
          <Opportunities data={data} go={go} />
        )}
        {route.view === "competitors" && <Competitors data={data} go={go} />}
        {route.view === "competitor" && (
          <CompetitorDetail data={data} domain={route.domain} go={go} />
        )}
        {route.view === "clusters" && <Clusters data={data} go={go} />}
        {route.view === "cluster" && (
          <ClusterDetail data={data} name={route.name} go={go} />
        )}
        {route.view === "roadmap" && <Roadmap data={data} go={go} />}
        {route.view === "pages" && <CompetitorPages data={data} go={go} />}
        {route.view === "page" && <PageDetail data={data} id={route.id} go={go} />}
      </main>
      <OpportunityDrawer
        opportunity={activeOpportunity}
        onClose={() => setDrawerId(null)}
      />
      <SetupModal
        open={setupOpen}
        data={data}
        onClose={() => setSetupOpen(false)}
        onSaved={setData}
        onRefresh={runFullRefresh}
      />
    </div>
  );
}

function Sidebar({
  data,
  route,
  go,
  userLabel,
  onSetup,
  onRefresh,
  isRefreshing
}: {
  data: SeoDashboardData;
  route: Route;
  go: (route: Route) => void;
  userLabel: string;
  onSetup: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const isActive = (view: Route["view"]) =>
    route.view === view ||
    (view === "opportunities" && route.view === "overview") ||
    (view === "competitors" && route.view === "competitor") ||
    (view === "clusters" && route.view === "cluster") ||
    (view === "pages" && route.view === "page");

  return (
    <aside className="seo-sidebar">
      <div className="seo-brand">
        <Link className="seo-brand-link" href="/apps">
          <span className="seo-brand-mark">S</span>
          <span className="seo-brand-name">SEO</span>
          <span className="seo-brand-sub">Lab</span>
        </Link>
      </div>

      <div className="seo-nav-section">
        <h6>Analysis</h6>
        <NavButton
          active={isActive("overview")}
          label="Overview"
          onClick={() => go({ view: "overview" })}
        />
        <NavButton
          active={isActive("opportunities")}
          label="Opportunities"
          count={data.opportunities.length}
          onClick={() => go({ view: "opportunities" })}
        />
        <NavButton
          active={isActive("clusters")}
          label="Clusters"
          count={data.clusters.length}
          onClick={() => go({ view: "clusters" })}
        />
        <NavButton
          active={isActive("roadmap")}
          label="Roadmap"
          count={data.roadmap.length}
          onClick={() => go({ view: "roadmap" })}
        />
      </div>

      <div className="seo-nav-section">
        <h6>Competition</h6>
        <NavButton
          active={isActive("competitors")}
          label="Competitors"
          count={data.competitors.length}
          onClick={() => go({ view: "competitors" })}
        />
        <NavButton
          active={isActive("pages")}
          label="Competitor Pages"
          count={data.competitorPages.length}
          onClick={() => go({ view: "pages" })}
        />
      </div>

      <div className="seo-sidebar-foot">
        <div className="seo-eyebrow">Target domain</div>
        <div className="seo-domain">
          {targetDomainLabel(data.settings.targetDomain)}
        </div>
        <div className="seo-sidebar-market">
          {data.settings.locationName} · {data.settings.languageName}
        </div>
        <div className="seo-mono seo-tiny">
          {dateLabel(data.refresh.lastSuccessfulRefreshAt)}
        </div>
        <button className="seo-setup-trigger" type="button" onClick={onSetup}>
          Configure setup
        </button>
        <button
          className="seo-refresh-trigger"
          type="button"
          disabled={
            isRefreshing ||
            !data.credentials.configured ||
            !data.settings.targetDomain.trim()
          }
          onClick={onRefresh}
        >
          {isRefreshing ? "Refreshing..." : "Refresh all"}
        </button>
        <div className="seo-user-block">
          <span>{userLabel}</span>
          <form action="/logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  label,
  count,
  onClick
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`seo-nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {count != null && <span className="seo-count">{count}</span>}
    </button>
  );
}

function RefreshProgress({
  activeStep,
  data
}: {
  activeStep: SeoRefreshStep | null;
  data: SeoDashboardData;
}) {
  return (
    <div className="seo-progress-card">
      <div>
        <div className="seo-eyebrow">Refresh in progress</div>
        <div className="seo-progress-title">
          {activeStep ? refreshLabels[activeStep] : "Starting"}
        </div>
      </div>
      <div className="seo-progress-steps">
        {refreshSteps.map((step) => (
          <span
            key={step}
            className={`seo-progress-dot ${step === activeStep ? "active" : ""}`}
          >
            {refreshLabels[step]}
          </span>
        ))}
      </div>
      <div className="seo-progress-meta">
        <span>{data.competitors.length} competitors</span>
        <span>{data.opportunities.length} opportunities</span>
        <span>{data.competitorPages.length} pages</span>
      </div>
    </div>
  );
}

function PageHead({
  crumbs,
  title,
  right
}: {
  crumbs?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="seo-page-head">
      <div>
        {crumbs && <div className="seo-crumbs">{crumbs}</div>}
        <h1>{title}</h1>
      </div>
      {right}
    </div>
  );
}

function HeaderMeta({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="seo-h-meta">
      {items.map(([label, value]) => (
        <div className="seo-h-item" key={label}>
          <span className="seo-h-lbl">{label}</span>
          <span className="seo-h-val">{value}</span>
        </div>
      ))}
    </div>
  );
}

function LinkButton({
  children,
  onClick
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="seo-link" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function KpiRow({
  items
}: {
  items: Array<{ label: string; value: ReactNode; delta?: ReactNode }>;
}) {
  return (
    <div className="seo-kpi-row">
      {items.map((item) => (
        <div className="seo-kpi" key={item.label}>
          <div className="seo-kpi-lbl">{item.label}</div>
          <div className="seo-kpi-val">{item.value}</div>
          {item.delta && <div className="seo-kpi-delta">{item.delta}</div>}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="seo-empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action && <div className="seo-empty-action">{action}</div>}
    </div>
  );
}

function Overview({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: Route | { view: "opportunity"; id: string }) => void;
}) {
  const opportunities = data.opportunities;
  const totalVolume = opportunities.reduce((sum, row) => sum + row.volume, 0);
  const avgDiff =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce((sum, row) => sum + row.difficulty, 0) /
            opportunities.length
        )
      : 0;
  const highPriority = opportunities.filter((row) => row.tier === "P0").length;
  const quickWins = opportunities.filter(
    (row) => row.difficulty < 40 && row.volume > 2000
  ).length;
  const tierDist = (["P0", "P1", "P2", "P3"] as const).map((tier) => ({
    name: tier,
    label: tierLabel(tier),
    value: opportunities.filter((row) => row.tier === tier).length,
    color: `var(--seo-t-${tier.toLowerCase()})`
  }));
  const topClusters = [...data.clusters]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8);
  const topOpps = [...opportunities].sort((a, b) => b.score - a.score).slice(0, 8);
  const compRank = [...data.competitors].sort((a, b) => b.sharedEtv - a.sharedEtv);

  return (
    <>
      <PageHead
        crumbs={`SEO OPPORTUNITY REPORT · ${data.settings.locationName.toUpperCase()} · ${data.settings.languageName.toUpperCase()}`}
        title={
          <>
            Opportunity overview <span className="seo-muted-rule">—</span>{" "}
            <span className="seo-mono seo-title-domain">
              {targetDomainLabel(data.settings.targetDomain)}
            </span>
          </>
        }
        right={
          <HeaderMeta
            items={[
              ["Last pull", dateLabel(data.refresh.lastSuccessfulRefreshAt)],
              ["Credentials", data.credentials.configured ? "Saved" : "Missing"]
            ]}
          />
        }
      />

      {opportunities.length === 0 ? (
        <EmptyState
          title="No SEO data yet"
          body="Open setup, save validated DataForSEO credentials, then run Refresh all to populate this dashboard."
        />
      ) : (
        <>
          <KpiRow
            items={[
              {
                label: "Opportunities",
                value: opportunities.length,
                delta: `across ${data.clusters.length} clusters`
              },
              {
                label: "Total Search Volume",
                value: (
                  <>
                    {fmtNum(totalVolume)}
                    <span className="seo-unit">/mo</span>
                  </>
                ),
                delta: "deduped demand"
              },
              {
                label: "Avg Difficulty",
                value: (
                  <>
                    {avgDiff}
                    <span className="seo-unit">/100</span>
                  </>
                ),
                delta: "keyword difficulty"
              },
              {
                label: "High Priority",
                value: highPriority,
                delta: "tier P0 keywords"
              },
              {
                label: "Quick Wins",
                value: quickWins,
                delta: "diff < 40, vol > 2k"
              },
              {
                label: "Competitors",
                value: data.competitors.length,
                delta: `${data.competitors.filter((row) => row.source === "Manual").length} manual`
              }
            ]}
          />

          <div className="seo-grid-3 seo-gap-top">
            <div className="seo-card">
              <CardHeader title="Volume vs. difficulty" sub={`${opportunities.length} opportunities`} />
              <div className="seo-card-body">
                <Scatter
                  points={opportunities}
                  onClick={(opportunity) =>
                    go({ view: "opportunity", id: opportunity.id })
                  }
                />
              </div>
            </div>
            <div className="seo-card">
              <CardHeader title="Priority mix" sub="by tier" />
              <div className="seo-card-body seo-center">
                <Donut data={tierDist} centerSub="Opportunities" />
                <div className="seo-tier-list">
                  {tierDist.map((tier) => (
                    <div className="seo-tier-row" key={tier.name}>
                      <span style={{ background: tier.color }} />
                      <span>{tier.name} · {tier.label}</span>
                      <b>{tier.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="seo-card">
              <CardHeader
                title="Top clusters by volume"
                action={<LinkButton onClick={() => go({ view: "clusters" })}>View all</LinkButton>}
              />
              <div className="seo-card-body">
                <HBar data={topClusters} valueKey="volume" />
              </div>
            </div>
          </div>

          <SectionHead
            title="Top opportunities by priority score"
            action={<LinkButton onClick={() => go({ view: "opportunities" })}>See all {opportunities.length}</LinkButton>}
          />
          <OpportunitiesTable rows={topOpps} go={go} />

          <SectionHead
            title="Competitive landscape"
            action={<LinkButton onClick={() => go({ view: "competitors" })}>View all</LinkButton>}
          />
          <div className="seo-grid-2">
            <div className="seo-card">
              <CardHeader
                title="Shared opportunity (ETV)"
                sub="monthly est. organic traffic value"
              />
              <div className="seo-card-body">
                <VBar data={compRank.slice(0, 8)} valueKey="sharedEtv" />
              </div>
            </div>
            <div className="seo-card">
              <CardHeader title="Competitor footprint" sub="click to drill in" />
              <CompetitorFootprintTable
                competitors={compRank}
                go={(domain) => go({ view: "competitor", domain })}
              />
            </div>
          </div>

          <SectionHead
            title="Upcoming on the roadmap"
            action={<LinkButton onClick={() => go({ view: "roadmap" })}>Full roadmap</LinkButton>}
          />
          <RoadmapList rows={data.roadmap.slice(0, 6)} go={go} />
        </>
      )}
    </>
  );
}

function CardHeader({
  title,
  sub,
  action
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="seo-card-header">
      <span className="seo-card-title">{title}</span>
      {action ?? (sub && <span className="seo-card-sub">{sub}</span>)}
    </div>
  );
}

function SectionHead({
  title,
  action
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="seo-section-head">
      <h2>{title}</h2>
      <div>{action}</div>
    </div>
  );
}

function Opportunities({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: { view: "opportunity"; id: string } | Route) => void;
}) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("All");
  const [cluster, setCluster] = useState("All");
  const [sort, setSort] = useState<{ key: keyof SeoOpportunity; dir: 1 | -1 }>({
    key: "score",
    dir: -1
  });
  const clusterOptions = ["All", ...new Set(data.opportunities.map((row) => row.cluster))];
  const filtered = useMemo(() => {
    return data.opportunities
      .filter((row) =>
        query ? row.keyword.toLowerCase().includes(query.toLowerCase()) : true
      )
      .filter((row) => (tier === "All" ? true : row.tier === tier))
      .filter((row) => (cluster === "All" ? true : row.cluster === cluster))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];

        if (typeof av === "string" && typeof bv === "string") {
          return av.localeCompare(bv) * sort.dir;
        }

        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * sort.dir;
        }

        return 0;
      });
  }, [cluster, data.opportunities, query, sort, tier]);

  function setSortKey(key: keyof SeoOpportunity) {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === -1 ? 1 : -1 } : { key, dir: -1 }
    );
  }

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / OPPORTUNITIES</>}
        title="Opportunities"
        right={
          <HeaderMeta
            items={[
              ["Matching", `${filtered.length} of ${data.opportunities.length}`],
              ["Total volume", `${fmtNum(filtered.reduce((sum, row) => sum + row.volume, 0))}/mo`]
            ]}
          />
        }
      />
      <div className="seo-filters">
        <input
          className="seo-input"
          placeholder="Search keywords..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="seo-lbl-inline">Tier</span>
        <Segmented
          options={["All", "P0", "P1", "P2", "P3"]}
          value={tier}
          onChange={setTier}
        />
        <span className="seo-lbl-inline">Cluster</span>
        <select
          className="seo-input"
          value={cluster}
          onChange={(event) => setCluster(event.target.value)}
        >
          {clusterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <OpportunitiesTable rows={filtered} go={go} onSort={setSortKey} sort={sort} />
    </>
  );
}

function OpportunitiesTable({
  rows,
  go,
  onSort,
  sort
}: {
  rows: SeoOpportunity[];
  go: (route: { view: "opportunity"; id: string } | Route) => void;
  onSort?: (key: keyof SeoOpportunity) => void;
  sort?: { key: keyof SeoOpportunity; dir: 1 | -1 };
}) {
  const headers: Array<[keyof SeoOpportunity, string, string]> = [
    ["keyword", "Keyword", ""],
    ["cluster", "Cluster", ""],
    ["volume", "Volume", "num"],
    ["difficulty", "Difficulty", ""],
    ["cpc", "CPC", "num"],
    ["bestRank", "Best Rank", "num"],
    ["intent", "Intent", ""],
    ["tier", "Tier", ""],
    ["score", "Score", "num"]
  ];

  return (
    <div className="seo-card">
      <table className="seo-table">
        <thead>
          <tr>
            {headers.map(([key, label, cls]) => (
              <th
                key={key}
                className={`${cls} ${onSort ? "sortable" : ""} ${sort?.key === key ? "sorted" : ""}`}
                onClick={onSort ? () => onSort(key) : undefined}
              >
                {label}
                {sort?.key === key && <span className="seo-sort">{sort.dir === -1 ? "↓" : "↑"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="clickable"
              onClick={() => go({ view: "opportunity", id: row.id })}
            >
              <td>
                <div className="seo-kw">{row.keyword}</div>
                <div className="seo-url seo-tiny">{row.contentType}</div>
              </td>
              <td><span className="seo-cluster">{row.cluster}</span></td>
              <td className="num">{fmtNum(row.volume)}</td>
              <td><DiffPill value={row.difficulty} /></td>
              <td className="num">${row.cpc.toFixed(2)}</td>
              <td className="num">{row.bestRank ? `#${row.bestRank}` : "—"}</td>
              <td><span className="seo-chip soft">{row.intent}</span></td>
              <td><Tier tier={row.tier} /></td>
              <td className="num"><strong>{row.score}</strong></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="seo-empty-row">
                No keywords match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Competitors({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: Route) => void;
}) {
  const list = [...data.competitors].sort((a, b) => b.etv - a.etv);
  const maxKw = Math.max(1, ...list.map((row) => row.organicKw));

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / COMPETITORS</>}
        title="Competitors"
        right={
          <HeaderMeta
            items={[
              ["Discovered", list.length],
              ["Combined ETV", fmtMoney(list.reduce((sum, row) => sum + row.etv, 0))]
            ]}
          />
        }
      />
      {list.length === 0 ? (
        <EmptyState title="No competitors yet" body="Run a refresh to discover and merge competitor domains." />
      ) : (
        <>
          <div className="seo-grid-2">
            <div className="seo-card">
              <CardHeader title="Organic ETV" sub="monthly USD" />
              <div className="seo-card-body">
                <VBar data={list} valueKey="etv" />
              </div>
            </div>
            <div className="seo-card">
              <CardHeader title="Avg position vs. shared keywords" sub="lower position = stronger" />
              <div className="seo-card-body">
                <Scatter
                  points={list.map((row) => ({
                    id: row.domain,
                    keyword: row.domain,
                    difficulty: row.avgPos,
                    volume: row.sharedKw,
                    score: Math.max(20, row.sharedKw / 10),
                    tier: "P1" as const
                  }))}
                />
              </div>
            </div>
          </div>
          <SectionHead title="All competitors" />
          <div className="seo-card">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th className="num">Organic Kw</th>
                  <th className="num">Organic ETV</th>
                  <th className="num">Shared Kw</th>
                  <th className="num">Shared ETV</th>
                  <th className="num">Avg Pos</th>
                  <th>Footprint</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.domain}
                    className="clickable"
                    onClick={() => go({ view: "competitor", domain: row.domain })}
                  >
                    <td><span className="seo-mono">{row.domain}</span></td>
                    <td className="num">{fmtNum(row.organicKw)}</td>
                    <td className="num">{fmtMoney(row.etv)}</td>
                    <td className="num">{fmtNum(row.sharedKw)}</td>
                    <td className="num">{fmtMoney(row.sharedEtv)}</td>
                    <td className="num">{row.avgPos ? row.avgPos.toFixed(1) : "—"}</td>
                    <td><BarCell value={row.organicKw} max={maxKw} /></td>
                    <td><span className="seo-chip">{row.source}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function CompetitorFootprintTable({
  competitors,
  go
}: {
  competitors: SeoCompetitor[];
  go: (domain: string) => void;
}) {
  const maxEtv = Math.max(1, ...competitors.map((row) => row.etv));

  return (
    <table className="seo-table">
      <thead>
        <tr>
          <th>Competitor</th>
          <th className="num">Org. Kw</th>
          <th className="num">Shared</th>
          <th className="num">Avg Pos</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {competitors.map((row) => (
          <tr key={row.domain} className="clickable" onClick={() => go(row.domain)}>
            <td><span className="seo-mono">{row.domain}</span></td>
            <td className="num">{fmtNum(row.organicKw)}</td>
            <td className="num">{fmtNum(row.sharedKw)}</td>
            <td className="num">{row.avgPos ? row.avgPos.toFixed(1) : "—"}</td>
            <td><BarCell value={row.etv} max={maxEtv} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CompetitorDetail({
  data,
  domain,
  go
}: {
  data: SeoDashboardData;
  domain: string;
  go: (route: Route | { view: "opportunity"; id: string }) => void;
}) {
  const competitor = data.competitors.find((row) => row.domain === domain);
  const pages = data.competitorPages
    .filter((row) => row.competitorDomain === domain)
    .sort((a, b) => b.etv - a.etv);
  const keywords = data.opportunities.filter((row) => row.bestCompetitor === domain);
  const [tab, setTab] = useState<"pages" | "keywords">("pages");

  if (!competitor) {
    return <EmptyState title="Competitor not found" body="Return to the competitor list and choose another domain." />;
  }

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / <LinkButton onClick={() => go({ view: "competitors" })}>Competitors</LinkButton> / {domain.toUpperCase()}</>}
        title={<span className="seo-mono seo-detail-title">{domain}</span>}
        right={<HeaderMeta items={[["Avg position", competitor.avgPos ? competitor.avgPos.toFixed(1) : "—"], ["Top pages", pages.length]]} />}
      />
      <KpiRow
        items={[
          { label: "Organic Kw", value: fmtNum(competitor.organicKw) },
          { label: "Organic ETV", value: fmtMoney(competitor.etv) },
          { label: "Shared Kw", value: fmtNum(competitor.sharedKw) },
          { label: "Shared ETV", value: fmtMoney(competitor.sharedEtv) },
          { label: "Paid Cost Est.", value: fmtMoney(competitor.paidCost) },
          {
            label: "Overlap %",
            value: competitor.organicKw
              ? `${((competitor.sharedKw / competitor.organicKw) * 100).toFixed(1)}%`
              : "—"
          }
        ]}
      />
      <div className="seo-tabs">
        <button className={tab === "pages" ? "active" : ""} type="button" onClick={() => setTab("pages")}>
          Top Pages
        </button>
        <button className={tab === "keywords" ? "active" : ""} type="button" onClick={() => setTab("keywords")}>
          Shared Keywords
        </button>
      </div>
      {tab === "pages" ? (
        <PagesList pages={pages} go={go} />
      ) : (
        <OpportunitiesTable rows={keywords} go={go} />
      )}
    </>
  );
}

function Clusters({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: Route) => void;
}) {
  const list = [...data.clusters].sort((a, b) => b.volume - a.volume);
  const maxVol = Math.max(1, ...list.map((row) => row.volume));

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / CLUSTERS</>}
        title="Topic clusters"
        right={<HeaderMeta items={[["Clusters", list.length], ["Combined volume", `${fmtNum(list.reduce((sum, row) => sum + row.volume, 0))}/mo`]]} />}
      />
      {list.length === 0 ? (
        <EmptyState title="No clusters yet" body="Clusters will appear after opportunities are scored." />
      ) : (
        <>
          <div className="seo-card">
            <CardHeader title="Cluster map" sub="sized by monthly search volume" />
            <div className="seo-card-body flush">
              <Treemap data={list} onClick={(cluster) => go({ view: "cluster", name: cluster.name })} />
            </div>
          </div>
          <SectionHead title="All clusters" />
          <div className="seo-card">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Cluster</th>
                  <th className="num">Keywords</th>
                  <th className="num">Total Volume</th>
                  <th className="num">Avg Difficulty</th>
                  <th className="num">Max Score</th>
                  <th>Priority</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.name} className="clickable" onClick={() => go({ view: "cluster", name: row.name })}>
                    <td><div className="seo-kw">{row.name}</div></td>
                    <td className="num">{row.keywords}</td>
                    <td className="num">{fmtNum(row.volume)}</td>
                    <td><DiffPill value={row.avgDiff} /></td>
                    <td className="num"><strong>{row.maxScore}</strong></td>
                    <td><Tier tier={row.priority} /></td>
                    <td><BarCell value={row.volume} max={maxVol} kind="score" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function ClusterDetail({
  data,
  name,
  go
}: {
  data: SeoDashboardData;
  name: string;
  go: (route: Route | { view: "opportunity"; id: string }) => void;
}) {
  const cluster = data.clusters.find((row) => row.name === name);
  const opportunities = data.opportunities
    .filter((row) => row.cluster === name)
    .sort((a, b) => b.score - a.score);

  if (!cluster) {
    return <EmptyState title="Cluster not found" body="Return to the cluster list and choose another topic." />;
  }

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / <LinkButton onClick={() => go({ view: "clusters" })}>Clusters</LinkButton> / {name.toUpperCase()}</>}
        title={name}
      />
      <KpiRow
        items={[
          { label: "Keywords in cluster", value: cluster.keywords },
          { label: "Total volume", value: <>{fmtNum(cluster.volume)}<span className="seo-unit">/mo</span></> },
          { label: "Avg difficulty", value: cluster.avgDiff },
          { label: "Max priority score", value: cluster.maxScore },
          { label: "Priority", value: <Tier tier={cluster.priority} /> },
          { label: "Opportunities", value: opportunities.length }
        ]}
      />
      <div className="seo-grid-2 seo-gap-top">
        <div className="seo-card">
          <CardHeader title="Volume vs difficulty" />
          <div className="seo-card-body">
            <Scatter points={opportunities} onClick={(row) => go({ view: "opportunity", id: row.id })} />
          </div>
        </div>
        <div className="seo-card">
          <CardHeader title="Intent mix" />
          <div className="seo-card-body seo-center">
            <Donut
              data={["Informational", "Commercial", "Transactional", "Navigational"].map((intent, index) => ({
                name: intent,
                value: opportunities.filter((row) => row.intent === intent).length,
                color: ["var(--seo-forest)", "var(--seo-oxblood)", "var(--seo-ochre)", "var(--seo-ink-3)"][index]
              })).filter((row) => row.value > 0)}
              centerSub="Keywords"
            />
          </div>
        </div>
      </div>
      <SectionHead title={`Keywords in ${name}`} />
      <OpportunitiesTable rows={opportunities} go={go} />
    </>
  );
}

function Roadmap({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: { view: "opportunity"; id: string } | Route) => void;
}) {
  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / ROADMAP</>}
        title="Content roadmap"
        right={<HeaderMeta items={[["Scheduled", data.roadmap.length], ["Backlog", data.roadmap.filter((row) => row.status === "Backlog").length]]} />}
      />
      <RoadmapList rows={data.roadmap} go={go} />
    </>
  );
}

function RoadmapList({
  rows,
  go
}: {
  rows: SeoRoadmapItem[];
  go: (route: { view: "opportunity"; id: string } | Route) => void;
}) {
  const grouped = rows.reduce<Record<string, SeoRoadmapItem[]>>((acc, row) => {
    const key = row.publishDate
      ? new Date(`${row.publishDate}T00:00:00`).toLocaleString(undefined, {
          month: "long",
          year: "numeric"
        })
      : "Unscheduled";
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  return (
    <div className="seo-card">
      <div className="seo-card-body roadmap">
        {rows.length === 0 && <div className="seo-empty-row">No roadmap rows yet.</div>}
        {Object.entries(grouped).map(([month, items]) => (
          <div className="seo-timeline" key={month}>
            <div className="seo-timeline-date">
              {month.split(" ")[0].toUpperCase()}
              <span>{month.split(" ")[1] ?? ""}</span>
            </div>
            <div className="seo-timeline-items">
              {items.map((item) => (
                <div
                  className="seo-timeline-item"
                  key={item.id}
                  onClick={() => go({ view: "opportunity", id: item.id })}
                >
                  <div className={`seo-dot ${item.priority}`} />
                  <div>
                    <div className="seo-ti-kw">{item.targetKeyword}</div>
                    <div className="seo-ti-meta">
                      {item.cluster} · {item.contentType} · {item.owner !== "—" ? item.owner : "Unassigned"}
                    </div>
                  </div>
                  <div className="seo-ti-right">
                    <span>{fmtNum(item.searchVolume)}</span>
                    <br />
                    <span className="seo-status">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorPages({
  data,
  go
}: {
  data: SeoDashboardData;
  go: (route: Route) => void;
}) {
  const [domain, setDomain] = useState("All");
  const [type, setType] = useState("All");
  const [query, setQuery] = useState("");
  const pages = [...data.competitorPages].sort((a, b) => b.etv - a.etv);
  const domains = ["All", ...new Set(pages.map((page) => page.competitorDomain))];
  const types = ["All", "Blog", "Resource", "Tool", "Landing"];
  const filtered = pages.filter(
    (page) =>
      (domain === "All" || page.competitorDomain === domain) &&
      (type === "All" || page.pageType === type) &&
      (!query || page.pageUrl.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / COMPETITOR PAGES</>}
        title="Competitor pages"
        right={<HeaderMeta items={[["Pages indexed", `${filtered.length} of ${pages.length}`], ["Combined ETV", fmtMoney(filtered.reduce((sum, page) => sum + page.etv, 0))]]} />}
      />
      <div className="seo-filters">
        <input
          className="seo-input"
          placeholder="Search URLs..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="seo-lbl-inline">Domain</span>
        <select className="seo-input" value={domain} onChange={(event) => setDomain(event.target.value)}>
          {domains.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <span className="seo-lbl-inline">Type</span>
        <Segmented options={types} value={type} onChange={setType} />
      </div>
      <PagesTable pages={filtered} go={go} />
    </>
  );
}

function PagesList({
  pages,
  go
}: {
  pages: SeoCompetitorPage[];
  go: (route: Route) => void;
}) {
  return <PagesTable pages={pages.slice(0, 80)} go={go} />;
}

function PagesTable({
  pages,
  go
}: {
  pages: SeoCompetitorPage[];
  go: (route: Route) => void;
}) {
  return (
    <div className="seo-card">
      <table className="seo-table">
        <thead>
          <tr>
            <th>URL</th>
            <th>Type</th>
            <th className="num">Est. Traffic</th>
            <th className="num">Rankings</th>
            <th className="num">Pos 1</th>
            <th className="num">Pos 2-3</th>
            <th className="num">Pos 4-10</th>
            <th className="num">Move</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className="clickable" onClick={() => go({ view: "page", id: page.id })}>
              <td>
                <div className="seo-mono seo-tiny">{page.competitorDomain}</div>
                <div className="seo-url">{page.urlPath}</div>
              </td>
              <td><span className="seo-chip">{page.pageType}</span></td>
              <td className="num">{fmtNum(page.etv)}</td>
              <td className="num">{page.rankings}</td>
              <td className="num">{page.pos1}</td>
              <td className="num">{page.pos23}</td>
              <td className="num">{page.pos410}</td>
              <td className="num">
                <span className={page.up > page.down ? "seo-pos" : "seo-neg"}>
                  {page.up > page.down ? "↑" : "↓"}{Math.abs(page.up - page.down)}
                </span>
              </td>
            </tr>
          ))}
          {pages.length === 0 && (
            <tr>
              <td colSpan={8} className="seo-empty-row">No pages match.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PageDetail({
  data,
  id,
  go
}: {
  data: SeoDashboardData;
  id: string;
  go: (route: Route | { view: "opportunity"; id: string }) => void;
}) {
  const page = data.competitorPages.find((row) => row.id === id);
  const keywords = data.pageKeywords
    .filter((row) => row.pageUrl === page?.pageUrl)
    .sort((a, b) => b.searchVolume - a.searchVolume);

  if (!page) {
    return <EmptyState title="Page not found" body="Return to competitor pages and choose another URL." />;
  }

  return (
    <>
      <PageHead
        crumbs={<><LinkButton onClick={() => go({ view: "overview" })}>Overview</LinkButton> / <LinkButton onClick={() => go({ view: "pages" })}>Pages</LinkButton> / {page.competitorDomain.toUpperCase()}</>}
        title={<span className="seo-mono seo-page-url-title">{page.pageUrl}</span>}
      />
      <KpiRow
        items={[
          { label: "Type", value: page.pageType },
          { label: "Est. Traffic", value: <>{fmtNum(page.etv)}<span className="seo-unit">/mo</span></> },
          { label: "Rankings", value: page.rankings },
          { label: "Paid Cost Est.", value: fmtMoney(page.paidCost) },
          { label: "New Rankings", value: page.newRanks },
          { label: "Lost", value: page.lost }
        ]}
      />
      <div className="seo-grid-2 seo-gap-top">
        <div className="seo-card">
          <CardHeader title="Ranking distribution" sub="by position" />
          <div className="seo-card-body">
            <HBar
              data={[
                { name: "Position 1", value: page.pos1 },
                { name: "Positions 2-3", value: page.pos23 },
                { name: "Positions 4-10", value: page.pos410 },
                { name: "Positions 11-20", value: page.pos1120 }
              ]}
              valueKey="value"
            />
          </div>
        </div>
        <div className="seo-card">
          <CardHeader title="Movement" sub="since last pull" />
          <div className="seo-card-body">
            <HBar
              data={[
                { name: "New rankings", value: page.newRanks },
                { name: "Moved up", value: page.up },
                { name: "Moved down", value: page.down },
                { name: "Lost", value: page.lost }
              ]}
              valueKey="value"
            />
          </div>
        </div>
      </div>
      <SectionHead title="Page keywords" />
      <PageKeywordsTable rows={keywords} />
    </>
  );
}

function PageKeywordsTable({ rows }: { rows: SeoPageKeyword[] }) {
  return (
    <div className="seo-card">
      <table className="seo-table">
        <thead>
          <tr>
            <th>Keyword</th>
            <th className="num">Volume</th>
            <th>Difficulty</th>
            <th className="num">Page Rank</th>
            <th className="num">Keyword ETV</th>
            <th>Intent</th>
            <th>URL on SERP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.pageUrl}:${row.keyword}`}>
              <td><div className="seo-kw">{row.keyword}</div></td>
              <td className="num">{fmtNum(row.searchVolume)}</td>
              <td><DiffPill value={row.keywordDifficulty} /></td>
              <td className="num">{row.pageRank ? `#${row.pageRank}` : "—"}</td>
              <td className="num">{fmtMoney(row.keywordEtv)}</td>
              <td><span className="seo-chip soft">{row.intent}</span></td>
              <td><span className="seo-url">{row.urlOnSerp || row.pageUrl}</span></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="seo-empty-row">No page keywords pulled for this URL.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OpportunityDrawer({
  opportunity,
  onClose
}: {
  opportunity: SeoOpportunity | null;
  onClose: () => void;
}) {
  const open = Boolean(opportunity);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className={`seo-drawer-bg ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`seo-drawer ${open ? "open" : ""}`}>
        {opportunity && (
          <>
            <div className="seo-drawer-header">
              <div className="seo-crumbs">{opportunity.cluster.toUpperCase()} · KEYWORD DETAIL</div>
              <h3>{opportunity.keyword}</h3>
              <button type="button" onClick={onClose}>×</button>
              <div className="seo-drawer-pills">
                <Tier tier={opportunity.tier} />
                <span className="seo-chip">{opportunity.intent}</span>
                <span className="seo-chip">{opportunity.contentType}</span>
                <span className="seo-chip soft">Priority {opportunity.score}</span>
              </div>
            </div>
            <div className="seo-drawer-body">
              <div className="seo-stat-grid">
                <div><span>Volume</span><b>{fmtNum(opportunity.volume)}</b></div>
                <div><span>Difficulty</span><b>{opportunity.difficulty}</b></div>
                <div><span>CPC</span><b>${opportunity.cpc.toFixed(2)}</b></div>
                <div><span>Competitors</span><b>{opportunity.competitorCount}</b></div>
              </div>
              <DetailRow label="Why it matters">{opportunity.whyItMatters}</DetailRow>
              <DetailRow label="Best URL">
                <span className="seo-url">{opportunity.bestUrl || "No ranking URL captured"}</span>
              </DetailRow>
              <DetailRow label="Best competitor">
                {opportunity.bestCompetitor || "—"}
              </DetailRow>
              <DetailRow label="SERP features">
                {opportunity.serpFeatures.length > 0 ? opportunity.serpFeatures.join(", ") : "—"}
              </DetailRow>
              <DetailRow label="Trends">
                Monthly {opportunity.monthlyTrend}% · Yearly {opportunity.yearlyTrend}%
              </DetailRow>
              <DetailRow label="Roadmap">
                {opportunity.publishDate ? dateLabel(opportunity.publishDate) : "Unscheduled"} · {opportunity.status}
              </DetailRow>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="seo-detail-row">
      <div>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SetupModal({
  open,
  data,
  onClose,
  onSaved,
  onRefresh
}: {
  open: boolean;
  data: SeoDashboardData;
  onClose: () => void;
  onSaved: (data: SeoDashboardData) => void;
  onRefresh: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<SeoSettings>(data.settings);
  const [tab, setTab] = useState("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(data.settings);
  }, [data.settings]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("keydown", onKey);
    }

    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  function update<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateWeight(key: keyof SeoSettings["weights"], value: number) {
    setSettings((current) => ({
      ...current,
      weights: {
        ...current.weights,
        [key]: value
      }
    }));
  }

  function updateCompetitor(
    index: number,
    key: keyof SeoSettings["manualCompetitors"][number],
    value: string | boolean
  ) {
    setSettings((current) => {
      const rows = [...current.manualCompetitors];
      rows[index] = { ...rows[index], [key]: value };
      return { ...current, manualCompetitors: rows };
    });
  }

  function updateSeed(
    index: number,
    key: keyof SeoSeedKeyword,
    value: string | boolean
  ) {
    setSettings((current) => {
      const rows = [...current.seedKeywords];
      rows[index] = { ...rows[index], [key]: value };
      return { ...current, seedKeywords: rows };
    });
  }

  async function save(refreshAfterSave: boolean) {
    setSaving(true);
    setMessage(null);
    const result = await saveSeoSetupAction({
      settings,
      credentials:
        login.trim() || password
          ? {
              login,
              password
            }
          : undefined
    });
    setSaving(false);

    if (result.status === "error") {
      setMessage(result.message);
      return;
    }

    setLogin("");
    setPassword("");
    onSaved(result.data);
    setMessage(result.message ?? "Setup saved.");

    if (refreshAfterSave) {
      onClose();
      await onRefresh();
    }
  }

  const weightSum = Object.values(settings.weights).reduce((sum, value) => sum + value, 0);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className={`seo-modal-bg ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`seo-modal ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="seo-modal-header">
          <div>
            <div className="seo-crumbs">SEO OPPORTUNITY REPORT · CONFIGURATION</div>
            <h3>Setup</h3>
            <p>Edit inputs before pulling from DataForSEO. Changes affect every refresh.</p>
          </div>
          <button type="button" className="seo-close" onClick={onClose}>×</button>
        </div>
        <div className="seo-modal-tabs">
          {[
            ["credentials", "Credentials"],
            ["market", "Market & target"],
            ["pages", "Page pulls"],
            ["limits", "API limits"],
            ["scoring", "Scoring"],
            ["seeds", "Competitors & seeds"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="seo-modal-body">
          {message && <div className="seo-form-message">{message}</div>}
          {tab === "credentials" && (
            <SetupSection
              title="DataForSEO credentials"
              desc="Credentials are validated with DataForSEO and then stored encrypted for this signed-in user."
            >
              <FieldGrid>
                <Field label="API login" hint={data.credentials.loginHint ? `Saved as ${data.credentials.loginHint}` : "From DataForSEO API Access."}>
                  <input className="seo-input" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" placeholder="api-login@example.com" />
                </Field>
                <Field label="API password" hint="Use the raw API password, not your account password. Basic/Base64 tokens are decoded before saving.">
                  <input className="seo-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder={data.credentials.configured ? "Leave blank to keep saved password" : "Raw API password"} />
                </Field>
              </FieldGrid>
              <div className="seo-credential-status">
                <span className={data.credentials.configured ? "configured" : ""}>
                  {data.credentials.configured ? "Credentials saved" : "No credentials saved"}
                </span>
                {data.credentials.validatedAt && <span>Validated {dateLabel(data.credentials.validatedAt)}</span>}
              </div>
            </SetupSection>
          )}
          {tab === "market" && (
            <SetupSection title="Market & target" desc="DataForSEO targets the bare domain in this country/language combination.">
              <FieldGrid>
                <Field label="Target domain" hint="Bare domain only, no https:// or www.">
                  <input
                    className="seo-input"
                    placeholder="example.com"
                    value={settings.targetDomain}
                    onChange={(event) => update("targetDomain", event.target.value)}
                  />
                </Field>
                <Field label="Location code" hint="DataForSEO location ID.">
                  <NumberInput value={settings.locationCode} onChange={(value) => update("locationCode", value)} />
                </Field>
                <Field label="Location name">
                  <input className="seo-input" value={settings.locationName} onChange={(event) => update("locationName", event.target.value)} />
                </Field>
                <Field label="Language code">
                  <input className="seo-input seo-mono" value={settings.languageCode} onChange={(event) => update("languageCode", event.target.value)} />
                </Field>
                <Field label="Language name">
                  <input className="seo-input" value={settings.languageName} onChange={(event) => update("languageName", event.target.value)} />
                </Field>
              </FieldGrid>
            </SetupSection>
          )}
          {tab === "pages" && (
            <SetupSection title="Competitor page settings" desc="Controls page-level pulls and DataForSEO cost.">
              <FieldGrid>
                <Field label="Top pages limit per competitor">
                  <Stepper value={settings.topPagesPerCompetitor} onChange={(value) => update("topPagesPerCompetitor", value)} min={1} max={200} />
                </Field>
                <Field label="Page keyword limit per page">
                  <Stepper value={settings.pageKwLimit} onChange={(value) => update("pageKwLimit", value)} min={1} max={200} />
                </Field>
                <Field label="Top pages to enrich per competitor">
                  <Stepper value={settings.pagesToEnrich} onChange={(value) => update("pagesToEnrich", value)} min={1} max={50} />
                </Field>
                <Field label="Minimum page ETV">
                  <Stepper value={settings.minPageEtv} onChange={(value) => update("minPageEtv", value)} min={0} max={1_000_000} step={100} />
                </Field>
              </FieldGrid>
              <CostEstimate settings={settings} />
            </SetupSection>
          )}
          {tab === "limits" && (
            <SetupSection title="API limits & cost controls" desc="Set pull sizes. Higher numbers cost more credits.">
              <FieldGrid>
                <Field label="Max competitor domains">
                  <Stepper value={settings.maxCompetitors} onChange={(value) => update("maxCompetitors", value)} min={1} max={50} />
                </Field>
                <Field label="Keyword limit per competitor">
                  <Stepper value={settings.kwLimitPerCompetitor} onChange={(value) => update("kwLimitPerCompetitor", value)} min={10} max={1000} step={50} />
                </Field>
                <Field label="Seed suggestions per seed">
                  <Stepper value={settings.seedSuggestionsLimit} onChange={(value) => update("seedSuggestionsLimit", value)} min={10} max={500} step={10} />
                </Field>
                <Field label="Minimum search volume">
                  <Stepper value={settings.minSearchVolume} onChange={(value) => update("minSearchVolume", value)} min={0} max={100000} step={10} />
                </Field>
              </FieldGrid>
              <div className="seo-toggle-row">
                <Toggle label="Pull SERP info" desc="Returns SERP features and check URLs." value={settings.pullSerpInfo} onChange={(value) => update("pullSerpInfo", value)} />
                <Toggle label="Include clickstream data" desc="May increase DataForSEO cost if supported for the endpoint." value={settings.includeClickstream} onChange={(value) => update("includeClickstream", value)} />
              </div>
            </SetupSection>
          )}
          {tab === "scoring" && (
            <SetupSection title="Scoring weights" desc="How Priority Score is computed. Weights should sum to 1.0.">
              <Weight label="Search volume" value={settings.weights.volume} onChange={(value) => updateWeight("volume", value)} />
              <Weight label="Low difficulty" value={settings.weights.lowDifficulty} onChange={(value) => updateWeight("lowDifficulty", value)} />
              <Weight label="Competitor proof" value={settings.weights.competitorProof} onChange={(value) => updateWeight("competitorProof", value)} />
              <Weight label="Intent" value={settings.weights.intent} onChange={(value) => updateWeight("intent", value)} />
              <Weight label="Trend" value={settings.weights.trend} onChange={(value) => updateWeight("trend", value)} />
              <div className="seo-weight-total">
                <span>Total</span>
                <b className={Math.abs(weightSum - 1) < 0.001 ? "ok" : ""}>{weightSum.toFixed(2)}</b>
              </div>
              <FieldGrid>
                <Field label="High priority threshold">
                  <Stepper value={settings.highThreshold} onChange={(value) => update("highThreshold", value)} min={50} max={100} />
                </Field>
                <Field label="Medium priority threshold">
                  <Stepper value={settings.mediumThreshold} onChange={(value) => update("mediumThreshold", value)} min={20} max={settings.highThreshold - 1} />
                </Field>
              </FieldGrid>
            </SetupSection>
          )}
          {tab === "seeds" && (
            <>
              <SetupSection title="Manual competitor domains" desc="Always pulled, regardless of discovery overlap.">
                <ListEditor
                  rows={settings.manualCompetitors}
                  columns={[
                    { key: "domain", label: "Domain", placeholder: "competitor.com", mono: true },
                    { key: "notes", label: "Notes", placeholder: "Why this competitor?" }
                  ]}
                  onChange={updateCompetitor}
                  onAdd={() => update("manualCompetitors", [...settings.manualCompetitors, { domain: "", notes: "", active: true }])}
                  onRemove={(index) => update("manualCompetitors", settings.manualCompetitors.filter((_, rowIndex) => rowIndex !== index))}
                />
              </SetupSection>
              <SetupSection title="Seed keywords" desc="Used by Keyword Suggestions and Related Keywords.">
                <ListEditor
                  rows={settings.seedKeywords}
                  columns={[
                    { key: "keyword", label: "Keyword", placeholder: "lease agreement template" },
                    { key: "notes", label: "Notes", placeholder: "Optional context" }
                  ]}
                  onChange={updateSeed}
                  onAdd={() => update("seedKeywords", [...settings.seedKeywords, { keyword: "", notes: "", active: true }])}
                  onRemove={(index) => update("seedKeywords", settings.seedKeywords.filter((_, rowIndex) => rowIndex !== index))}
                />
              </SetupSection>
            </>
          )}
        </div>
        <div className="seo-modal-footer">
          <span>Last refresh <b>{dateLabel(data.refresh.lastSuccessfulRefreshAt)}</b></span>
          <div>
            <button type="button" className="seo-btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="seo-btn secondary" disabled={saving} onClick={() => save(false)}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className="seo-btn primary" disabled={saving} onClick={() => save(true)}>
              Save & refresh
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SetupSection({
  title,
  desc,
  children
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="seo-setup-section">
      <div className="seo-setup-section-head">
        <h4>{title}</h4>
        {desc && <p>{desc}</p>}
      </div>
      <div className="seo-setup-section-body">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="seo-field-grid">{children}</div>;
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="seo-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function NumberInput({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className="seo-input seo-mono"
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
    />
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="seo-stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))}>−</button>
      <input
        className="seo-input seo-mono"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
      />
      <button type="button" onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="seo-toggle">
      <span>
        <b>{label}</b>
        <small>{desc}</small>
      </span>
      <button type="button" className={value ? "on" : ""} onClick={() => onChange(!value)}>
        <span />
      </button>
    </label>
  );
}

function Weight({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="seo-weight">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <b>{value.toFixed(2)}</b>
    </div>
  );
}

function ListEditor<T extends { active: boolean; notes: string }>({
  rows,
  columns,
  onChange,
  onAdd,
  onRemove
}: {
  rows: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    placeholder: string;
    mono?: boolean;
  }>;
  onChange: (index: number, key: keyof T, value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="seo-list-edit">
      <div className="seo-list-head">
        {columns.map((column) => (
          <span key={String(column.key)}>{column.label}</span>
        ))}
        <span>Active</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div className="seo-list-row" key={index}>
          {columns.map((column) => (
            <input
              key={String(column.key)}
              className={`seo-input ${column.mono ? "seo-mono" : ""}`}
              placeholder={column.placeholder}
              value={String(row[column.key] ?? "")}
              onChange={(event) => onChange(index, column.key, event.target.value)}
            />
          ))}
          <input
            type="checkbox"
            checked={row.active}
            onChange={(event) => onChange(index, "active", event.target.checked)}
          />
          <button type="button" onClick={() => onRemove(index)}>×</button>
        </div>
      ))}
      <button type="button" className="seo-btn ghost" onClick={onAdd}>Add row</button>
    </div>
  );
}

function CostEstimate({ settings }: { settings: SeoSettings }) {
  const competitors = settings.maxCompetitors;
  const pageCalls = competitors * settings.pagesToEnrich;
  const keywordCalls = competitors;
  const seedCalls = settings.seedKeywords.filter((seed) => seed.active && seed.keyword).length * 2;
  const total = pageCalls + keywordCalls + seedCalls + 2;

  return (
    <div className="seo-cost-est">
      <div>
        <span>Estimated API calls per refresh</span>
        <b>{total}</b>
      </div>
      <div className="seo-cost-bar">
        <span style={{ flex: Math.max(keywordCalls, 1) }} />
        <span style={{ flex: Math.max(pageCalls, 1) }} />
        <span style={{ flex: Math.max(seedCalls, 1) }} />
      </div>
      <small>
        {keywordCalls} keyword pulls · {pageCalls} page enrichment · {seedCalls} seed expansions
      </small>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="seo-segmented">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={option === value ? "active" : ""}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Tier({ tier }: { tier: SeoOpportunity["tier"] | SeoCluster["priority"] }) {
  return <span className={`seo-tier ${tier}`}>{tier}</span>;
}

function DiffPill({ value }: { value: number }) {
  const cls = value < 35 ? "easy" : value < 50 ? "medium" : "hard";
  return <span className={`seo-diff ${cls}`}>{value}</span>;
}

function BarCell({
  value,
  max,
  kind = ""
}: {
  value: number;
  max: number;
  kind?: string;
}) {
  return (
    <div className="seo-bar-cell">
      <span>{fmtNum(value)}</span>
      <div className={kind}>
        <i style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

type ScatterPoint = Pick<SeoOpportunity, "id" | "keyword" | "difficulty" | "volume" | "score" | "tier">;

function Scatter({
  points,
  onClick
}: {
  points: ScatterPoint[];
  onClick?: (point: ScatterPoint) => void;
}) {
  const width = 720;
  const height = 330;
  const pad = { t: 18, r: 18, b: 42, l: 56 };
  const maxX = Math.max(70, ...points.map((point) => point.difficulty + 4));
  const maxY = Math.max(1, ...points.map((point) => point.volume * 1.08));
  const x = (value: number) => pad.l + (value / maxX) * (width - pad.l - pad.r);
  const y = (value: number) =>
    height - pad.b - (value / maxY) * (height - pad.t - pad.b);

  return (
    <svg className="seo-chart" viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={pad.l} y1={y(maxY * tick)} x2={width - pad.r} y2={y(maxY * tick)} className="grid" />
          <text x={pad.l - 8} y={y(maxY * tick) + 4} textAnchor="end">{fmtNum(maxY * tick)}</text>
        </g>
      ))}
      {[0, 20, 40, 60, 80].map((tick) => (
        <text key={tick} x={x(tick)} y={height - pad.b + 18} textAnchor="middle">{tick}</text>
      ))}
      <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} className="axis" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} className="axis" />
      <line x1={x(40)} y1={pad.t} x2={x(40)} y2={height - pad.b} className="divider" />
      {points.map((point) => (
        <circle
          key={point.id}
          cx={x(point.difficulty)}
          cy={y(point.volume)}
          r={Math.max(3, Math.sqrt(point.score || 50) * 0.8)}
          className={`bubble ${point.tier}`}
          onClick={onClick ? () => onClick(point) : undefined}
        >
          <title>{point.keyword} · vol {fmtNum(point.volume)} · diff {point.difficulty}</title>
        </circle>
      ))}
    </svg>
  );
}

function Donut({
  data,
  centerSub
}: {
  data: Array<{ name: string; value: number; color: string }>;
  centerSub?: string;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const inner = radius - 24;
  const sum = data.reduce((total, item) => total + item.value, 0) || 1;
  let angle = -Math.PI / 2;

  return (
    <svg className="seo-donut" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item) => {
        const fraction = item.value / sum;
        const start = angle;
        const end = angle + fraction * Math.PI * 2;
        angle = end;
        const large = end - start > Math.PI ? 1 : 0;
        const x0 = cx + radius * Math.cos(start);
        const y0 = cy + radius * Math.sin(start);
        const x1 = cx + radius * Math.cos(end);
        const y1 = cy + radius * Math.sin(end);
        const xi0 = cx + inner * Math.cos(end);
        const yi0 = cy + inner * Math.sin(end);
        const xi1 = cx + inner * Math.cos(start);
        const yi1 = cy + inner * Math.sin(start);
        const path = `M${x0},${y0} A${radius},${radius} 0 ${large} 1 ${x1},${y1} L${xi0},${yi0} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`;

        return <path key={item.name} d={path} fill={item.color} />;
      })}
      <text x={cx} y={cy + 4} className="center">{fmtNum(sum)}</text>
      {centerSub && <text x={cx} y={cy + 23} className="sub">{centerSub}</text>}
    </svg>
  );
}

function HBar<T extends { name: string }>({
  data,
  valueKey
}: {
  data: T[];
  valueKey: keyof T;
}) {
  const width = 520;
  const labelWidth = 180;
  const valueWidth = 70;
  const rowHeight = 28;
  const max = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0));
  const barWidth = width - labelWidth - valueWidth - 16;

  return (
    <svg className="seo-hbar" viewBox={`0 0 ${width} ${Math.max(rowHeight, data.length * rowHeight + 6)}`}>
      {data.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        const y = index * rowHeight + 6;
        return (
          <g key={`${row.name}-${index}`}>
            <text x={labelWidth - 12} y={y + rowHeight / 2 + 4} textAnchor="end">{row.name}</text>
            <rect x={labelWidth} y={y + rowHeight / 2 - 5} width={barWidth} height={1} className="track" />
            <rect x={labelWidth} y={y + rowHeight / 2 - 6} width={(value / max) * barWidth} height={3} className="bar" />
            <text x={labelWidth + barWidth + 8} y={y + rowHeight / 2 + 4}>{fmtNum(value)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function VBar<T extends SeoCompetitor>({
  data,
  valueKey
}: {
  data: T[];
  valueKey: keyof Pick<SeoCompetitor, "etv" | "sharedEtv">;
}) {
  const width = 720;
  const height = 240;
  const pad = { t: 14, r: 12, b: 62, l: 12 };
  const max = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0)) * 1.1;
  const colWidth = (width - pad.l - pad.r) / Math.max(1, data.length);
  const y = (value: number) => height - pad.b - (value / max) * (height - pad.t - pad.b);

  return (
    <svg className="seo-vbar" viewBox={`0 0 ${width} ${height}`}>
      {data.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        const cx = pad.l + colWidth * index + colWidth / 2;
        const bw = Math.min(40, colWidth - 12);
        const top = y(value);

        return (
          <g key={row.domain}>
            <rect x={cx - bw / 2} y={top} width={bw} height={height - pad.b - top} />
            <text x={cx} y={top - 6} textAnchor="middle">{fmtMoney(value)}</text>
            <text x={cx} y={height - pad.b + 18} textAnchor="middle">{row.domain}</text>
          </g>
        );
      })}
      <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} />
    </svg>
  );
}

function Treemap({
  data,
  onClick
}: {
  data: SeoCluster[];
  onClick: (cluster: SeoCluster) => void;
}) {
  const width = 720;
  const height = 360;
  const total = data.reduce((sum, row) => sum + row.volume, 0) || 1;
  const rows: Array<{ x: number; y: number; w: number; h: number; cluster: SeoCluster }> = [];
  let y = 0;

  for (let index = 0; index < data.length; index += 3) {
    const group = data.slice(index, index + 3);
    const groupSum = group.reduce((sum, row) => sum + row.volume, 0);
    const rowHeight = (groupSum / total) * height;
    let x = 0;

    for (const cluster of group) {
      const cellWidth = (cluster.volume / groupSum) * width;
      rows.push({ x, y, w: cellWidth, h: rowHeight, cluster });
      x += cellWidth;
    }

    y += rowHeight;
  }

  return (
    <svg className="seo-treemap" viewBox={`0 0 ${width} ${height}`}>
      {rows.map((cell, index) => (
        <g key={cell.cluster.name} onClick={() => onClick(cell.cluster)}>
          <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} className={`cell-${index % 6}`} />
          <text x={cell.x + 12} y={cell.y + 24}>{cell.cluster.name}</text>
          <text x={cell.x + 12} y={cell.y + 44} className="sub">
            {fmtNum(cell.cluster.volume)} vol · {cell.cluster.keywords} kw
          </text>
        </g>
      ))}
    </svg>
  );
}
