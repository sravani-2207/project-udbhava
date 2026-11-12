import { Monogram } from "@/components/brand";
import { EmptyState } from "@/components/shared/state-views";
import {
  DeadlineText,
  Eyebrow,
  ScoreRing,
  SlotsMeter,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { submissionSchema, type SubmissionValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Github,
  History,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trophy,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

type SubmissionFile = Doc<"submissions">["files"][number] & {
  url: string | null;
};

type SubmissionView = Omit<Doc<"submissions">, "files"> & {
  files: SubmissionFile[];
  analysis: Doc<"aiAnalyses"> | null;
  comments: Doc<"reviews">[];
};

type LinkDraft = { label: string; url: string };

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^ConvexError:\s*/i, "")
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .trim();
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StageStrip({
  submitted,
  feedback,
  reviewing,
  shortlisted,
}: {
  submitted: boolean;
  feedback: boolean;
  reviewing: boolean;
  shortlisted: boolean;
}) {
  const stages = [
    { label: "Chosen", done: true, current: false },
    { label: "Submitted", done: submitted, current: !submitted },
    { label: "Feedback", done: feedback, current: submitted && !feedback },
    {
      label: shortlisted ? "Shortlisted" : "In review",
      done: shortlisted || reviewing,
      current: feedback && !shortlisted && !reviewing,
    },
  ];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {stages.map((stage, index) => (
        <span key={stage.label} className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium",
              stage.done
                ? "border-primary/20 bg-accent/30 text-primary"
                : stage.current
                  ? "border-primary/30 bg-background text-primary"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            {stage.done ? (
              <Check className="size-2.5" strokeWidth={3} />
            ) : (
              <span className="size-1.5 rounded-full bg-current opacity-60" />
            )}
            {stage.label}
          </span>
          {index < stages.length - 1 ? (
            <span className="h-px w-3 bg-border" aria-hidden="true" />
          ) : null}
        </span>
      ))}
    </div>
  );
}

function FeedbackPanel({ submission }: { submission: SubmissionView | null }) {
  const analysis = submission?.analysis ?? null;

  if (!submission) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <Eyebrow>Feedback</Eyebrow>
        <div className="mt-6 flex flex-col items-center py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Sparkles className="size-5" strokeWidth={1.6} />
          </span>
          <p className="mt-4 font-display text-xl font-semibold">
            Feedback starts with a version
          </p>
          <p className="mt-1.5 max-w-xs text-[0.75rem] leading-5 text-muted-foreground">
            Submit your approach and you'll get a structured first pass:
            alignment, strengths, gaps, and the next upgrade.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <Eyebrow>Feedback</Eyebrow>
        <p className="mt-4 text-sm text-muted-foreground">
          This version is saved. Feedback will appear here shortly.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border/70 bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>First-pass feedback</Eyebrow>
        <Badge variant="outline" className="gap-1 border-border bg-background text-[0.62rem]">
          <Sparkles className="size-2.5" />
          v{submission.version}
        </Badge>
      </div>

      <div className="mt-4">
        <ScoreRing score={analysis.alignmentScore} size={82} />
      </div>

      <p className="mt-4 text-[0.8rem] leading-6 text-foreground/80">
        {analysis.summary}
      </p>

      {analysis.criteriaCoverage.length > 0 ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Criteria coverage
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.criteriaCoverage.map((item) => (
              <li
                key={item.criterion}
                className="flex items-start gap-2 text-[0.72rem] leading-4"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                    item.covered
                      ? "bg-accent/40 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {item.covered ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : (
                    <X className="size-2.5" strokeWidth={2.5} />
                  )}
                </span>
                <span className={item.covered ? "text-foreground/80" : "text-muted-foreground"}>
                  {item.criterion}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-primary">
            Strengths
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.strengths.map((strength) => (
              <li key={strength} className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/80">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={1.9} />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What's thin
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.weaknesses.map((weakness) => (
              <li key={weakness} className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/75">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                {weakness}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-primary/10 bg-accent/15 p-3.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-primary">
            Upgrade next
          </p>
          <ol className="mt-2 space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={recommendation} className="flex items-start gap-2 text-[0.75rem] leading-5 text-foreground/80">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.55rem] font-semibold text-primary">
                  {index + 1}
                </span>
                {recommendation}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {submission.comments.length > 0 ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <MessageSquare className="size-3" />
            Reviewer notes
          </p>
          <ul className="mt-2 space-y-2">
            {submission.comments.map((comment) => (
              <li
                key={comment._id}
                className="rounded-lg border border-border/60 bg-background/60 p-2.5 text-[0.72rem] leading-5 text-foreground/75"
              >
                {comment.comment}
                <span className="mt-1 block text-[0.62rem] text-muted-foreground">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 border-t border-border/60 pt-3 text-[0.62rem] leading-4 text-muted-foreground">
        Structured first pass, generated from your submission against this
        phase's criteria. It is a starting point — a human reviewer sees the same
        version.
      </p>
    </motion.div>
  );
}

function VersionHistory({
  submissions,
  shortlisted,
}: {
  submissions: SubmissionView[];
  shortlisted: boolean;
}) {
  const [selected, setSelected] = useState<SubmissionView | null>(null);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Version history</Eyebrow>
        <span className="text-[0.68rem] text-muted-foreground">
          {submissions.length} version{submissions.length === 1 ? "" : "s"}
        </span>
      </div>

      {submissions.length === 0 ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Versions appear here after your first submission. Nothing is
          overwritten.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {submissions.map((submission, index) => (
            <li key={submission._id}>
              <button
                type="button"
                onClick={() => setSelected(submission)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  index === 0
                    ? "border-primary/20 bg-accent/15"
                    : "border-border/70 bg-background/50 hover:border-primary/20",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-xs font-semibold",
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-primary",
                  )}
                >
                  v{submission.version}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.78rem] font-medium">
                      {submission.title}
                    </span>
                    {submission.analysis ? (
                      <span className="shrink-0 rounded-full border border-border bg-card px-1.5 py-0.5 text-[0.6rem] tabular-nums text-muted-foreground">
                        {submission.analysis.alignmentScore}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                    {formatTimeAgo(submission.createdAt)}
                    {index === 0 ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-primary">Latest</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {shortlisted ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/15 bg-accent/20 p-3">
          <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-[0.72rem] leading-5 text-foreground/80">
            Shortlisted by the organization. Keep an eye on your inbox and My
            work for the next step.
          </p>
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/70 px-6 py-5 pr-12">
            <Eyebrow>
              Version {selected?.version} · {selected ? formatDate(selected.createdAt, true) : ""}
            </Eyebrow>
            <DialogTitle className="mt-1 font-display text-2xl font-semibold">
              {selected?.title}
            </DialogTitle>
            <DialogDescription>
              Saved exactly as submitted. New versions do not overwrite old ones.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
              <div className="whitespace-pre-line rounded-xl border border-border/70 bg-background/60 p-4 text-[0.82rem] leading-6 text-foreground/80">
                {selected.approach}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Attachments
                  </p>
                  {selected.repoUrl || selected.links.length > 0 || selected.files.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {selected.repoUrl ? (
                        <li>
                          <a
                            href={selected.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                          >
                            <Github className="size-3.5" />
                            Repository
                          </a>
                        </li>
                      ) : null}
                      {selected.links.map((link) => (
                        <li key={`${link.url}-${link.label}`}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                          >
                            <ExternalLink className="size-3.5" />
                            {link.label}
                          </a>
                        </li>
                      ))}
                      {selected.files.map((file) => (
                        <li key={file.storageId}>
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                            >
                              <Paperclip className="size-3.5" />
                              {file.name}
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Paperclip className="size-3.5" />
                              {file.name}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-[0.72rem] text-muted-foreground">
                      No attachments on this version.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Alignment
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {selected.analysis?.alignmentScore ?? "—"}
                    <span className="text-xs font-normal text-muted-foreground"> / 100</span>
                  </p>
                  <p className="mt-1 text-[0.7rem] leading-4 text-muted-foreground">
                    {selected.analysis?.summary ?? "No analysis stored for this version."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Workspace() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const detail = useQuery(
    api.assignments.detail,
    assignmentId ? { assignmentId: assignmentId as Id<"assignments"> } : "skip",
  );

  const submitSolution = useMutation(api.submissions.submit);
  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const inviteTeammate = useMutation(api.assignments.inviteTeammate);
  const setTeamLead = useMutation(api.assignments.setTeamLead);

  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [uploaded, setUploaded] = useState<
    Array<{ name: string; storageId: Id<"_storage">; size?: number }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { title: "", approach: "", repoUrl: "" },
  });

  const watchedApproach = form.watch("approach");

  const submissions = useMemo<SubmissionView[]>(
    () => detail?.submissions ?? [],
    [detail?.submissions],
  );
  const latest = submissions[0] ?? null;

  if (!assignmentId) {
    return (
      <EmptyState
        icon={FileText}
        title="Assignment not found"
        description="Open My work to pick one of your active briefs."
        action={
          <Button asChild>
            <Link to="/student/work">Back to My work</Link>
          </Button>
        }
      />
    );
  }

  if (detail === undefined) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton-warm h-3 w-32 rounded-full" />
        <div className="skeleton-warm h-10 w-3/4 rounded-lg" />
        <div className="skeleton-warm h-4 w-1/2 rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <div className="skeleton-warm h-72 w-full rounded-2xl" />
            <div className="skeleton-warm h-44 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton-warm h-80 w-full rounded-2xl" />
            <div className="skeleton-warm h-36 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const {
    problem,
    organization,
    phases,
    selectedPhase,
    team,
    members,
    canSubmit,
    deadlinePassed,
    isLead,
    shortlisted,
  } = detail;

  const joinedMembers = members.filter((member) => member.userId);
  const nextVersion = (latest?.version ?? 0) + 1;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(event.target.files ?? []);
    if (fileList.length === 0) return;
    const room = Math.max(0, 5 - uploaded.length);
    if (room === 0) {
      toast.error("Up to five files per version.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      for (const file of fileList.slice(0, room)) {
        const postUrl = await generateUploadUrl({});
        const response = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const result = (await response.json()) as { storageId: string };
        setUploaded((current) => [
          ...current,
          {
            name: file.name,
            storageId: result.storageId as Id<"_storage">,
            size: file.size,
          },
        ]);
      }
    } catch {
      toast.error("One of the files couldn't upload. Try a smaller file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function onSubmit(values: SubmissionValues) {
    setSubmitError(null);
    if (!selectedPhase) {
      setSubmitError("This assignment has no phase attached. Contact support.");
      return;
    }
    const cleanLinks = links
      .filter((link) => link.label.trim() || link.url.trim())
      .map((link) => ({ label: link.label.trim() || "Link", url: link.url.trim() }));
    const badLink = cleanLinks.find((link) => !/^https?:\/\/.+\..+/.test(link.url));
    if (badLink) {
      setSubmitError("Every link needs a full https:// address.");
      return;
    }
    try {
      const result = await submitSolution({
        assignmentId: detail.assignment._id,
        phaseId: selectedPhase._id,
        title: values.title,
        approach: values.approach,
        repoUrl: values.repoUrl || undefined,
        links: cleanLinks,
        files: uploaded,
      });
      toast.success(`Version ${result.version} submitted`, {
        description: `First-pass alignment: ${result.alignmentScore}/100. Feedback is ready.`,
      });
      form.reset({ title: "", approach: "", repoUrl: "" });
      setLinks([]);
      setUploaded([]);
    } catch (error) {
      setSubmitError(messageFor(error));
    }
  }

  async function handleInvite() {
    if (!team) return;
    setTeamBusy(true);
    try {
      const result = await inviteTeammate({
        assignmentId: detail.assignment._id,
        email: inviteEmail,
      });
      toast.success(
        result.foundAccount
          ? "Teammate added and notified."
          : "Invite saved — they'll join when they sign up.",
      );
      setInviteEmail("");
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setTeamBusy(false);
    }
  }

  async function handleLeadChange(memberId: string) {
    try {
      await setTeamLead({
        assignmentId: detail.assignment._id,
        memberId: memberId as Id<"teamMembers">,
      });
      toast.success("Team lead updated.");
    } catch (error) {
      toast.error(messageFor(error));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/student/work"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        My work
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Monogram name={problem.orgName} className="size-7 rounded-lg text-[0.6rem]" />
                <span className="text-xs font-medium text-muted-foreground">
                  {problem.orgName}
                </span>
              </div>
              <span className="size-1 rounded-full bg-border" />
              <Badge variant="outline" className="gap-1 border-border bg-card">
                {detail.assignment.mode === "team" ? (
                  <Users className="size-3" />
                ) : (
                  <UserRound className="size-3" />
                )}
                {detail.assignment.mode === "team" ? "Team" : "Solo"}
              </Badge>
              {selectedPhase ? (
                <Badge variant="outline" className="border-border bg-card">
                  Phase {selectedPhase.order}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[2.6rem]">
              {problem.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedPhase?.title ?? "Selected phase"} ·{" "}
              <Link
                to={`/student/problems/${problem._id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                View full brief
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 sm:items-end">
            <DeadlineText deadline={problem.deadline} />
            <span className="text-[0.65rem] text-muted-foreground">
              {formatDate(problem.deadline, true)}
            </span>
          </div>
        </div>

        <StageStrip
          submitted={submissions.length > 0}
          feedback={!!latest?.analysis}
          reviewing={latest?.comments.length ? true : false}
          shortlisted={shortlisted}
        />
      </header>

      {!canSubmit ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/35 px-4 py-3 text-[0.78rem] leading-5 text-muted-foreground">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary/70" />
          <span>
            {deadlinePassed
              ? "The deadline has passed, so this workspace is read-only. Your versions and feedback stay here."
              : problem.state !== "published"
                ? "This brief is closed by the organization. Your versions and feedback stay here."
                : isLead
                  ? "Submissions are paused right now."
                  : "Only the team lead can submit new versions. You can still read every version and its feedback."}
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          {/* Submit form */}
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow>Submit a solution</Eyebrow>
                <h2 className="mt-1.5 font-display text-[1.6rem] font-semibold">
                  {latest ? "Send a new version" : "Your first version"}
                </h2>
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  {selectedPhase
                    ? `For ${selectedPhase.title}. Version ${nextVersion} will sit alongside ${latest ? `version ${latest.version}` : "nothing yet"}.`
                    : "Choose a phase before submitting."}
                </p>
              </div>
              <Badge variant="outline" className="border-border bg-background">
                v{nextVersion}
              </Badge>
            </div>

            {canSubmit ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-5 space-y-4"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Version title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Two-step reminder with a voice note"
                            className="h-10 bg-background/70 shadow-none"
                            maxLength={140}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="approach"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-baseline justify-between gap-3">
                          <FormLabel className="text-xs">Your approach</FormLabel>
                          <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                            {watchedApproach.length.toLocaleString()} / 12,000
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="What did you decide, why, and what would you test first? Include the constraints you're working within."
                            rows={9}
                            className="min-h-44 resize-y bg-background/70 text-[0.85rem] leading-6 shadow-none"
                            maxLength={12000}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Repository (optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Github className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="https://github.com/you/project"
                              className="h-10 bg-background/70 pl-9 shadow-none"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium">Links</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[0.7rem]"
                        onClick={() => setLinks((current) => [...current, { label: "", url: "" }])}
                      >
                        <Plus className="size-3" />
                        Add link
                      </Button>
                    </div>
                    {links.length === 0 ? (
                      <p className="text-[0.7rem] text-muted-foreground">
                        Add a prototype, Figma file, doc, or anything reviewers should open.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={link.label}
                              onChange={(event) =>
                                setLinks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, label: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Label (Prototype)"
                              className="h-9 bg-background/70 text-xs shadow-none sm:w-40"
                              aria-label={`Link ${index + 1} label`}
                            />
                            <div className="relative flex-1">
                              <Link2 className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                              <Input
                                value={link.url}
                                onChange={(event) =>
                                  setLinks((current) =>
                                    current.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, url: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="https://"
                                className="h-9 bg-background/70 pl-8 text-xs shadow-none"
                                aria-label={`Link ${index + 1} URL`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove link"
                              onClick={() =>
                                setLinks((current) =>
                                  current.filter((_, itemIndex) => itemIndex !== index),
                                )
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium">Files</label>
                      <span className="text-[0.65rem] text-muted-foreground">
                        Up to 5 · PDF, images, docs
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(event) => void handleFiles(event)}
                      aria-label="Attach submission files"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 bg-background/60 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || uploaded.length >= 5}
                      >
                        {uploading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {uploading ? "Uploading…" : "Attach file"}
                      </Button>
                      {uploaded.map((file) => (
                        <span
                          key={file.storageId}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[0.68rem]"
                        >
                          <Paperclip className="size-3" />
                          <span className="max-w-[10rem] truncate">{file.name}</span>
                          {file.size ? (
                            <span className="text-[0.6rem] text-muted-foreground">
                              {formatSize(file.size)}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setUploaded((current) =>
                                current.filter((item) => item.storageId !== file.storageId),
                              )
                            }
                            aria-label={`Remove ${file.name}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {submitError ? (
                    <p className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                      {submitError}
                    </p>
                  ) : null}

                  <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[0.68rem] text-muted-foreground">
                      You can submit another version any time before the deadline.
                    </p>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting || uploading}
                      className="gap-2"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {form.formState.isSubmitting
                        ? "Submitting…"
                        : `Submit version ${nextVersion}`}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                {latest
                  ? "The submission window is closed. Every version you sent remains available, with its feedback."
                  : "There is no open submission window for this brief right now."}
              </div>
            )}
          </section>

          <VersionHistory submissions={submissions} shortlisted={shortlisted} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <FeedbackPanel submission={latest} />

          {team ? (
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Eyebrow>Team</Eyebrow>
                  <p className="mt-1 font-display text-xl font-semibold">{team.name}</p>
                </div>
                {isLead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[0.7rem]"
                    onClick={() => setTeamOpen(true)}
                  >
                    Manage
                  </Button>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {members.map((member) => (
                  <li key={member._id} className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[0.6rem] font-semibold text-primary">
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.75rem] font-medium">
                        {member.name}
                      </span>
                      <span className="block text-[0.62rem] text-muted-foreground">
                        {member.status === "invited"
                          ? "Invited · not registered"
                          : member.role === "lead"
                            ? "Team lead · submits"
                            : "Member"}
                      </span>
                    </span>
                    {member.role === "lead" ? (
                      <Badge className="h-5 bg-primary px-2 text-[0.58rem] text-primary-foreground">
                        Lead
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/60 pt-3 text-[0.65rem] leading-4 text-muted-foreground">
                Only the lead submits. The team choice was locked when you took
                this brief.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <Eyebrow>Mode</Eyebrow>
              <div className="mt-2 flex items-center gap-2">
                <UserRound className="size-4 text-primary" />
                <p className="font-display text-xl font-semibold">Solo</p>
              </div>
              <p className="mt-2 text-[0.72rem] leading-5 text-muted-foreground">
                You took this brief on your own. That choice is recorded and
                can't be changed to a team later.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <Eyebrow>Phase at a glance</Eyebrow>
            {selectedPhase ? (
              <>
                <p className="mt-1.5 font-display text-lg font-semibold leading-tight">
                  {selectedPhase.title}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {selectedPhase.evaluationCriteria.map((criterion) => (
                    <li
                      key={criterion}
                      className="flex items-start gap-2 text-[0.7rem] leading-4 text-foreground/75"
                    >
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2.4} />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {phases.length} phases · check the brief for the full plan.
              </p>
            )}
            <div className="mt-4 border-t border-border/60 pt-3">
              <SlotsMeter count={problem.solutionCount} cap={problem.solutionCap} compact />
            </div>
            {organization ? (
              <p className="mt-3 text-[0.65rem] leading-4 text-muted-foreground">
                Questions for {organization.companyName}? Reply to your feedback
                thread or use the offer conversation.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Team management dialog */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Manage {team?.name}</DialogTitle>
            <DialogDescription>
              Invite one more person or hand the submission lead to a joined
              teammate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="inviteEmail" className="text-xs font-medium">
                Invite by email
              </label>
              <div className="flex gap-2">
                <Input
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@college.edu"
                  className="h-9 bg-background/70 shadow-none"
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  onClick={() => void handleInvite()}
                  disabled={teamBusy || !inviteEmail.includes("@")}
                >
                  {teamBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Invite
                </Button>
              </div>
              <p className="text-[0.65rem] leading-4 text-muted-foreground">
                A team can have up to five members. Unregistered invitees are
                stored so they can join later.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Submission lead</label>
              <Select
                value={
                  members.find((member) => member.role === "lead")?.userId ?? ""
                }
                onValueChange={(value) => void handleLeadChange(value)}
              >
                <SelectTrigger className="h-9 w-full bg-background/70 text-xs">
                  <SelectValue placeholder="Choose a joined teammate" />
                </SelectTrigger>
                <SelectContent>
                  {joinedMembers.map((member) => (
                    <SelectItem key={member._id} value={member.userId as string}>
                      {member.name} {member.role === "lead" ? "· current lead" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.65rem] text-muted-foreground">
                Changing the lead changes who can submit; everyone keeps access
                to the work and feedback.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
