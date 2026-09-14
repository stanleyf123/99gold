import type { Metadata } from "next";

export const SITE_URL = "https://99gold.net";
export const SITE_NAME = "玖久黃金報價網";
export const SITE_NAME_EN = "99GOLD.NET";
export const DEFAULT_OG_IMAGE = "/og";
export const DEFAULT_OG_ALT = "玖久黃金報價網今日金價：台灣理論錢價與 COMEX 黃金參考";

export type SeoLocale = "zh" | "en" | "ja";
export type PublicRoute = "home" | "jewelry" | "international" | "recycling" | "global" | "news";

type Localized = { zh: string; en: string; ja: string };

export const routeCopy: Record<PublicRoute, { path: string; title: Localized; description: Localized }> = {
  home: {
    path: "/",
    title: {
      zh: "今日黃金報價｜玖久黃金報價網 99GOLD.NET",
      en: "Live Gold Quotes | 99GOLD.NET",
      ja: "本日の金相場｜99GOLD.NET",
    },
    description: {
      zh: "即時 COMEX 黃金參考、台灣理論金價（錢／公克）、貴金屬比較與歷史走勢。換算採 GC 與臺銀美元即期賣出，僅供參考，非店家成交價。",
      en: "Live COMEX gold reference, Taiwan theoretical qian/gram prices, metals comparison and history. GC × Bank of Taiwan USD; indicative only.",
      ja: "COMEX金参考値、台湾の理論銭・グラム価格、貴金属比較と履歴。GC×台湾銀行米ドル直物売り。参考情報です。",
    },
  },
  jewelry: {
    path: "/jewelry",
    title: {
      zh: "今日銀樓金價｜買進、估計賣出與理論回收｜玖久黃金報價網",
      en: "Today’s Jewelry Gold Price | Buy, Estimated Sell, Recycle | 99GOLD.NET",
      ja: "本日の店頭金価格｜買値・推定売値・理論買取｜99GOLD.NET",
    },
    description: {
      zh: "以國際黃金與臺銀美元即期賣出換算台灣理論買進，並標示估計賣出溢價、近月高低與回收參考。理論數字，非各店成交牌價。",
      en: "Taiwan theoretical jewelry buy from international gold and Bank of Taiwan USD, plus estimated sell premium, monthly range and recycle reference. Not a shop board price.",
      ja: "国際金と台湾銀行米ドル直物売りから台湾の理論買を換算し、推定売プレミアム・月間レンジ・買取参考を示します。店頭価格ではありません。",
    },
  },
  international: {
    path: "/international",
    title: {
      zh: "國際金價｜COMEX 黃金與貴金屬參考｜玖久黃金報價網",
      en: "International Gold | COMEX Metals Reference | 99GOLD.NET",
      ja: "国際金価格｜COMEX貴金属参考｜99GOLD.NET",
    },
    description: {
      zh: "追蹤 COMEX 黃金、白銀、鉑金與鈀金期貨參考報價（美元／盎司）。來源受限時改列公開現貨參考，不構成可成交牌告。",
      en: "Follow COMEX gold, silver, platinum and palladium futures in USD/oz. If limited, the site switches to a public spot reference. Not an executable quote.",
      ja: "COMEXの金・銀・プラチナ・パラジウム先物（USD/oz）を追います。制限時は公開現物参考へ切替。約定可能な提示ではありません。",
    },
  },
  recycling: {
    path: "/recycling",
    title: {
      zh: "黃金回收試算｜999.9、916、750 理論回收｜玖久黃金報價網",
      en: "Gold Recycle Estimate | 999.9, 916, 750 | 99GOLD.NET",
      ja: "金の買取試算｜999.9・916・750｜99GOLD.NET",
    },
    description: {
      zh: "依台灣理論買進成本與成色比例估算 999.9、916、750 舊金回收參考。未含檢測、耗損與手續費，實際回收請向店家確認。",
      en: "Estimate 999.9, 916 and 750 recycle value from Taiwan theoretical buy cost by purity. Excludes testing, loss and fees; confirm in store.",
      ja: "台湾の理論買コストと成色比率で999.9・916・750の買取参考を試算。鑑定・減耗・手数料は含みません。",
    },
  },
  global: {
    path: "/global",
    title: {
      zh: "全球貴金屬報價｜金銀鉑鈀與幣別換算｜玖久黃金報價網",
      en: "Global Precious Metals | Gold Silver Platinum Palladium | 99GOLD.NET",
      ja: "世界貴金属相場｜金銀プラチナパラジウム｜99GOLD.NET",
    },
    description: {
      zh: "金、銀、鉑、鈀國際參考行情與主要幣別重量換算。屬公開市場參考，並非店家可成交牌告。",
      en: "International gold, silver, platinum and palladium references with major-currency weight conversion. Public-market reference, not a dealer quote.",
      ja: "金・銀・プラチナ・パラジウムの国際参考相場と主要通貨の重量換算。公開市場の参考値であり、店頭の約定価格ではありません。",
    },
  },
  news: {
    path: "/news",
    title: {
      zh: "黃金市場新聞｜玖久黃金報價網",
      en: "Gold Market News | 99GOLD.NET",
      ja: "金市場ニュース｜99GOLD.NET",
    },
    description: {
      zh: "官方來源快訊與本站查核後撰寫的黃金市場分析，分開呈現新聞事實與解讀。",
      en: "Official-source briefs and independently checked gold-market analysis, with facts separated from commentary.",
      ja: "公式情報源の速報と、本サイトが確認のうえ執筆した金市場分析。事実と解説を分けて掲載します。",
    },
  },
};

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(route: PublicRoute, locale: SeoLocale = "zh"): Metadata {
  const copy = routeCopy[route];
  const title = copy.title[locale];
  const description = copy.description[locale];
  const url = absoluteUrl(copy.path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME_EN,
      locale: locale === "zh" ? "zh_TW" : locale === "ja" ? "ja_JP" : "en_US",
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.svg"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    inLanguage: ["zh-Hant", "en", "ja"],
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(entries: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export const sectionCrumbs: Record<"jewelry" | "international" | "recycling" | "global" | "news", { name: string; path: string }> = {
  jewelry: { name: "銀樓價格", path: "/jewelry" },
  international: { name: "國際金價", path: "/international" },
  recycling: { name: "黃金回收", path: "/recycling" },
  global: { name: "全球報價", path: "/global" },
  news: { name: "市場新聞", path: "/news" },
};
