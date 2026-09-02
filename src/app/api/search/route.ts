import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as handlers from "@/lib/api/search";

export async function GET(request: Request) {
  return handlers.GET(request, getCloudflareContext().env);
}
