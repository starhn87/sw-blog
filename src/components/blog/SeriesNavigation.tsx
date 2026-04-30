import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSeriesPosts } from "@/lib/mdx";
import type { Post } from "@/types";

export function SeriesNavigation({
  currentSlug,
  seriesName,
}: {
  currentSlug: string;
  seriesName: string;
}) {
  const posts = getSeriesPosts(seriesName);
  const index = posts.findIndex((p) => p.slug === currentSlug);
  if (index === -1) return null;

  const prev = index > 0 ? posts[index - 1] : null;
  const next = index < posts.length - 1 ? posts[index + 1] : null;
  if (!prev && !next) return null;

  return (
    <nav aria-label="시리즈 네비게이션">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{seriesName}</h2>
        <span className="text-sm text-muted-foreground shrink-0">
          {index + 1} / {posts.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SeriesCard post={prev} direction="prev" />
        <SeriesCard post={next} direction="next" />
      </div>
    </nav>
  );
}

function SeriesCard({
  post,
  direction,
}: {
  post: Post | null;
  direction: "prev" | "next";
}) {
  if (!post) {
    return <div className="hidden sm:block" aria-hidden />;
  }

  const isPrev = direction === "prev";
  const label = isPrev ? "이전편" : "다음편";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-lg border border-border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-accent/50 hover:shadow-md hover:shadow-brand/5"
    >
      <div
        className={`mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground ${
          isPrev ? "" : "justify-end"
        }`}
      >
        {isPrev && <ChevronLeft size={14} />}
        <span>{label}</span>
        {!isPrev && <ChevronRight size={14} />}
      </div>
      <h3
        className={`line-clamp-2 text-base font-semibold tracking-tight text-foreground group-hover:text-brand ${
          isPrev ? "text-left" : "text-right"
        }`}
      >
        {post.title}
      </h3>
    </Link>
  );
}
