import { blogDetailInfoConverter } from "@/converters/blogDetailConverter";
import { notionBlocksToElements } from "@/utils/notionBlocksToElements";
import { formatKoreanDate } from "@/utils/formatKoreanDate";
import { getPage, getPageContent } from "@/utils/notion";
import { createBlogDetailMetadata } from "@/utils/createBlogDetailMetadata";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import Image from "next/image";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  const page = (await getPage(id)) as PageObjectResponse;
  return createBlogDetailMetadata(page, id);
}

async function BlogDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const page = (await getPage(id)) as PageObjectResponse;
  const blocks = await getPageContent(id);
  const { title, tags, createdAt, thumbnailUrl } = blogDetailInfoConverter(page);

  return (
    <article className="max-w-2xl mx-auto px-2 md:px-0 py-8">
      {thumbnailUrl && (
        <div className="mb-6">
          <Image src={thumbnailUrl} alt={title} width={800} height={400} className="rounded-xl w-full max-h-80 object-cover" />
        </div>
      )}
      <h1 className="font-bold text-3xl mb-2">{title}</h1>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded bg-accent text-xs text-accent-foreground font-medium">#{tag}</span>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mb-8">{formatKoreanDate(createdAt)}</div>
      <section className="prose dark:prose-invert">
        {notionBlocksToElements(blocks)}
      </section>
    </article>
  );
}
export default BlogDetailPage;
