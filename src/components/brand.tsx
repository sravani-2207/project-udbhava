import { cn } from "@/lib/utils";
import { Link } from "react-router";

/** A delicate, full-petalled lotus. Stroked so it stays crisp at any size. */
export function LotusMark({
  className,
  strokeWidth = 1.15,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      aria-hidden="true"
      className={cn("text-primary", className)}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 26.6c-3.3-4.7-3.3-12.1 0-17.2 3.3 5.1 3.3 12.5 0 17.2Z" />
      <path d="M20 26.6c-5.7-1.6-9.4-6.1-10.6-11.4 4.7.4 8.6 3.7 10.6 8.6" />
      <path d="M20 26.6c5.7-1.6 9.4-6.1 10.6-11.4-4.7.4-8.6 3.7-10.6 8.6" />
      <path d="M20 28.1c-7.5-.2-13-3.4-15.6-9.1 5.9-1 11.6 1.8 15.6 7.3" />
      <path d="M20 28.1c7.5-.2 13-3.4 15.6-9.1-5.9-1-11.6 1.8-15.6 7.3" />
      <path d="M8.4 29.3c3.6 2.6 7.7 3.9 11.6 3.9s8-1.3 11.6-3.9" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
  showMark = true,
}: {
  className?: string;
  markClassName?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark ? (
        <LotusMark className={cn("h-6 w-auto", markClassName)} />
      ) : null}
      <span className="wordmark text-[0.95rem] leading-none text-foreground">
        UDBHAVA
      </span>
    </span>
  );
}

export function BrandLink({
  to = "/",
  className,
  inverted = false,
}: {
  to?: string;
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label="Udbhava home"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <LotusMark
        className={cn(
          "h-6 w-auto transition-transform duration-300 group-hover:rotate-3",
          inverted ? "text-primary-foreground" : "text-primary",
        )}
      />
      <span
        className={cn(
          "wordmark text-[0.95rem] leading-none",
          inverted ? "text-primary-foreground" : "text-foreground",
        )}
      >
        UDBHAVA
      </span>
    </Link>
  );
}

/** Small monogram used on cards where a company logo would be. */
export function Monogram({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary font-display text-sm font-semibold tracking-wide text-primary",
        className,
      )}
    >
      {initials || "U"}
    </span>
  );
}
