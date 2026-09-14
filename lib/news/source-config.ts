export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  allowedHosts: string[];
  language: "en";
  category: "macro" | "policy";
  titleTerms: string[];
};

export type NewsSourceHealthRow = {
  source_id: string;
  source_name: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
};

// First-party public feeds only. New sources must be explicitly allowlisted and
// reviewed before they can enter the editorial queue.
export const newsSources: NewsSource[] = [
  {
    id: "federal-reserve-monetary",
    name: "Federal Reserve Board",
    feedUrl: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    allowedHosts: ["federalreserve.gov"],
    language: "en",
    category: "policy",
    titleTerms: [],
  },
  {
    // Speeches land more often than FOMC statements, so a 3-hour cron can see new items.
    id: "federal-reserve-speeches",
    name: "Federal Reserve Board · Speeches",
    feedUrl: "https://www.federalreserve.gov/feeds/speeches.xml",
    allowedHosts: ["federalreserve.gov"],
    language: "en",
    category: "policy",
    titleTerms: [],
  },
  {
    id: "bls-cpi",
    name: "U.S. Bureau of Labor Statistics · CPI",
    feedUrl: "https://www.bls.gov/feed/cpi.rss",
    allowedHosts: ["bls.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    id: "bls-ppi",
    name: "U.S. Bureau of Labor Statistics · PPI",
    feedUrl: "https://www.bls.gov/feed/ppi.rss",
    allowedHosts: ["bls.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    id: "bls-employment",
    name: "U.S. Bureau of Labor Statistics · Employment Situation",
    feedUrl: "https://www.bls.gov/feed/empsit.rss",
    allowedHosts: ["bls.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    id: "bls-jolts",
    name: "U.S. Bureau of Labor Statistics · JOLTS",
    feedUrl: "https://www.bls.gov/feed/jolts.rss",
    allowedHosts: ["bls.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    // ECB press/speeches/interviews; typically several items per week, often same-day.
    id: "ecb-press",
    name: "European Central Bank",
    feedUrl: "https://www.ecb.europa.eu/rss/press.html",
    allowedHosts: ["ecb.europa.eu"],
    language: "en",
    category: "policy",
    titleTerms: [],
  },
  {
    // UK CPI/GDP/trade calendar. BoE /rss/* is Akamai-blocked from common VPS
    // ranges (including Linode); a browser User-Agent does not unblock it.
    id: "ons-release-calendar",
    name: "UK Office for National Statistics",
    feedUrl: "https://www.ons.gov.uk/releasecalendar?rss",
    allowedHosts: ["ons.gov.uk"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    // Treasury speeches and news — UK policy coverage without BoE's datacenter 403.
    id: "hm-treasury-news",
    name: "HM Treasury",
    feedUrl: "https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=hm-treasury",
    allowedHosts: ["gov.uk"],
    language: "en",
    category: "policy",
    titleTerms: [],
  },
  {
    // GDP, PCE, trade — gold-relevant US macro, more frequent than quarterly BLS CPI.
    id: "bea-news",
    name: "U.S. Bureau of Economic Analysis",
    feedUrl: "https://apps.bea.gov/rss/rss.xml",
    allowedHosts: ["bea.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
  {
    // Census briefing-room indicators (retail, trade, inventories) update on most business days.
    id: "census-indicators",
    name: "U.S. Census Bureau · Economic Indicators",
    feedUrl: "https://www.census.gov/economic-indicators/indicator.xml",
    allowedHosts: ["census.gov"],
    language: "en",
    category: "macro",
    titleTerms: [],
  },
];

export function sourceAcceptsTitle(source: NewsSource, title: string) {
  if (!source.titleTerms.length) return true;
  const normalized = title.normalize("NFKC").toLocaleLowerCase("en-US");
  return source.titleTerms.some((term) => normalized.includes(term));
}

export function newsSourceLabel(sourceId: string) {
  return newsSources.find((source) => source.id === sourceId)?.name ?? sourceId;
}

/** Admin health list: current allowlist only, so retired BoE 403 rows stay off the dashboard. */
export function currentSourceHealth(
  rows: Array<{
    source_id: string;
    last_attempt_at?: string | null;
    last_success_at?: string | null;
    last_error?: string | null;
    consecutive_errors?: number | null;
  }>,
): NewsSourceHealthRow[] {
  const byId = new Map(rows.map((row) => [row.source_id, row]));
  return newsSources.map((source) => {
    const row = byId.get(source.id);
    return {
      source_id: source.id,
      source_name: source.name,
      last_attempt_at: row?.last_attempt_at ?? null,
      last_success_at: row?.last_success_at ?? null,
      last_error: row?.last_error ?? null,
      consecutive_errors: row?.consecutive_errors ?? 0,
    };
  });
}
