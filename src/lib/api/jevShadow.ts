import { isAdmin } from "@/lib/auth";
import { collectChatObservations } from "@/lib/chatShadowObservation";

export async function GET(request: Request, env: CloudflareEnv) {
  if (!isAdmin(request, env)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const from = Date.parse(start), to = Date.parse(end);
  if (!iso.test(start) || !iso.test(end) || !Number.isFinite(from) || !Number.isFinite(to) ||
    new Date(from).toISOString() !== start || new Date(to).toISOString() !== end ||
    from >= to || to - from > 31 * 86_400_000) return Response.json({ error: "invalid range" }, { status: 400 });
  return Response.json(await collectChatObservations(env.DB, start, end), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request, env: CloudflareEnv) {
  if (!isAdmin(request, env)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const result = await env.DB.prepare("DELETE FROM jev_shadow_events WHERE observed_at < ?").bind(cutoff).run();
  return Response.json({ retentionDays: 90, deleted: result.meta.changes }, { headers: { "Cache-Control": "private, no-store" } });
}
