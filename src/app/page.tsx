import { getPages } from "@/utils/notion";
import BlogListItem from "@/components/BlogListItem";
import blogListItemInfoConverter from "@/converters/blogListItemInfoConverter";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export default async function Home() {
  const { results } = (await getPages()) ?? {};

  if (!results) {
    return null;
  }

  const blogs = results.filter(
    (page): page is PageObjectResponse =>
      page.object === "page" && "properties" in page,
  );
  return (
    <div className="flex flex-col gap-10 items-center">
      <section className="w-full flex flex-col gap-8 max-w-2xl px-2 md:px-0">
        {blogs.map((blog) => {
          return (
            <BlogListItem
              key={blog.id}
              {...blogListItemInfoConverter(blog)}
              cardSize="md"
            />
          );
        })}
      </section>
    </div>
  );
}
