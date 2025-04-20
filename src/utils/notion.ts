import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export const notionClient = new Client({
  auth: process.env.NEXT_PUBLIC_NOTION_TOKEN as string,
});

export async function getPages() {
  return notionClient.databases.query({
    database_id: process.env.NEXT_PUBLIC_NOTION_DB_ID as string,
  });
}

export async function getPage(id: string) {
  return notionClient.pages.retrieve({ page_id: id });
}

export async function getPageContent(id: string) {
  const blocks = await notionClient.blocks.children.list({ block_id: id });
  return blocks.results as BlockObjectResponse[];
}
