export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  allowedHosts: string[];
  language: "en";
  category: "macro" | "policy" | "prices";
  titleTerms: string[];
  excludeTerms?: string[];
};

export type NewsSourceHealthRow = {
  source_id: string;
  source_name: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
};

/** Precious-metals headlines for publisher gold/commodities feeds. */
export const goldMetalTerms = [
  "gold",
  "silver",
  "platinum",
  "palladium",
  "bullion",
  "xau",
  "xag",
  "precious metal",
  "precious metals",
  "ounce",
];

/** UK / official calendar items that still move gold (not labour or AML). */
export const goldMacroTerms = [
  "cpi",
  "inflation",
  "gdp",
  "ppi",
  "producer price",
  "producer prices",
  "consumer price",
  "consumer prices",
  "retail sales",
  "trade balance",
  "balance of payments",
  "public sector",
  "gilt",
  "sterling",
  "interest rate",
  "interest rates",
  "monetary",
  "fiscal",
  "budget",
];

export const ukNoiseTerms = [
  "labour market",
  "labor market",
  "employment",
  "claimant",
  "vacancies",
  "vacancy",
  "unemployment",
  "workforce",
  "earnings",
  "crime",
  "census",
  "migration",
  "wellbeing",
  "well-being",
];

export const treasuryNoiseTerms = [
  "anti-money laundering",
  "anti money laundering",
  "aml",
  "cryptoasset",
  "cryptoassets",
  "cryptocurrency",
  "crypto",
  "sanctions",
  "ministerial appointment",
  "honours",
];

export const ecbPolicyTerms = [
  "monetary",
  "inflation",
  "interest rate",
  "interest rates",
  "price stability",
  "lagarde",
  "guindos",
  "schnabel",
  "quantitative",
  "asset purchase",
  "introductory statement",
  "monetary policy",
  "press conference",
  "gold",
  "energy",
  "oil",
];

export const energyShockTerms = [
  "opec",
  "pipeline",
  "hormuz",
  "embargo",
  "outage",
  "disruption",
  "force majeure",
  "crude shock",
  "oil shock",
  "saudi",
  "libya",
  "iran",
  "gold",
  "inflation",
  "rate hike",
  "fed",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-aware match so ECB "rate" does not hit "corporate", and "gold" does not hit "golden". */
export function textHasTerm(haystack: string, term: string) {
  const needle = term.normalize("NFKC").toLocaleLowerCase("en-US").trim();
  if (!needle) return false;
  if (/[\u3040-\u9fff]/.test(needle) || /[^\p{L}\p{N}]/u.test(needle)) {
    return haystack.includes(needle);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, "u").test(haystack);
}

// Public RSS/Atom only. New sources must be allowlisted. Do not add Google News
// search RSS (`news.google.com/rss/search`) to production cron: Linode
// 172.237.11.195 gets HTTP 503 (Google sorry page) even though the same URL is
// HTTP 200 from other networks. That is the same class of datacenter block as
// Bank of England Akamai 403. Kitco's historic `/rss/*.xml` paths now serve
// HTML 404, so they are not listed either.
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
    // ECB press/speeches/interviews. Filter generic climate/AML remarks; keep
    // monetary-policy and energy items that move gold.
    id: "ecb-press",
    name: "European Central Bank",
    feedUrl: "https://www.ecb.europa.eu/rss/press.html",
    allowedHosts: ["ecb.europa.eu"],
    language: "en",
    category: "policy",
    titleTerms: ecbPolicyTerms,
  },
  {
    // UK CPI/GDP/trade calendar. BoE /rss/* is Akamai-blocked from common VPS
    // ranges (including Linode); a browser User-Agent does not unblock it.
    // Labour-market calendar items are excluded — they flooded /news.
    id: "ons-release-calendar",
    name: "UK Office for National Statistics",
    feedUrl: "https://www.ons.gov.uk/releasecalendar?rss",
    allowedHosts: ["ons.gov.uk"],
    language: "en",
    category: "macro",
    titleTerms: goldMacroTerms,
    excludeTerms: ukNoiseTerms,
  },
  {
    // Treasury speeches and news — UK policy coverage without BoE's datacenter 403.
    // Drop AML / crypto consultations; keep inflation, budget, gilt items.
    id: "hm-treasury-news",
    name: "HM Treasury",
    feedUrl: "https://www.gov.uk/government/organisations/hm-treasury.atom",
    allowedHosts: ["gov.uk"],
    language: "en",
    category: "policy",
    titleTerms: goldMacroTerms,
    excludeTerms: treasuryNoiseTerms,
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
  {
    // First-party gold commodity RSS; HTTP 200 from a datacenter IP (2026-09-16).
    id: "mining-com-gold",
    name: "MINING.COM · Gold",
    feedUrl: "https://www.mining.com/commodity/gold/feed/",
    allowedHosts: ["mining.com"],
    language: "en",
    category: "prices",
    titleTerms: goldMetalTerms,
  },
  {
    // Commodities desk with gold/silver headlines. Metals filter drops oil-inventory noise.
    id: "investing-commodities",
    name: "Investing.com · Commodities",
    feedUrl: "https://www.investing.com/rss/news_11.rss",
    allowedHosts: ["investing.com"],
    language: "en",
    category: "prices",
    titleTerms: goldMetalTerms,
  },
  {
    // Energy-shock tape (Saudi pipeline, Hormuz, OPEC). HTTP 200 from a datacenter IP.
    id: "oilprice-energy",
    name: "Oilprice.com · Energy",
    feedUrl: "https://oilprice.com/rss/energy",
    allowedHosts: ["oilprice.com"],
    language: "en",
    category: "macro",
    titleTerms: energyShockTerms,
  },
];

export function sourceAcceptsTitle(source: NewsSource, title: string, summary = "") {
  const haystack = `${title}\n${summary}`.normalize("NFKC").toLocaleLowerCase("en-US");
  if ((source.excludeTerms ?? []).some((term) => textHasTerm(haystack, term))) return false;
  if (!source.titleTerms.length) return true;
  return source.titleTerms.some((term) => textHasTerm(haystack, term));
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
