import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { getPostBySlug, getPostSlugs } from "@/lib/mdx";
import { mdxComponents } from "@/components/mdx/MDXComponents";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ViewCounter } from "@/components/blog/ViewCounter";
import { LikeButton } from "@/components/blog/LikeButton";
import { CommentSection } from "@/components/blog/CommentSection";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = getPostBySlug(slug);
    if (!post) return { title: "Not Found" };
    return {
      title: post.title,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        publishedTime: post.date,
        tags: post.tags,
      },
      alternates: {
        canonical: `/blog/${slug}`,
      },
    };
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "이승우",
      url: "https://www.seung-woo.me/about",
    },
    url: `https://www.seung-woo.me/blog/${slug}`,
  };

  return (
    <div className="relative flex gap-0 xl:gap-12">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <article className="mx-auto max-w-3xl flex-1 min-w-0">
      <header className="mb-10">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>&middot;</span>
          <span>{post.readingTime}</span>
          <span>&middot;</span>
          <ViewCounter slug={slug} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypePrettyCode,
                  {
                    theme: {
                      dark: "github-dark",
                      light: "github-light",
                    },
                  },
                ],
              ],
            },
          }}
        />
      </div>
      <div className="mt-10 flex items-center gap-4">
        <LikeButton slug={slug} />
      </div>
      <CommentSection slug={slug} />
    </article>
    <TableOfContents />
    </div>
  );
}
