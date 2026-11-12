import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireOrganization } from "./lib/authz";
import { difficultyValidator } from "./schema";

const phaseInputValidator = v.object({
  title: v.string(),
  description: v.string(),
  evaluationCriteria: v.array(v.string()),
  skills: v.array(v.string()),
  durationWeeks: v.number(),
});

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function matchScoreFor(
  problem: Doc<"problems">,
  profileSkills: string[],
  profileDomains: string[],
): { score: number; matchedSkills: string[] } {
  const skillSet = new Set(profileSkills.map(lower));
  const matchedSkills = problem.skills.filter((skill) => skillSet.has(lower(skill)));
  const domainMatch =
    profileDomains.some((domain) => lower(domain) === lower(problem.domain)) ||
    profileDomains.some((domain) => lower(problem.domain).includes(lower(domain)));
  const skillRatio =
    problem.skills.length === 0 ? 0 : matchedSkills.length / problem.skills.length;
  const score = Math.round(skillRatio * 70 + (domainMatch ? 30 : 0));
  return { score: Math.min(100, score), matchedSkills };
}

/** Public problem strip for the landing page. No auth required. */
export const featured = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_state", (q) => q.eq("state", "published"))
      .collect();
    const open = problems
      .filter((problem) => problem.deadline > now)
      .sort((a, b) => a.deadline - b.deadline)
      .slice(0, 3);

    return await Promise.all(
      open.map(async (problem) => {
        const phases = await ctx.db
          .query("phases")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        return {
          _id: problem._id,
          title: problem.title,
          summary: problem.summary,
          orgName: problem.orgName,
          orgVerified: problem.orgVerified,
          domain: problem.domain,
          skills: problem.skills,
          difficulty: problem.difficulty,
          deadline: problem.deadline,
          solutionCap: problem.solutionCap,
          solutionCount: problem.solutionCount,
          phaseCount: phases.length,
        };
      }),
    );
  },
});

export const publicStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const problems = await ctx.db.query("problems").collect();
    const organizations = await ctx.db.query("organizationProfiles").collect();
    const students = await ctx.db.query("studentProfiles").collect();
    return {
      openProblems: problems.filter(
        (problem) => problem.state === "published" && problem.deadline > now,
      ).length,
      startups: organizations.length,
      students: students.length,
    };
  },
});

export const facets = query({
  args: {},
  handler: async (ctx) => {
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_state", (q) => q.eq("state", "published"))
      .collect();
    const domains = Array.from(new Set(problems.map((p) => p.domain))).sort();
    const skills = Array.from(
      new Set(problems.flatMap((p) => p.skills)),
    ).sort();
    return { domains, skills };
  },
});

/**
 * The student's first screen: every open problem, ranked against their profile.
 * Full problems stay visible so students can see the cap in action.
 */
export const board = query({
  args: {
    search: v.optional(v.string()),
    domain: v.optional(v.string()),
    skill: v.optional(v.string()),
    difficulty: v.optional(difficultyValidator),
    deadlineWithinDays: v.optional(v.number()),
    sort: v.optional(
      v.union(v.literal("recommended"), v.literal("deadline"), v.literal("newest")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const profile =
      user?.role === "student"
        ? await ctx.db
            .query("studentProfiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first()
        : null;

    const now = Date.now();
    const all = await ctx.db.query("problems").collect();
    const visible = all.filter(
      (problem) =>
        (problem.state === "published" ||
          (problem.state === "closed" && problem.closedReason === "cap")) &&
        problem.deadline > now,
    );

    const search = lower(args.search ?? "");
    const deadlineLimit = args.deadlineWithinDays
      ? now + args.deadlineWithinDays * 24 * 60 * 60 * 1000
      : null;

    const filtered = visible.filter((problem) => {
      if (args.domain && problem.domain !== args.domain) return false;
      if (args.difficulty && problem.difficulty !== args.difficulty) return false;
      if (args.skill && !problem.skills.includes(args.skill)) return false;
      if (deadlineLimit && problem.deadline > deadlineLimit) return false;
      if (search) {
        const haystack = [
          problem.title,
          problem.summary,
          problem.description,
          problem.orgName,
          problem.domain,
          ...problem.skills,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const profileSkills = profile
      ? [...profile.skills, ...profile.interests]
      : [];
    const profileDomains = profile ? profile.domains : [];

    const items = await Promise.all(
      filtered.map(async (problem) => {
        const phases = await ctx.db
          .query("phases")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        const ownAssignment = user
          ? await ctx.db
              .query("assignments")
              .withIndex("by_problem_and_student", (q) =>
                q.eq("problemId", problem._id).eq("studentId", user._id),
              )
              .first()
          : null;
        // Team members don't own the assignment, but they should still see
        // that they are already on this brief.
        let assignment = ownAssignment;
        if (!assignment && user) {
          const membership = await ctx.db
            .query("teamMembers")
            .withIndex("by_problem_and_user", (q) =>
              q.eq("problemId", problem._id).eq("userId", user._id),
            )
            .first();
          if (membership) {
            assignment = await ctx.db
              .query("assignments")
              .withIndex("by_team", (q) => q.eq("teamId", membership.teamId))
              .first();
          }
        }
        const match = profile
          ? matchScoreFor(problem, profileSkills, profileDomains)
          : { score: 0, matchedSkills: [] as string[] };

        return {
          _id: problem._id,
          title: problem.title,
          summary: problem.summary,
          orgName: problem.orgName,
          orgIndustry: problem.orgIndustry,
          orgVerified: problem.orgVerified,
          domain: problem.domain,
          skills: problem.skills,
          difficulty: problem.difficulty,
          deadline: problem.deadline,
          state: problem.state,
          solutionCap: problem.solutionCap,
          solutionCount: problem.solutionCount,
          slotsLeft: Math.max(0, problem.solutionCap - problem.solutionCount),
          isFull:
            problem.state === "closed" || problem.solutionCount >= problem.solutionCap,
          phaseCount: phases.length,
          phaseTitles: phases
            .sort((a, b) => a.order - b.order)
            .map((phase) => phase.title),
          createdAt: problem._creationTime,
          matchScore: match.score,
          matchedSkills: match.matchedSkills,
          hasTaken: assignment !== null,
        };
      }),
    );

    const sort = args.sort ?? "recommended";
    items.sort((a, b) => {
      if (sort === "deadline") return a.deadline - b.deadline;
      if (sort === "newest") return b.createdAt - a.createdAt;
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const aFull = a.isFull ? 1 : 0;
      const bFull = b.isFull ? 1 : 0;
      if (aFull !== bFull) return aFull - bFull;
      return a.deadline - b.deadline;
    });

    return {
      items,
      profileReady: profile !== null,
      totalOpen: items.filter((item) => !item.isFull).length,
      matchingCount: items.filter((item) => item.matchScore >= 50).length,
    };
  },
});

export const getById = query({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new ConvexError("That problem no longer exists.");

    const org = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", problem.orgId))
      .first();
    const phases = (
      await ctx.db
        .query("phases")
        .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
        .collect()
    ).sort((a, b) => a.order - b.order);

    const ownAssignment =
      user && user.role === "student"
        ? await ctx.db
            .query("assignments")
            .withIndex("by_problem_and_student", (q) =>
              q.eq("problemId", problem._id).eq("studentId", user._id),
            )
            .first()
        : null;
    let assignment = ownAssignment;
    if (!assignment && user && user.role === "student") {
      const membership = await ctx.db
        .query("teamMembers")
        .withIndex("by_problem_and_user", (q) =>
          q.eq("problemId", problem._id).eq("userId", user._id),
        )
        .first();
      if (membership) {
        assignment = await ctx.db
          .query("assignments")
          .withIndex("by_team", (q) => q.eq("teamId", membership.teamId))
          .first();
      }
    }

    const team = assignment?.teamId
      ? await ctx.db.get(assignment.teamId)
      : null;
    const members = team
      ? await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect()
      : [];

    return {
      problem,
      organization: org,
      phases,
      slack: Math.max(0, problem.solutionCap - problem.solutionCount),
      isFull:
        problem.state === "closed" ||
        problem.solutionCount >= problem.solutionCap,
      deadlinePassed: problem.deadline < Date.now(),
      assignment,
      team,
      teamMembers: members,
      viewerRole: user?.role ?? null,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    description: v.string(),
    domain: v.string(),
    skills: v.array(v.string()),
    difficulty: difficultyValidator,
    deadline: v.number(),
    solutionCap: v.number(),
    phases: v.array(phaseInputValidator),
    publish: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireOrganization(ctx);

    const title = args.title.trim();
    const summary = args.summary.trim();
    const description = args.description.trim();
    const domain = args.domain.trim();
    const skills = Array.from(
      new Set(args.skills.map((skill) => skill.trim()).filter(Boolean)),
    );

    if (title.length < 8) {
      throw new ConvexError("Give the problem a title of at least 8 characters.");
    }
    if (summary.length < 20) {
      throw new ConvexError("Add a one-line summary of at least 20 characters.");
    }
    if (description.length < 80) {
      throw new ConvexError(
        "Describe the context and constraints in at least 80 characters.",
      );
    }
    if (!domain) throw new ConvexError("Choose a domain.");
    if (skills.length === 0) throw new ConvexError("Add at least one skill.");
    if (args.deadline < Date.now() + 24 * 60 * 60 * 1000) {
      throw new ConvexError("Pick a deadline at least one day from now.");
    }
    if (args.solutionCap < 1 || args.solutionCap > 50) {
      throw new ConvexError("The solution cap must be between 1 and 50.");
    }
    if (args.phases.length === 0 || args.phases.length > 6) {
      throw new ConvexError("Add between one and six phases.");
    }

    const phases = args.phases.map((phase, index) => {
      const phaseTitle = phase.title.trim();
      if (phaseTitle.length < 3) {
        throw new ConvexError(`Phase ${index + 1} needs a title.`);
      }
      return {
        title: phaseTitle,
        description: phase.description.trim().slice(0, 1200),
        evaluationCriteria: phase.evaluationCriteria
          .map((criterion) => criterion.trim())
          .filter(Boolean)
          .slice(0, 8),
        skills: Array.from(
          new Set(phase.skills.map((skill) => skill.trim()).filter(Boolean)),
        ).slice(0, 8),
        durationWeeks: Math.min(12, Math.max(1, Math.round(phase.durationWeeks))),
      };
    });

    const problemId = await ctx.db.insert("problems", {
      orgId: user._id,
      orgName: profile.companyName,
      orgIndustry: profile.industry,
      orgVerified: profile.verified,
      title,
      summary: summary.slice(0, 240),
      description: description.slice(0, 6000),
      domain,
      skills: skills.slice(0, 12),
      difficulty: args.difficulty,
      deadline: args.deadline,
      state: args.publish ? "published" : "draft",
      solutionCap: args.solutionCap,
      solutionCount: 0,
      isMultiPhase: phases.length > 1,
    });

    for (const [index, phase] of phases.entries()) {
      await ctx.db.insert("phases", {
        problemId,
        order: index + 1,
        ...phase,
      });
    }

    return { problemId };
  },
});

export const updateState = mutation({
  args: {
    problemId: v.id("problems"),
    action: v.union(v.literal("publish"), v.literal("close"), v.literal("reopen")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new ConvexError("That problem no longer exists.");
    if (problem.orgId !== user._id) {
      throw new ConvexError("You can only manage your own problems.");
    }

    if (args.action === "publish") {
      if (problem.state !== "draft") {
        throw new ConvexError("Only drafts can be published.");
      }
      const phaseCount = (
        await ctx.db
          .query("phases")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect()
      ).length;
      if (phaseCount === 0) throw new ConvexError("Add at least one phase first.");
      await ctx.db.patch(problem._id, { state: "published" });
      return { ok: true };
    }

    if (args.action === "close") {
      await ctx.db.patch(problem._id, {
        state: "closed",
        closedReason: "manual",
      });
      return { ok: true };
    }

    if (problem.deadline < Date.now()) {
      throw new ConvexError("The deadline has passed — extend it before reopening.");
    }
    if (problem.solutionCount >= problem.solutionCap) {
      throw new ConvexError(
        "This brief reached its solution cap, so it cannot be reopened.",
      );
    }
    await ctx.db.patch(problem._id, {
      state: "published",
      closedReason: undefined,
    });
    return { ok: true };
  },
});

export const orgProblems = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireOrganization(ctx);
    const problems = (
      await ctx.db
        .query("problems")
        .withIndex("by_org", (q) => q.eq("orgId", user._id))
        .collect()
    ).sort((a, b) => b._creationTime - a._creationTime);

    return await Promise.all(
      problems.map(async (problem) => {
        const phases = await ctx.db
          .query("phases")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        const shortlisted = await ctx.db
          .query("shortlists")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        return {
          ...problem,
          phaseCount: phases.length,
          submissionCount: submissions.length,
          shortlistCount: shortlisted.length,
        };
      }),
    );
  },
});

export const orgOverview = query({
  args: {},
  handler: async (ctx) => {
    const { user, profile } = await requireOrganization(ctx);
    const problems = (
      await ctx.db
        .query("problems")
        .withIndex("by_org", (q) => q.eq("orgId", user._id))
        .collect()
    ).sort((a, b) => b._creationTime - a._creationTime);

    const byProblem = await Promise.all(
      problems.map(async (problem) => {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();
        const latestByAssignment = new Map<string, (typeof submissions)[number]>();
        for (const submission of submissions) {
          const key = `${submission.assignmentId}:${submission.phaseId ?? "main"}`;
          const previous = latestByAssignment.get(key);
          if (!previous || submission.version > previous.version) {
            latestByAssignment.set(key, submission);
          }
        }
        const latest = Array.from(latestByAssignment.values());
        const scores = (
          await Promise.all(
            latest.map((submission) =>
              ctx.db
                .query("aiAnalyses")
                .withIndex("by_submission", (q) =>
                  q.eq("submissionId", submission._id),
                )
                .first(),
            ),
          )
        ).filter((analysis) => analysis !== null);

        return {
          problem,
          submissionCount: submissions.length,
          latestCount: latest.length,
          averageScore:
            scores.length === 0
              ? null
              : Math.round(
                  scores.reduce((sum, item) => sum + item.alignmentScore, 0) /
                    scores.length,
                ),
        };
      }),
    );

    const shortlisted = await ctx.db
      .query("shortlists")
      .withIndex("by_org", (q) => q.eq("orgId", user._id))
      .collect();
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_org", (q) => q.eq("orgId", user._id))
      .collect();

    const recentSubmissions = await Promise.all(
      (
        await Promise.all(
          problems.map(async (problem) =>
            (
              await ctx.db
                .query("submissions")
                .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
                .collect()
            ).map((submission) => ({ submission, problem })),
          ),
        )
      )
        .flat()
        .sort((a, b) => b.submission.createdAt - a.submission.createdAt)
        .slice(0, 5)
        .map(async ({ submission, problem }) => {
          const student = await ctx.db
            .query("studentProfiles")
            .withIndex("by_user", (q) => q.eq("userId", submission.submitterId))
            .first();
          const analysis = await ctx.db
            .query("aiAnalyses")
            .withIndex("by_submission", (q) =>
              q.eq("submissionId", submission._id),
            )
            .first();
          return {
            submissionId: submission._id,
            problemId: problem._id,
            problemTitle: problem.title,
            studentName: student?.fullName ?? "Student",
            version: submission.version,
            createdAt: submission.createdAt,
            alignmentScore: analysis?.alignmentScore ?? null,
          };
        }),
    );

    const averageScoreValues = byProblem
      .map((item) => item.averageScore)
      .filter((score): score is number => score !== null);

    return {
      profile,
      stats: {
        published: problems.filter((p) => p.state === "published").length,
        drafts: problems.filter((p) => p.state === "draft").length,
        submissions: byProblem.reduce((sum, item) => sum + item.submissionCount, 0),
        shortlisted: shortlisted.length,
        opportunities: opportunities.length,
        accepted: opportunities.filter((o) => o.status === "accepted").length,
        averageScore:
          averageScoreValues.length === 0
            ? null
            : Math.round(
                averageScoreValues.reduce((sum, score) => sum + score, 0) /
                  averageScoreValues.length,
              ),
      },
      chart: byProblem
        .slice()
        .reverse()
        .map((item) => ({
          name:
            item.problem.title.length > 22
              ? `${item.problem.title.slice(0, 21)}…`
              : item.problem.title,
          submissions: item.submissionCount,
          shortlisted: 0,
        })),
      recentSubmissions,
      problems: byProblem.map((item) => ({
        ...item.problem,
        submissionCount: item.submissionCount,
        averageScore: item.averageScore,
      })),
    };
  },
});
