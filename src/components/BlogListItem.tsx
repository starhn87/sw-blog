import Image from "next/image";
import Link from "next/link";

interface BlogListItemProps {
  id: string;
  title: string;
  subTitle: string;
  thumbnailUrl: string;
  createdAt: string;
  tags: string[];
}

const BlogListItem = ({
  id,
  title,
  subTitle,
  thumbnailUrl,
  createdAt,
  tags,
}: BlogListItemProps) => {
  return (
    <Link href={`/${id}`}>
      <div
        className={"flex flex-col gap-3 border-solid cursor-pointer"}
        role={"button"}
      >
        <Image src={thumbnailUrl} alt={title} width={400} height={300} />
        <h2 className={"font-bold text-2xl"}>{title}</h2>
        <p>{subTitle}</p>
      </div>
    </Link>
  );
};

export default BlogListItem;
