import Link from "next/link";
import { getPostBySlug } from "@/lib/mdx";
import { canOptimize, getImageSrcSet, getOptimizedImageUrl } from "@/lib/image";

export function PostLink({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  if (!post) return null;

  return (
    <Link
      href={`/blog/${slug}`}
      className="not-prose group my-4 flex cursor-pointer overflow-hidden rounded-lg border border-border transition-all duration-300 hover:border-brand/30 hover:bg-accent"
    >
      {post.thumbnail && (
        <img
          src={
            canOptimize(post.thumbnail)
              ? getOptimizedImageUrl(post.thumbnail, 400)
              : post.thumbnail
          }
          srcSet={getImageSrcSet(post.thumbnail)}
          sizes="200px"
          alt={post.title}
          className="aspect-[16/9] w-32 shrink-0 object-cover sm:w-48"
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1 border-l border-border p-4">
        <span className="text-sm font-semibold tracking-tight">
          {post.title}
        </span>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {post.description}
        </span>
      </div>
    </Link>
  );
}
