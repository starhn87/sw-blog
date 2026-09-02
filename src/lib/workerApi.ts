import * as views from "./api/views";
import * as likes from "./api/likes";
import * as comments from "./api/comments";
import * as commentLikes from "./api/commentLikes";
import * as analytics from "./api/analytics";
import * as media from "./api/media";
import * as search from "./api/search";
import { logError } from "./log";

const routes: Record<string, Record<string, (
  request: Request, env: CloudflareEnv, ctx: Pick<ExecutionContext, "waitUntil">,
) => Promise<Response>>> = {
  "/api/views": views,
  "/api/likes": likes,
  "/api/comments": comments,
  "/api/comments/likes": commentLikes,
  "/api/analytics": analytics,
  "/api/media": media,
  "/api/search": search,
};

export async function handleApiRequest(
  request: Request, env: CloudflareEnv, ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  if (!Object.hasOwn(routes, path)) return;
  const methods = routes[path];
  let response: Response;
  if (request.method === "OPTIONS") {
    response = new Response(null, {
      status: 204,
      headers: { Allow: [...Object.keys(methods), "HEAD", "OPTIONS"].sort().join(", ") },
    });
  } else {
    const method = request.method === "HEAD" ? "GET" : request.method;
    if (!Object.hasOwn(methods, method)) {
      response = new Response(null, { status: 405 });
    } else {
      try {
        response = await methods[method](request, env, ctx);
      } catch (error) {
        logError("api/request", error, { path, method: request.method });
        response = new Response(null, { status: 500, headers: { "Cache-Control": "private, no-store" } });
      }
    }
  }
  if (request.method === "HEAD") response = new Response(null, response);
  response.headers.set("X-API-Runtime", "worker");
  return response;
}
