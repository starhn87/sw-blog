import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostFrontmatter } from "@/types";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

function isShallowClone(): boolean {
  try {
    return (
      execSync("git rev-parse --is-shallow-repository", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === "true"
    );
  } catch {
    return false;
  }
}

function getGitLastModified(filePath: string): string | null {
  if (isShallowClone()) return null;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => getPostBySlug(file.replace(/\.mdx$/, "")))
    .filter((post): post is Post => post !== null && post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = data as PostFrontmatter;
  const updated =
    frontmatter.updated ??
    getGitLastModified(filePath) ??
    frontmatter.date;

  // MDX JSX lowercase tags bypass components map — alias <img> to <Img> so our override runs
  const transformedContent = content.replace(/<img(\s)/g, "<Img$1");

  return {
    ...frontmatter,
    updated,
    slug,
    content: transformedContent,
    readingTime: readingTime(content).text,
  };
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tags = new Set(posts.flatMap((post) => post.tags));
  return [...tags].sort();
}

export function getSeriesPosts(seriesName: string): Post[] {
  return getAllPosts()
    .filter((p) => p.series === seriesName)
    .sort((a, b) => {
      const ao = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
}

export function getRelatedPosts(
  slug: string,
  limit = 3,
): { posts: Post[]; variant: "related" | "mixed" | "recent" } {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return { posts: [], variant: "related" };

  const currentSeries = current.series;
  const candidates = all.filter(
    (p) => p.slug !== slug && (!currentSeries || p.series !== currentSeries),
  );

  const scored = candidates
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
    })
    .slice(0, limit)
    .map((e) => e.post);

  if (scored.length >= limit) return { posts: scored, variant: "related" };

  const pickedSlugs = new Set(scored.map((p) => p.slug));
  const fillers = candidates
    .filter((p) => !pickedSlugs.has(p.slug))
    .slice(0, limit - scored.length);

  return {
    posts: [...scored, ...fillers],
    variant: scored.length === 0 ? "recent" : "mixed",
  };
}
