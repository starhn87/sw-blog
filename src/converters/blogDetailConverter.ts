import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface BlogDetailInfo {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  thumbnailUrl: string;
}

export function blogDetailInfoConverter(page: PageObjectResponse): BlogDetailInfo {
  return {
    id: page.id,
    title: page.properties.title.title[0]?.plain_text || "",
    tags: page.properties.tags.multi_select.map((tag: any) => tag.name),
    createdAt: page.properties.createdAt.created_time,
    thumbnailUrl: page.properties.thumbnailUrl.files[0]?.file?.url || "",
  };
}
