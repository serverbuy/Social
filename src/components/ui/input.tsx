import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-lg border border-transparent bg-elevated px-4 text-sm text-fg placeholder:text-subtle outline-none",
          "focus:border-primary",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-transparent bg-elevated px-4 py-3 text-sm text-fg placeholder:text-subtle outline-none focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}
