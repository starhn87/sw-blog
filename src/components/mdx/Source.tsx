import type { ReactNode } from "react";

export default function Source({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <p className="-mt-5 mb-6 text-center text-sm text-muted-foreground">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {children}
      </a>
    </p>
  );
}
