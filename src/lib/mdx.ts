import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostFrontmatter } from "@/types";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

function getGitLastModified(filePath: string): string | null {
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
  const updated = getGitLastModified(filePath) ?? frontmatter.date;

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
