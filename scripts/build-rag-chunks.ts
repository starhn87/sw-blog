import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");
const OUTPUT = path.join(process.cwd(), "public/rag-chunks.json");
const CHUNK_SIZE = 500;
const OVERLAP = 50;

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

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - OVERLAP) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
    if (i + CHUNK_SIZE >= words.length) break;
  }

  return chunks;
}

function buildChunks() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.writeFileSync(OUTPUT, "[]");
    console.log("No posts found. Empty chunks created.");
    return;
  }

  const allChunks: { slug: string; title: string; chunkIndex: number; content: string }[] = [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    if (!data.published) continue;

    const plain = stripMdx(content);
    const chunks = chunkText(plain);
    const slug = file.replace(/\.mdx$/, "");

    chunks.forEach((chunk, i) => {
      allChunks.push({
        slug,
        title: data.title,
        chunkIndex: i,
        content: chunk,
      });
    });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(allChunks));
  console.log(`RAG chunks built: ${allChunks.length} chunks from ${files.length} posts`);
}

buildChunks();
