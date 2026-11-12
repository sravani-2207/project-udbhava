import { Monogram } from "@/components/brand";
import { EmptyState, LoadingCard } from "@/components/shared/state-views";
import { PageHeading, StatCard } from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Send,
  ThumbsDown,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

type StatusFilter = "all" | "sent" | "accepted" | "declined";

const typeLabels: Record<string, string> = {
  internship: "Internship",
  job: "Job",
  project: "Project",
};

export default function OrgOpportunities() {
  const opportunities = useQuery(api.opportunities.sentByOrg);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const list = opportunities ?? [];
    return {
      all: list.length,
      sent: list.filter((item) => item.status === "sent").length,
      accepted: list.filter((item) => item.status === "accepted").length,
      declined: list.filter((item) => item.status === "declined").length,
    };
  }, [opportunities]);

  const filtered = (opportunities ?? []).filter(
    (item) => filter === "all" || item.status === filter,
  );

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Opportunities"
        title="From good work to a real start."
        description="Every opportunity you send appears here with its live status. Students accept or decline from their My work; you're notified either way."
        actions={
          <Button asChild variant="outline" className="gap-2 bg-card">
            <Link to="/org/problems">
              Review submissions
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sent"
          value={counts.all}
          hint="Internships, jobs, projects"
          icon={Send}
        />
        <StatCard
          label="Awaiting reply"
          value={counts.sent}
          hint="Students have not answered yet"
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Accepted"
          value={counts.accepted}
          hint={
            counts.declined > 0
              ? `${counts.declined} declined`
              : "No declines"
          }
          icon={Trophy}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card p-1.5">
        {(
          [
            { value: "all" as const, label: "All" },
            { value: "sent" as const, label: "Awaiting reply" },
            { value: "accepted" as const, label: "Accepted" },
            { value: "declined" as const, label: "Declined" },
          ]
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.72rem] font-medium transition-colors",
              filter === item.value
                ? "bg-accent/35 text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            {item.label}
            <span className="rounded-full bg-secondary/70 px-1.5 py-0.5 text-[0.6rem] tabular-nums">
              {counts[item.value]}
            </span>
          </button>
        ))}
      </div>

      {opportunities === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={
            opportunities.length === 0
              ? "No opportunities sent yet"
              : "Nothing in this view"
          }
          description={
            opportunities.length === 0
              ? "When a submission deserves a real conversation, open it from a problem's review screen and send an internship, project, or job."
              : "Switch the filter or send another opportunity from a review."
          }
          action={
            <Button asChild className="gap-2">
              <Link to="/org/problems">
                Go to problems
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((opportunity, index) => (
            <motion.article
              key={opportunity._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Monogram
                    name={opportunity.studentName}
                    className="size-10 rounded-xl"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {opportunity.studentName}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-5 border-border bg-background px-2 text-[0.6rem] uppercase tracking-[0.08em]"
                      >
                        {typeLabels[opportunity.type]}
                      </Badge>
                      <Badge
                        className={cn(
                          "h-5 gap-1 px-2 text-[0.6rem] capitalize",
                          opportunity.status === "accepted"
                            ? "bg-primary text-primary-foreground"
                            : opportunity.status === "declined"
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-accent/35 text-accent-foreground",
                        )}
                      >
                        {opportunity.status === "accepted" ? (
                          <CheckCircle2 className="size-2.5" />
                        ) : opportunity.status === "declined" ? (
                          <ThumbsDown className="size-2.5" />
                        ) : null}
                        {opportunity.status === "sent"
                          ? "Awaiting reply"
                          : opportunity.status}
                      </Badge>
                    </div>
                    {opportunity.studentHeadline ? (
                      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                        {opportunity.studentHeadline}
                      </p>
                    ) : null}
                    <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-tight">
                      {opportunity.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[0.8rem] leading-6 text-foreground/75">
                      {opportunity.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted-foreground">
                      <span>Sent {formatDate(opportunity.createdAt, true)}</span>
                      {opportunity.problemTitle ? (
                        <span>From “{opportunity.problemTitle}”</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {opportunity.status === "sent" ? (
                  <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[0.62rem] text-muted-foreground">
                    Waiting on student
                  </span>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <p className="text-[0.7rem] leading-5 text-muted-foreground">
          Opportunities are promises, not metrics. Keep the message specific to
          the student's submission — the accept rate follows the care behind the
          note.
        </p>
      </div>
    </div>
  );
}
