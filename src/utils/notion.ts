import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DB_ID = process.env.NOTION_DB_ID;

export const notionClient = (() => {
  if (!NOTION_TOKEN) {
    return;
  }
  return new Client({ auth: NOTION_TOKEN });
})();

export async function getPages() {
  if (!NOTION_DB_ID) {
    return;
  }
  return notionClient?.databases.query({ database_id: NOTION_DB_ID });
}

export async function getPage(id: string) {
  return notionClient?.pages.retrieve({ page_id: id });
}

export async function getPageContent(id: string) {
  const blocks = (await notionClient?.blocks.children.list({
    block_id: id,
  })) ?? { results: [] };
  return blocks?.results as BlockObjectResponse[];
}
