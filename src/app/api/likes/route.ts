import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as handlers from "@/lib/api/likes";

export async function GET(request: Request) {
  return handlers.GET(request, getCloudflareContext().env);
}

export async function POST(request: Request) {
  const { env, ctx } = getCloudflareContext();
  return handlers.POST(request, env, ctx);
}
