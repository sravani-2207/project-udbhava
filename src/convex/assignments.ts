import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireStudent } from "./lib/authz";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  notification: {
    type: "team_invite" | "system";
    title: string;
    body: string;
    link?: string;
  },
) {
  await ctx.db.insert("notifications", {
    userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: false,
    createdAt: Date.now(),
  });
}

/**
 * Take up a problem. The solution cap is enforced in this single Convex
 * mutation: the increment and the auto-close happen in one serializable
 * transaction, so two students cannot claim the 50th slot twice.
 */
export const takeUp = mutation({
  args: {
    problemId: v.id("problems"),
    mode: v.union(v.literal("solo"), v.literal("team")),
    phaseId: v.optional(v.id("phases")),
    teamName: v.optional(v.string()),
    inviteEmails: v.optional(v.array(v.string())),
    leadEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireStudent(ctx);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new ConvexError("That problem no longer exists.");
    if (problem.state === "draft") {
      throw new ConvexError("This problem is not open yet.");
    }
    if (problem.state === "closed" || problem.closedReason === "cap") {
      throw new ConvexError("Submissions are full for this problem.");
    }
    if (problem.deadline < Date.now()) {
      throw new ConvexError("The deadline has passed for this problem.");
    }
    if (problem.solutionCount >= problem.solutionCap) {
      throw new ConvexError("Submissions are full for this problem.");
    }

    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_problem_and_student", (q) =>
        q.eq("problemId", problem._id).eq("studentId", user._id),
      )
      .first();
    if (existing) {
      throw new ConvexError("You have already taken up this problem.");
    }
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_problem_and_user", (q) =>
        q.eq("problemId", problem._id).eq("userId", user._id),
      )
      .first();
    if (existingMembership) {
      throw new ConvexError("You are already on a team for this problem.");
    }

    const phases = (
      await ctx.db
        .query("phases")
        .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
        .collect()
    ).sort((a, b) => a.order - b.order);
    if (phases.length === 0) {
      throw new ConvexError("This problem has no phases defined yet.");
    }

    let phaseId: Id<"phases">;
    if (phases.length === 1) {
      phaseId = phases[0]._id;
    } else {
      if (!args.phaseId) {
        throw new ConvexError("Choose the phase that matches your expertise.");
      }
      const phase = phases.find((item) => item._id === args.phaseId);
      if (!phase) {
        throw new ConvexError("That phase does not belong to this problem.");
      }
      phaseId = phase._id;
    }

    let teamId: Id<"teams"> | undefined;
    if (args.mode === "team") {
      const teamName = (args.teamName ?? "").trim();
      if (teamName.length < 2) {
        throw new ConvexError("Give your team a name.");
      }
      const emails = Array.from(
        new Set(
          (args.inviteEmails ?? [])
            .map(normalizeEmail)
            .filter((email) => email.length > 0 && email !== normalizeEmail(user.email ?? "")),
        ),
      );
      if (emails.length > 4) {
        throw new ConvexError("A team can invite up to four teammates.");
      }
      if (emails.some((email) => !isEmail(email))) {
        throw new ConvexError("One of the teammate emails looks invalid.");
      }

      const resolved = await Promise.all(
        emails.map(async (email) => {
          const invitedUser = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", email))
            .first();
          const invitedProfile = invitedUser
            ? await ctx.db
                .query("studentProfiles")
                .withIndex("by_user", (q) => q.eq("userId", invitedUser._id))
                .first()
            : null;
          return { email, invitedUser, invitedProfile };
        }),
      );

      const leadCandidate = args.leadEmail
        ? resolved.find(
            (item) =>
              normalizeEmail(item.email) === normalizeEmail(args.leadEmail ?? ""),
          )
        : undefined;

      teamId = await ctx.db.insert("teams", {
        problemId: problem._id,
        name: teamName.slice(0, 60),
        createdBy: user._id,
        leadId: leadCandidate?.invitedUser?._id ?? user._id,
      });

      await ctx.db.insert("teamMembers", {
        teamId,
        problemId: problem._id,
        userId: user._id,
        name: profile.fullName,
        role: leadCandidate?.invitedUser ? "member" : "lead",
        status: "joined",
      });

      for (const item of resolved) {
        if (item.invitedUser) {
          await ctx.db.insert("teamMembers", {
            teamId,
            problemId: problem._id,
            userId: item.invitedUser._id,
            name: item.invitedProfile?.fullName ?? item.invitedUser.name ?? "Teammate",
            role:
              item.invitedUser._id === (leadCandidate?.invitedUser?._id ?? "")
                ? "lead"
                : "member",
            status: "joined",
          });
          await notify(ctx, item.invitedUser._id, {
            type: "team_invite",
            title: "You were added to a team",
            body: `${profile.fullName} added you to ${teamName} for “${problem.title}”.`,
            link: "/student/work",
          });
        } else {
          await ctx.db.insert("teamMembers", {
            teamId,
            problemId: problem._id,
            invitedEmail: item.email,
            name: item.email.split("@")[0],
            role: "member",
            status: "invited",
          });
        }
      }
    }

    const nextCount = problem.solutionCount + 1;
    const reachedCap = nextCount >= problem.solutionCap;
    await ctx.db.patch(problem._id, {
      solutionCount: nextCount,
      state: reachedCap ? "closed" : "published",
      closedReason: reachedCap ? "cap" : undefined,
    });

    const assignmentId = await ctx.db.insert("assignments", {
      problemId: problem._id,
      studentId: user._id,
      mode: args.mode,
      teamId,
      phaseId,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "system",
      title: `You're on “${problem.title}”`,
      body:
        args.mode === "team"
          ? `Team created. Only the team lead can submit; the ${args.mode} choice is locked in.`
          : `Solo mode is locked in. Submit your ${phases.find((phase) => phase._id === phaseId)?.title ?? "phase"} solution before the deadline.`,
      link: "/student/work",
      read: false,
      createdAt: Date.now(),
    });

    return { assignmentId, reachedCap };
  },
});

/** My Work: assignments the student owns or is a team member of. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireStudent(ctx);

    const ownAssignments = await ctx.db
      .query("assignments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_student", (q) => q.eq("userId", user._id))
      .collect();
    const teamIds = Array.from(new Set(memberships.map((m) => m.teamId)));

    const teamAssignments: Doc<"assignments">[] = [];
    for (const teamId of teamIds) {
      const assignment = await ctx.db
        .query("assignments")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .first();
      if (assignment) teamAssignments.push(assignment);
    }

    const unique = new Map<string, Doc<"assignments">>();
    for (const assignment of [...ownAssignments, ...teamAssignments]) {
      unique.set(assignment._id, assignment);
    }

    const items = await Promise.all(
      Array.from(unique.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (assignment) => {
          const problem = await ctx.db.get(assignment.problemId);
          if (!problem) return null;
          const phase = assignment.phaseId
            ? await ctx.db.get(assignment.phaseId)
            : null;
          const team = assignment.teamId
            ? await ctx.db.get(assignment.teamId)
            : null;
          const members = team
            ? await ctx.db
                .query("teamMembers")
                .withIndex("by_team", (q) => q.eq("teamId", team._id))
                .collect()
            : [];
          const submissions = (
            await ctx.db
              .query("submissions")
              .withIndex("by_assignment", (q) =>
                q.eq("assignmentId", assignment._id),
              )
              .collect()
          ).sort((a, b) => b.version - a.version);
          const latest = submissions[0] ?? null;
          const analysis = latest
            ? await ctx.db
                .query("aiAnalyses")
                .withIndex("by_submission", (q) =>
                  q.eq("submissionId", latest._id),
                )
                .first()
            : null;
          const shortlist = latest
            ? await ctx.db
                .query("shortlists")
                .withIndex("by_submission", (q) =>
                  q.eq("submissionId", latest._id),
                )
                .first()
            : null;

          const isOwner = assignment.studentId === user._id;
          const isLead = team ? team.leadId === user._id : isOwner;

          return {
            assignment,
            problem,
            phase,
            team,
            members,
            submissionCount: submissions.length,
            latestVersion: latest?.version ?? null,
            latestSubmittedAt: latest?.createdAt ?? null,
            alignmentScore: analysis?.alignmentScore ?? null,
            shortlisted: shortlist !== null,
            isOwner,
            isLead,
            canSubmit:
              isLead &&
              problem.state === "published" &&
              problem.deadline > Date.now(),
          };
        }),
    );

    return items.filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

export const detail = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const { user } = await requireStudent(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new ConvexError("That assignment no longer exists.");

    const team = assignment.teamId ? await ctx.db.get(assignment.teamId) : null;
    const members = team
      ? await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect()
      : [];
    const isOwner = assignment.studentId === user._id;
    const isMember = members.some((member) => member.userId === user._id);
    if (!isOwner && !isMember) {
      throw new ConvexError("You don't have access to this assignment.");
    }

    const problem = await ctx.db.get(assignment.problemId);
    if (!problem) throw new ConvexError("The problem no longer exists.");
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
    const selectedPhase = assignment.phaseId
      ? await ctx.db.get(assignment.phaseId)
      : null;

    const submissionDocs = (
      await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect()
    ).sort((a, b) => b.version - a.version);

    const submissions = await Promise.all(
      submissionDocs.map(async (submission) => {
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
        return {
          ...submission,
          files: await Promise.all(
            submission.files.map(async (file) => ({
              ...file,
              url: await ctx.storage.getUrl(file.storageId),
            })),
          ),
          analysis,
          comments,
        };
      }),
    );

    const shortlist = submissions[0]
      ? await ctx.db
          .query("shortlists")
          .withIndex("by_submission", (q) =>
            q.eq("submissionId", submissions[0]._id),
          )
          .first()
      : null;

    const isLead = team ? team.leadId === user._id : isOwner;

    return {
      assignment,
      problem,
      organization: org,
      phases,
      selectedPhase,
      team,
      members,
      submissions,
      isOwner,
      isLead,
      shortlisted: shortlist !== null,
      deadlinePassed: problem.deadline < Date.now(),
      canSubmit:
        isLead && problem.state === "published" && problem.deadline > Date.now(),
    };
  },
});

export const inviteTeammate = mutation({
  args: {
    assignmentId: v.id("assignments"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireStudent(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new ConvexError("That assignment no longer exists.");
    if (!assignment.teamId) {
      throw new ConvexError("Solo assignments cannot invite teammates.");
    }
    const team = await ctx.db.get(assignment.teamId);
    if (!team) throw new ConvexError("That team no longer exists.");
    if (team.leadId !== user._id && assignment.studentId !== user._id) {
      throw new ConvexError("Only the team lead can invite teammates.");
    }

    const existingMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    if (existingMembers.length >= 5) {
      throw new ConvexError("A team can have up to five members.");
    }
    const email = normalizeEmail(args.email);
    if (!isEmail(email)) throw new ConvexError("Enter a valid email address.");
    if (existingMembers.some((member) => member.invitedEmail === email)) {
      throw new ConvexError("That person is already on this team.");
    }
    if (normalizeEmail(user.email ?? "") === email) {
      throw new ConvexError("You're already on this team.");
    }

    const invitedUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    const invitedProfile = invitedUser
      ? await ctx.db
          .query("studentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", invitedUser._id))
          .first()
      : null;

    await ctx.db.insert("teamMembers", {
      teamId: team._id,
      problemId: team.problemId,
      userId: invitedUser?._id,
      invitedEmail: invitedUser ? undefined : email,
      name: invitedProfile?.fullName ?? invitedUser?.name ?? email.split("@")[0],
      role: "member",
      status: invitedUser ? "joined" : "invited",
    });

    if (invitedUser) {
      const problem = await ctx.db.get(assignment.problemId);
      await notify(ctx, invitedUser._id, {
        type: "team_invite",
        title: "You were added to a team",
        body: `${profile.fullName} added you to ${team.name} for “${problem?.title ?? "a problem"}”.`,
        link: "/student/work",
      });
    }

    return { ok: true, foundAccount: invitedUser !== null };
  },
});

export const setTeamLead = mutation({
  args: {
    assignmentId: v.id("assignments"),
    memberId: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireStudent(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment?.teamId) throw new ConvexError("This is a solo assignment.");
    const team = await ctx.db.get(assignment.teamId);
    if (!team) throw new ConvexError("That team no longer exists.");
    if (team.leadId !== user._id && assignment.studentId !== user._id) {
      throw new ConvexError("Only the team lead can change the lead.");
    }
    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== team._id || !member.userId) {
      throw new ConvexError("Choose a teammate who has joined.");
    }

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    for (const item of members) {
      const nextRole: "lead" | "member" =
        item.userId === member.userId ? "lead" : "member";
      if (item.role !== nextRole) {
        await ctx.db.patch(item._id, { role: nextRole });
      }
    }
    await ctx.db.patch(team._id, { leadId: member.userId });
    await ctx.db.insert("notifications", {
      userId: member.userId,
      type: "system",
      title: "You're now the team lead",
      body: `You can submit solutions for ${team.name}. The lead is the only member who can submit.`,
      link: "/student/work",
      read: false,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});
