import Image from "next/image";

export function notionBlocksToElements(blocks: any[]) {
  return blocks.map((block, idx) => {
    if (block.type === "paragraph") {
      return (
        <p key={block.id} className="mb-4 text-base leading-relaxed">
          {block.paragraph.rich_text.map((rt: any, i: number) => rt.plain_text).join("")}
        </p>
      );
    }
    if (block.type === "heading_1") {
      return (
        <h1 key={block.id} className="text-2xl font-bold mt-8 mb-3">
          {block.heading_1.rich_text.map((rt: any) => rt.plain_text).join("")}
        </h1>
      );
    }
    if (block.type === "heading_2") {
      return (
        <h2 key={block.id} className="text-xl font-semibold mt-6 mb-2">
          {block.heading_2.rich_text.map((rt: any) => rt.plain_text).join("")}
        </h2>
      );
    }
    if (block.type === "image") {
      const url = block.image.type === "file" ? block.image.file.url : block.image.external.url;
      return (
        <div key={block.id} className="my-6 flex justify-center">
          <Image src={url} alt="blog image" width={600} height={350} className="rounded-lg object-contain max-h-96" />
        </div>
      );
    }
    return null;
  });
}
