import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { cache } from "react";

export const notionClient = new Client({
  auth: process.env.NEXT_PUBLIC_NOTION_TOKEN,
});

export const getPages = cache(() => {
  return notionClient.databases.query({
    database_id: process.env.NEXT_PUBLIC_NOTION_DB_ID,
  });
});

export const getPageContent = cache((pageId: string) => {
  return notionClient.blocks.children
    .list({ block_id: pageId })
    .then((res) => res.results as BlockObjectResponse[]);
});

// Slug 값으로 페이지 가져오기(현재 사용할 함수)
export const getPageBySlug = cache((slug: string) => {
  return notionClient.databases
    .query({
      database_id: process.env.NEXT_PUBLIC_NOTION_DB_ID,
    })
    .then((res) => res.results[0] as PageObjectResponse | undefined);
});
