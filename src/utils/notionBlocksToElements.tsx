import Image from "next/image";
import CodeBlock from "@/components/CodeBlock";
import { ReactNode } from "react";

function renderRichText(richTexts: any[]) {
  return richTexts.flatMap((rt: any, i: number) => {
    // 줄바꿈(\n) 처리: plain_text를 \n으로 split
    const lines = rt.plain_text.split("\n");
    return lines.flatMap((line: string, idx: number) => {
      let el: ReactNode = line;
      if (rt.href) {
        el = (
          <a
            href={rt.href}
            key={i + "-" + idx}
            className="text-blue-600 underline"
          >
            {el}
          </a>
        );
      }
      if (rt.annotations) {
        if (rt.annotations.bold)
          el = (
            <strong key={i + "-" + idx} className="font-extrabold">
              {el}
            </strong>
          );
        if (rt.annotations.italic)
          el = (
            <em key={i + "-" + idx} className="italic">
              {el}
            </em>
          );
        if (rt.annotations.code)
          el = (
            <code
              key={i + "-" + idx}
              className="bg-gray-100 px-1 rounded font-mono text-base"
            >
              {el}
            </code>
          );
        if (rt.annotations.strikethrough)
          el = (
            <span key={i + "-" + idx} className="line-through">
              {el}
            </span>
          );
        if (rt.annotations.underline)
          el = (
            <span key={i + "-" + idx} className="underline">
              {el}
            </span>
          );
      }
      // 줄바꿈 삽입: 마지막 줄이 아니면 <br /> 추가
      return idx < lines.length - 1
        ? [el, <br key={i + "-" + idx + "-br"} />]
        : [el];
    });
  });
}

export function notionBlocksToElements(blocks: any[]) {
  return blocks.map((block, idx) => {
    if (block.type === "paragraph") {
      return (
        <p key={block.id} className="mb-4 text-base" style={{ lineHeight: "2" }}>
          {renderRichText(block.paragraph.rich_text)}
        </p>
      );
    }
    if (block.type === "heading_1") {
      return (
        <h1
          key={block.id}
          className="text-5xl font-extrabold tracking-tight border-b border-gray-300 pb-2 mb-6 mt-10"
          style={{ lineHeight: "2.2" }}
        >
          {renderRichText(block.heading_1.rich_text)}
        </h1>
      );
    }
    if (block.type === "heading_2") {
      return (
        <h2
          key={block.id}
          className="text-3xl font-bold text-primary border-l-4 border-primary/50 pl-4 mb-4 mt-8 bg-primary/5"
          style={{ lineHeight: "2" }}
        >
          {renderRichText(block.heading_2.rich_text)}
        </h2>
      );
    }
    if (block.type === "heading_3") {
      return (
        <h3 key={block.id} className="text-lg font-semibold mt-4 mb-2" style={{ lineHeight: "1.8" }}>
          {renderRichText(block.heading_3.rich_text)}
        </h3>
      );
    }
    if (block.type === "bulleted_list_item") {
      return (
        <li key={block.id} className="list-disc ml-6 mb-2" style={{ lineHeight: "2" }}>
          {renderRichText(block.bulleted_list_item.rich_text)}
        </li>
      );
    }
    if (block.type === "numbered_list_item") {
      return (
        <li key={block.id} className="list-decimal ml-6 mb-2" style={{ lineHeight: "2" }}>
          {renderRichText(block.numbered_list_item.rich_text)}
        </li>
      );
    }
    if (block.type === "quote") {
      return (
        <blockquote
          key={block.id}
          className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600"
          style={{ lineHeight: "2" }}
        >
          {renderRichText(block.quote.rich_text)}
        </blockquote>
      );
    }
    if (block.type === "code") {
      const codeText = block.code.rich_text
        .map((rt: any) => rt.plain_text)
        .join("");
      const language = block.code.language;
      const caption = block.code.caption && block.code.caption.length > 0
        ? block.code.caption.map((c: any) => c.plain_text).join(" ")
        : undefined;
      return (
        <CodeBlock codeText={codeText} language={language} caption={caption} key={block.id} />
      );
    }
    if (block.type === "divider") {
      return <hr key={block.id} className="my-6 border-t border-gray-200" />;
    }
    if (block.type === "image") {
      const url =
        block.image.type === "file"
          ? block.image.file.url
          : block.image.external.url;
      const caption =
        block.image.caption && block.image.caption.length > 0
          ? block.image.caption.map((c: any) => c.plain_text).join(" ")
          : "blog image";
      return (
        <div key={block.id} className="my-6 flex justify-center">
          <Image
            src={url}
            alt={caption}
            width={600}
            height={350}
            className="rounded-lg object-contain max-h-96"
          />
        </div>
      );
    }
    return null;
  });
}
