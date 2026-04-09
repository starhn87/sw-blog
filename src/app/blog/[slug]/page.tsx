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
import { CommentSectionLazy } from "@/components/blog/CommentSectionLazy";
import { ProseZoom } from "@/components/mdx/ZoomableImage";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ShareButton } from "@/components/blog/ShareButton";
import { SeriesNavigation } from "@/components/blog/SeriesNavigation";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { StaggerChildren, StaggerItem, ScrollReveal } from "@/components/motion/StaggerChildren";
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
    const ogImg = post.ogImage || post.thumbnail || "/og-default.png";
    return {
      title: post.title,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.updated,
        tags: post.tags,
        url: `https://www.seung-woo.me/blog/${slug}`,
        siteName: "이승우 블로그",
        locale: "ko_KR",
        images: [{ url: ogImg, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.description,
        images: [ogImg],
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

  const siteUrl = "https://www.seung-woo.me";
  const postUrl = `${siteUrl}/blog/${slug}`;
  const rawImage = post.ogImage || post.thumbnail;
  const imageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${siteUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    ...(imageUrl && { image: [imageUrl] }),
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    ...(post.series && {
      isPartOf: {
        "@type": "CreativeWorkSeries",
        name: post.series,
      },
    }),
    ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
    author: {
      "@type": "Person",
      name: "이승우",
      url: `${siteUrl}/about`,
    },
    publisher: {
      "@type": "Person",
      name: "이승우",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    url: postUrl,
  };

  return (
    <div className="relative flex gap-0 xl:gap-12">
    <ReadingProgress />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <StaggerChildren className="flex-1 min-w-0" as="article">
      <StaggerItem>
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight">
            {post.title}
          </h1>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>&middot;</span>
              <ViewCounter slug={slug} />
            </div>
            <ShareButton />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-foreground/70 dark:bg-brand/15"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>
      </StaggerItem>
      <ProseZoom>
        <div className="prose prose-neutral dark:prose-invert max-w-none wrap-break-word">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{
              // Blog posts are authored in this repo, so JSX expression attributes
              // (e.g. <img sizes={["33vw", 267]} />) are trusted. blockDangerousJS
              // still blocks things like eval/Function.
              blockJS: false,
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
      </ProseZoom>
      <StaggerItem>
        <div className="mt-10 flex items-center gap-4">
          <LikeButton slug={slug} />
        </div>
        {post.series && (
          <ScrollReveal className="mt-16">
            <SeriesNavigation currentSlug={slug} seriesName={post.series} />
          </ScrollReveal>
        )}
        <ScrollReveal className="mt-16">
          <RelatedPosts currentSlug={slug} />
        </ScrollReveal>
        <CommentSectionLazy slug={slug} />
      </StaggerItem>
    </StaggerChildren>
    <TableOfContents />
    </div>
  );
}
