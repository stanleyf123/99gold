import { NextResponse } from "next/server";
import { getRawDb } from "../../../db";
import { getChatGPTUser, isAdminEmail } from "../../chatgpt-auth";

const publicDefaults = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
};

const adminDefaults = {
  alertEmailTo: "",
  lineUserId: "",
};

const defaults = { ...publicDefaults, ...adminDefaults };

function publicView(settings: typeof defaults) {
  const next = { ...publicDefaults };
  for (const key of Object.keys(publicDefaults) as Array<keyof typeof publicDefaults>) {
    next[key] = settings[key];
  }
  return next;
}

async function readSettings() {
  const db = getRawDb();
  const result = await db.prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
  return result.results.reduce((settings, row) => {
    if (row.key in settings) settings[row.key as keyof typeof defaults] = row.value;
    return settings;
  }, { ...defaults });
}

export async function GET() {
  try {
    const settings = await readSettings();
    const user = await getChatGPTUser();
    const body = user && isAdminEmail(user.email) ? settings : publicView(settings);
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch {
    const user = await getChatGPTUser().catch(() => null);
    const body = user && isAdminEmail(user.email) ? defaults : publicView(defaults);
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "你沒有管理權限" }, { status: 403 });
  }

  const body = await request.json() as Partial<typeof defaults>;
  const allowed = Object.keys(defaults) as Array<keyof typeof defaults>;
  const entries = allowed
    .filter((key) => typeof body[key] === "string")
    .map((key) => [key, String(body[key]).trim().slice(0, key === "announcement" ? 240 : key === "alertEmailTo" || key === "lineUserId" ? 120 : 80)] as const);
  if (!entries.length) return NextResponse.json({ error: "沒有可儲存的內容" }, { status: 400 });

  const db = getRawDb();
  const now = new Date().toISOString();
  await db.batch(entries.map(([key, value]) => db.prepare(
    "INSERT INTO site_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
  ).bind(key, value, now, user.email)));
  return NextResponse.json({ ...(await readSettings()), updatedAt: now });
}
