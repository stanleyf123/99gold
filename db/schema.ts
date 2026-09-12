import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dailyNews = sqliteTable("daily_news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  newsDay: text("news_day").notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  summary: text("summary"),
  url: text("url").notNull(),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  sourceLanguage: text("source_language"),
  articleDate: text("article_date").notNull(),
  image: text("image"),
  fetchedAt: text("fetched_at").notNull(),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});
