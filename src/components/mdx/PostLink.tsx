import Link from "next/link";
import { getPostBySlug } from "@/lib/mdx";
import PostThumbnail from "@/components/blog/PostThumbnail";

export function PostLink({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  if (!post) return null;

  return (
    <Link
      href={`/blog/${slug}`}
      className="not-prose group my-4 flex cursor-pointer overflow-hidden rounded-lg border border-border transition-all duration-300 hover:border-brand/30 hover:bg-accent"
    >
      {post.thumbnail && (
        <PostThumbnail
          src={post.thumbnail}
          alt={post.title}
          width={400}
          sizes="200px"
          className="aspect-[16/9] w-32 shrink-0 object-cover sm:w-48"
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
