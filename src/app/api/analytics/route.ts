import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  ne,
} from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getOrCreateVisitorId } from "@/lib/auth";
import {
  isAnalyticsEvent,
  isAnalyticsSource,
  isValidPostSlug,
} from "@/lib/analytics";
import {
  ANALYTICS_EVENT_START_DAYS,
  getAnalyticsDay,
  hashDailyVisitor,
  POST_VIEW_START_DAY,
} from "@/lib/analytics.server";
import { getDB } from "@/lib/db";
import { analyticsEvents, dailyViews } from "@/lib/schema";

export const runtime = "edge";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDateRange(request: Request): { start: string; end: string } | null {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? getAnalyticsDay(-6);
  const end = searchParams.get("end") ?? getAnalyticsDay(1);
  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) return null;

  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    startTime >= endTime ||
    endTime - startTime > 31 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }
  return { start, end };
}

export async function GET(request: Request) {
  const range = getDateRange(request);
  if (!range) {
    return Response.json({ error: "invalid date range" }, { status: 400 });
  }

  const db = getDB(getRequestContext().env.DB);
  const inRange = and(
    gte(analyticsEvents.day, range.start),
    lt(analyticsEvents.day, range.end),
  );
  const viewInRange = and(
    gte(dailyViews.day, range.start),
    lt(dailyViews.day, range.end),
  );
  const [
    events,
    sources,
    sourceVisitors,
    engagedPosts,
    postReaderTotal,
    postReaderPosts,
  ] = await db.batch([
    db
      .select({ event: analyticsEvents.event, count: count() })
      .from(analyticsEvents)
      .where(inRange)
      .groupBy(analyticsEvents.event),
    db
      .select({
        event: analyticsEvents.event,
        source: analyticsEvents.source,
        count: count(),
      })
      .from(analyticsEvents)
      .where(and(inRange, ne(analyticsEvents.source, "")))
      .groupBy(analyticsEvents.event, analyticsEvents.source),
    db
      .select({
        event: analyticsEvents.event,
        source: analyticsEvents.source,
        count: countDistinct(analyticsEvents.visitorHash),
      })
      .from(analyticsEvents)
      .where(and(inRange, ne(analyticsEvents.source, "")))
      .groupBy(analyticsEvents.event, analyticsEvents.source),
    db
      .select({ slug: analyticsEvents.slug, count: count() })
      .from(analyticsEvents)
      .where(and(inRange, eq(analyticsEvents.event, "engaged_read")))
      .groupBy(analyticsEvents.slug)
      .orderBy(desc(count()))
      .limit(50),
    db.select({ count: count() }).from(dailyViews).where(viewInRange),
    db
      .select({ slug: dailyViews.slug, count: count() })
      .from(dailyViews)
      .where(viewInRange)
      .groupBy(dailyViews.slug)
      .orderBy(desc(count()))
      .limit(50),
  ]);

  return Response.json({
    range,
    events,
    sources,
    sourceVisitors,
    engagedPosts,
    postReaders: {
      total: postReaderTotal[0]?.count ?? 0,
      posts: postReaderPosts,
    },
    coverage: {
      events: ANALYTICS_EVENT_START_DAYS,
      postViews: POST_VIEW_START_DAY,
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid event" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  if (!isAnalyticsEvent(input.event)) {
    return Response.json({ error: "invalid event" }, { status: 400 });
  }

  let slug = "";
  let source = "";
  if (input.event === "post_click") {
    if (!isValidPostSlug(input.slug) || !isAnalyticsSource(input.source)) {
      return Response.json({ error: "invalid post click" }, { status: 400 });
    }
    slug = input.slug;
    source = input.source;
  } else if (input.event === "engaged_read") {
    if (!isValidPostSlug(input.slug)) {
      return Response.json({ error: "invalid engaged read" }, { status: 400 });
    }
    slug = input.slug;
  } else if (input.event === "listing_view") {
    if (
      input.source !== "home" &&
      input.source !== "blog" &&
      input.source !== "tag"
    ) {
      return Response.json({ error: "invalid listing view" }, { status: 400 });
    }
    source = input.source;
  } else {
    source = "search";
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const day = getAnalyticsDay();
  const visitorHash = await hashDailyVisitor(visitorId, day);
  const db = getDB(getRequestContext().env.DB);
  await db
    .insert(analyticsEvents)
    .values({ day, event: input.event, slug, source, visitorHash })
    .onConflictDoNothing({
      target: [
        analyticsEvents.day,
        analyticsEvents.event,
        analyticsEvents.slug,
        analyticsEvents.source,
        analyticsEvents.visitorHash,
      ],
    });

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": setCookieHeader },
  });
}
