"use client";

import { useEffect, useState } from "react";

interface Comment {
  id: number;
  slug: string;
  author: string;
  content: string;
  createdAt: string;
  parentId: number | null;
}

export function CommentSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = () => {
    fetch(`/api/comments?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setComments(data as Comment[]));
  };

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, author, content }),
    });
    setContent("");
    fetchComments();
    setSubmitting(false);
  };

  return (
    <section className="mt-16 border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-semibold">
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h2>

      <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3">
        <input
          type="text"
          placeholder="이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-foreground/30"
        />
        <textarea
          placeholder="댓글을 남겨주세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-foreground/30 resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !author.trim() || !content.trim()}
          className="self-end rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {submitting ? "작성 중..." : "댓글 작성"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium">{comment.author}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="text-sm text-foreground/80">{comment.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
