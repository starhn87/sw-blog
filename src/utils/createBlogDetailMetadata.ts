import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Metadata } from "next";
import { blogDetailInfoConverter } from "@/converters/blogDetailConverter";

export async function createBlogDetailMetadata(
  page: PageObjectResponse,
  id: string,
): Promise<Metadata> {
  const { title, tags, thumbnailUrl } = blogDetailInfoConverter(page);
  const description = tags.length ? `태그: ${tags.join(", ")}` : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      // TODO: 실제 도메인 주소 적용
      url: `https://YOUR_DOMAIN/${id}`,
      images: thumbnailUrl ? [{ url: thumbnailUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: thumbnailUrl ? [thumbnailUrl] : undefined,
    },
  };
}
