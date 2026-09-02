import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as handlers from "@/lib/api/commentLikes";

export async function GET(request: Request) {
  return handlers.GET(request, getCloudflareContext().env);
}

export async function POST(request: Request) {
  return handlers.POST(request, getCloudflareContext().env);
}
