import Link from "next/link";
import type { Post } from "@/types";
import { canOptimize, getImageSrcSet, getOptimizedImageUrl } from "@/lib/image";

export function RelatedPostCard({ post }: { post: Post }) {
  return (
    <article className="group h-full transition-transform duration-300 ease-out hover:-translate-y-1">
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border transition-all duration-300 group-hover:border-brand/30 group-hover:bg-accent/50 group-hover:shadow-md group-hover:shadow-brand/5">
          {post.thumbnail ? (
            <img
              src={
                canOptimize(post.thumbnail)
                  ? getOptimizedImageUrl(post.thumbnail, 600)
                  : post.thumbnail
              }
              srcSet={getImageSrcSet(post.thumbnail)}
              sizes="(min-width: 768px) 33vw, 100vw"
              alt={post.title}
              className="aspect-[16/9] w-full border-b border-border object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center border-b border-border bg-brand/10">
              <img
                src="/logo.svg"
                alt=""
                aria-hidden
                className="h-1/2 w-1/2 object-contain opacity-60"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col p-4">
            <time
              dateTime={post.date}
              className="text-xs text-muted-foreground"
            >
              {new Date(post.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <h3 className="mt-1 line-clamp-2 min-h-[2lh] text-base font-semibold tracking-tight">
              {post.title}
            </h3>
            {post.tags.length > 0 && (
              <div className="mt-auto pt-3">
                <div className="flex h-[1.375rem] flex-wrap gap-1.5 overflow-hidden">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex h-[1.375rem] shrink-0 items-center rounded-full bg-brand/10 px-2.5 text-xs font-medium text-foreground/70 dark:bg-brand/15"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
