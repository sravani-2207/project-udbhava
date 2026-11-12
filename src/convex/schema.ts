import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

/**
 * Udbhava data model.
 *
 * Version 1 covers the student + organization experience. Admin-only tables
 * (audit logs, platform settings) are intentionally omitted in this scope.
 */

export const USER_ROLES = {
  STUDENT: "student",
  ORGANIZATION: "organization",
  ADMIN: "admin",
} as const;

export const userRoleValidator = v.union(
  v.literal("student"),
  v.literal("organization"),
  v.literal("admin"),
);
export type UserRole = Infer<typeof userRoleValidator>;

export const profileRoleValidator = v.union(
  v.literal("student"),
  v.literal("organization"),
);

export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
);

export const difficultyValidator = v.union(
  v.literal("starter"),
  v.literal("intermediate"),
  v.literal("advanced"),
);
export type Difficulty = Infer<typeof difficultyValidator>;

export const problemStateValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("closed"),
);
export type ProblemState = Infer<typeof problemStateValidator>;

export const closedReasonValidator = v.union(
  v.literal("manual"),
  v.literal("cap"),
  v.literal("deadline"),
);

export const assignmentModeValidator = v.union(
  v.literal("solo"),
  v.literal("team"),
);
export type AssignmentMode = Infer<typeof assignmentModeValidator>;

export const teamMemberStatusValidator = v.union(
  v.literal("invited"),
  v.literal("joined"),
);

export const opportunityTypeValidator = v.union(
  v.literal("internship"),
  v.literal("job"),
  v.literal("project"),
);
export type OpportunityType = Infer<typeof opportunityTypeValidator>;

export const opportunityStatusValidator = v.union(
  v.literal("sent"),
  v.literal("accepted"),
  v.literal("declined"),
);

export const fileValidator = v.object({
  name: v.string(),
  storageId: v.id("_storage"),
  size: v.optional(v.number()),
});

export const linkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

export const showcaseItemValidator = v.object({
  title: v.string(),
  description: v.string(),
  link: v.optional(v.string()),
});

export const notificationTypeValidator = v.union(
  v.literal("team_invite"),
  v.literal("feedback_ready"),
  v.literal("shortlisted"),
  v.literal("offer"),
  v.literal("submission"),
  v.literal("comment"),
  v.literal("system"),
);
export type NotificationType = Infer<typeof notificationTypeValidator>;

const schema = defineSchema(
  {
    // Default Convex Auth tables.
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),

      role: v.optional(userRoleValidator),
      status: v.optional(accountStatusValidator),
      demo: v.optional(v.boolean()),
    }).index("email", ["email"]),

    studentProfiles: defineTable({
      userId: v.id("users"),
      fullName: v.string(),
      headline: v.string(),
      university: v.string(),
      year: v.string(),
      bio: v.string(),
      skills: v.array(v.string()),
      interests: v.array(v.string()),
      domains: v.array(v.string()),
      availability: v.string(),
      links: v.array(linkValidator),
      showcase: v.array(showcaseItemValidator),
    })
      .index("by_user", ["userId"])
      .index("by_university", ["university"]),

    organizationProfiles: defineTable({
      userId: v.id("users"),
      companyName: v.string(),
      contactName: v.string(),
      website: v.optional(v.string()),
      industry: v.string(),
      companySize: v.string(),
      location: v.string(),
      about: v.string(),
      verified: v.boolean(),
    }).index("by_user", ["userId"]),

    problems: defineTable({
      orgId: v.id("users"),
      orgName: v.string(),
      orgIndustry: v.string(),
      orgVerified: v.boolean(),
      title: v.string(),
      summary: v.string(),
      description: v.string(),
      domain: v.string(),
      skills: v.array(v.string()),
      difficulty: difficultyValidator,
      deadline: v.number(),
      state: problemStateValidator,
      closedReason: v.optional(closedReasonValidator),
      solutionCap: v.number(),
      solutionCount: v.number(),
      isMultiPhase: v.boolean(),
      /** Stable key used only by the demo seed so demos are idempotent. */
      demoKey: v.optional(v.string()),
    })
      .index("by_org", ["orgId"])
      .index("by_state", ["state"])
      .index("by_state_and_deadline", ["state", "deadline"])
      .index("by_demo_key", ["demoKey"]),

    phases: defineTable({
      problemId: v.id("problems"),
      order: v.number(),
      title: v.string(),
      description: v.string(),
      evaluationCriteria: v.array(v.string()),
      skills: v.array(v.string()),
      durationWeeks: v.number(),
    }).index("by_problem", ["problemId"]),

    teams: defineTable({
      problemId: v.id("problems"),
      name: v.string(),
      createdBy: v.id("users"),
      leadId: v.id("users"),
    })
      .index("by_problem", ["problemId"])
      .index("by_lead", ["leadId"]),

    teamMembers: defineTable({
      teamId: v.id("teams"),
      problemId: v.id("problems"),
      userId: v.optional(v.id("users")),
      invitedEmail: v.optional(v.string()),
      name: v.string(),
      role: v.union(v.literal("lead"), v.literal("member")),
      status: teamMemberStatusValidator,
    })
      .index("by_team", ["teamId"])
      .index("by_student", ["userId"])
      .index("by_problem_and_user", ["problemId", "userId"])
      .index("by_email", ["invitedEmail"]),

    assignments: defineTable({
      problemId: v.id("problems"),
      studentId: v.id("users"),
      mode: assignmentModeValidator,
      teamId: v.optional(v.id("teams")),
      phaseId: v.optional(v.id("phases")),
      status: v.union(v.literal("active"), v.literal("completed")),
      createdAt: v.number(),
    })
      .index("by_problem", ["problemId"])
      .index("by_student", ["studentId"])
      .index("by_problem_and_student", ["problemId", "studentId"])
      .index("by_team", ["teamId"]),

    submissions: defineTable({
      problemId: v.id("problems"),
      assignmentId: v.id("assignments"),
      phaseId: v.optional(v.id("phases")),
      submitterId: v.id("users"),
      version: v.number(),
      title: v.string(),
      approach: v.string(),
      repoUrl: v.optional(v.string()),
      links: v.array(linkValidator),
      files: v.array(fileValidator),
      createdAt: v.number(),
    })
      .index("by_assignment", ["assignmentId"])
      .index("by_assignment_and_phase", ["assignmentId", "phaseId"])
      .index("by_problem", ["problemId"])
      .index("by_submitter", ["submitterId"]),

    aiAnalyses: defineTable({
      submissionId: v.id("submissions"),
      problemId: v.id("problems"),
      alignmentScore: v.number(),
      summary: v.string(),
      strengths: v.array(v.string()),
      weaknesses: v.array(v.string()),
      recommendations: v.array(v.string()),
      criteriaCoverage: v.array(
        v.object({
          criterion: v.string(),
          covered: v.boolean(),
        }),
      ),
      model: v.string(),
      createdAt: v.number(),
    })
      .index("by_submission", ["submissionId"])
      .index("by_problem", ["problemId"]),

    shortlists: defineTable({
      problemId: v.id("problems"),
      submissionId: v.id("submissions"),
      orgId: v.id("users"),
      studentId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_problem", ["problemId"])
      .index("by_submission", ["submissionId"])
      .index("by_org", ["orgId"]),

    reviews: defineTable({
      submissionId: v.id("submissions"),
      problemId: v.id("problems"),
      orgId: v.id("users"),
      comment: v.string(),
      createdAt: v.number(),
    })
      .index("by_submission", ["submissionId"])
      .index("by_problem", ["problemId"]),

    opportunities: defineTable({
      orgId: v.id("users"),
      orgName: v.string(),
      studentId: v.id("users"),
      problemId: v.optional(v.id("problems")),
      type: opportunityTypeValidator,
      title: v.string(),
      message: v.string(),
      status: opportunityStatusValidator,
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_org", ["orgId"])
      .index("by_problem", ["problemId"]),

    notifications: defineTable({
      userId: v.id("users"),
      type: notificationTypeValidator,
      title: v.string(),
      body: v.string(),
      link: v.optional(v.string()),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_read", ["userId", "read"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
