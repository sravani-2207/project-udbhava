import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  CircleDashed,
  Clock3,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { difficultyLabel, formatDeadline } from "@/lib/format";

const difficultyStyles: Record<string, string> = {
  starter:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary",
  intermediate:
    "border-border bg-background text-foreground hover:bg-background",
  advanced:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary",
};

export function DifficultyBadge({ value }: { value: string }) {
  return (
    <Badge className={cn("h-6 px-2.5", difficultyStyles[value])}>
      {difficultyLabel(value)}
    </Badge>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-2 font-display text-[2.15rem] leading-[1.08] font-semibold tracking-[-0.015em] text-foreground sm:text-[2.6rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function DeadlineText({
  deadline,
  className,
}: {
  deadline: number;
  className?: string;
}) {
  const passed = deadline < Date.now();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        passed ? "text-muted-foreground" : "text-foreground/80",
        className,
      )}
    >
      {passed ? (
        <Lock className="size-3.5" strokeWidth={1.7} />
      ) : (
        <Clock3 className="size-3.5" strokeWidth={1.7} />
      )}
      {formatDeadline(deadline)}
    </span>
  );
}

/**
 * The 50-solution cap, made visible everywhere a student decides to take a
 * problem up. No fake scarcity: it reads straight from the counter.
 */
export function SlotsMeter({
  count,
  cap,
  compact = false,
}: {
  count: number;
  cap: number;
  compact?: boolean;
}) {
  const percent = Math.min(100, Math.round((count / Math.max(1, cap)) * 100));
  const left = Math.max(0, cap - count);
  const full = left === 0;
  return (
    <div className={cn("w-full", compact ? "space-y-1.5" : "space-y-2")}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={cn("font-medium", full ? "text-primary" : "text-foreground/85")}>
          {full ? "Submissions full" : `${left} of ${cap} slots left`}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {count}/{cap}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={count}
        aria-label={`${count} of ${cap} solutions taken`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            full ? "bg-primary" : percent > 75 ? "bg-primary/80" : "bg-primary/55",
          )}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
    </div>
  );
}

export function MetaRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function MetaItem({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" strokeWidth={1.7} aria-hidden="true" />
      {children}
    </span>
  );
}

export function PhaseCount({ count }: { count: number }) {
  return (
    <MetaItem icon={CircleDashed}>
      {count === 1 ? "Single phase" : `${count} phases`}
    </MetaItem>
  );
}

export function MatchChip({ score }: { score: number }) {
  if (score < 40) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1 border-border bg-accent/35 text-accent-foreground"
    >
      <Sparkles className="size-3" strokeWidth={1.8} />
      {score}% match
    </Badge>
  );
}

export function ScoreRing({
  score,
  size = 76,
  label = "Alignment",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label} score ${score} out of 100`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            className="text-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold text-foreground">
          {score}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {score >= 80
            ? "Strong fit"
            : score >= 65
              ? "Promising"
              : "Needs sharpening"}
        </p>
        <p className="text-xs text-muted-foreground">out of 100</p>
      </div>
    </div>
  );
}

export function SectionRule({ className }: { className?: string }) {
  return <div className={cn("hairline h-px w-full", className)} />;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: typeof CalendarClock;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="size-4 text-primary/70" strokeWidth={1.6} /> : null}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold leading-none text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
