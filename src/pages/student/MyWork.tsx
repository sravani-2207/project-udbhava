import { Monogram } from "@/components/brand";
import { EmptyState, LoadingCard } from "@/components/shared/state-views";
import {
  DeadlineText,
  Eyebrow,
  PageHeading,
  StatCard,
} from "@/components/shared/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDate, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  Compass,
  FileText,
  FolderKanban,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type OpportunityView = Doc<"opportunities"> & { problemTitle: string | null };

const typeLabels: Record<string, string> = {
  internship: "Internship",
  job: "Job",
  project: "Project",
};

function WorkProgress({
  submitted,
  feedback,
  shortlisted,
}: {
  submitted: boolean;
  feedback: boolean;
  shortlisted: boolean;
}) {
  const steps = [
    { label: "Chosen", done: true },
    { label: "Submitted", done: submitted },
    { label: "Feedback", done: feedback },
    { label: shortlisted ? "Shortlisted" : "In review", done: shortlisted },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => (
        <span key={step.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-medium",
              step.done
                ? "bg-accent/35 text-primary"
                : "bg-secondary/50 text-muted-foreground",
            )}
          >
            {step.done ? (
              <CheckCircle2 className="size-2.5" strokeWidth={2.2} />
            ) : (
              <CircleDashed className="size-2.5" />
            )}
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <span
              className={cn(
                "h-px w-2.5",
                step.done ? "bg-primary/30" : "bg-border",
              )}
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}

export default function MyWork() {
  const work = useQuery(api.assignments.mine);
  const offers = useQuery(api.opportunities.mine);
  const respond = useMutation(api.opportunities.respond);
  const [pending, setPending] = useState<{
    opportunity: OpportunityView;
    action: "accept" | "decline";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const submittedCount =
    work?.reduce((sum, item) => sum + item.submissionCount, 0) ?? 0;
  const scored = (work ?? []).filter((item) => item.alignmentScore !== null);
  const averageScore =
    scored.length === 0
      ? null
      : Math.round(
          scored.reduce((sum, item) => sum + (item.alignmentScore ?? 0), 0) /
            scored.length,
        );
  const openOffers = (offers ?? []).filter((offer) => offer.status === "sent").length;

  async function confirmResponse() {
    if (!pending) return;
    setBusy(true);
    try {
      await respond({
        opportunityId: pending.opportunity._id,
        action: pending.action,
      });
      toast.success(
        pending.action === "accept"
          ? "Opportunity accepted. The organization has been notified."
          : "Opportunity declined. Thanks for the clear reply.",
      );
      setPending(null);
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      toast.error(raw.replace(/^ConvexError:\s*/i, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="My work"
        title={
          <>
            The briefs you
            <br className="sm:hidden" /> took on.
          </>
        }
        description="Everything you're building, every version you've sent, the feedback you've earned, and the opportunities that came from it."
        actions={
          <Button asChild variant="outline" className="gap-2 bg-card">
            <Link to="/student">
              <Compass className="size-4" />
              Find another brief
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="work" className="gap-6">
        <TabsList className="h-10 w-full justify-start gap-1 rounded-xl border border-border/70 bg-card p-1 sm:w-fit">
          <TabsTrigger
            value="work"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-accent/35 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <FolderKanban className="size-3.5" />
            Active work
            {work ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] tabular-nums">
                {work.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="opportunities"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-accent/35 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <BriefcaseBusiness className="size-3.5" />
            Opportunities received
            {offers ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] tabular-nums">
                {offers.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active briefs"
              value={work?.length ?? "—"}
              hint="Solo and team work"
              icon={FolderKanban}
            />
            <StatCard
              label="Versions sent"
              value={work === undefined ? "—" : submittedCount}
              hint="Never overwritten"
              icon={FileText}
            />
            <StatCard
              label="Avg. alignment"
              value={averageScore === null ? "—" : averageScore}
              hint={scored.length > 0 ? `Across ${scored.length} scored brief${scored.length === 1 ? "" : "s"}` : "Submit to see this"}
              icon={Sparkles}
            />
            <StatCard
              label="Open offers"
              value={offers === undefined ? "—" : openOffers}
              hint="Internships, jobs, projects"
              icon={BriefcaseBusiness}
            />
          </div>

          {work === undefined ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : work.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Your work board is empty"
              description="Take up an open problem and it will land here, with a workspace for every phase and version."
              action={
                <Button asChild className="gap-2">
                  <Link to="/student">
                    Browse open problems
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {work.map((item, index) => (
                <motion.div
                  key={item.assignment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
                  className="h-full"
                >
                  <div className="lift flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Monogram name={item.problem.orgName} className="size-9 rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate text-[0.78rem] font-semibold">
                            {item.problem.orgName}
                          </p>
                          <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                            {item.problem.domain}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {item.shortlisted ? (
                          <Badge className="h-5 gap-1 bg-primary px-2 text-[0.58rem] text-primary-foreground">
                            <Trophy className="size-2.5" />
                            Shortlisted
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-border bg-background px-2 text-[0.58rem]"
                        >
                          {item.assignment.mode === "team" ? (
                            <Users className="size-2.5" />
                          ) : (
                            <UserRound className="size-2.5" />
                          )}
                          {item.assignment.mode === "team" ? "Team" : "Solo"}
                        </Badge>
                      </div>
                    </div>

                    <Link
                      to={`/student/work/${item.assignment._id}`}
                      className="group mt-4 block"
                    >
                      <h3 className="font-display text-[1.35rem] font-semibold leading-[1.15] transition-colors group-hover:text-primary">
                        {item.problem.title}
                      </h3>
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CircleDashed className="size-3" />
                        {item.phase?.title ?? "Phase selected"}
                      </span>
                      <DeadlineText deadline={item.problem.deadline} />
                    </div>

                    {item.team ? (
                      <p className="mt-2 text-[0.68rem] text-muted-foreground">
                        {item.team.name} ·{" "}
                        {item.members
                          .map((member) => member.name.split(" ")[0])
                          .slice(0, 3)
                          .join(", ")}
                        {item.members.length > 3
                          ? ` +${item.members.length - 3}`
                          : ""}
                      </p>
                    ) : null}

                    <div className="mt-4">
                      <WorkProgress
                        submitted={item.submissionCount > 0}
                        feedback={item.alignmentScore !== null}
                        shortlisted={item.shortlisted}
                      />
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                          {item.latestVersion
                            ? `Latest · v${item.latestVersion}`
                            : "No submission yet"}
                        </p>
                        <p className="mt-1 text-[0.75rem] font-medium">
                          {item.alignmentScore !== null
                            ? `${item.alignmentScore}/100 alignment`
                            : item.latestSubmittedAt
                              ? formatTimeAgo(item.latestSubmittedAt)
                              : "Your move"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 bg-background">
                        <Link to={`/student/work/${item.assignment._id}`}>
                          Open workspace
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow>Opportunities received</Eyebrow>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Startups reach out after seeing your work. Accepting shares
                  your profile and opens a conversation; declining is a complete
                  answer.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[0.7rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {openOffers} awaiting your reply
                </span>
              </div>
            </div>
          </div>

          {offers === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : offers.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No offers yet — and that's okay"
              description="Shortlists and opportunities arrive here. The fastest way to earn one is a specific, honest submission with a tangible artifact."
              action={
                <Button asChild variant="outline">
                  <Link to="/student">Explore open problems</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {offers.map((offer, index) => (
                <motion.div
                  key={offer._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Monogram name={offer.orgName} className="size-10 rounded-xl" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{offer.orgName}</p>
                          <Badge
                            variant="outline"
                            className="h-5 border-border bg-background px-2 text-[0.6rem] uppercase tracking-[0.08em]"
                          >
                            {typeLabels[offer.type]}
                          </Badge>
                          {offer.status !== "sent" ? (
                            <Badge
                              className={cn(
                                "h-5 px-2 text-[0.6rem] capitalize",
                                offer.status === "accepted"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-secondary-foreground",
                              )}
                            >
                              {offer.status}
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-tight">
                          {offer.title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-[0.8rem] leading-6 text-foreground/75">
                          {offer.message}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted-foreground">
                          <span>Received {formatDate(offer.createdAt, true)}</span>
                          {offer.problemTitle ? (
                            <span>From “{offer.problemTitle}”</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {offer.status === "sent" ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setPending({ opportunity: offer, action: "accept" })}
                        >
                          <ThumbsUp className="size-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 bg-background"
                          onClick={() => setPending({ opportunity: offer, action: "decline" })}
                        >
                          <ThumbsDown className="size-3.5" />
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <p className="shrink-0 text-[0.7rem] text-muted-foreground">
                        {offer.status === "accepted"
                          ? "You accepted this."
                          : "You declined this."}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              {pending?.action === "accept"
                ? "Accept this opportunity?"
                : "Decline this opportunity?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {pending?.action === "accept"
                ? `You're accepting “${pending.opportunity.title}” from ${pending.opportunity.orgName}. The organization will be notified so they can share next steps.`
                : `You're declining “${pending?.opportunity.title}” from ${pending?.opportunity.orgName}. They'll be notified politely — this won't affect your other work.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmResponse();
              }}
            >
              {busy ? "Saving…" : pending?.action === "accept" ? "Yes, accept" : "Yes, decline"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
