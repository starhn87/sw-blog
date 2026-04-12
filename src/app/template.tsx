import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-[fade-in_0.6s_ease-out]">{children}</div>
  );
}
