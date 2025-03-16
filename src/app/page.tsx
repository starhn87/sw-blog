import { DisplayModeButton } from "@/components/DisplayModeButton";
import { getPages } from "@/utils/notion";
import BlogListItem from "@/components/BlogListItem";
import blogListItemInfoConverter from "@/utils/blogListItemInfoConverter";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export default async function Home() {
  const { results: blogs } = await getPages();

  return (
    <>
      <div className={"m-10 flex flex-col gap-5"}>
        <div className={"flex justify-end right-0"}>
          <DisplayModeButton />
        </div>
        <div className={"grid place-items-center gap-16"}>
          <h1 className={"font-bold text-4xl"}>이승우의 블로그</h1>
          <div className={"flex-row"}>
            {blogs.map((blog: PageObjectResponse) => {
              return (
                <BlogListItem
                  key={blog.id}
                  {...blogListItemInfoConverter(blog)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
