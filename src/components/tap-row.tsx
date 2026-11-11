import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function TapRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left hover:bg-elevated"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight className="size-5 shrink-0 text-subtle" />
    </button>
  );
}
