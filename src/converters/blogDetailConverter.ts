import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface BlogDetailInfo {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  thumbnailUrl: string;
}

export function blogDetailInfoConverter(
  page: PageObjectResponse,
): BlogDetailInfo {
  const properties = page.properties;

  // Title
  let title = "";
  const titleProp = properties.title;
  if (titleProp && titleProp.type === "title" && titleProp.title.length > 0) {
    title = titleProp.title.map((t) => t.plain_text).join("");
  }

  // Tags
  let tags: string[] = [];
  const tagsProp = properties.tags;
  if (
    tagsProp &&
    tagsProp.type === "multi_select" &&
    Array.isArray(tagsProp.multi_select)
  ) {
    tags = tagsProp.multi_select.map((t) => t.name);
  }

  // CreatedAt
  let createdAt = "";
  const createdAtProp = properties.createdAt;
  if (
    createdAtProp &&
    createdAtProp.type === "created_time" &&
    createdAtProp.created_time
  ) {
    createdAt = createdAtProp.created_time;
  }

  // Thumbnail
  let thumbnailUrl = "";
  const thumbnailProp = properties.thumbnailUrl;
  if (
    thumbnailProp &&
    thumbnailProp.type === "files" &&
    Array.isArray(thumbnailProp.files) &&
    thumbnailProp.files.length > 0
  ) {
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
    thumbnailUrl,
  };
}
