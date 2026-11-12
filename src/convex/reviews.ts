import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrganization } from "./lib/authz";

/** Organization review workspace for one owned problem. */
export const forProblem = query({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new ConvexError("That problem no longer exists.");
    if (problem.orgId !== user._id) {
      throw new ConvexError("You can only review submissions for your own problems.");
    }

    const org = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const phases = (
      await ctx.db
        .query("phases")
        .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
        .collect()
    ).sort((a, b) => a.order - b.order);

    const allSubmissions = await ctx.db
      .query("submissions")
      .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
      .collect();

    const latestByKey = new Map<string, (typeof allSubmissions)[number]>();
    const versionCount = new Map<string, number>();
    for (const submission of allSubmissions) {
      const key = `${submission.assignmentId}:${submission.phaseId ?? "main"}`;
      const current = latestByKey.get(key);
      if (!current || submission.version > current.version) {
        latestByKey.set(key, submission);
      }
      versionCount.set(key, (versionCount.get(key) ?? 0) + 1);
    }

    const shortlists = await ctx.db
      .query("shortlists")
      .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
      .collect();
    const shortlistedIds = new Set(shortlists.map((item) => item.submissionId));

    const submissions = await Promise.all(
      Array.from(latestByKey.entries()).map(async ([key, submission]) => {
        const assignment = await ctx.db.get(submission.assignmentId);
        const studentId = assignment?.studentId ?? submission.submitterId;
        const student = await ctx.db
          .query("studentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", studentId))
          .first();
        const team = assignment?.teamId
          ? await ctx.db.get(assignment.teamId)
          : null;
        const members = team
          ? await ctx.db
              .query("teamMembers")
              .withIndex("by_team", (q) => q.eq("teamId", team._id))
              .collect()
          : [];
        const phase = submission.phaseId
          ? await ctx.db.get(submission.phaseId)
          : null;
        const analysis = await ctx.db
          .query("aiAnalyses")
          .withIndex("by_submission", (q) =>
            q.eq("submissionId", submission._id),
          )
          .first();
        const comments = await ctx.db
          .query("reviews")
          .withIndex("by_submission", (q) =>
            q.eq("submissionId", submission._id),
          )
          .collect();
        const files = await Promise.all(
          submission.files.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          })),
        );
        return {
          submission: { ...submission, files },
          student: student
            ? {
                _id: student.userId,
                fullName: student.fullName,
                university: student.university,
                headline: student.headline,
                skills: student.skills,
              }
            : null,
          assignment,
          team,
          memberNames: members.map((member) => member.name),
          phase,
          analysis,
          comments: comments.sort((a, b) => a.createdAt - b.createdAt),
          shortlisted: shortlistedIds.has(submission._id),
          versionCount: versionCount.get(key) ?? 1,
        };
      }),
    );

    submissions.sort((a, b) => b.submission.createdAt - a.submission.createdAt);

    return {
      problem,
      organization: org,
      phases,
      submissions,
      stats: {
        total: allSubmissions.length,
        latest: submissions.length,
        shortlisted: shortlists.length,
        averageScore:
          submissions.filter((item) => item.analysis).length === 0
            ? null
            : Math.round(
                submissions
                  .filter((item) => item.analysis)
                  .reduce(
                    (sum, item) => sum + (item.analysis?.alignmentScore ?? 0),
                    0,
                  ) / submissions.filter((item) => item.analysis).length,
              ),
      },
    };
  },
});

export const toggleShortlist = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new ConvexError("That submission no longer exists.");
    const problem = await ctx.db.get(submission.problemId);
    if (!problem || problem.orgId !== user._id) {
      throw new ConvexError("You can only shortlist submissions on your problems.");
    }

    const existing = await ctx.db
      .query("shortlists")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { shortlisted: false };
    }

    const assignment = await ctx.db.get(submission.assignmentId);
    const studentId = assignment?.studentId ?? submission.submitterId;
    await ctx.db.insert("shortlists", {
      problemId: problem._id,
      submissionId: submission._id,
      orgId: user._id,
      studentId,
      createdAt: Date.now(),
    });
    const org = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    await ctx.db.insert("notifications", {
      userId: studentId,
      type: "shortlisted",
      title: "You've been shortlisted",
      body: `${org?.companyName ?? "An organization"} shortlisted your solution for “${problem.title}”.`,
      link: "/student/work",
      read: false,
      createdAt: Date.now(),
    });

    return { shortlisted: true };
  },
});

export const addComment = mutation({
  args: { submissionId: v.id("submissions"), comment: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx);
    const comment = args.comment.trim();
    if (comment.length < 4) {
      throw new ConvexError("Write a short note before posting.");
    }
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new ConvexError("That submission no longer exists.");
    const problem = await ctx.db.get(submission.problemId);
    if (!problem || problem.orgId !== user._id) {
      throw new ConvexError("You can only comment on submissions to your problems.");
    }

    await ctx.db.insert("reviews", {
      submissionId: submission._id,
      problemId: problem._id,
      orgId: user._id,
      comment: comment.slice(0, 800),
      createdAt: Date.now(),
    });

    const assignment = await ctx.db.get(submission.assignmentId);
    const studentId = assignment?.studentId ?? submission.submitterId;
    await ctx.db.insert("notifications", {
      userId: studentId,
      type: "comment",
      title: "New reviewer note",
      body: `${args.comment.slice(0, 120)}${args.comment.length > 120 ? "…" : ""}`,
      link: "/student/work",
      read: false,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});
