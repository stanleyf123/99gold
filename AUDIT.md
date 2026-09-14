# Feature completeness audit (post PR #15)

Audit against latest `main` after **Jewelry historical FX pairing + Email/LINE price alerts** (#15). Live site `https://99gold.net` was checked 2026-09-14 (GMT+8 evening) together with this tree.

Legend: **PASS** = works end-to-end in code + live (or local reasoning where live is the old bundle). **FIXED** = user-visible bug repaired in this PR. **FOLLOW-UP** = non-blocking, not implemented here.

## Checklist

| Area | Result | Notes |
| --- | --- | --- |
| Homepage SSR live quotes | **PASS** | `getGlobalQuotesOrNull` + `force-dynamic`. Live HTML includes GC=F, Taiwan qian/gram, BOT sight-sell. Client refresh is skipped when SSR already has items (no empty flash). |
| Market radar + BOT USD spot sell | **PASS** | Radar shows gold, theoretical buy, estimated sell, 臺銀美金即期賣出. False “目前沒有可驗證的即時報價” only when `quotes.length === 0`. |
| Gold/silver ratio (30D/90D/1Y/3Y/5Y) | **PASS** | Home, `/international`, `/global`. `/api/gold-silver-ratio?period=5Y` 200. Missing GC/SI days omitted, not interpolated. |
| Alerts UI (browser) | **PASS** | Homepage + `/global`. Browser Notification path is localStorage-only. |
| `/jewelry` hero buy/sell | **PASS** | Live theoretical buy/sell + month range. Recycle *calculator* is not on this page (only `/recycling`). |
| `/jewelry` daily table + historical FX | **PASS** (deployed from #15) | Badge **歷史匯率換算參考**, column **當日匯率**. `/api/jewelry-history?period=1M`: 21 sessions, **21 distinct** BOT sight-sell rates, `omitted: 0`. |
| `/international` | **PASS** | COMEX metals, 30/90 charts, ratio 1Y/3Y/5Y. |
| `/global` world markets + multi-metal | **PASS** | Gold/silver/platinum/palladium board + comparison table + Taiwan/HK/CN/JP/SG/London/NY conversions. |
| `/recycling` calculator | **PASS** | Live qian × purity; empty/invalid inputs show “—” (no fake 18000). |
| `/news` 市場快訊, no agency byline | **PASS** | Index + homepage use `briefLabels` (“市場快訊” / Market brief / 市場速報), not feed `source_name`. Live small-print is `市場快訊 · 機器翻譯`. |
| `/news` zh/en/ja | **FIXED** | Official brief pages (`/news/{id}`) now get 中/EN/日 links with `?lang=`. News index language switcher also tracks `category` via `useSearchParams` (previously stuck after client navigations). Listing `<title>` matches h1 (`市場新聞` / Market news), not “全部新聞 / All news”. |
| Auto-publish path | **PASS** | Pipeline publishes `pending` immediately (`AUTO_PIPELINE_REVIEWER`). Live `scheduleStatus: healthy`, `checkedAt` recent. Admin copy: 無需人工核准. |
| Admin login uses `SITE_URL` | **PASS** | `/api/admin/session` redirects via `publicAbsoluteUrl`. Relative `/admin/login` for unauthenticated visits. |
| Approve publishes immediately | **PASS** | `reviewNewsCandidate` with no future `scheduledFor` → `status: published` now. Admin button “核准並上架”. |
| i18n chrome zh/en/ja | **FIXED** | Live `/api/visitor-locale` returned `{"locale":"en"}` on nginx (no `cf-ipcountry`). First visit with JS then flipped chrome to English. Unknown/missing country now stays **zh**. JP still ja; TW/HK/MO zh; other *known* countries en. |
| PWA manifest / sw | **PASS** | `/manifest.webmanifest` standalone; `/sw.js` network-first for shell + `/api/global-quotes`; admin excluded. |
| `/og` | **PASS** | `image/png` 1200×630 from live quotes. Canonical `og:image` is `https://99gold.net/og`. |
| HTTPS / canonical | **PASS** | Apex canonical `https://99gold.net`. `www` and `http` 301 to https://99gold.net/. |
| Price alerts Email/LINE without keys | **PASS** | Live GET `/api/price-alerts` → `email.configured: false`, `line.configured: false`, `browser: true`. Checkboxes disabled; no crash. |

## Fixes in this PR

1. **Default UI locale is zh-Hant** when GeoIP country is missing/unknown (`XX` / `T1` / empty). Stops nginx-fronted production from auto-switching new visitors to English.
2. **Official brief language switcher** writes `/news/{id}?lang=zh|en|ja` so article body matches chrome (SSR `searchParams.lang`).
3. **News index language + category** stay in sync after App Router client navigations (`useSearchParams`).
4. **Chart keyboard `id`s** are unique (`useId`) so `/international` (gold history + ratio both on 1M) no longer duplicates `market-chart-1M`.
5. **News listing title** uses the same “市場新聞 / Market news / 市場ニュース” string as the page h1.

## Remaining non-blocking follow-ups

Do **not** treat these as merge blockers for this audit PR.

- **SEO score / new features** (roadmap later phases): richer meta, FAQ expansion, Core Web Vitals, extra landing pages.
- **OpenAI translation**: several 市場快訊 titles remain English or mixed (e.g. ECB speeches). MyMemory is the current default; `OPENAI_API_KEY` is documented in `.env.example` but not required here.
- **Sitemap for auto-published briefs**: `sitemap.xml` lists editorials + legacy `news_articles`, not `news_candidates` with `status=published`.
- **Jewelry daily table vs chart period**: table is the SSR 1M series; 90D/1Y/3Y only update the chart. Acceptable; could lift period state if product wants one table per range (3Y would be hundreds of rows).
- **Email/LINE dispatch**: needs `RESEND_API_KEY` or SMTP + `LINE_CHANNEL_ACCESS_TOKEN` in `/etc/99gold.env` and `99gold-alerts.timer`. Without keys, browser alerts still work.
- **Cloudflare `cf-ipcountry`**: if a CDN is added later, JP/US geo-detect will start working; until then everyone without a stored locale stays zh.

## How to verify this PR

1. `npm test`
2. Open `/api/visitor-locale` without `cf-ipcountry` → `{"locale":"zh"}`.
3. Open a 市場快訊 `/news/ecb-press-…` and click EN / 日 in the header → URL gains `?lang=en|ja` and the article language changes.
4. `/international` has two charts; keyboard range inputs must have distinct `id`s.
5. Homepage / jewelry / global / recycling / news still show live quotes (no false empty radar).

## Local verification (2026-09-14)

Ran against `http://127.0.0.1:3000` (`SQLITE_PATH=/workspace/data/99gold.sqlite`, `SITE_URL=https://99gold.net`).

| Check | Result |
| --- | --- |
| `GET /api/visitor-locale` (no GeoIP) | `{"locale":"zh"}` |
| `cf-ipcountry: JP` / `US` / `XX` | ja / en / zh |
| First-visit homepage chrome | Stays 繁中 (`今日金價`…); radar includes **臺銀美金即期賣出** NT$ 31.765; no empty-quotes banner |
| `/news/{id}` 中 → EN → 日 | URL `?lang=` and article title/body switch (seeded `audit-brief-fx-i18n`) |
| `/news` `<title>` / h1 | 市場新聞｜99GOLD.NET |
| `/jewelry` | Hero buy/sell + **當日匯率** column with distinct BOT rates |
| `/international` chart ids | Two unique `market-chart-1M-*` keyboard ids |
| `/global` `/recycling` `/og` PWA | 200; recycle calc empty → “—”; Email/LINE `configured: false`, no crash |
| `npm test` | 94 pass, 0 fail, 1 skip |
