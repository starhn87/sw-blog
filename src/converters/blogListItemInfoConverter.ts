import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

interface BlogListItemInfo {
  id: string;
  title: string;
  subTitle: string;
  tags: string[];
  createdAt: string;
  thumbnailUrl: string;
}

const blogListItemInfoConverter = ({
  id,
  properties: { title, subTitle, tags, createdAt, thumbnailUrl },
}: PageObjectResponse): BlogListItemInfo => {
  return {
    id,
    title: title.title[0].text.content,
    subTitle: subTitle.rich_text[0].text.content,
    tags: tags.multi_select.map((tag) => tag.name),
    createdAt: createdAt.created_time,
    thumbnailUrl: thumbnailUrl.files[0].file.url,
  };
};

export default blogListItemInfoConverter;
