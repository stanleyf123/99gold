export type NewsLocale = "zh" | "en" | "ja";
export type TranslationProvider = "openai" | "mymemory" | "libretranslate" | "source";

export type LocalizedBrief = {
  titles: Record<NewsLocale, string>;
  summaries: Record<NewsLocale, string | null>;
  provider: TranslationProvider;
  translated: boolean;
  complete: boolean;
};

export type TranslateEnv = Record<string, string | undefined>;

export type ExistingBriefText = {
  titles?: Partial<Record<NewsLocale, string | null>>;
  summaries?: Partial<Record<NewsLocale, string | null>>;
  provider?: string | null;
};

export type TranslateDeps = {
  fetch?: typeof fetch;
  env?: TranslateEnv;
  delayMs?: number;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  existing?: ExistingBriefText;
  mymemoryGate?: MyMemoryGate;
};

export type MyMemoryGate = {
  chain: Promise<void>;
  pausedUntil: number;
  lastCallAt: number;
};

export const AUTO_PIPELINE_REVIEWER = "auto-pipeline";

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MYMEMORY_MAX_CHARS = 450;
const TRANSLATE_TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; 99gold.net-news/1.0; +https://99gold.net)";

export const MYMEMORY_MIN_INTERVAL_MS = 800;
export const MYMEMORY_MAX_ATTEMPTS = 3;
export const MYMEMORY_DEFAULT_429_MS = 30_000;
export const MYMEMORY_MAX_BACKOFF_MS = 5 * 60_000;
export const MYMEMORY_SKIP_IF_PAUSE_MS = 8_000;
export const TRANSLATION_RETRY_BASE_MS = 6 * 60 * 60 * 1000;
export const TRANSLATION_RETRY_MAX_MS = 48 * 60 * 60 * 1000;

export function createMyMemoryGate(): MyMemoryGate {
  return { chain: Promise.resolve(), pausedUntil: 0, lastCallAt: 0 };
}

const defaultMyMemoryGate = createMyMemoryGate();

export function resetMyMemoryGate(gate: MyMemoryGate = defaultMyMemoryGate) {
  gate.chain = Promise.resolve();
  gate.pausedUntil = 0;
  gate.lastCallAt = 0;
}

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
  translation_retry_at?: string | null;
  translation_attempts?: number | null;
};

function pickLocalizedTitle(localized: string, sourceTitle: string, locale: NewsLocale) {
  const value = cleanSourceText(localized);
  if (!value) return sourceTitle;
  if (looksLikeTargetLocale(value, locale, sourceTitle)) return value;
  if (locale === "en" && /[A-Za-z]/.test(value)) return value;
  return sourceTitle;
}

function pickLocalizedSummary(localized: string, sourceSummary: string | null, locale: NewsLocale) {
  const value = cleanSourceText(localized);
  if (!value) return sourceSummary;
  if (looksLikeTargetLocale(value, locale, sourceSummary ?? value)) return value;
  if (locale === "en" && /[A-Za-z]/.test(value)) return value;
  return sourceSummary;
}

export function needsTranslationBackfill(row: StoredBrief) {
  const sourceTitle = cleanSourceText(row.title);
  if (!sourceTitle) return false;
  return !looksLikeTargetLocale(row.title_zh ?? "", "zh", sourceTitle)
    || !looksLikeTargetLocale(row.title_ja ?? "", "ja", sourceTitle);
}

export function selectRetranslateCandidates<T extends StoredBrief>(rows: T[], nowIso: string, limit: number) {
  const now = Date.parse(nowIso);
  const due = rows.filter((row) => {
    if (!needsTranslationBackfill(row)) return false;
    const retryAt = row.translation_retry_at;
    if (!retryAt) return true;
    const retryTime = Date.parse(retryAt);
    return !Number.isFinite(retryTime) || (Number.isFinite(now) && retryTime <= now);
  });
  return due.slice(0, Math.max(0, limit));
}

export function nextTranslationRetryAt(
  nowIso: string,
  options: { rateLimited?: boolean; attempts?: number } = {},
) {
  const now = Date.parse(nowIso);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const attempts = Math.max(0, options.attempts ?? 0);
  const multiplier = options.rateLimited ? Math.max(2, 2 ** Math.min(attempts, 3)) : 2 ** Math.min(attempts, 3);
  const delay = Math.min(TRANSLATION_RETRY_BASE_MS * Math.max(1, multiplier), TRANSLATION_RETRY_MAX_MS);
  return new Date(safeNow + delay).toISOString();
}

export function parseRetryAfterMs(header: string | null | undefined, now = Date.now()) {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MYMEMORY_MAX_BACKOFF_MS);
  }
  const date = Date.parse(trimmed);
  if (!Number.isFinite(date)) return null;
  return Math.min(Math.max(0, date - now), MYMEMORY_MAX_BACKOFF_MS);
}

export function mymemoryBackoffMs(
  attempt: number,
  retryAfterMs: number | null = null,
  random = Math.random,
) {
  if (retryAfterMs != null && retryAfterMs > 0) {
    return retryAfterMs + Math.floor(random() * 250);
  }
  const base = Math.min(MYMEMORY_DEFAULT_429_MS * 2 ** Math.max(0, attempt), MYMEMORY_MAX_BACKOFF_MS);
  const jitter = Math.floor(random() * Math.max(250, base * 0.2));
  return base + jitter;
}

export function isRetryableMyMemoryStatus(status: number) {
  return status === 429 || status === 503;
}

export function isMyMemoryRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /mymemory HTTP 429|mymemory status 429|mymemory cooling/.test(message);
}

export function myMemoryPauseRemainingMs(gate: MyMemoryGate = defaultMyMemoryGate, now = Date.now()) {
  return Math.max(0, gate.pausedUntil - now);
}

export function isMyMemoryCoolingDown(
  gate: MyMemoryGate = defaultMyMemoryGate,
  now = Date.now(),
  skipIfPauseExceedsMs = MYMEMORY_SKIP_IF_PAUSE_MS,
) {
  return myMemoryPauseRemainingMs(gate, now) > skipIfPauseExceedsMs;
}

export function translationPendingLabel(locale: NewsLocale) {
  if (locale === "zh") return "翻譯處理中";
  if (locale === "ja") return "翻訳待ち";
  return "Translation pending";
}

export function translationPendingHeadline(locale: NewsLocale) {
  if (locale === "zh") return "翻譯處理中";
  if (locale === "ja") return "翻訳処理中";
  return "Translation pending";
}

export function isTranslationPending(locale: NewsLocale, translated: boolean, sourceLanguage?: string | null) {
  if (translated || locale === "en") return false;
  const source = sourceLanguage === "zh" || sourceLanguage === "ja" ? sourceLanguage : "en";
  return locale !== source;
}

export function hasLocalizedTitle(row: StoredBrief, locale: NewsLocale) {
  const sourceTitle = cleanSourceText(row.title) || cleanSourceText(row.title_en ?? "");
  if (locale === "en") {
    const english = cleanSourceText(row.title_en ?? "") || sourceTitle;
    return Boolean(english);
  }
  const localized = locale === "zh" ? row.title_zh : row.title_ja;
  return looksLikeTargetLocale(localized ?? "", locale, sourceTitle);
}

/** zh listings omit untranslated wires. ja/en still list them (ja uses a pending placeholder). */
export function isReadyForLocaleListing(row: StoredBrief, locale: NewsLocale) {
  if (locale === "zh") return hasLocalizedTitle(row, "zh");
  return true;
}

export function localizedBriefFields(row: StoredBrief, locale: NewsLocale) {
  const sourceTitle = cleanSourceText(row.title) || cleanSourceText(row.title_en ?? "") || "Market brief";
  const sourceSummary = row.summary ? cleanSourceText(row.summary) : (row.summary_en ? cleanSourceText(row.summary_en) : null);
  const sourceLanguage = row.source_language === "zh" || row.source_language === "ja" ? row.source_language : "en";
  const provider = row.translation_provider ?? null;
  if (locale === "en") {
    const title = pickLocalizedTitle(row.title_en ?? "", sourceTitle, "en") || sourceTitle;
    const summary = pickLocalizedSummary(row.summary_en ?? "", sourceSummary, "en");
    return {
      title,
      summary,
      translated: false,
      translationProvider: null as string | null,
      translationLabel: null as string | null,
      translationPending: false,
      translationPendingLabel: null as string | null,
    };
  }

  const rawTitle = locale === "zh" ? (row.title_zh ?? "") : (row.title_ja ?? "");
  const rawSummary = locale === "zh" ? (row.summary_zh ?? "") : (row.summary_ja ?? "");
  const localizedTitle = looksLikeTargetLocale(rawTitle, locale, sourceTitle) ? cleanSourceText(rawTitle) : "";
  const localizedSummary = looksLikeTargetLocale(rawSummary, locale, sourceSummary ?? rawSummary)
    ? cleanSourceText(rawSummary)
    : null;
  const translated = Boolean(localizedTitle)
    && Boolean(provider && provider !== "source")
    && locale !== sourceLanguage;
  if (!localizedTitle) {
    return {
      title: translationPendingHeadline(locale),
      summary: null,
      translated: false,
      translationProvider: null,
      translationLabel: null,
      translationPending: true,
      translationPendingLabel: translationPendingLabel(locale),
    };
  }
  return {
    title: localizedTitle,
    summary: localizedSummary,
    translated,
    translationProvider: translated ? provider : null,
    translationLabel: translated ? translationAttribution(locale, provider) : null,
    translationPending: false,
    translationPendingLabel: null,
  };
}

function envValue(env: TranslateEnv, key: string) {
  const value = env[key]?.trim();
  return value ? value : "";
}

function openaiKey(env: TranslateEnv) {
  return envValue(env, "OPENAI_API_KEY") || envValue(env, "TRANSLATE_API_KEY");
}

function defaultSleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleepWith(deps: TranslateDeps, ms: number) {
  const sleep = deps.sleep ?? defaultSleep;
  return sleep(ms);
}

function nowWith(deps: TranslateDeps) {
  return deps.now ? deps.now() : Date.now();
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

function pauseMyMemory(gate: MyMemoryGate, until: number) {
  gate.pausedUntil = Math.max(gate.pausedUntil, until);
}

async function withMyMemorySlot<T>(deps: TranslateDeps, task: () => Promise<T>): Promise<T> {
  const gate = deps.mymemoryGate ?? defaultMyMemoryGate;
  const run = gate.chain.then(async () => {
    const now = nowWith(deps);
    const pauseMs = myMemoryPauseRemainingMs(gate, now);
    if (pauseMs > MYMEMORY_SKIP_IF_PAUSE_MS) {
      throw new Error("mymemory cooling down");
    }
    if (pauseMs > 0) await sleepWith(deps, pauseMs);
    const spacing = Math.max(0, deps.delayMs ?? MYMEMORY_MIN_INTERVAL_MS);
    const sinceLast = gate.lastCallAt ? nowWith(deps) - gate.lastCallAt : spacing;
    if (spacing > 0 && sinceLast < spacing) {
      const jitter = spacing > 0 ? Math.floor((deps.random ?? Math.random)() * 200) : 0;
      await sleepWith(deps, spacing - sinceLast + jitter);
    }
    const result = await task();
    gate.lastCallAt = nowWith(deps);
    return result;
  });
  gate.chain = run.then(() => undefined, () => undefined);
  return run;
}

async function fetchMyMemoryPayload(
  url: URL,
  deps: TranslateDeps & Required<Pick<TranslateDeps, "fetch">>,
) {
  const gate = deps.mymemoryGate ?? defaultMyMemoryGate;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MYMEMORY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const payload = await withMyMemorySlot(deps, async () => {
        const response = await deps.fetch(url, {
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
        });
        const retryAfter = parseRetryAfterMs(response.headers.get("retry-after"), nowWith(deps));
        if (!response.ok) {
          if (isRetryableMyMemoryStatus(response.status)) {
            const waitMs = mymemoryBackoffMs(attempt, retryAfter, deps.random ?? Math.random);
            pauseMyMemory(gate, nowWith(deps) + waitMs);
            throw new Error(`mymemory HTTP ${response.status}`);
          }
          throw new Error(`mymemory HTTP ${response.status}`);
        }
        const body = await readJson(response);
        const status = Number(body.responseStatus ?? 0);
        if (status && status !== 200) {
          if (isRetryableMyMemoryStatus(status)) {
            const waitMs = mymemoryBackoffMs(attempt, retryAfter, deps.random ?? Math.random);
            pauseMyMemory(gate, nowWith(deps) + waitMs);
            throw new Error(`mymemory status ${status}`);
          }
          throw new Error(`mymemory status ${status}`);
        }
        return body;
      });
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const rateLimited = isMyMemoryRateLimitError(lastError);
      if (!rateLimited || attempt >= MYMEMORY_MAX_ATTEMPTS - 1) throw lastError;
      const pauseMs = myMemoryPauseRemainingMs(gate, nowWith(deps));
      if (pauseMs > MYMEMORY_SKIP_IF_PAUSE_MS) throw lastError;
      if (pauseMs > 0) await sleepWith(deps, pauseMs);
    }
  }
  throw lastError ?? new Error("mymemory failed");
}

async function translateWithMyMemory(
  text: string,
  target: "zh-TW" | "ja",
  sourceLanguage: string,
  deps: TranslateDeps & Required<Pick<TranslateDeps, "fetch">> & { env: TranslateEnv },
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
    const payload = await fetchMyMemoryPayload(url, deps);
    const translated = stringField((payload.responseData as { translatedText?: string } | undefined)?.translatedText);
    if (!translated) throw new Error("mymemory empty translation");
    parts.push(translated);
  }
  return parts.join(" ").trim();
}

function sourceBrief(title: string, summary: string | null): LocalizedBrief {
  const cleanedTitle = cleanSourceText(title);
  const cleanedSummary = summary ? cleanSourceText(summary) : null;
  return {
    titles: { zh: "", en: cleanedTitle, ja: "" },
    summaries: { zh: null, en: cleanedSummary, ja: null },
    provider: "source",
    translated: false,
    complete: false,
  };
}

function keepLocalized(
  candidate: string | null | undefined,
  current: string | null | undefined,
  source: string,
  locale: Exclude<NewsLocale, "en">,
) {
  if (looksLikeTargetLocale(candidate ?? "", locale, source)) return cleanSourceText(candidate ?? "");
  if (looksLikeTargetLocale(current ?? "", locale, source)) return cleanSourceText(current ?? "");
  return "";
}

function overlayTranslation(
  sourceTitle: string,
  sourceSummary: string | null,
  current: LocalizedBrief,
  titles: Partial<Record<NewsLocale, string | null | undefined>>,
  summaries: Partial<Record<NewsLocale, string | null | undefined>>,
  provider: TranslationProvider,
): LocalizedBrief {
  const nextTitles = {
    zh: keepLocalized(titles.zh, current.titles.zh, sourceTitle, "zh"),
    en: cleanSourceText(titles.en ?? "") || current.titles.en || sourceTitle,
    ja: keepLocalized(titles.ja, current.titles.ja, sourceTitle, "ja"),
  };
  const summarySource = sourceSummary ?? "";
  const nextSummaries = {
    zh: keepLocalized(summaries.zh, current.summaries.zh, summarySource || (summaries.zh ?? ""), "zh") || null,
    en: cleanSourceText(summaries.en ?? "") || current.summaries.en || sourceSummary,
    ja: keepLocalized(summaries.ja, current.summaries.ja, summarySource || (summaries.ja ?? ""), "ja") || null,
  };
  const zhOk = looksLikeTargetLocale(nextTitles.zh, "zh", sourceTitle);
  const jaOk = looksLikeTargetLocale(nextTitles.ja, "ja", sourceTitle);
  const contributed = (titles.zh && zhOk && nextTitles.zh !== current.titles.zh)
    || (titles.ja && jaOk && nextTitles.ja !== current.titles.ja)
    || provider === current.provider;
  return {
    titles: {
      zh: nextTitles.zh,
      en: nextTitles.en || sourceTitle,
      ja: nextTitles.ja,
    },
    summaries: {
      zh: nextSummaries.zh,
      en: nextSummaries.en || sourceSummary,
      ja: nextSummaries.ja,
    },
    provider: zhOk || jaOk ? (contributed && provider !== "source" ? provider : (current.provider === "source" ? provider : current.provider)) : "source",
    translated: zhOk || jaOk,
    complete: zhOk && jaOk,
  };
}

function applyExisting(sourceTitle: string, sourceSummary: string | null, existing?: ExistingBriefText): LocalizedBrief {
  const base = sourceBrief(sourceTitle, sourceSummary);
  if (!existing) return base;
  const provider = existing.provider === "openai" || existing.provider === "mymemory" || existing.provider === "libretranslate"
    ? existing.provider
    : "source";
  return overlayTranslation(sourceTitle, sourceSummary, base, existing.titles ?? {}, existing.summaries ?? {}, provider);
}

export async function translateOfficialBrief(
  title: string,
  summary: string | null,
  sourceLanguage = "en",
  deps: TranslateDeps = {},
): Promise<LocalizedBrief> {
  const cleanedTitle = cleanSourceText(title) || "Market brief";
  const cleanedSummary = summary ? cleanSourceText(summary) : null;
  let best = applyExisting(cleanedTitle, cleanedSummary, deps.existing);
  const fetchImpl = deps.fetch ?? fetch;
  const env = deps.env ?? process.env;
  const delayMs = deps.delayMs ?? MYMEMORY_MIN_INTERVAL_MS;
  const options: TranslateDeps & Required<Pick<TranslateDeps, "fetch">> & { env: TranslateEnv; delayMs: number } = {
    ...deps,
    fetch: fetchImpl,
    env,
    delayMs,
  };

  if (best.complete) return best;

  if (openaiKey(env)) {
    try {
      const result = await translateWithOpenAi(cleanedTitle, cleanedSummary, sourceLanguage, options);
      if (result) {
        best = overlayTranslation(cleanedTitle, cleanedSummary, best, result.titles, result.summaries, "openai");
        if (best.complete) return best;
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
      const needZh = !looksLikeTargetLocale(best.titles.zh, "zh", cleanedTitle);
      const needJa = !looksLikeTargetLocale(best.titles.ja, "ja", cleanedTitle);
      const [zhTitle, jaTitle, zhSummary, jaSummary] = await Promise.all([
        needZh ? translateWithLibreTranslate(cleanedTitle, "zh", sourceLanguage, options) : Promise.resolve(best.titles.zh),
        needJa ? translateWithLibreTranslate(cleanedTitle, "ja", sourceLanguage, options) : Promise.resolve(best.titles.ja),
        cleanedSummary && needZh ? translateWithLibreTranslate(cleanedSummary, "zh", sourceLanguage, options) : Promise.resolve(best.summaries.zh ?? ""),
        cleanedSummary && needJa ? translateWithLibreTranslate(cleanedSummary, "ja", sourceLanguage, options) : Promise.resolve(best.summaries.ja ?? ""),
      ]);
      best = overlayTranslation(
        cleanedTitle,
        cleanedSummary,
        best,
        { zh: zhTitle, en: cleanedTitle, ja: jaTitle },
        { zh: zhSummary, en: cleanedSummary ?? "", ja: jaSummary },
        "libretranslate",
      );
      if (best.complete) return best;
    } catch (error) {
      console.error(JSON.stringify({
        event: "news_translate_libretranslate_failed",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  const gate = deps.mymemoryGate ?? defaultMyMemoryGate;
  if (isMyMemoryCoolingDown(gate, nowWith(deps))) {
    console.error(JSON.stringify({
      event: "news_translate_mymemory_skipped",
      error: "mymemory cooling down",
    }));
    return best;
  }

  const needZh = !looksLikeTargetLocale(best.titles.zh, "zh", cleanedTitle);
  const needJa = !looksLikeTargetLocale(best.titles.ja, "ja", cleanedTitle);
  const applyMyMemory = (titles: Partial<Record<NewsLocale, string>>, summaries: Partial<Record<NewsLocale, string | null>>) => {
    best = overlayTranslation(cleanedTitle, cleanedSummary, best, { en: cleanedTitle, ...titles }, { en: cleanedSummary ?? "", ...summaries }, "mymemory");
  };
  try {
    if (needZh) {
      const zhTitle = await translateWithMyMemory(cleanedTitle, "zh-TW", sourceLanguage, options);
      applyMyMemory({ zh: zhTitle }, {});
    }
    if (needJa && !isMyMemoryCoolingDown(gate, nowWith(deps))) {
      const jaTitle = await translateWithMyMemory(cleanedTitle, "ja", sourceLanguage, options);
      applyMyMemory({ ja: jaTitle }, {});
    }
    if (cleanedSummary && needZh && !isMyMemoryCoolingDown(gate, nowWith(deps))) {
      const zhSummary = await translateWithMyMemory(cleanedSummary, "zh-TW", sourceLanguage, options);
      applyMyMemory({}, { zh: zhSummary });
    }
    if (cleanedSummary && needJa && !isMyMemoryCoolingDown(gate, nowWith(deps))) {
      const jaSummary = await translateWithMyMemory(cleanedSummary, "ja", sourceLanguage, options);
      applyMyMemory({}, { ja: jaSummary });
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "news_translate_mymemory_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return best;
}
