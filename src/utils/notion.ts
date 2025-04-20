import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const NOTION_TOKEN = process.env.NEXT_PUBLIC_NOTION_TOKEN as string | undefined;
const NOTION_DB_ID = process.env.NEXT_PUBLIC_NOTION_DB_ID as string | undefined;

if (!NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN is not defined");
}

export const notionClient = new Client({ auth: NOTION_TOKEN });

export async function getPages() {
  if (!NOTION_DB_ID) {
    throw new Error("NOTION_DB_ID is not defined");
  }

  return notionClient.databases.query({ database_id: NOTION_DB_ID });
}

export async function getPage(id: string) {
  return notionClient.pages.retrieve({ page_id: id });
}

export async function getPageContent(id: string) {
  const blocks = await notionClient.blocks.children.list({ block_id: id });
  return blocks.results as BlockObjectResponse[];
}
