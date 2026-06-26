import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getAllTags, getPostsByTag } from "@/lib/mdx";
import { PostCard } from "@/components/blog/PostCard";
import { TagCloud } from "@/components/home/TagCloud";
import { ScrollReveal } from "@/components/motion/StaggerChildren";

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `'${decoded}' 태그가 달린 글 모음`,
    alternates: { canonical: `/blog/tag/${tag}` },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = getPostsByTag(decoded);

  if (posts.length === 0) notFound();

  const allTags = getAllTags();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/blog"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          모든 글
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">#{decoded}</h1>
        <p className="text-sm text-muted-foreground">{posts.length}개의 글</p>
      </div>
      <TagCloud tags={allTags} activeTag={decoded} />
      <div className="flex flex-col gap-4 md:gap-6">
        {posts.map((post) => (
          <ScrollReveal key={post.slug}>
            <PostCard post={post} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
