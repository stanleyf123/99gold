# 部署到 Linode Nanode（Ubuntu 24.04 + Node 22 + Nginx）

本站以標準 Next.js 跑在 Node 上，資料庫改為本機 SQLite。不再需要 Cloudflare Workers、D1、vinext 或 wrangler。

目標主機範例：`172.237.11.195`（1GB RAM + swap），Nginx 反代到 `127.0.0.1:3000`。

## 每次部署／更新後

程式碼同步並 `systemctl restart 99gold.service` 之後，還要做這兩步：

1. **跑 migration**（含 `translation_retry_at` / `translation_attempts` 欄位，見 `drizzle/0007_translation_retry.sql`）：

   ```bash
   cd /var/www/99gold
   sudo -u www-data npm run db:migrate
   ```

   漏跑時新聞 cron 無法把翻譯未完成的已發布快訊排進重試佇列。

2. **啟用到價提醒 timer**（單位檔在 `deploy/systemd/`）：

   ```bash
   sudo systemctl enable --now 99gold-alerts.timer
   sudo systemctl list-timers 99gold-alerts.timer
   ```

   瀏覽器 Notification 不依賴此 timer；Email／LINE 發送才需要。未設定金鑰時指令仍會成功，只是 `fired` 為 0。

## 1. 系統套件

```bash
sudo apt update
sudo apt install -y nginx build-essential python3 sqlite3
# Node.js 22：依 NodeSource 或 nvm 安裝，確認 `node -v` >= 22.13
```

1GB RAM 建議保留至少 1–2GB swap。`next build` 記憶體很吃緊，**最好在本機或較大的機器 build**，再把 `.next/`、`node_modules/`、原始碼同步到 VPS。若一定要在 Nanode 上 build：

```bash
export NODE_OPTIONS=--max-old-space-size=768
npm run build
```

## 2. 應用程式目錄

```bash
sudo mkdir -p /var/www/99gold/data
sudo chown -R www-data:www-data /var/www/99gold
# 將 repo 放到 /var/www/99gold 後：
cd /var/www/99gold
sudo -u www-data npm ci
sudo -u www-data npm run db:migrate
sudo -u www-data npm run build   # 若未在其他機器先 build
```

SQLite 檔預設為 `/var/www/99gold/data/99gold.sqlite`（可用 `SQLITE_PATH` 覆寫）。請把 `data/` 列入備份，不要提交到 git。

## 3. 環境變數

`/etc/99gold.env`（權限 `0600`，所有者 `www-data`）：

```bash
SQLITE_PATH=/var/www/99gold/data/99gold.sqlite
SITE_URL=https://99gold.net
ADMIN_EMAIL=stanleys1225@gmail.com
ADMIN_NAME=
ADMIN_TOKEN=請改成足夠長的隨機字串
NODE_ENV=production
# 可選：較佳的 zh-Hant／ja 翻譯。未設定時使用公開 MyMemory（不必金鑰）。
# OPENAI_API_KEY=
# TRANSLATE_API_KEY=
# MYMEMORY_EMAIL=

# 到價提醒 Email（擇一：Resend HTTP 或 SMTP 465）。未設定時前台仍有瀏覽器通知。
# ALERT_EMAIL_TO=stanleys1225@gmail.com
# ALERT_EMAIL_FROM=99GOLD.NET <alerts@99gold.net>
# RESEND_API_KEY=
# SMTP_HOST=smtp.resend.com
# SMTP_PORT=465
# SMTP_USER=resend
# SMTP_PASS=

# 到價提醒 LINE（擇一）。LINE Notify 已停用，請優先 Messaging API。
# LINE_CHANNEL_ACCESS_TOKEN=
# LINE_USER_ID=
# LINE_NOTIFY_TOKEN=
# LINE_WEBHOOK_URL=
```

產生權杖範例：`openssl rand -hex 32`。不要把真實權杖寫進 git。

`SITE_URL` 除了給管理 cookie 加 `Secure`，也是反代後面絕對轉址的公開 origin（見第 6 節）。不要省略。

管理後台：`https://99gold.net/admin/login`。也可用標頭 `Authorization: Bearer <ADMIN_TOKEN>` 或 `x-admin-token` 呼叫管理 API。

## 4. systemd：網站行程

`/etc/systemd/system/99gold.service`：

```ini
[Unit]
Description=99gold.net Next.js
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/99gold
EnvironmentFile=/etc/99gold.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now 99gold.service
```

`npm start` 等於 `next start --hostname 127.0.0.1 --port 3000`。

## 5. systemd timer：新聞管線（取代 Worker cron）

先前 Cloudflare Worker 每 30 分鐘跑一次 RSS 檢查。VPS 上由 systemd `99gold-news.timer` **每 3 小時**呼叫：

```bash
cd /var/www/99gold
npm run news:pipeline
```

可選 `--manual`（寫入 `news_runs.trigger = manual`）：

```bash
npx tsx scripts/run-news-pipeline.ts --manual
```

`/etc/systemd/system/99gold-news.service`：

```ini
[Unit]
Description=99gold.net news pipeline
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=/var/www/99gold
EnvironmentFile=/etc/99gold.env
ExecStart=/usr/bin/npm run news:pipeline
Nice=10
```

`/etc/systemd/system/99gold-news.timer`：

```ini
[Unit]
Description=Check official gold news feeds every 3 hours

[Timer]
OnBootSec=2min
OnCalendar=0/3:00:00
AccuracySec=5min
Persistent=true
Unit=99gold-news.service

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now 99gold-news.timer
```

## 5b. systemd timer：到價提醒 Email／LINE

瀏覽器 Notification 仍在訪客裝置上檢查。Email／LINE 則由伺服器發送（同一目標 6 小時冷卻，另有 30 秒全域間隔以免洗版）。金鑰寫在 `/etc/99gold.env` 一次即可；收件人與 LINE 使用者 ID 也可在 `/admin` 儲存。

安裝用單位檔在 repo 的 `deploy/systemd/`（不含密鑰）：

```bash
sudo cp /var/www/99gold/deploy/systemd/99gold-alerts.service /etc/systemd/system/
sudo cp /var/www/99gold/deploy/systemd/99gold-alerts.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now 99gold-alerts.timer
# 可先手動跑一次確認腳本存在：
cd /var/www/99gold && sudo -u www-data npm run alerts:dispatch
sudo systemctl list-timers 99gold-alerts.timer
```

`99gold-alerts.timer` **每 15 分鐘**呼叫 `npm run alerts:dispatch`。服務讀 `EnvironmentFile=/etc/99gold.env`，工作目錄 `/var/www/99gold`。

未設定 `RESEND_API_KEY`／`SMTP_HOST` 與 LINE token 時，指令會成功但 `fired` 為 0，不影響網站。前台「我的到價提醒」仍可開瀏覽器通知。GET `/api/price-alerts` 的 `email.configured`／`line.configured` 只反映目前環境金鑰，不是程式故障。

等價 crontab：

```cron
*/15 * * * * www-data cd /var/www/99gold && /usr/bin/npm run alerts:dispatch >> /var/log/99gold-alerts.log 2>&1
```

等價 crontab（若不用 systemd timer）：

```cron
0 */3 * * * www-data cd /var/www/99gold && /usr/bin/npm run news:pipeline >> /var/log/99gold-news.log 2>&1
```

部署或更新後請先跑 migration，再手動跑一次管線，讓既有 `pending` 候選一次回填為已發布：

```bash
cd /var/www/99gold
sudo -u www-data npm run db:migrate
sudo -u www-data npm run news:pipeline
```

成功時摘要裡的 `publishedCount` 應增加，新快訊會出現在 `https://99gold.net/news`（以及 `?lang=zh`／`en`／`ja`），不必登入 `/admin` 核准。timer 之後每 3 小時重複：抓取白名單 RSS → 翻譯標題與摘要 → 直接上架。已 `rejected` 的列不會自動發布。管理後台仍可列出項目與拒絕尚未發布的列，但快樂路徑不再需要人工核准。

### 手動觸發一次新聞抓取（Linode）

systemd 單位已是 `Type=oneshot`，不必等 3 小時 timer：

```bash
sudo systemctl start 99gold-news.service
sudo journalctl -u 99gold-news.service -n 80 --no-pager
```

等價（寫入 `news_runs.trigger = cron`，與 timer 相同）：

```bash
cd /var/www/99gold
sudo -u www-data npm run news:pipeline
```

若要標成手動跑（`news_runs.trigger = manual`）：

```bash
cd /var/www/99gold
sudo -u www-data npx tsx scripts/run-news-pipeline.ts --manual
```

### 新聞來源、相關性過濾與 Linode IP 封鎖

`lib/news/source-config.ts` 白名單是公開 RSS/Atom。**不要把 Bank of England 或 Google News RSS 加回 production cron。**

在 Linode `172.237.11.195`（以及其他常見機房 IP 段）上：

- `https://www.bankofengland.co.uk/rss/speeches`（以及 `/rss/news`、`/rss/publications`）會回 **Akamai Access Denied HTML 403**。從住宅／辦公室網路同一 URL 可能是 200 RSS。這是 **IP／機房封鎖**，不是缺 User-Agent。IMF 的 RSS 在部分 datacenter IP 上也有同樣的 Akamai 403。
- Google News `https://news.google.com/rss/search?...` 在 Linode 會回 **HTTP 503**（Google sorry page），其他網路常是 HTTP 200。沒有可用的 Linode egress 繞路前，**不要**把它寫進 `newsSources`。
- Kitco 歷史路徑 `https://www.kitco.com/rss/KitcoNews.xml` 目前是 HTML 404，不是 RSS。

英國／總體來源 **ONS release calendar 與 HM Treasury 已從 production 白名單拿掉**（就業月曆、加密／AML 諮詢灌滿 `/news`）。過濾函式仍留在 `source-config.ts` 供測試。Fed 貨幣聲明、BLS CPI／就業（既有 URL 不改）、帶貨幣政策關鍵字的 ECB 稿仍會過。

Linode 主機 curl 實測 **HTTP 200 且為真實 RSS/XML** 後採用：

- MINING.COM 黃金商品 RSS（首選）：`https://www.mining.com/commodity/gold/feed/`
- Investing.com 股市／市場 RSS（再以金銀等關鍵字過濾）：`https://www.investing.com/rss/news_25.rss`
- Oilprice.com 主源（管線、OPEC、荷姆茲等衝擊 + 貴金屬關鍵字）：`https://oilprice.com/rss/main`

同一批探測可用但未加入 cron 的：`mining.com/feed/`（較雜）、`investing.com/rss/news_301.rss`（加密）、BBC business、CNBC `100003114`（頻道已偏綜合要聞）、Fed `press_all.xml`（已有更窄的 monetary／speeches）。

歷史英國來源 URL（已停用，勿加回 cron）：

- ONS：`https://www.ons.gov.uk/releasecalendar?rss`
- HM Treasury：`https://www.gov.uk/government/organisations/hm-treasury.atom`

若 SQLite 裡還留著 `news_source_state.source_id = bank-of-england-speeches` 的連續 403，那是歷史列，管理後台只顯示目前白名單，不會再把它當成排程故障。可選清理：

```sql
DELETE FROM news_source_state WHERE source_id = 'bank-of-england-speeches';
```

## 6. Nginx

網域 `99gold.net` 與 IP `172.237.11.195` 都反代到 Node。憑證可用 Certbot 另開 `:443` server。

`/etc/nginx/sites-available/99gold`：

```nginx
upstream 99gold {
    server 127.0.0.1:3000;
    keepalive 8;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 99gold.net www.99gold.net 172.237.11.195;

    client_max_body_size 2m;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_pass http://99gold;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/99gold /etc/nginx/sites-enabled/99gold
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS 範例（Certbot 完成後）：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 99gold.net www.99gold.net;
    ssl_certificate     /etc/letsencrypt/live/99gold.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/99gold.net/privkey.pem;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_pass http://99gold;
    }
}
```

啟用 HTTPS 後把 `SITE_URL=https://99gold.net` 寫入環境檔，管理登入 cookie 才會帶 `Secure`。

Nginx 已轉發 `Host` 與 `X-Forwarded-Proto`，但 Next.js 的 `request.url` 仍可能是上游 `http://127.0.0.1:3000`。凡是 **絕對** 轉址（例如 `/api/admin/session` 的 `Location`）必須用 `SITE_URL`（去掉結尾斜線）當 origin，不要用 `request.url`；否則手機瀏覽器會跟到 `http://localhost:3000/admin` 而連不上。相對路徑 `redirect("/admin")` 由瀏覽器依目前頁面解析，不受影響。

## 7. 檢查

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
curl -sS http://127.0.0.1:3000/api/global-quotes | head
curl -sS http://127.0.0.1:3000/robots.txt
curl -sS http://127.0.0.1:3000/sitemap.xml | head
sudo systemctl status 99gold.service 99gold-news.timer 99gold-alerts.timer
```

## 8. SEO

`app/robots.ts`、`app/sitemap.ts`、`app/layout.tsx` 的 metadata / Open Graph 維持不變。sitemap 改讀本機 SQLite 的 `news_articles`，沒有資料庫時仍會列出編輯稿。
