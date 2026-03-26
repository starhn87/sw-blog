import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  const processKey = process.env.ANTHROPIC_API_KEY ?? "(empty)";
  let cfKey = "(error)";
  try {
    cfKey = getRequestContext().env.ANTHROPIC_API_KEY ?? "(empty)";
  } catch (e) {
    cfKey = `(catch: ${e instanceof Error ? e.message : "unknown"})`;
  }

  // 키의 앞 10자 + 뒤 4자만 노출
  const mask = (k: string) => {
    if (k.startsWith("(")) return k;
    if (k.length < 16) return `(too short: ${k.length})`;
    return `${k.slice(0, 10)}...${k.slice(-4)} (len:${k.length})`;
  };

  return Response.json({
    processEnv: mask(processKey),
    getRequestContext: mask(cfKey),
  });
}
