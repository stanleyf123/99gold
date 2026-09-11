import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

const defaults = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
};

async function ensureTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  )`).run();
}

async function readSettings() {
  await ensureTable();
  const result = await env.DB.prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
  return result.results.reduce((settings, row) => {
    if (row.key in settings) settings[row.key as keyof typeof defaults] = row.value;
    return settings;
  }, { ...defaults });
}

export async function GET() {
  try {
    return NextResponse.json(await readSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(defaults, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  if (user.email.toLowerCase() !== "stanleys1225@gmail.com") {
    return NextResponse.json({ error: "你沒有管理權限" }, { status: 403 });
  }

  const body = await request.json() as Partial<typeof defaults>;
  const allowed = Object.keys(defaults) as Array<keyof typeof defaults>;
  const entries = allowed
    .filter((key) => typeof body[key] === "string")
    .map((key) => [key, String(body[key]).trim().slice(0, key === "announcement" ? 240 : 80)] as const);
  if (!entries.length) return NextResponse.json({ error: "沒有可儲存的內容" }, { status: 400 });

  await ensureTable();
  const now = new Date().toISOString();
  await env.DB.batch(entries.map(([key, value]) => env.DB.prepare(
    "INSERT INTO site_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
  ).bind(key, value, now, user.email)));
  return NextResponse.json({ ...(await readSettings()), updatedAt: now });
}
