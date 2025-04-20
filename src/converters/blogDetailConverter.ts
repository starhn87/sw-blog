import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface BlogDetailInfo {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  thumbnailUrl: string;
}

export function blogDetailInfoConverter(page: PageObjectResponse): BlogDetailInfo {
  const properties = page.properties;

  // Title
  let title = "";
  const titleProp = properties["제목"];
  if (titleProp && titleProp.type === "title" && titleProp.title.length > 0) {
    title = titleProp.title.map(t => t.plain_text).join("");
  }

  // Tags
  let tags: string[] = [];
  const tagsProp = properties["태그"];
  if (tagsProp && tagsProp.type === "multi_select" && Array.isArray(tagsProp.multi_select)) {
    tags = tagsProp.multi_select.map(t => t.name);
  }

  // CreatedAt
  let createdAt = "";
  const createdAtProp = properties["생성일"];
  if (createdAtProp && createdAtProp.type === "date" && createdAtProp.date) {
    createdAt = createdAtProp.date.start;
  }

  // Thumbnail
  let thumbnailUrl = "";
  const thumbnailProp = properties["썸네일"];
  if (thumbnailProp && thumbnailProp.type === "files" && Array.isArray(thumbnailProp.files) && thumbnailProp.files.length > 0) {
    const file = thumbnailProp.files[0];
    if (file.type === "external") {
      thumbnailUrl = file.external.url;
    } else if (file.type === "file") {
      thumbnailUrl = file.file.url;
    }
  }

  return {
    id: page.id,
    title,
    tags,
    createdAt,
    thumbnailUrl
  };
}
