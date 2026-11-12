import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrganization, requireStudent } from "./lib/authz";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireStudent(ctx);
    const opportunities = (
      await ctx.db
        .query("opportunities")
        .withIndex("by_student", (q) => q.eq("studentId", user._id))
        .collect()
    ).sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      opportunities.map(async (opportunity) => {
        const problem = opportunity.problemId
          ? await ctx.db.get(opportunity.problemId)
          : null;
        return { ...opportunity, problemTitle: problem?.title ?? null };
      }),
    );
  },
});

export const send = mutation({
  args: {
    studentId: v.id("users"),
    problemId: v.optional(v.id("problems")),
    type: v.union(v.literal("internship"), v.literal("job"), v.literal("project")),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireOrganization(ctx);
    const title = args.title.trim();
    const message = args.message.trim();
    if (title.length < 4) {
      throw new ConvexError("Give the opportunity a clear title.");
    }
    if (message.length < 20) {
      throw new ConvexError("Add a short note about why you're reaching out.");
    }

    const student = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .first();
    if (!student) throw new ConvexError("That student no longer exists.");

    if (args.problemId) {
      const problem = await ctx.db.get(args.problemId);
      if (!problem || problem.orgId !== user._id) {
        throw new ConvexError("You can only reference your own problems.");
      }
    }

    const opportunityId = await ctx.db.insert("opportunities", {
      orgId: user._id,
      orgName: profile.companyName,
      studentId: args.studentId,
      problemId: args.problemId,
      type: args.type,
      title: title.slice(0, 120),
      message: message.slice(0, 1500),
      status: "sent",
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: args.studentId,
      type: "offer",
      title: `New ${args.type} opportunity from ${profile.companyName}`,
      body: title,
      link: "/student/work",
      read: false,
      createdAt: Date.now(),
    });

    return { opportunityId };
  },
});

export const respond = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    action: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireStudent(ctx);
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new ConvexError("That opportunity no longer exists.");
    if (opportunity.studentId !== user._id) {
      throw new ConvexError("That opportunity belongs to another student.");
    }
    if (opportunity.status !== "sent") {
      throw new ConvexError("You already responded to this opportunity.");
    }

    await ctx.db.patch(opportunity._id, {
      status: args.action === "accept" ? "accepted" : "declined",
    });

    await ctx.db.insert("notifications", {
      userId: opportunity.orgId,
      type: "offer",
      title:
        args.action === "accept"
          ? "Your opportunity was accepted"
          : "Your opportunity was declined",
      body: `${user.name ?? "A student"} ${args.action === "accept" ? "accepted" : "declined"} “${opportunity.title}”.`,
      link: "/org",
      read: false,
      createdAt: Date.now(),
    });

    return { status: args.action === "accept" ? "accepted" : "declined" };
  },
});

export const sentByOrg = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireOrganization(ctx);
    const opportunities = (
      await ctx.db
        .query("opportunities")
        .withIndex("by_org", (q) => q.eq("orgId", user._id))
        .collect()
    ).sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      opportunities.map(async (opportunity) => {
        const student = await ctx.db
          .query("studentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", opportunity.studentId))
          .first();
        const problem = opportunity.problemId
          ? await ctx.db.get(opportunity.problemId)
          : null;
        return {
          ...opportunity,
          studentName: student?.fullName ?? "Student",
          studentHeadline: student?.headline ?? "",
          problemTitle: problem?.title ?? null,
        };
      }),
    );
  },
});
