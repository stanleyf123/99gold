import type { Metadata } from "next";
import { hreflangHrefs, localizedHref, type PathLocale } from "./locale-path";

export const SITE_URL = "https://99gold.net";
export const SITE_NAME = "玖久黃金報價網";
export const SITE_NAME_EN = "99GOLD.NET";
/** Live dark quote card (1200×630 PNG from `/og`). Brand JPEG stays at `/og.jpg` as the backdrop. */
export const DEFAULT_OG_IMAGE = "/og";
export const DEFAULT_OG_ALT = "玖久黃金報價網今日金價：台灣理論錢價與 COMEX 黃金參考";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = "image/png";

export type SeoLocale = PathLocale;
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
      zh: "市場新聞｜官方快訊與本站分析｜玖久黃金報價網",
      en: "Market News | Official Briefs and Analysis | 99GOLD.NET",
      ja: "市場ニュース｜公式速報と独自分析｜99GOLD.NET",
    },
    description: {
      zh: "官方來源市場快訊（自動翻譯上架）與本站查核後撰寫的黃金分析，分開呈現事實與解讀。非投資建議。",
      en: "Official-source market briefs (auto-translated) and independently checked gold analysis, with facts separated from commentary. Not investment advice.",
      ja: "公式情報源の市場速報（自動翻訳）と、本サイトが確認のうえ執筆した金市場分析。事実と解説を分け、投資助言ではありません。",
    },
  },
};

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localizedPagePath(path: string, locale: SeoLocale = "zh"): string {
  return localizedHref(path, locale);
}

export function languageAlternates(path: string, query?: string | Record<string, string | null | undefined>) {
  const hrefs = hreflangHrefs(path, query);
  return {
    "zh-Hant": absoluteUrl(hrefs["zh-Hant"]),
    en: absoluteUrl(hrefs.en),
    ja: absoluteUrl(hrefs.ja),
    "x-default": absoluteUrl(hrefs["x-default"]),
  };
}

export function pageMetadata(route: PublicRoute, locale: SeoLocale = "zh"): Metadata {
  const copy = routeCopy[route];
  const title = copy.title[locale];
  const description = copy.description[locale];
  const path = localizedPagePath(copy.path, locale);
  const url = absoluteUrl(path);
  const ogAlt = `${title} — ${DEFAULT_OG_ALT}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(copy.path),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME_EN,
      locale: locale === "zh" ? "zh_TW" : locale === "ja" ? "ja_JP" : "en_US",
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: ogAlt, type: OG_IMAGE_TYPE }],
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

export function publisherJsonLd() {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl("/favicon.svg") },
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  inLanguage: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    inLanguage: input.inLanguage,
    url: input.url,
    mainEntityOfPage: input.url,
    image: input.image ? [input.image] : [absoluteUrl(DEFAULT_OG_IMAGE)],
    author: publisherJsonLd(),
    publisher: publisherJsonLd(),
    isAccessibleForFree: true,
  };
}

export function itemListJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export const newsIndexFaq: Record<SeoLocale, Array<{ question: string; answer: string }>> = {
  zh: [
    { question: "市場快訊和本站分析有何不同？", answer: "市場快訊來自允許的官方來源，本站翻譯後上架，不改寫政策原文。分析文章是本站查核近期資料後自行撰寫，並把事實與解讀分開。" },
    { question: "快訊多久更新一次？", answer: "官方來源每 3 小時自動檢查、翻譯並上架，無需人工核准。翻譯失敗時會保留原文標題，不會留空白。" },
    { question: "這些內容是投資建議嗎？", answer: "不是。資訊與分析僅供參考，不構成個人投資或交易建議。" },
  ],
  en: [
    { question: "What is the difference between a market brief and analysis?", answer: "Market briefs come from allowlisted official sources and are translated for publication without rewriting the policy text. Analysis articles are written here after checking recent sources, with facts separated from commentary." },
    { question: "How often are briefs updated?", answer: "Official sources are checked every 3 hours, then auto-translated and published. If translation fails, the original headline is kept instead of a blank title." },
    { question: "Is this investment advice?", answer: "No. Information and analysis are for reference only and are not personal investment or trading advice." },
  ],
  ja: [
    { question: "市場速報と分析記事の違いは？", answer: "市場速報は許可した公式情報源を翻訳して公開し、政策原文は書き換えません。分析記事は最近の資料を確認したうえで本サイトが執筆し、事実と解説を分けます。" },
    { question: "速報はどのくらい更新されますか？", answer: "公式情報源を3時間ごとに確認し、自動翻訳して公開します。翻訳できない場合は空欄にせず原文見出しを残します。" },
    { question: "投資助言ですか？", answer: "いいえ。情報と分析は参考用であり、個別の投資・取引助言ではありません。" },
  ],
};

export const briefFaq: Record<SeoLocale, Array<{ question: string; answer: string }>> = {
  zh: [
    { question: "這則快訊是官方新聞還是本站評論？", answer: "這是官方來源的市場快訊。本站翻譯並上架，不把機構名稱當成作者署名，也不改寫政策內容。" },
    { question: "可以當成買賣黃金的依據嗎？", answer: "不可以。快訊與本站報價都只是參考資訊，不構成投資或交易建議；實際買賣請向店家或合格顧問確認。" },
  ],
  en: [
    { question: "Is this an official release or this site’s commentary?", answer: "This is an official-source market brief. We translate it for publication, do not use the agency name as a byline, and do not rewrite the policy text." },
    { question: "Can I trade gold on this?", answer: "No. Briefs and quotes on this site are reference information only, not investment or trading advice." },
  ],
  ja: [
    { question: "これは公式発表ですか、それとも本サイトの解説ですか？", answer: "公式情報源の市場速報です。翻訳して公開し、機関名を署名には使いません。政策原文も書き換えません。" },
    { question: "金の売買判断に使えますか？", answer: "使えません。速報も相場も参考情報であり、投資・取引の助言ではありません。" },
  ],
};

export const sectionCrumbs: Record<"jewelry" | "international" | "recycling" | "global" | "news", { name: string; path: string }> = {
  jewelry: { name: "銀樓價格", path: "/jewelry" },
  international: { name: "國際金價", path: "/international" },
  recycling: { name: "黃金回收", path: "/recycling" },
  global: { name: "全球報價", path: "/global" },
  news: { name: "市場新聞", path: "/news" },
};
