import { Monogram } from "@/components/brand";
import { ErrorState } from "@/components/shared/state-views";
import {
  DeadlineText,
  DifficultyBadge,
  Eyebrow,
  SlotsMeter,
} from "@/components/shared/ui-bits";
import { TakeUpDialog } from "@/components/student/TakeUpDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Globe,
  LockKeyhole,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

export default function ProblemDetail() {
  const { problemId } = useParams<{ problemId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const me = useQuery(api.profiles.me);
  const detail = useQuery(
    api.problems.getById,
    problemId ? { problemId: problemId as Id<"problems"> } : "skip",
  );

  if (!problemId) {
    return (
      <ErrorState
        title="That brief is missing"
        description="The link doesn't include a problem. Head back to the board and pick one up."
      />
    );
  }

  if (detail === undefined) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton-warm h-3 w-24 rounded-full" />
        <div className="skeleton-warm h-8 w-3/4 rounded-lg" />
        <div className="skeleton-warm h-4 w-full rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <div className="skeleton-warm h-40 w-full rounded-2xl" />
            <div className="skeleton-warm h-56 w-full rounded-2xl" />
          </div>
          <div className="skeleton-warm h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const {
    problem,
    organization,
    phases,
    slack,
    isFull,
    deadlinePassed,
    assignment,
    team,
    teamMembers,
  } = detail;

  const profileSkills = new Set(
    (me?.studentProfile?.skills ?? []).map((skill) => skill.toLowerCase()),
  );
  const closed = isFull || deadlinePassed || problem.state !== "published";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Link
          to="/student"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          All open problems
        </Link>
        <span className="size-1 rounded-full bg-border" />
        <span className="text-muted-foreground">{problem.domain}</span>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Monogram name={problem.orgName} className="size-9 rounded-lg" />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {problem.orgName}
                {problem.orgVerified ? (
                  <CheckCircle2 className="size-3.5 text-primary" aria-label="Verified startup" />
                ) : null}
              </p>
              <p className="text-[0.7rem] text-muted-foreground">
                {organization?.industry ?? problem.orgIndustry}
                {organization?.location ? ` · ${organization.location}` : ""}
              </p>
            </div>
          </div>
          <span className="hidden h-6 w-px bg-border sm:block" />
          <DifficultyBadge value={problem.difficulty} />
          {problem.isMultiPhase ? (
            <Badge variant="outline" className="gap-1">
              <CircleDashed className="size-3" />
              {phases.length} phases
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <CircleDashed className="size-3" />
              Single phase
            </Badge>
          )}
          {isFull ? (
            <Badge className="bg-primary text-primary-foreground">Submissions full</Badge>
          ) : null}
        </div>

        <h1 className="mt-6 font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[3.35rem]">
          {problem.title}
        </h1>
        <p className="mt-4 max-w-3xl text-[0.95rem] leading-7 text-muted-foreground">
          {problem.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {problem.skills.map((skill) => (
            <span
              key={skill}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[0.7rem]",
                profileSkills.has(skill.toLowerCase())
                  ? "border-primary/20 bg-accent/25 text-foreground/85"
                  : "border-border/80 bg-card text-foreground/70",
              )}
            >
              {skill}
            </span>
          ))}
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7">
            <Eyebrow>The brief</Eyebrow>
            <div className="mt-3 whitespace-pre-line text-[0.9rem] leading-7 text-foreground/85">
              {problem.description}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <Eyebrow>Work plan</Eyebrow>
                <h2 className="mt-2 font-display text-[1.9rem] font-semibold tracking-[-0.01em]">
                  {phases.length > 1 ? "Phases and review criteria" : "Review criteria"}
                </h2>
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                {phases.length > 1
                  ? "You'll choose one phase when you take this up."
                  : "One submission covers this brief."}
              </p>
            </div>

            <ol className="mt-4 space-y-3">
              {phases.map((phase) => {
                const matchingSkills = phase.skills.filter((skill) =>
                  profileSkills.has(skill.toLowerCase()),
                );
                return (
                  <li
                    key={phase._id}
                    className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-accent/25 font-display text-sm font-semibold text-primary">
                          {phase.order}
                        </span>
                        <div>
                          <h3 className="font-display text-xl font-semibold leading-tight">
                            {phase.title}
                          </h3>
                          <p className="mt-1 text-[0.72rem] text-muted-foreground">
                            {phase.durationWeeks} week
                            {phase.durationWeeks === 1 ? "" : "s"} estimated
                          </p>
                        </div>
                      </div>
                      {matchingSkills.length > 0 ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/15 bg-accent/25 px-2.5 py-1 text-[0.65rem] font-medium text-primary">
                          <Sparkles className="size-3" />
                          Matches {matchingSkills.length} of your skills
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-[0.85rem] leading-6 text-foreground/75">
                      {phase.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {phase.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[0.65rem] text-foreground/65"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {phase.evaluationCriteria.length > 0 ? (
                      <div className="mt-4 rounded-xl bg-background/70 p-3.5">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Evaluated on
                        </p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {phase.evaluationCriteria.map((criterion) => (
                            <li
                              key={criterion}
                              className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/75"
                            >
                              <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2.4} />
                              {criterion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Monogram name={problem.orgName} className="size-11 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Eyebrow>Who posted this</Eyebrow>
                <h2 className="mt-1.5 font-display text-xl font-semibold">
                  {problem.orgName}
                </h2>
                <p className="mt-2 text-[0.82rem] leading-6 text-muted-foreground">
                  {organization?.about ||
                    "A small team posting real problems from the work they do every day."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.7rem] text-muted-foreground">
                  {organization?.industry ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="size-3.5" />
                      {organization.industry}
                    </span>
                  ) : null}
                  {organization?.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {organization.location}
                    </span>
                  ) : null}
                  {organization?.companySize ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {organization.companySize}
                    </span>
                  ) : null}
                  {organization?.website ? (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                    >
                      <Globe className="size-3.5" />
                      Website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Decision rail */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border/80 bg-card p-5 soft-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Deadline
              </p>
              <DeadlineText deadline={problem.deadline} />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold leading-tight">
              {formatLongDate(problem.deadline)}
            </p>

            <div className="mt-5 border-t border-border/60 pt-4">
              <SlotsMeter count={problem.solutionCount} cap={problem.solutionCap} />
              <p className="mt-2.5 text-[0.68rem] leading-4 text-muted-foreground">
                {isFull
                  ? "All 50 solutions are in. This brief is closed."
                  : slack <= 8
                    ? "Nearly full — the brief closes automatically at 50."
                    : "The brief auto-closes when the 50th solution is taken up."}
              </p>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-border/60 pt-4 text-[0.75rem]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd><DifficultyBadge value={problem.difficulty} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium">
                  <Users className="size-3.5" />
                  Solo or team
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Phases</dt>
                <dd className="font-medium">{phases.length}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-border/60 pt-4">
              {assignment ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-primary/15 bg-accent/20 p-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-primary">
                      You're on this brief
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-foreground/80">
                      {assignment.mode === "team"
                        ? `Team · ${team?.name ?? "your team"} · lead submits`
                        : "Solo work"} ·{" "}
                      {phases.find((phase) => phase._id === assignment.phaseId)
                        ?.title ?? "Phase selected"}
                    </p>
                    {teamMembers.length > 0 ? (
                      <p className="mt-1 text-[0.68rem] text-muted-foreground">
                        {teamMembers.map((member) => member.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild className="h-10 w-full gap-2">
                    <Link to={`/student/work/${assignment._id}`}>
                      Open your workspace
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : closed ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-[0.72rem] leading-5 text-muted-foreground">
                    <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary/70" />
                    <span>
                      {isFull
                        ? "Submissions full. This brief reached its cap of 50 solutions."
                        : deadlinePassed
                          ? "The deadline has passed. New solutions can't be submitted."
                          : "This brief is closed by the organization."}
                    </span>
                  </div>
                  <Button asChild variant="outline" className="h-10 w-full">
                    <Link to="/student">Explore other open problems</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <Button
                    className="h-10 w-full gap-2"
                    onClick={() => setDialogOpen(true)}
                  >
                    Take up this problem
                    <ArrowRight className="size-4" />
                  </Button>
                  <p className="flex items-start gap-1.5 text-[0.65rem] leading-4 text-muted-foreground">
                    <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                    You'll choose solo or team — and your phase, if there are
                    several — before anything is submitted.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4 text-[0.65rem] text-muted-foreground">
              <Clock3 className="size-3.5 text-primary/60" />
              First-pass feedback is generated on every version.
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What happens after
            </p>
            <ol className="mt-3 space-y-2.5">
              {[
                "Submit your approach with links or a repo.",
                "Read the structured first-pass feedback.",
                "Revise before the deadline — versions are kept.",
                "The startup shortlists and can send an offer.",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2 text-[0.7rem] leading-4 text-muted-foreground">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border text-[0.55rem] font-semibold text-primary">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <TakeUpDialog
        problem={problem}
        phases={phases}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
