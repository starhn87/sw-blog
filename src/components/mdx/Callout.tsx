import type { ReactNode } from "react";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: {
    icon: Info,
    className: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300",
  },
  tip: {
    icon: Lightbulb,
    className: "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300",
  },
} as const;

export function Callout({
  type = "info",
  children,
}: {
  type?: keyof typeof variants;
  children: ReactNode;
}) {
  const { icon: Icon, className } = variants[type];

  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", className)}>
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="text-sm [&>p]:m-0">{children}</div>
    </div>
  );
}
