import type { MetadataRoute } from "next";
import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await env.DB.prepare("SELECT id FROM daily_news ORDER BY id DESC LIMIT 500").all<{ id: number }>();
  return [{ url: "https://99gold.net" }, ...rows.results.map((row) => ({ url: `https://99gold.net/news/${row.id}` }))];
}
