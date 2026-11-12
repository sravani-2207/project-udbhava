import { EmptyState, LoadingCard } from "@/components/shared/state-views";
import {
  DeadlineText,
  DifficultyBadge,
  Eyebrow,
  PageHeading,
  SlotsMeter,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileCheck2,
  FilePlus2,
  Inbox,
  Loader2,
  Lock,
  Rocket,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type StateFilter = "all" | "draft" | "published" | "closed";

function stateBadge(state: string, closedReason?: string) {
  if (state === "draft") {
    return (
      <Badge variant="outline" className="border-border bg-background text-muted-foreground">
        Draft
      </Badge>
    );
  }
  if (state === "closed") {
    return (
      <Badge
        className={cn(
          closedReason === "cap"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {closedReason === "cap" ? "Submissions full" : "Closed"}
      </Badge>
    );
  }
  return (
    <Badge className="bg-accent/40 text-accent-foreground">
      <span className="mr-1 size-1.5 rounded-full bg-primary" />
      Live
    </Badge>
  );
}

export default function OrgProblems() {
  const problems = useQuery(api.problems.orgProblems);
  const updateState = useMutation(api.problems.updateState);
  const [filter, setFilter] = useState<StateFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const list = problems ?? [];
    return {
      all: list.length,
      draft: list.filter((problem) => problem.state === "draft").length,
      published: list.filter((problem) => problem.state === "published").length,
      closed: list.filter((problem) => problem.state === "closed").length,
    };
  }, [problems]);

  const filtered = (problems ?? []).filter(
    (problem) => filter === "all" || problem.state === filter,
  );

  async function changeState(
    problemId: Id<"problems">,
    action: "publish" | "close" | "reopen",
  ) {
    setBusyId(problemId);
    try {
      await updateState({ problemId, action });
      toast.success(
        action === "publish"
          ? "Problem published. Students can see it now."
          : action === "close"
            ? "Problem closed to new submissions."
            : "Problem reopened.",
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      toast.error(raw.replace(/^ConvexError:\s*/i, ""));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Problems"
        title="The briefs you own."
        description="Draft with care, publish when ready, and close when the signal is enough. The 50-solution cap counts itself."
        actions={
          <Button asChild className="gap-2">
            <Link to="/org/problems/new">
              <FilePlus2 className="size-4" />
              Post a problem
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card p-1.5">
        {(
          [
            { value: "all" as const, label: "All problems" },
            { value: "published" as const, label: "Live" },
            { value: "draft" as const, label: "Drafts" },
            { value: "closed" as const, label: "Closed" },
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

      {problems === undefined ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            problems.length === 0
              ? "No briefs yet"
              : `No ${filter === "all" ? "" : filter} problems`
          }
          description={
            problems.length === 0
              ? "Post the problem your team keeps postponing. Give students context, constraints, and phases — the rest follows."
              : "Switch the filter or post a new brief. Nothing is hidden from you here."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {filter !== "all" ? (
                <Button variant="outline" onClick={() => setFilter("all")}>
                  Show all problems
                </Button>
              ) : null}
              <Button asChild className="gap-2">
                <Link to="/org/problems/new">
                  <FilePlus2 className="size-4" />
                  Post a problem
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((problem, index) => (
            <motion.article
              key={problem._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
              className="lift flex flex-col rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {stateBadge(problem.state, problem.closedReason)}
                  <DifficultyBadge value={problem.difficulty} />
                </div>
                <DeadlineText deadline={problem.deadline} />
              </div>

              <Link to={`/org/problems/${problem._id}`} className="group mt-4 block">
                <h2 className="font-display text-[1.45rem] font-semibold leading-[1.14] transition-colors group-hover:text-primary">
                  {problem.title}
                </h2>
              </Link>
              <p className="mt-2 line-clamp-2 text-[0.8rem] leading-6 text-muted-foreground">
                {problem.summary}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {problem.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[0.64rem] text-foreground/65"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {problem.submissionCount} submission{problem.submissionCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Trophy className="size-3" />
                  {problem.shortlistCount} shortlisted
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileCheck2 className="size-3" />
                  {problem.phaseCount} phase{problem.phaseCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4">
                <SlotsMeter count={problem.solutionCount} cap={problem.solutionCap} compact />
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {problem.state === "draft" ? (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => void changeState(problem._id, "publish")}
                      disabled={busyId === problem._id}
                    >
                      {busyId === problem._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Rocket className="size-3.5" />
                      )}
                      Publish
                    </Button>
                  ) : null}
                  {problem.state === "published" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 bg-background"
                      onClick={() => void changeState(problem._id, "close")}
                      disabled={busyId === problem._id}
                    >
                      {busyId === problem._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      Close
                    </Button>
                  ) : null}
                  {problem.state === "closed" && problem.closedReason !== "cap" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 bg-background"
                      onClick={() => void changeState(problem._id, "reopen")}
                      disabled={busyId === problem._id}
                    >
                      {busyId === problem._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Reopen
                    </Button>
                  ) : null}
                  <span className="text-[0.65rem] text-muted-foreground">
                    Posted {formatDate(problem._creationTime)}
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-[0.72rem] text-primary hover:bg-accent/20 hover:text-primary"
                >
                  <Link to={`/org/problems/${problem._id}`}>
                    {problem.submissionCount > 0 ? "Review submissions" : "Open review"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <Eyebrow>How the cap works</Eyebrow>
        <p className="mt-1.5 text-[0.75rem] leading-5 text-muted-foreground">
          A problem accepts up to 50 solutions. The 50th take-up closes the brief
          automatically and replaces the apply action with “Submissions full”.
          Drafts don't count.
        </p>
      </div>
    </div>
  );
}
