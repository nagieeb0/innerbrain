/** InnerBrain landing server: serves public/ and stores demo requests in Postgres. */
import { SQL } from "bun";
import { timingSafeEqual } from "node:crypto";
import { parseLead } from "./lead";

const db = new SQL(process.env.DATABASE_URL!);
const ADMIN_KEY = process.env.ADMIN_KEY ?? "";
const PUBLIC = `${import.meta.dir}/public`;

await db`create table if not exists leads (
  id serial primary key, created_at timestamptz not null default now(),
  name text not null, company text not null, phone text not null, email text,
  team_size text, city text, need text, ip text)`;

// ponytail: in-memory per-IP throttle (5 per 10 min), resets on deploy; move to Redis if ever multi-instance.
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > 5;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function adminOk(key: string | null) {
  if (!ADMIN_KEY || !key) return false;
  const a = Buffer.from(key), b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    const url = new URL(req.url);
    const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

    if (url.pathname === "/api/lead" && req.method === "POST") {
      if (throttled(ip)) return json({ error: "طلبات كثيرة، حاول بعد قليل." }, 429);
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "طلب غير صالح." }, 400);
      const lead = parseLead(body);
      if ("error" in lead) return lead.error === "spam" ? json({ ok: true }) : json(lead, 422);
      await db`insert into leads ${db({ ...lead, ip })}`;
      return json({ ok: true });
    }

    if (url.pathname === "/leads") {
      if (!adminOk(url.searchParams.get("key"))) return new Response("Not found", { status: 404 });
      const rows = await db`select * from leads order by id desc limit 500`;
      const cols = ["id", "created_at", "name", "company", "phone", "email", "team_size", "city", "need"];
      const tr = rows.map((r: any) => `<tr>${cols.map((c) => `<td>${esc(c === "created_at" ? new Date(r[c]).toISOString().slice(0, 16).replace("T", " ") : r[c])}</td>`).join("")}</tr>`).join("");
      return new Response(
        `<!doctype html><meta charset=utf-8><meta name=robots content=noindex><title>Leads (${rows.length})</title><style>body{font:14px system-ui;padding:20px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 8px;vertical-align:top;max-width:360px}</style><h1>Leads (${rows.length})</h1><table dir=auto><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${tr}</table>`,
        { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
      );
    }

    if (url.pathname === "/health") return new Response("ok");

    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (/^[\w-]+\.(html|js|css|svg|png|ico|txt|webp|xml)$/.test(name)) {
      const file = Bun.file(`${PUBLIC}/${name}`);
      if (await file.exists())
        return new Response(file, { headers: { "cache-control": name.endsWith(".html") ? "no-cache" : "public, max-age=3600" } });
    }
    return new Response("Not found", { status: 404 });
  },
});
