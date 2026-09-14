import type { MetadataRoute } from "next";
import { getRawDb } from "../db";
import { editorials } from "./news/editorial";
import { SITE_URL } from "../lib/seo";

export const dynamic = "force-dynamic";

const staticRoutes = ["/", "/jewelry", "/international", "/recycling", "/global"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  let archived: { id: string }[] = [];
  try {
    archived = (await getRawDb().prepare("SELECT id FROM news_articles ORDER BY published_at DESC LIMIT 500").all<{ id: string }>()).results;
  } catch {
    /* Authored articles remain available without the archive database. */
  }

  return [
    ...staticRoutes.map((path) => ({
      url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: path === "/" || path === "/jewelry" ? "hourly" as const : "daily" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...(["zh", "en", "ja"] as const).map((lang) => ({
      url: `${SITE_URL}/news?lang=${lang}`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...editorials.map((article) => ({
      url: `${SITE_URL}/news/${article.id}`,
      lastModified: article.publishedAt,
      alternates: {
        languages: Object.fromEntries(
          editorials.filter((related) => related.group === article.group).map((related) => [
            related.locale === "zh" ? "zh-Hant" : related.locale,
            `${SITE_URL}/news/${related.id}`,
          ]),
        ),
      },
    })),
    ...archived.map((row) => ({ url: `${SITE_URL}/news/${row.id}` })),
  ];
}
