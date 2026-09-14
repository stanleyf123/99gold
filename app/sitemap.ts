import type { MetadataRoute } from "next";
import { getRawDb } from "../db";
import { editorials } from "./news/editorial";
import { SITE_URL } from "../lib/seo";
import {
  archivedArticleSitemapEntries,
  briefSitemapEntries,
  sitemapLastmod,
} from "../lib/sitemap-entries";

export const dynamic = "force-dynamic";

const staticRoutes = [
  { path: "/", changeFrequency: "hourly" as const, priority: 1 },
  { path: "/jewelry", changeFrequency: "hourly" as const, priority: 0.9 },
  { path: "/international", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/recycling", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/global", changeFrequency: "hourly" as const, priority: 0.8 },
  { path: "/news", changeFrequency: "hourly" as const, priority: 0.85 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  let archived: { id: string; published_at?: string | null }[] = [];
  let briefs: { id: string; published_at?: string | null; translated_at?: string | null; source_published_at?: string | null }[] = [];
  try {
    const db = getRawDb();
    const [archiveRows, briefRows] = await Promise.all([
      db.prepare("SELECT id, published_at FROM news_articles ORDER BY published_at DESC LIMIT 500")
        .all<{ id: string; published_at?: string | null }>(),
      db.prepare(`SELECT id, published_at, translated_at, source_published_at
        FROM news_candidates
        WHERE status = 'published' AND published_at IS NOT NULL
        ORDER BY published_at DESC LIMIT 500`)
        .all<{ id: string; published_at?: string | null; translated_at?: string | null; source_published_at?: string | null }>(),
    ]);
    archived = archiveRows.results;
    briefs = briefRows.results;
  } catch {
    /* Authored articles remain available without the archive database. */
  }

  const briefIds = new Set(briefs.map((row) => row.id));
  const editorialIds = new Set(editorials.map((article) => article.id));

  return [
    ...staticRoutes.map((route) => ({
      url: route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`,
      lastModified: generatedAt,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...(["zh", "en", "ja"] as const).map((lang) => ({
      url: `${SITE_URL}/news?lang=${lang}`,
      lastModified: generatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...editorials.map((article) => ({
      url: `${SITE_URL}/news/${article.id}`,
      lastModified: sitemapLastmod(article.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          editorials.filter((related) => related.group === article.group).map((related) => [
            related.locale === "zh" ? "zh-Hant" : related.locale,
            `${SITE_URL}/news/${related.id}`,
          ]),
        ),
      },
    })),
    ...briefSitemapEntries(briefs),
    ...archivedArticleSitemapEntries(archived.filter((row) => !briefIds.has(row.id) && !editorialIds.has(row.id))),
  ];
}
