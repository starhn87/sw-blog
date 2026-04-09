import { getRelatedPosts } from "@/lib/mdx";
import { RelatedPostCard } from "./RelatedPostCard";

export function RelatedPosts({ currentSlug }: { currentSlug: string }) {
  const { posts, variant } = getRelatedPosts(currentSlug, 3);
  if (posts.length === 0) return null;

  const heading =
    variant === "related"
      ? "관련 글"
      : variant === "mixed"
        ? "더 읽어보기"
        : "최근 글";

  return (
    <section aria-label={heading}>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <RelatedPostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}
