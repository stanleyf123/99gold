import type { MetadataRoute } from "next";
import { getRawDb } from "../db";
import { editorials } from "./news/editorial";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let archived: {id:string}[]=[];
  try { archived=(await getRawDb().prepare("SELECT id FROM news_articles ORDER BY published_at DESC LIMIT 500").all<{id:string}>()).results; } catch { /* Authored articles remain available without the archive database. */ }
  return [{url:"https://99gold.net"},...(["zh","en","ja"].map(lang=>({url:`https://99gold.net/news?lang=${lang}`}))),...editorials.map(a=>({url:`https://99gold.net/news/${a.id}`,lastModified:a.publishedAt,alternates:{languages:Object.fromEntries(editorials.filter(b=>b.group===a.group).map(b=>[b.locale==="zh"?"zh-Hant":b.locale,`https://99gold.net/news/${b.id}`]))}})),...archived.map(row=>({url:`https://99gold.net/news/${row.id}`}))];
}
