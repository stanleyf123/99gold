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
];

export function sourceAcceptsTitle(source: NewsSource, title: string) {
  if (!source.titleTerms.length) return true;
  const normalized = title.normalize("NFKC").toLocaleLowerCase("en-US");
  return source.titleTerms.some((term) => normalized.includes(term));
}
