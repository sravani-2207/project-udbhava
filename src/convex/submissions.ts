import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireStudent } from "./lib/authz";

const linkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

const fileValidator = v.object({
  name: v.string(),
  storageId: v.id("_storage"),
  size: v.optional(v.number()),
});

function cleanUrl(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();

  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;

  return trimmed.slice(0, 500);
}

/**
 * Mint a short-lived URL for a submission attachment.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStudent(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new submission version.
 * Grok evaluation runs asynchronously after the submission is saved.
 */
export const submit = mutation({
  args: {
    assignmentId: v.id("assignments"),
    phaseId: v.id("phases"),
    title: v.string(),
    approach: v.string(),
    repoUrl: v.optional(v.string()),
    links: v.array(linkValidator),
    files: v.array(fileValidator),
  },

  handler: async (ctx, args) => {
    const { user, profile } = await requireStudent(ctx);

    const assignment = await ctx.db.get(args.assignmentId);

    if (!assignment) {
      throw new ConvexError("That assignment no longer exists.");
    }

    if (assignment.status !== "active") {
      throw new ConvexError("This assignment is already complete.");
    }

    const problem = await ctx.db.get(assignment.problemId);

    if (!problem) {
      throw new ConvexError("That problem no longer exists.");
    }

    if (problem.state !== "published") {
      throw new ConvexError("This problem is closed for new submissions.");
    }

    if (problem.deadline < Date.now()) {
      throw new ConvexError(
        "The deadline has passed — submissions are closed.",
      );
    }

    const team = assignment.teamId
      ? await ctx.db.get(assignment.teamId)
      : null;

    const isOwner = assignment.studentId === user._id;
    const isLead = team ? team.leadId === user._id : isOwner;

    if (!isLead) {
      throw new ConvexError(
        "Only the team lead can submit a solution.",
      );
    }

    if (assignment.phaseId && assignment.phaseId !== args.phaseId) {
      throw new ConvexError(
        "You can only submit for the phase you chose when taking up the problem.",
      );
    }

    const phase = await ctx.db.get(args.phaseId);

    if (!phase || phase.problemId !== problem._id) {
      throw new ConvexError(
        "That phase does not belong to this problem.",
      );
    }

    const title = args.title.trim();
    const approach = args.approach.trim();

    if (title.length < 5) {
      throw new ConvexError(
        "Give your submission a title of at least 5 characters.",
      );
    }

    if (approach.length < 80) {
      throw new ConvexError(
        "Write at least 80 characters so reviewers can follow your approach.",
      );
    }

    const links = args.links
      .map((link) => ({
        label: link.label.trim().slice(0, 60) || "Link",
        url: cleanUrl(link.url),
      }))
      .filter(
        (link): link is { label: string; url: string } =>
          Boolean(link.url),
      )
      .slice(0, 6);

    const files = args.files.slice(0, 5).map((file) => ({
      name: file.name.trim().slice(0, 120) || "Attachment",
      storageId: file.storageId,
      size: file.size,
    }));

    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_and_phase", (q) =>
        q
          .eq("assignmentId", assignment._id)
          .eq("phaseId", args.phaseId),
      )
      .collect();

    const version =
      existing.reduce(
        (max, submission) => Math.max(max, submission.version),
        0,
      ) + 1;

    // Save the submission first.
    const submissionId = await ctx.db.insert("submissions", {
      problemId: problem._id,
      assignmentId: assignment._id,
      phaseId: phase._id,
      submitterId: user._id,
      version,
      title: title.slice(0, 140),
      approach: approach.slice(0, 12000),
      repoUrl: cleanUrl(args.repoUrl),
      links,
      files,
      createdAt: Date.now(),
    });

    // Schedule Grok evaluation in the background.
    await ctx.scheduler.runAfter(
      0,
      internal.aiEvaluation.evaluateSubmission,
      {
        submissionId,
        problemId: problem._id,
        problemTitle: problem.title,
        domain: problem.domain,
        phaseTitle: phase.title,
        evaluationCriteria: phase.evaluationCriteria,
        approach,
        repoUrl: cleanUrl(args.repoUrl) ?? null,
        linkCount: links.length,
        fileCount: files.length,
        version,
      },
    );

    // Notify the organization about the new submission.
    await ctx.db.insert("notifications", {
      userId: problem.orgId,
      type: "submission",
      title: `New submission on "${problem.title}"`,
      body: `${profile.fullName} submitted version ${version} for ${phase.title}.`,
      link: `/org/problems/${problem._id}`,
      read: false,
      createdAt: Date.now(),
    });

    return {
      submissionId,
      version,
    };
  },
});