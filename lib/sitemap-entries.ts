import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";
import { hreflangHrefs, localizedHref } from "./locale-path";

export type BriefSitemapRow = {
  id: string;
  published_at?: string | null;
  translated_at?: string | null;
  source_published_at?: string | null;
};

export type ArchivedSitemapRow = {
  id: string;
  published_at?: string | null;
};

export function sitemapLastmod(value?: string | Date | null): Date {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function newsLanguageAlternates(path: string, siteUrl = SITE_URL): Record<string, string> {
  const hrefs = hreflangHrefs(path);
  return {
    "zh-Hant": `${siteUrl}${hrefs["zh-Hant"]}`,
    en: `${siteUrl}${hrefs.en}`,
    ja: `${siteUrl}${hrefs.ja}`,
    "x-default": `${siteUrl}${hrefs["x-default"]}`,
  };
}

export function briefSitemapEntries(
  rows: BriefSitemapRow[],
  siteUrl = SITE_URL,
): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  for (const row of rows) {
    const id = row.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const lastModified = sitemapLastmod(row.translated_at || row.published_at || row.source_published_at);
    entries.push({
      url: `${siteUrl}${localizedHref(`/news/${id}`, "zh")}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.65,
      alternates: {
        languages: newsLanguageAlternates(`/news/${id}`, siteUrl),
      },
    });
  }
  return entries;
}

export function archivedArticleSitemapEntries(
  rows: ArchivedSitemapRow[],
  siteUrl = SITE_URL,
): MetadataRoute.Sitemap {
  return rows
    .filter((row) => row.id)
    .map((row) => ({
      url: `${siteUrl}/news/${row.id}`,
      lastModified: sitemapLastmod(row.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
}
