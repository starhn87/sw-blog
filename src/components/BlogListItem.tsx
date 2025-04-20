import Image from "next/image";
import Link from "next/link";

function formatKoreanDate(dateStr: string) {
  const date = new Date(dateStr);
  return date
    .toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ".")
    .replace(/\s/g, " ");
}

interface BlogListItemProps {
  id: string;
  title: string;
  subTitle: string;
  thumbnailUrl: string;
  createdAt: string;
  tags: string[];
  cardSize?: "md" | "lg";
}

const cardSizeClass = {
  md: "max-w-md min-w-[280px]",
  lg: "max-w-xl min-w-[320px]",
};

const BlogListItem = ({
  id,
  title,
  subTitle,
  thumbnailUrl,
  createdAt,
  tags,
  cardSize = "md",
}: BlogListItemProps) => {
  return (
    <Link href={`/${id}`} className="block group w-full">
      <div
        className={
          `flex flex-col border border-border rounded-2xl shadow-sm bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden mx-auto w-full ` +
          cardSizeClass[cardSize]
        }
        role={"button"}
      >
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {}
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover group-hover:brightness-95 transition-all"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium shadow-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <h2 className="font-bold text-lg md:text-xl line-clamp-2 text-ellipsis leading-tight mb-1">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
            {subTitle}
          </p>
          <span className="text-xs text-muted-foreground mt-auto">
            {formatKoreanDate(createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default BlogListItem;
