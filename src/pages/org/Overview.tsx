import { Monogram } from "@/components/brand";
import { EmptyState, PageSkeleton } from "@/components/shared/state-views";
import {
  Eyebrow,
  PageHeading,
  StatCard,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { api } from "@/convex/_generated/api";
import { firstName, formatTimeAgo } from "@/lib/format";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileCheck2,
  FilePlus2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const chartConfig = {
  submissions: {
    label: "Submissions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function OrgOverview() {
  const overview = useQuery(api.problems.orgOverview);

  if (overview === undefined) return <PageSkeleton />;

  const { profile, stats, chart, recentSubmissions, problems } = overview;
  const needsReview = problems
    .filter((problem) => problem.submissionCount > 0)
    .sort((a, b) => b.submissionCount - a.submissionCount)
    .slice(0, 4);

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Overview"
        title={
          <>
            {firstName(profile?.contactName)}, here's
            <br className="sm:hidden" /> the signal.
          </>
        }
        description="Live briefs, submissions coming in, and the work worth a closer read. Everything here reflects real student submissions, not vanity metrics."
        actions={
          <Button asChild className="gap-2">
            <Link to="/org/problems/new">
              <FilePlus2 className="size-4" />
              Post a problem
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live problems"
          value={stats.published}
          hint={`${stats.drafts} draft${stats.drafts === 1 ? "" : "s"} waiting`}
          icon={FileCheck2}
        />
        <StatCard
          label="Submissions"
          value={stats.submissions}
          hint="Across all versions"
          icon={Users}
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          hint={`${stats.opportunities} offer${stats.opportunities === 1 ? "" : "s"} sent`}
          icon={Trophy}
        />
        <StatCard
          label="Avg. alignment"
          value={stats.averageScore ?? "—"}
          hint={
            stats.averageScore === null
              ? "No submitted work yet"
              : "Latest version per phase"
          }
          icon={Sparkles}
        />
      </div>

      {problems.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No problems posted yet"
          description="The best first brief is the one your team keeps postponing. Add context, constraints, and a phase plan — students handle the rest."
          action={
            <Button asChild className="gap-2">
              <Link to="/org/problems/new">
                Post your first problem
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow>Submission volume</Eyebrow>
                  <h2 className="mt-1.5 font-display text-[1.55rem] font-semibold">
                    Where the work is landing
                  </h2>
                </div>
                <Badge variant="outline" className="border-border bg-background">
                  {chart.length} problem{chart.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {chart.every((item) => item.submissions === 0) ? (
                <div className="flex h-[260px] flex-col items-center justify-center text-center">
                  <Users className="size-5 text-primary/60" />
                  <p className="mt-3 text-sm font-medium">No submissions yet</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                    As students submit, this chart shows which briefs are pulling
                    attention. Student work appears within minutes.
                  </p>
                </div>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="mt-4 aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={chart}
                    margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 4" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      fontSize={10}
                      interval={0}
                      angle={chart.length > 3 ? -18 : 0}
                      textAnchor={chart.length > 3 ? "end" : "middle"}
                      height={chart.length > 3 ? 62 : 32}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      fontSize={10}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="submissions"
                      fill="var(--color-submissions)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </motion.section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Eyebrow>Review queue</Eyebrow>
                  <h2 className="mt-1.5 font-display text-[1.55rem] font-semibold">
                    Worth a closer read
                  </h2>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[0.7rem]">
                  <Link to="/org/problems">
                    All
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>

              {needsReview.length === 0 ? (
                <div className="mt-8 flex flex-col items-center text-center">
                  <FileCheck2 className="size-5 text-primary/50" />
                  <p className="mt-3 text-sm font-medium">Nothing waiting</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    New submissions will show up here with their first-pass
                    alignment.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-border/60">
                  {needsReview.map((problem) => (
                    <li key={problem._id}>
                      <Link
                        to={`/org/problems/${problem._id}`}
                        className="group flex items-start gap-3 py-3 first:pt-0"
                      >
                        <Monogram name={problem.orgName} className="size-8 rounded-lg text-[0.6rem]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.78rem] font-medium transition-colors group-hover:text-primary">
                            {problem.title}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] text-muted-foreground">
                            <span>{problem.submissionCount} submission{problem.submissionCount === 1 ? "" : "s"}</span>
                            {problem.averageScore !== null ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{problem.averageScore}/100 avg.</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                        <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 rounded-xl border border-primary/10 bg-accent/15 p-3">
                <p className="flex items-start gap-2 text-[0.68rem] leading-4 text-foreground/75">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Every submission arrives with a structured first pass. You
                  still make the call.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow>Latest submissions</Eyebrow>
                <h2 className="mt-1.5 font-display text-[1.55rem] font-semibold">
                  Fresh work, newest first
                </h2>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1.5 bg-background">
                <Link to="/org/problems">
                  Review all
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            {recentSubmissions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                Student submissions will appear here. Publishing a brief is the
                first step.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border/60">
                {recentSubmissions.map((submission) => (
                  <li key={submission.submissionId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-[0.62rem] font-semibold text-primary">
                        {submission.studentName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.78rem] font-medium">
                          {submission.studentName}{" "}
                          <span className="font-normal text-muted-foreground">
                            submitted v{submission.version}
                          </span>
                        </p>
                        <p className="truncate text-[0.68rem] text-muted-foreground">
                          {submission.problemTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-11 sm:pl-0">
                      {submission.alignmentScore !== null ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[0.65rem] tabular-nums text-foreground/75">
                          <Sparkles className="size-2.5 text-primary" />
                          {submission.alignmentScore}/100
                        </span>
                      ) : null}
                      <span className="text-[0.65rem] text-muted-foreground">
                        {formatTimeAgo(submission.createdAt)}
                      </span>
                      <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[0.7rem]">
                        <Link to={`/org/problems/${submission.problemId}`}>
                          Open
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {stats.accepted > 0 || stats.opportunities > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[0.75rem] text-muted-foreground">
                <BriefcaseBusiness className="size-4 text-primary" />
                {stats.opportunities} opportunit{stats.opportunities === 1 ? "y" : "ies"} sent ·{" "}
                {stats.accepted} accepted
              </p>
              <Link
                to="/org/opportunities"
                className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary underline-offset-4 hover:underline"
              >
                Track opportunities
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
