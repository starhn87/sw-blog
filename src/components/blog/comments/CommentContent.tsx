export function CommentContent({ content }: { content: string }) {
  const match = content.match(/^(\S+님)\s/);
  if (!match) return <>{content}</>;

  return (
    <>
      <span className="font-semibold text-foreground">{match[1]}</span>
      {content.slice(match[1].length)}
    </>
  );
}
