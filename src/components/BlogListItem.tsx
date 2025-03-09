interface BlogListItemProps {
  title: string;
  subTitle: string;
  imageUrl: string;
  createdAt: string;
  tags: string[];
}

const BlogListItem = ({
  title,
  subTitle,
  imageUrl,
  createdAt,
  tags,
}: BlogListItemProps) => {
  console.log(title, subTitle, imageUrl, createdAt, tags);
  return (
    <div className={"flex flex-col gap-5 border-solid w-96"}>
      <h2>{title}</h2>
      <p>{subTitle}</p>
    </div>
  );
};

export default BlogListItem;
