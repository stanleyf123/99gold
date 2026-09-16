# 玖久黃金報價網

Next.js（App Router）網站，在 Linux VPS 上以 Node.js 22 + SQLite 執行。即時金價、臺灣銀行匯率換算、新聞編輯與管理後台。

## 環境需求

- Node.js `>=22.13.0`
- 編譯 `better-sqlite3` 需要 `python3`、`make`、`g++`（Ubuntu：`build-essential`）

## 本機

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

開發伺服器綁在 `127.0.0.1:3000`。

```bash
npm run build
npm start
```

## 常用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | Next.js 開發模式 |
| `npm run build` | 標準 `next build` |
| `npm start` | `next start`，監聽 `127.0.0.1:3000` |
| `npm run db:migrate` | 套用 `drizzle/*.sql` 到本機 SQLite |
| `npm run news:pipeline` | 檢查官方 RSS、翻譯（zh-Hant／en／ja）並自動上架快訊 |
| `npm run alerts:dispatch` | 檢查已同步的到價提醒並發送 Email／LINE（需環境金鑰） |
| `npm test` | 單元／原始碼測試（不需要完整 build） |
| `npm run test:build` | 先 build 再檢查產出 |

新聞排程請用 systemd timer（每 3 小時）或 cron 呼叫 `npm run news:pipeline`，不要在訪客請求裡抓 RSS。流水線會把新 RSS 候選自動核准、翻譯並上架到 `/news`，不必再經 `/admin` 人工核准；既有 `pending` 列會在第一次跑管線時一次回填。Linode 上手動跑一次：`sudo systemctl start 99gold-news.service`（見 [DEPLOY-LINODE.md](./DEPLOY-LINODE.md)）。白名單是公開 RSS/Atom（Fed、BLS、ECB、BEA、Census、MINING.COM 黃金、Investing.com 市場快訊經金銀過濾、Oilprice 能源衝擊）。ONS／HM Treasury 已停用。**不要**把 Bank of England 或 Google News RSS 加回 production cron：BoE 在機房 IP 是 Akamai 403，Google News 在 Linode `172.237.11.195` 是 HTTP 503。

翻譯預設用公開 MyMemory（不必金鑰）。若在 `/etc/99gold.env` 設定 `OPENAI_API_KEY` 或 `TRANSLATE_API_KEY`，則改走 OpenAI；也可設 `LIBRETRANSLATE_URL`。標題品質以機器翻譯為主時，前台會標示「機器翻譯」。

## 環境變數

見 `.env.example`。管理後台在 VPS 上使用 `ADMIN_TOKEN` 登入；若仍有 OpenAI Sites 的 ChatGPT 身分標頭，也會繼續被接受。反代後面的 Next.js 絕對轉址必須用 `SITE_URL`（見 [DEPLOY-LINODE.md](./DEPLOY-LINODE.md)），不要用 `request.url` 當公開 origin。
