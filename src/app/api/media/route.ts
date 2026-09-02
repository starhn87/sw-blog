import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as handlers from "@/lib/api/media";

export async function GET(request: Request) {
  return handlers.GET(request, getCloudflareContext().env);
}

export async function POST(request: Request) {
  return handlers.POST(request, getCloudflareContext().env);
}

export async function PUT(request: Request) {
  return handlers.PUT(request, getCloudflareContext().env);
}

export async function DELETE(request: Request) {
  return handlers.DELETE(request, getCloudflareContext().env);
}
