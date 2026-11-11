import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-2xl bg-surface px-5 py-8", className)}>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {action}
    </div>
  );
}
