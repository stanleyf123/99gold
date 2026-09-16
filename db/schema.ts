import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const newsArticles = sqliteTable("news_articles", {
  id: text("id").primaryKey(),
  locale: text("locale").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sourceUrl: text("source_url").notNull(),
  publishedAt: text("published_at").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

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

export const newsCandidates = sqliteTable("news_candidates", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  externalId: text("external_id").notNull(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  title: text("title").notNull(),
  titleHash: text("title_hash").notNull(),
  summary: text("summary"),
  sourceName: text("source_name").notNull(),
  sourceLanguage: text("source_language").notNull().default("en"),
  category: text("category").notNull().default("macro"),
  sourcePublishedAt: text("source_published_at").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledFor: text("scheduled_for"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  publishedAt: text("published_at"),
  titleZh: text("title_zh"),
  titleEn: text("title_en"),
  titleJa: text("title_ja"),
  summaryZh: text("summary_zh"),
  summaryEn: text("summary_en"),
  summaryJa: text("summary_ja"),
  translationProvider: text("translation_provider"),
  translatedAt: text("translated_at"),
  translationRetryAt: text("translation_retry_at"),
  translationAttempts: integer("translation_attempts").notNull().default(0),
});

export const newsSourceState = sqliteTable("news_source_state", {
  sourceId: text("source_id").primaryKey(),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastAttemptAt: text("last_attempt_at").notNull(),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  consecutiveErrors: integer("consecutive_errors").notNull().default(0),
});

export const newsRuns = sqliteTable("news_runs", {
  id: text("id").primaryKey(),
  trigger: text("trigger").notNull(),
  scheduledFor: text("scheduled_for").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(),
  sourcesChecked: integer("sources_checked").notNull().default(0),
  itemsSeen: integer("items_seen").notNull().default(0),
  candidatesAdded: integer("candidates_added").notNull().default(0),
  duplicatesSkipped: integer("duplicates_skipped").notNull().default(0),
  publishedCount: integer("published_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  details: text("details"),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("zh"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at").notNull(),
});

export const oauthAccounts = sqliteTable("oauth_accounts", {
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
