/** Cloudflare Worker entry is unused on the Linux/Node production path.
 * News ingestion runs via `npm run news:pipeline` (systemd timer or cron).
 * See DEPLOY-LINODE.md and scripts/run-news-pipeline.ts.
 */
export {};
