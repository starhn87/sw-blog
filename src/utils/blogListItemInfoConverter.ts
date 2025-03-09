import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

interface BlogListItemInfo {
  title: string;
  subTitle: string;
  tags: string[];
  createdAt: string;
}

const blogListItemInfoConverter = ({
  properties: { title, subTitle, tags, createdAt },
}: PageObjectResponse): BlogListItemInfo => {
  console.log(tags);

  return {
    title: title.title[0].text.content,
    subTitle: subTitle.rich_text[0].text.content,
    tags: tags.multi_select.map((tag) => tag.name),
    createdAt: createdAt.created_time,
  };
};

export default blogListItemInfoConverter;
