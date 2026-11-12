import { Monogram } from "@/components/brand";
import { EmptyState } from "@/components/shared/state-views";
import {
  DeadlineText,
  Eyebrow,
  PageHeading,
  ScoreRing,
  SlotsMeter,
  StatCard,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatDate, formatTimeAgo } from "@/lib/format";
import { opportunitySchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

type ReviewSubmission = {
  submission: Omit<Doc<"submissions">, "files"> & {
    files: Array<Doc<"submissions">["files"][number] & { url: string | null }>;
  };
  student: {
    _id: Id<"users">;
    fullName: string;
    university: string;
    headline: string;
    skills: string[];
  } | null;
  assignment: Doc<"assignments"> | null;
  team: Doc<"teams"> | null;
  memberNames: string[];
  phase: Doc<"phases"> | null;
  analysis: Doc<"aiAnalyses"> | null;
  comments: Doc<"reviews">[];
  shortlisted: boolean;
  versionCount: number;
};

type SortOption = "newest" | "score" | "versions";

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^ConvexError:\s*/i, "")
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .trim();
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="rounded-full border border-border bg-background px-2 py-1 text-[0.65rem] text-muted-foreground">
        No score
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.65rem] font-medium tabular-nums",
        score >= 80
          ? "border-primary/20 bg-accent/30 text-primary"
          : "border-border bg-background text-foreground/75",
      )}
    >
      <Sparkles className="size-2.5" />
      {score}/100
    </span>
  );
}

function Attachments({ item }: { item: ReviewSubmission }) {
  const { repoUrl, links, files } = item.submission;
  if (!repoUrl && links.length === 0 && files.length === 0) {
    return <span className="text-[0.65rem] text-muted-foreground">No attachments</span>;
  }
  const chip =
    "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[0.62rem] text-primary underline-offset-4 hover:underline";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {repoUrl ? (
        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className={chip}>
          <Github className="size-2.5" />
          Repository
        </a>
      ) : null}
      {links.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={chip}
        >
          <ExternalLink className="size-2.5" />
          {link.label}
        </a>
      ))}
      {files.map((file) =>
        file.url ? (
          <a
            key={file.storageId}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className={chip}
          >
            <Paperclip className="size-2.5" />
            {file.name}
          </a>
        ) : (
          <span
            key={file.storageId}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[0.62rem] text-muted-foreground"
          >
            <Paperclip className="size-2.5" />
            {file.name}
          </span>
        ),
      )}
    </div>
  );
}

export default function ProblemReview() {
  const { problemId } = useParams<{ problemId: string }>();
  const review = useQuery(
    api.reviews.forProblem,
    problemId ? { problemId: problemId as Id<"problems"> } : "skip",
  );
  const toggleShortlist = useMutation(api.reviews.toggleShortlist);
  const addComment = useMutation(api.reviews.addComment);
  const sendOpportunity = useMutation(api.opportunities.send);

  const [phaseFilter, setPhaseFilter] = useState("all");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detail, setDetail] = useState<ReviewSubmission | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);

  const [offerTarget, setOfferTarget] = useState<ReviewSubmission | null>(null);
  const [offerType, setOfferType] = useState<"internship" | "job" | "project">("internship");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);

  const submissions = useMemo(
    () => review?.submissions ?? [],
    [review?.submissions],
  );

  const filtered = useMemo(() => {
    let list = [...submissions];
    if (phaseFilter !== "all") {
      list = list.filter((item) => item.phase?._id === phaseFilter);
    }
    if (shortlistOnly) list = list.filter((item) => item.shortlisted);
    list.sort((a, b) => {
      if (sort === "score") {
        return (b.analysis?.alignmentScore ?? -1) - (a.analysis?.alignmentScore ?? -1);
      }
      if (sort === "versions") return b.versionCount - a.versionCount;
      return b.submission.createdAt - a.submission.createdAt;
    });
    return list;
  }, [submissions, phaseFilter, shortlistOnly, sort]);

  const compared = submissions.filter((item) =>
    compareIds.includes(item.submission._id),
  );

  if (!problemId) {
    return (
      <EmptyState
        icon={Inbox}
        title="Problem not found"
        description="Head back to your problems list and open a brief from there."
        action={
          <Button asChild>
            <Link to="/org/problems">Back to problems</Link>
          </Button>
        }
      />
    );
  }

  if (review === undefined) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton-warm h-3 w-28 rounded-full" />
        <div className="skeleton-warm h-9 w-3/4 rounded-lg" />
        <div className="skeleton-warm h-4 w-1/2 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-warm h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-warm h-16 rounded-xl" />
        <div className="skeleton-warm h-64 rounded-2xl" />
      </div>
    );
  }

  const { problem, phases, stats } = review;

  async function handleShortlist(item: ReviewSubmission) {
    setBusyId(item.submission._id);
    try {
      const result = await toggleShortlist({ submissionId: item.submission._id });
      toast.success(
        result.shortlisted
          ? `${item.student?.fullName ?? "Student"} shortlisted and notified.`
          : "Removed from the shortlist.",
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleComment(item: ReviewSubmission) {
    const value = (comments[item.submission._id] ?? "").trim();
    if (value.length < 4) return;
    setCommentBusyId(item.submission._id);
    try {
      await addComment({ submissionId: item.submission._id, comment: value });
      toast.success("Note posted. The student was notified.");
      setComments((current) => ({ ...current, [item.submission._id]: "" }));
      setCommentingId(null);
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setCommentBusyId(null);
    }
  }

  function openOffer(item: ReviewSubmission) {
    setOfferTarget(item);
    setOfferType("internship");
    setOfferTitle(
      `${item.student?.fullName.split(" ")[0] ?? "Student"} · ${problem.domain} opportunity`,
    );
    setOfferMessage("");
    setOfferError(null);
  }

  async function handleSendOffer() {
    if (!offerTarget?.student) {
      setOfferError("This submission has no student profile attached.");
      return;
    }
    const parsed = opportunitySchema.safeParse({
      type: offerType,
      title: offerTitle,
      message: offerMessage,
    });
    if (!parsed.success) {
      setOfferError(parsed.error.issues[0]?.message ?? "Check the details.");
      return;
    }
    setOfferBusy(true);
    setOfferError(null);
    try {
      await sendOpportunity({
        studentId: offerTarget.student._id,
        problemId: problem._id,
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
      });
      toast.success("Opportunity sent.", {
        description: `${offerTarget.student.fullName} will see it in My work.`,
      });
      setOfferTarget(null);
    } catch (error) {
      setOfferError(messageFor(error));
    } finally {
      setOfferBusy(false);
    }
  }

  function toggleCompare(submissionId: string, checked: boolean) {
    setCompareIds((current) => {
      if (!checked) return current.filter((id) => id !== submissionId);
      if (current.includes(submissionId)) return current;
      if (current.length >= 3) {
        toast.error("Compare up to three submissions at a time.");
        return current;
      }
      return [...current, submissionId];
    });
  }

  return (
    <div className="space-y-6">
      <Link
        to="/org/problems"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Your problems
      </Link>

      <PageHeading
        eyebrow="Review submissions"
        title={problem.title}
        description={problem.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "px-3 py-1.5",
                problem.state === "published"
                  ? "bg-accent/40 text-accent-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {problem.state === "draft"
                ? "Draft — not visible to students"
                : problem.state === "closed"
                  ? problem.closedReason === "cap"
                    ? "Closed — submissions full"
                    : "Closed"
                  : "Live"}
            </Badge>
            <DeadlineText deadline={problem.deadline} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Latest submissions"
          value={stats.latest}
          hint={`${stats.total} version${stats.total === 1 ? "" : "s"} total`}
          icon={FileText}
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          hint="Shortlisting notifies the student"
          icon={Trophy}
        />
        <StatCard
          label="Avg. alignment"
          value={stats.averageScore ?? "—"}
          hint="Latest version per phase"
          icon={Sparkles}
        />
        <StatCard
          label="Solution slots"
          value={`${problem.solutionCount}/${problem.solutionCap}`}
          hint="Cap enforced atomically"
          icon={Layers}
        />
      </div>

      {problem.state === "draft" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-accent/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-foreground/80">
            This brief is still a draft. Publish it before students can submit.
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 bg-card">
            <Link to="/org/problems">Go to problems</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPhaseFilter("all")}
          aria-pressed={phaseFilter === "all"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-medium transition-colors",
            phaseFilter === "all"
              ? "border-primary/20 bg-accent/30 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          All phases
          <span className="rounded-full bg-secondary/70 px-1.5 py-0.5 text-[0.58rem] tabular-nums">
            {submissions.length}
          </span>
        </button>
        {phases.map((phase) => {
          const count = submissions.filter((item) => item.phase?._id === phase._id).length;
          return (
            <button
              key={phase._id}
              type="button"
              onClick={() => setPhaseFilter(phase._id)}
              aria-pressed={phaseFilter === phase._id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-medium transition-colors",
                phaseFilter === phase._id
                  ? "border-primary/20 bg-accent/30 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {phase.order}. {phase.title}
              <span className="rounded-full bg-secondary/70 px-1.5 py-0.5 text-[0.58rem] tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShortlistOnly((current) => !current)}
            aria-pressed={shortlistOnly}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors",
              shortlistOnly
                ? "bg-accent/35 text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <Trophy className="size-3" />
            Shortlisted only
          </button>
          {compareIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[0.68rem] text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Clear {compareIds.length} selected
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {compareIds.length >= 2 ? (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setCompareOpen(true)}
            >
              Compare {compareIds.length}
              <ArrowRight className="size-3" />
            </Button>
          ) : null}
          <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
            <SelectTrigger
              className="h-8 w-[10.5rem] border-border bg-background text-[0.7rem]"
              aria-label="Sort submissions"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="score">Highest alignment</SelectItem>
              <SelectItem value="versions">Most versions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            submissions.length === 0
              ? "No submissions yet"
              : shortlistOnly
                ? "Nothing shortlisted yet"
                : "No submissions in this phase"
          }
          description={
            submissions.length === 0
              ? problem.state === "draft"
                ? "Publish the problem to open it to students. Submissions and their first-pass feedback will appear here."
                : "The brief is live. As students submit, every version lands here with feedback and criteria coverage."
              : "Try another phase filter or turn off “shortlisted only”."
          }
          action={
            submissions.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setShortlistOnly(false);
                  setPhaseFilter("all");
                }}
              >
                Show all submissions
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((item, index) => {
            const studentName = item.student?.fullName ?? "Student";
            const commentOpen = commentingId === item.submission._id;
            return (
              <motion.article
                key={item.submission._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
                className={cn(
                  "rounded-2xl border bg-card p-5",
                  item.shortlisted ? "border-primary/30" : "border-border/70",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.68rem] font-semibold text-primary">
                      {studentName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{studentName}</p>
                        {item.shortlisted ? (
                          <Badge className="h-5 gap-1 bg-primary px-2 text-[0.58rem] text-primary-foreground">
                            <Trophy className="size-2.5" />
                            Shortlisted
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                        {item.student?.university ?? "Student"}
                        {item.student?.headline ? ` · ${item.student.headline}` : ""}
                      </p>
                      {item.team ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                          <Users className="size-3" />
                          {item.team.name} · {item.memberNames.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.phase ? (
                      <Badge
                        variant="outline"
                        className="h-5 border-border bg-background px-2 text-[0.6rem]"
                      >
                        Phase {item.phase.order}
                      </Badge>
                    ) : null}
                    <span className="rounded-full border border-border bg-background px-2 py-1 text-[0.62rem] text-muted-foreground">
                      v{item.submission.version} · {item.versionCount} version
                      {item.versionCount === 1 ? "" : "s"}
                    </span>
                    <ScoreBadge score={item.analysis?.alignmentScore ?? null} />
                  </div>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[1.25rem] font-semibold leading-tight">
                      {item.submission.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-[0.78rem] leading-6 text-foreground/70">
                      {item.submission.approach}
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                    <Checkbox
                      checked={compareIds.includes(item.submission._id)}
                      onCheckedChange={(checked) =>
                        toggleCompare(item.submission._id, checked === true)
                      }
                      aria-label={`Select ${studentName}'s submission for comparison`}
                    />
                    <span className="text-[0.62rem] text-muted-foreground">Compare</span>
                  </label>
                </div>

                {item.analysis ? (
                  <div className="mt-3 rounded-xl border border-border/60 bg-background/50 p-3">
                    <p className="text-[0.7rem] leading-5 text-foreground/75">
                      {item.analysis.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[0.62rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Check className="size-2.5" strokeWidth={3} />
                        {item.analysis.strengths.length} strengths
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="size-2.5" />
                        {item.analysis.weaknesses.length} gaps
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpRightIcon />
                        {item.analysis.recommendations.length} upgrades
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <Attachments item={item} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={item.shortlisted ? "default" : "outline"}
                      className={cn(
                        "h-8 gap-1.5 text-[0.7rem]",
                        !item.shortlisted && "bg-background",
                      )}
                      onClick={() => void handleShortlist(item)}
                      disabled={busyId === item.submission._id}
                    >
                      {busyId === item.submission._id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trophy className="size-3" />
                      )}
                      {item.shortlisted ? "Shortlisted" : "Shortlist"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-[0.7rem]"
                      onClick={() =>
                        setCommentingId(commentOpen ? null : item.submission._id)
                      }
                    >
                      <MessageSquare className="size-3" />
                      Comment
                      {item.comments.length > 0 ? (
                        <span className="rounded-full bg-secondary px-1.5 text-[0.58rem] tabular-nums">
                          {item.comments.length}
                        </span>
                      ) : null}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-[0.7rem]"
                      onClick={() => openOffer(item)}
                    >
                      <Send className="size-3" />
                      Send opportunity
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetail(item)}
                    className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Full submission
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                {item.comments.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                    {item.comments.map((comment) => (
                      <li
                        key={comment._id}
                        className="rounded-lg bg-background/60 px-3 py-2"
                      >
                        <p className="text-[0.72rem] leading-5 text-foreground/75">
                          {comment.comment}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                          You · {formatTimeAgo(comment.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {commentOpen ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                    <Textarea
                      value={comments[item.submission._id] ?? ""}
                      onChange={(event) =>
                        setComments((current) => ({
                          ...current,
                          [item.submission._id]: event.target.value,
                        }))
                      }
                      placeholder="Leave a specific note the student can act on…"
                      rows={2}
                      className="resize-y bg-background/60 text-xs shadow-none"
                      maxLength={800}
                      aria-label={`Comment on ${studentName}'s submission`}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[0.68rem]"
                        onClick={() => setCommentingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-[0.68rem]"
                        onClick={() => void handleComment(item)}
                        disabled={
                          commentBusyId === item.submission._id ||
                          (comments[item.submission._id] ?? "").trim().length < 4
                        }
                      >
                        {commentBusyId === item.submission._id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Send className="size-3" />
                        )}
                        Post note
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.article>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-2.5">
          <Monogram name={problem.orgName} className="size-8 rounded-lg text-[0.6rem]" />
          <p className="text-[0.7rem] leading-5 text-muted-foreground">
            {problem.solutionCount} of {problem.solutionCap} solution slots are
            taken. The brief closes automatically at the cap or the deadline.
          </p>
        </div>
        <SlotsMeter
          count={problem.solutionCount}
          cap={problem.solutionCap}
          compact
        />
      </div>

      {/* Full submission */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border/70 px-6 py-5 pr-12">
            <Eyebrow>
              {detail?.student?.fullName ?? "Student"} ·{" "}
              {detail?.phase ? `Phase ${detail.phase.order}` : "Submission"}
            </Eyebrow>
            <DialogTitle className="mt-1 font-display text-2xl font-semibold">
              {detail?.submission.title}
            </DialogTitle>
            <DialogDescription>
              Version {detail?.submission.version}
              {detail ? ` · saved ${formatDate(detail.submission.createdAt, true)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="max-h-[68vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="whitespace-pre-line rounded-xl border border-border/70 bg-background/60 p-4 text-[0.82rem] leading-6 text-foreground/80">
                {detail.submission.approach}
              </div>

              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Attachments
                </p>
                <div className="mt-2">
                  <Attachments item={detail} />
                </div>
              </div>

              {detail.analysis ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 p-4">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-primary">
                        Strengths
                      </p>
                      <ul className="mt-2 space-y-2">
                        {detail.analysis.strengths.map((strength) => (
                          <li
                            key={strength}
                            className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/80"
                          >
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/70 p-4">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Gaps
                      </p>
                      <ul className="mt-2 space-y-2">
                        {detail.analysis.weaknesses.map((weakness) => (
                          <li
                            key={weakness}
                            className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/75"
                          >
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/10 bg-accent/15 p-4">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-primary">
                      Upgrades to ask about
                    </p>
                    <ol className="mt-2 space-y-2">
                      {detail.analysis.recommendations.map((recommendation, index) => (
                        <li
                          key={recommendation}
                          className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/80"
                        >
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.55rem] font-semibold text-primary">
                            {index + 1}
                          </span>
                          {recommendation}
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : null}

              {detail.comments.length > 0 ? (
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Your notes
                  </p>
                  <ul className="mt-2 space-y-2">
                    {detail.comments.map((comment) => (
                      <li
                        key={comment._id}
                        className="rounded-lg border border-border/60 bg-background/60 p-3 text-[0.75rem] leading-5"
                      >
                        {comment.comment}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="border-t border-border/70 bg-card px-6 py-4">
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detail ? (
              <Button
                variant={detail.shortlisted ? "outline" : "default"}
                className="gap-1.5"
                onClick={() => void handleShortlist(detail)}
                disabled={busyId === detail.submission._id}
              >
                <Trophy className="size-3.5" />
                {detail.shortlisted ? "Remove from shortlist" : "Shortlist"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle className="font-display text-2xl">
              Compare side by side
            </DialogTitle>
            <DialogDescription>
              Same brief, same phase, different thinking. Scroll sideways for
              three.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto px-6 py-5">
            <div className="flex gap-4">
              {compared.map((item) => (
                <div
                  key={item.submission._id}
                  className="min-w-[19rem] flex-1 rounded-xl border border-border/70 bg-background/50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {item.student?.fullName ?? "Student"}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground">
                        {item.student?.university ?? ""}
                        {item.team ? ` · ${item.team.name}` : ""}
                      </p>
                    </div>
                    <ScoreBadge score={item.analysis?.alignmentScore ?? null} />
                  </div>
                  <p className="mt-3 font-display text-lg font-semibold leading-tight">
                    {item.submission.title}
                  </p>
                  <p className="mt-2 line-clamp-6 text-[0.72rem] leading-5 text-foreground/70">
                    {item.submission.approach}
                  </p>
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary">
                      Strengths
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {(item.analysis?.strengths ?? []).slice(0, 3).map((strength) => (
                        <li
                          key={strength}
                          className="flex items-start gap-1.5 text-[0.68rem] leading-4 text-foreground/75"
                        >
                          <Check
                            className="mt-0.5 size-2.5 shrink-0 text-primary"
                            strokeWidth={3}
                          />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Gaps
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {(item.analysis?.weaknesses ?? []).slice(0, 2).map((weakness) => (
                        <li
                          key={weakness}
                          className="flex items-start gap-1.5 text-[0.68rem] leading-4 text-foreground/70"
                        >
                          <AlertCircle className="mt-0.5 size-2.5 shrink-0 text-muted-foreground" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 h-8 w-full gap-1.5 bg-card text-xs"
                    onClick={() => {
                      setCompareOpen(false);
                      setDetail(item);
                    }}
                  >
                    Open full submission
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t border-border/70 bg-card px-6 py-4">
            <Button variant="outline" onClick={() => setCompareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opportunity */}
      <Dialog
        open={offerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOfferTarget(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <Eyebrow>Opportunity</Eyebrow>
            <DialogTitle className="mt-1 font-display text-2xl">
              Reach out to{" "}
              {offerTarget?.student?.fullName.split(" ")[0] ?? "this student"}
            </DialogTitle>
            <DialogDescription>
              This sends a real opportunity to their My work, referencing “
              {problem.title}”.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Type</label>
              <Select
                value={offerType}
                onValueChange={(value) =>
                  setOfferType(value as "internship" | "job" | "project")
                }
              >
                <SelectTrigger className="h-9 w-full bg-background/70 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offerTitle" className="text-xs font-medium">
                Title
              </label>
              <Input
                id="offerTitle"
                value={offerTitle}
                onChange={(event) => setOfferTitle(event.target.value)}
                className="h-9 bg-background/70 shadow-none"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offerMessage" className="text-xs font-medium">
                Message
              </label>
              <Textarea
                id="offerMessage"
                value={offerMessage}
                onChange={(event) => setOfferMessage(event.target.value)}
                rows={5}
                placeholder="Why this student, what the work is, and what happens next."
                className="resize-y bg-background/70 text-sm shadow-none"
                maxLength={1500}
              />
              <p className="text-[0.65rem] text-muted-foreground">
                Be specific. Mention the submission that stood out.
              </p>
            </div>
            {offerError ? (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {offerError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOfferTarget(null)}
              disabled={offerBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSendOffer()}
              disabled={offerBusy}
              className="gap-1.5"
            >
              {offerBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submissions[0]?.analysis ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing
                score={submissions[0].analysis.alignmentScore}
                size={54}
                label="Top score"
              />
              <p className="max-w-md text-[0.7rem] leading-5 text-muted-foreground">
                Alignment scores come from the submission against the phase
                criteria. They are a first pass, not a verdict — your shortlist
                and notes carry the real weight.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight className="size-2.5 -rotate-45" />;
}
