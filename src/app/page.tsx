import { DisplayModeButton } from "@/components/DisplayModeButton";
import { getPages } from "@/utils/notion";

export default async function Home() {
  const blogs = await getPages();

  return (
    <div>
      <DisplayModeButton />
    </div>
  );
}
