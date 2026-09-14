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
| `npm run news:pipeline` | 檢查官方 RSS 並發布已核准快訊 |
| `npm test` | 單元／原始碼測試（不需要完整 build） |
| `npm run test:build` | 先 build 再檢查產出 |

新聞排程請用 systemd timer（每 3 小時）或 cron 呼叫 `npm run news:pipeline`，不要在訪客請求裡抓 RSS。白名單只含第一方公開 RSS/Atom（見 `lib/news/source-config.ts`）；Bank of England 在 Linode 等機房 IP 會被 Akamai 403，無法只靠 User-Agent 修好，英國來源改用 ONS 與 HM Treasury。VPS 部署步驟見 [DEPLOY-LINODE.md](./DEPLOY-LINODE.md)。

## 環境變數

見 `.env.example`。管理後台在 VPS 上使用 `ADMIN_TOKEN` 登入；若仍有 OpenAI Sites 的 ChatGPT 身分標頭，也會繼續被接受。
