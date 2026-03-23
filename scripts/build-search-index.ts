import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");
const OUTPUT = path.join(process.cwd(), "public/search-index.json");

function stripMdx(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~>-]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function buildIndex() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.writeFileSync(OUTPUT, "[]");
    console.log("No posts found. Empty index created.");
    return;
  }

  const posts = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      if (!data.published) return null;

      return {
        slug: file.replace(/\.mdx$/, ""),
        title: data.title,
        description: data.description,
        tags: data.tags,
        date: data.date,
        content: stripMdx(content).slice(0, 1000),
      };
    })
    .filter(Boolean);

  fs.writeFileSync(OUTPUT, JSON.stringify(posts));
  console.log(`Search index built: ${posts.length} posts`);
}

buildIndex();
