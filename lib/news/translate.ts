export type NewsLocale = "zh" | "en" | "ja";
export type TranslationProvider = "openai" | "mymemory" | "libretranslate" | "source";

export type LocalizedBrief = {
  titles: Record<NewsLocale, string>;
  summaries: Record<NewsLocale, string | null>;
  provider: TranslationProvider;
  translated: boolean;
};

export type TranslateEnv = Record<string, string | undefined>;

export type TranslateDeps = {
  fetch?: typeof fetch;
  env?: TranslateEnv;
  delayMs?: number;
};

export const AUTO_PIPELINE_REVIEWER = "auto-pipeline";

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MYMEMORY_MAX_CHARS = 450;
const TRANSLATE_TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; 99gold.net-news/1.0; +https://99gold.net)";

export function cleanSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function looksLikeTargetLocale(text: string, locale: NewsLocale, source: string) {
  const cleaned = cleanSourceText(text);
  if (!cleaned || cleaned === cleanSourceText(source)) return false;
  if (locale === "en") return /[A-Za-z]/.test(cleaned);
  return CJK.test(cleaned);
}

export function translationAttribution(locale: NewsLocale, provider: string | null | undefined) {
  if (provider === "openai") {
    return locale === "zh" ? "自動翻譯" : locale === "ja" ? "自動翻訳" : "Auto-translated";
  }
  if (provider === "mymemory" || provider === "libretranslate") {
    return locale === "zh" ? "機器翻譯" : locale === "ja" ? "機械翻訳" : "Machine translation";
  }
  return null;
}

type StoredBrief = {
  title: string;
  summary: string | null;
  title_zh?: string | null;
  title_en?: string | null;
  title_ja?: string | null;
  summary_zh?: string | null;
  summary_en?: string | null;
  summary_ja?: string | null;
  translation_provider?: string | null;
  source_language?: string | null;
};

export function localizedBriefFields(row: StoredBrief, locale: NewsLocale) {
  const sourceTitle = cleanSourceText(row.title);
  const sourceSummary = row.summary ? cleanSourceText(row.summary) : null;
  const titles = {
    zh: row.title_zh?.trim() || "",
    en: row.title_en?.trim() || "",
    ja: row.title_ja?.trim() || "",
  };
  const summaries = {
    zh: row.summary_zh?.trim() || "",
    en: row.summary_en?.trim() || "",
    ja: row.summary_ja?.trim() || "",
  };
  const title = looksLikeTargetLocale(titles[locale], locale, sourceTitle) || (locale === "en" && titles.en)
    ? (titles[locale] || sourceTitle)
    : sourceTitle;
  const localeSummary = summaries[locale];
  const summary = localeSummary
    ? (looksLikeTargetLocale(localeSummary, locale, sourceSummary ?? localeSummary) || (locale === "en" && summaries.en)
      ? localeSummary
      : sourceSummary)
    : sourceSummary;
  const sourceLanguage = row.source_language === "zh" || row.source_language === "ja" ? row.source_language : "en";
  const provider = row.translation_provider ?? null;
  const translated = locale !== sourceLanguage
    && Boolean(provider && provider !== "source")
    && title !== sourceTitle;
  return {
    title,
    summary,
    translated,
    translationProvider: translated ? provider : null,
    translationLabel: translated ? translationAttribution(locale, provider) : null,
  };
}

function envValue(env: TranslateEnv, key: string) {
  const value = env[key]?.trim();
  return value ? value : "";
}

function openaiKey(env: TranslateEnv) {
  return envValue(env, "OPENAI_API_KEY") || envValue(env, "TRANSLATE_API_KEY");
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`translation response was not JSON (${response.status})`);
  }
}

function stringField(value: unknown) {
  return typeof value === "string" ? cleanSourceText(value) : "";
}

function parseOpenAiPayload(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("openai translation JSON missing");
  const parsed = JSON.parse(content.slice(start, end + 1)) as {
    title?: Partial<Record<NewsLocale, unknown>>;
    summary?: Partial<Record<NewsLocale, unknown>>;
  };
  return {
    titles: {
      zh: stringField(parsed.title?.zh),
      en: stringField(parsed.title?.en),
      ja: stringField(parsed.title?.ja),
    },
    summaries: {
      zh: stringField(parsed.summary?.zh),
      en: stringField(parsed.summary?.en),
      ja: stringField(parsed.summary?.ja),
    },
  };
}

async function translateWithOpenAi(
  title: string,
  summary: string | null,
  sourceLanguage: string,
  deps: Required<Pick<TranslateDeps, "fetch">> & { env: TranslateEnv },
) {
  const key = openaiKey(deps.env);
  if (!key) return null;
  const model = envValue(deps.env, "OPENAI_MODEL") || "gpt-4o-mini";
  const response = await deps.fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You translate official economic news headlines and short summaries. Return only JSON.",
        },
        {
          role: "user",
          content: [
            `Source language: ${sourceLanguage}`,
            `Title: ${title}`,
            `Summary: ${summary ?? ""}`,
            "Translate title and summary into Traditional Chinese (Taiwan, zh-Hant) and Japanese.",
            "English should be a lightly cleaned original, not rewritten.",
            'Return JSON: {"title":{"zh":"...","en":"...","ja":"..."},"summary":{"zh":"...","en":"...","ja":"..."}}',
          ].join("\n"),
        },
      ],
    }),
    signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`openai HTTP ${response.status}`);
  const payload = await readJson(response);
  const content = (payload.choices as Array<{ message?: { content?: string } }> | undefined)
    ?.[0]?.message?.content ?? "";
  return parseOpenAiPayload(content);
}

function libreTranslateEndpoint(base: string) {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith("/translate") ? trimmed : `${trimmed}/translate`;
}

async function translateWithLibreTranslate(
  text: string,
  target: "zh" | "ja",
  sourceLanguage: string,
  deps: Required<Pick<TranslateDeps, "fetch">> & { env: TranslateEnv },
) {
  const base = envValue(deps.env, "LIBRETRANSLATE_URL");
  if (!base) return "";
  const body: Record<string, string> = {
    q: text,
    source: sourceLanguage === "ja" || sourceLanguage === "zh" ? sourceLanguage : "en",
    target: target === "zh" ? "zt" : "ja",
    format: "text",
  };
  const apiKey = envValue(deps.env, "LIBRETRANSLATE_API_KEY");
  if (apiKey) body.api_key = apiKey;
  const response = await deps.fetch(libreTranslateEndpoint(base), {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`libretranslate HTTP ${response.status}`);
  const payload = await readJson(response);
  return stringField(payload.translatedText);
}

async function translateWithMyMemory(
  text: string,
  target: "zh-TW" | "ja",
  sourceLanguage: string,
  deps: Required<Pick<TranslateDeps, "fetch">> & { env: TranslateEnv; delayMs: number },
) {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MYMEMORY_MAX_CHARS) {
    const slice = remaining.slice(0, MYMEMORY_MAX_CHARS);
    const split = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("。"), slice.lastIndexOf(" "));
    const take = split > 40 ? split + 1 : MYMEMORY_MAX_CHARS;
    chunks.push(remaining.slice(0, take).trim());
    remaining = remaining.slice(take).trim();
  }
  if (remaining) chunks.push(remaining);

  const parts: string[] = [];
  for (const chunk of chunks) {
    const url = new URL(MYMEMORY_URL);
    url.searchParams.set("q", chunk);
    url.searchParams.set("langpair", `${sourceLanguage === "ja" || sourceLanguage === "zh" ? sourceLanguage : "en"}|${target}`);
    const email = envValue(deps.env, "MYMEMORY_EMAIL");
    if (email) url.searchParams.set("de", email);
    const response = await deps.fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`mymemory HTTP ${response.status}`);
    const payload = await readJson(response);
    const status = Number(payload.responseStatus ?? 0);
    if (status && status !== 200) throw new Error(`mymemory status ${status}`);
    const translated = stringField((payload.responseData as { translatedText?: string } | undefined)?.translatedText);
    if (!translated) throw new Error("mymemory empty translation");
    parts.push(translated);
    await sleep(deps.delayMs);
  }
  return parts.join(" ").trim();
}

function sourceBrief(title: string, summary: string | null): LocalizedBrief {
  const cleanedTitle = cleanSourceText(title);
  const cleanedSummary = summary ? cleanSourceText(summary) : null;
  return {
    titles: { zh: cleanedTitle, en: cleanedTitle, ja: cleanedTitle },
    summaries: { zh: cleanedSummary, en: cleanedSummary, ja: cleanedSummary },
    provider: "source",
    translated: false,
  };
}

function mergeTranslation(
  title: string,
  summary: string | null,
  titles: Partial<Record<NewsLocale, string>>,
  summaries: Partial<Record<NewsLocale, string>>,
  provider: TranslationProvider,
): LocalizedBrief | null {
  const fallback = sourceBrief(title, summary);
  const nextTitles = {
    zh: titles.zh || fallback.titles.zh,
    en: titles.en || fallback.titles.en,
    ja: titles.ja || fallback.titles.ja,
  };
  const nextSummaries = {
    zh: summaries.zh || fallback.summaries.zh,
    en: summaries.en || fallback.summaries.en,
    ja: summaries.ja || fallback.summaries.ja,
  };
  const zhOk = looksLikeTargetLocale(nextTitles.zh, "zh", title);
  const jaOk = looksLikeTargetLocale(nextTitles.ja, "ja", title);
  if (!zhOk || !jaOk) return null;
  if (summary) {
    if (nextSummaries.zh && !looksLikeTargetLocale(nextSummaries.zh, "zh", summary)) nextSummaries.zh = fallback.summaries.zh;
    if (nextSummaries.ja && !looksLikeTargetLocale(nextSummaries.ja, "ja", summary)) nextSummaries.ja = fallback.summaries.ja;
  }
  return {
    titles: nextTitles,
    summaries: nextSummaries,
    provider,
    translated: true,
  };
}

export async function translateOfficialBrief(
  title: string,
  summary: string | null,
  sourceLanguage = "en",
  deps: TranslateDeps = {},
): Promise<LocalizedBrief> {
  const cleanedTitle = cleanSourceText(title);
  const cleanedSummary = summary ? cleanSourceText(summary) : null;
  const fallback = sourceBrief(cleanedTitle, cleanedSummary);
  const fetchImpl = deps.fetch ?? fetch;
  const env = deps.env ?? process.env;
  const delayMs = deps.delayMs ?? 120;
  const options = { fetch: fetchImpl, env, delayMs };

  if (openaiKey(env)) {
    try {
      const result = await translateWithOpenAi(cleanedTitle, cleanedSummary, sourceLanguage, options);
      if (result) {
        const merged = mergeTranslation(cleanedTitle, cleanedSummary, result.titles, result.summaries, "openai");
        if (merged) return merged;
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: "news_translate_openai_failed",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  if (envValue(env, "LIBRETRANSLATE_URL")) {
    try {
      const [zhTitle, jaTitle, zhSummary, jaSummary] = await Promise.all([
        translateWithLibreTranslate(cleanedTitle, "zh", sourceLanguage, options),
        translateWithLibreTranslate(cleanedTitle, "ja", sourceLanguage, options),
        cleanedSummary ? translateWithLibreTranslate(cleanedSummary, "zh", sourceLanguage, options) : Promise.resolve(""),
        cleanedSummary ? translateWithLibreTranslate(cleanedSummary, "ja", sourceLanguage, options) : Promise.resolve(""),
      ]);
      const merged = mergeTranslation(
        cleanedTitle,
        cleanedSummary,
        { zh: zhTitle, en: cleanedTitle, ja: jaTitle },
        { zh: zhSummary, en: cleanedSummary ?? "", ja: jaSummary },
        "libretranslate",
      );
      if (merged) return merged;
    } catch (error) {
      console.error(JSON.stringify({
        event: "news_translate_libretranslate_failed",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  try {
    const zhTitle = await translateWithMyMemory(cleanedTitle, "zh-TW", sourceLanguage, options);
    const jaTitle = await translateWithMyMemory(cleanedTitle, "ja", sourceLanguage, options);
    const zhSummary = cleanedSummary ? await translateWithMyMemory(cleanedSummary, "zh-TW", sourceLanguage, options) : "";
    const jaSummary = cleanedSummary ? await translateWithMyMemory(cleanedSummary, "ja", sourceLanguage, options) : "";
    const merged = mergeTranslation(
      cleanedTitle,
      cleanedSummary,
      { zh: zhTitle, en: cleanedTitle, ja: jaTitle },
      { zh: zhSummary, en: cleanedSummary ?? "", ja: jaSummary },
      "mymemory",
    );
    if (merged) return merged;
  } catch (error) {
    console.error(JSON.stringify({
      event: "news_translate_mymemory_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return fallback;
}
