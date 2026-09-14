export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  allowedHosts: string[];
  language: "en";
  category: "macro" | "policy";
  titleTerms: string[];
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
    id: "bank-of-england-speeches",
    name: "Bank of England · Speeches",
    feedUrl: "https://www.bankofengland.co.uk/rss/speeches",
    allowedHosts: ["bankofengland.co.uk"],
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
