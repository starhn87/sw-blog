import { getPages } from "@/utils/notion";
import BlogListItem from "@/components/BlogListItem";
import blogListItemInfoConverter from "@/utils/blogListItemInfoConverter";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export default async function Home() {
  const { results: blogs } = await getPages();

  return (
    <div className="flex flex-col gap-10 items-center">
      <section className="w-full flex flex-col gap-8 max-w-2xl px-2 md:px-0">
        {blogs.map((blog: PageObjectResponse, idx: number) => (
          <BlogListItem
            key={blog.id}
            {...blogListItemInfoConverter(blog)}
            cardSize={idx % 2 === 0 ? 'md' : 'lg'} // 카드 크기 다르게 전달
          />
        ))}
      </section>
    </div>
  );
}
