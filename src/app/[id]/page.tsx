import { getPage } from "@/utils/notion";

async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getPage(id);

  // TODO: 컨텐츠 UI 구성
  return <></>;
}
export default BlogDetailPage;
