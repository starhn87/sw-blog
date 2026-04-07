import fs from "fs";
import path from "path";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

// 마크다운 이미지 ![alt](src), JSX <img alt="..."> 또는 <ImageZoom alt="..."> 모두 검사
const MD_IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const JSX_IMG = /<(img|ImageZoom)\b([^>]*)\/?>/g;
const ALT_ATTR = /alt\s*=\s*["']([^"']*)["']/;

type Issue = { file: string; line: number; snippet: string };

function checkFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    let m: RegExpExecArray | null;

    MD_IMAGE.lastIndex = 0;
    while ((m = MD_IMAGE.exec(line)) !== null) {
      if (!m[1].trim()) {
        issues.push({ file: filePath, line: idx + 1, snippet: m[0] });
      }
    }

    JSX_IMG.lastIndex = 0;
    while ((m = JSX_IMG.exec(line)) !== null) {
      const attrs = m[2];
      const altMatch = attrs.match(ALT_ATTR);
      if (!altMatch || !altMatch[1].trim()) {
        issues.push({ file: filePath, line: idx + 1, snippet: m[0] });
      }
    }
  });

  return issues;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log("No posts directory found.");
    return;
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(POSTS_DIR, f));

  const allIssues = files.flatMap(checkFile);

  if (allIssues.length === 0) {
    console.log(`✓ All ${files.length} MDX files have alt text on every image.`);
    return;
  }

  console.error(`✗ Found ${allIssues.length} image(s) without alt text:\n`);
  for (const issue of allIssues) {
    const rel = path.relative(process.cwd(), issue.file);
    console.error(`  ${rel}:${issue.line}`);
    console.error(`    ${issue.snippet}\n`);
  }
  process.exit(1);
}

main();
