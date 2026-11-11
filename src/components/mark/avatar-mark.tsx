import { cn } from "@/lib/utils";
import { isPhotoAvatar } from "@/lib/avatar";

const PATTERNS = ["split", "invert", "stripe", "slash", "corner", "frame"] as const;

export function AvatarMark({
  username,
  avatarKey = "split",
  size = 40,
  className,
}: {
  username: string;
  avatarKey?: string;
  size?: number;
  className?: string;
}) {
  const initial = (username?.[0] ?? "?").toUpperCase();

  if (isPhotoAvatar(avatarKey)) {
    return (
      <img
        src={avatarKey}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full bg-elevated object-cover", className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }

  const pattern = PATTERNS.includes(avatarKey as (typeof PATTERNS)[number])
    ? avatarKey
    : PATTERNS[username.charCodeAt(0) % PATTERNS.length];

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-medium leading-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      <span className="absolute inset-0 bg-fg" />
      {pattern === "split" && <span className="absolute inset-y-0 left-0 w-1/2 bg-bg" />}
      {pattern === "stripe" && (
        <span
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(135deg, var(--color-bg) 0 4px, var(--color-fg) 4px 8px)",
          }}
        />
      )}
      {pattern === "slash" && (
        <span className="absolute inset-0 bg-bg">
          <span className="absolute left-[-20%] top-1/2 h-[2px] w-[140%] -rotate-45 bg-fg" />
        </span>
      )}
      {pattern === "corner" && (
        <span className="absolute inset-0 bg-bg">
          <span className="absolute right-0 top-0 size-[55%] bg-fg" />
        </span>
      )}
      {pattern === "frame" && (
        <span className="absolute inset-0 bg-bg">
          <span className="absolute inset-[3px] border border-fg" />
        </span>
      )}
      {pattern === "invert" && <span className="absolute inset-0 bg-fg" />}
      <span
        className={cn(
          "relative z-10 mix-blend-difference text-fg",
          pattern === "invert" && "mix-blend-normal text-bg",
        )}
      >
        {initial}
      </span>
    </span>
  );
}
