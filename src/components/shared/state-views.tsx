import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-6",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div className="skeleton-warm size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-warm h-3 w-24 rounded-full" />
          <div className="skeleton-warm h-3 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="skeleton-warm h-5 w-4/5 rounded-md" />
        <div className="skeleton-warm h-5 w-3/5 rounded-md" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton-warm h-3 w-full rounded-full" />
        <div className="skeleton-warm h-3 w-2/3 rounded-full" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="skeleton-warm h-6 w-20 rounded-full" />
        <div className="skeleton-warm h-6 w-16 rounded-full" />
      </div>
      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="skeleton-warm h-2 w-full rounded-full" />
        <div className="mt-3 flex justify-between">
          <div className="skeleton-warm h-3 w-24 rounded-full" />
          <div className="skeleton-warm h-3 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <LoadingCard key={index} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="space-y-3">
        <div className="skeleton-warm h-3 w-28 rounded-full" />
        <div className="skeleton-warm h-9 w-72 max-w-full rounded-lg" />
        <div className="skeleton-warm h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/70 bg-card p-5"
          >
            <div className="skeleton-warm h-3 w-20 rounded-full" />
            <div className="skeleton-warm mt-3 h-7 w-14 rounded-md" />
            <div className="skeleton-warm mt-3 h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="skeleton-warm h-4 w-40 rounded-full" />
          <div className="skeleton-warm mt-4 h-64 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="skeleton-warm h-4 w-40 rounded-full" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="skeleton-warm size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-warm h-3 w-3/4 rounded-full" />
                  <div className="skeleton-warm h-3 w-1/2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-secondary text-primary">
        <Icon className="size-5" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 font-display text-2xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </motion.div>
  );
}

export function ErrorState({
  title = "We couldn't load this",
  description = "Something went wrong while fetching the latest data. Try again — nothing you've saved is lost.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" strokeWidth={1.7} />
      </span>
      <h3 className="mt-5 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button
        variant="outline"
        className="mt-6"
        onClick={onRetry ?? (() => window.location.reload())}
      >
        Try again
      </Button>
    </div>
  );
}

export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
