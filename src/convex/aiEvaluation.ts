import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { analyseSubmission } from "./services/aiAnalysis";

const resultValidator = {
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
};

export const saveAnalysis = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    problemId: v.id("problems"),
    analysis: v.object(resultValidator),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiAnalyses")
      .withIndex("by_submission", (q) =>
        q.eq("submissionId", args.submissionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.analysis,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("aiAnalyses", {
        submissionId: args.submissionId,
        problemId: args.problemId,
        ...args.analysis,
        createdAt: Date.now(),
      });
    }
  },
});

export const evaluateSubmission = internalAction({
  args: {
    submissionId: v.id("submissions"),
    problemId: v.id("problems"),
    problemTitle: v.string(),
    domain: v.string(),
    phaseTitle: v.string(),
    evaluationCriteria: v.array(v.string()),
    approach: v.string(),
    repoUrl: v.union(v.string(), v.null()),
    linkCount: v.number(),
    fileCount: v.number(),
    version: v.number(),
  },

  handler: async (ctx, args) => {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error("XAI_API_KEY is not configured in Convex.");
    }

    const fallback = analyseSubmission({
      problemTitle: args.problemTitle,
      domain: args.domain,
      phaseTitle: args.phaseTitle,
      evaluationCriteria: args.evaluationCriteria,
      approach: args.approach,
      repoUrl: args.repoUrl,
      linkCount: args.linkCount,
      fileCount: args.fileCount,
      version: args.version,
    });

    try {
      const response = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4.7",
          store: false,
          input: [
            {
              role: "system",
              content: `You are an expert solution evaluator for Udbhava, a student-to-organization innovation platform.

Evaluate submissions fairly and critically. Judge the actual quality of the proposed solution, not just its length or keywords.

Return ONLY valid JSON with this exact structure:
{
  "alignmentScore": 0,
  "summary": "A concise evaluation summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "criteriaCoverage": [
    { "criterion": "criterion name", "covered": true }
  ]
}

Rules:
- alignmentScore must be an integer from 0 to 100.
- Evaluate every provided criterion individually.
- Do not claim that a repository, file, prototype, or feature was inspected. Only metadata is provided.
- Do not invent evidence or implementation details.
- Give specific, actionable feedback.
- Keep strengths, weaknesses and recommendations concise.
- Be constructive, fair and realistic.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                problemTitle: args.problemTitle,
                domain: args.domain,
                phaseTitle: args.phaseTitle,
                evaluationCriteria: args.evaluationCriteria,
                proposedSolution: args.approach,
                repositoryProvided: Boolean(args.repoUrl),
                supportingLinksCount: args.linkCount,
                attachmentCount: args.fileCount,
                submissionVersion: args.version,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Grok API error (${response.status}): ${errorText.slice(0, 500)}`,
        );
      }

      const body = await response.json();

      let outputText = body.output_text as string | undefined;

      if (!outputText && Array.isArray(body.output)) {
        for (const item of body.output) {
          if (item.type === "message" && Array.isArray(item.content)) {
            const textPart = item.content.find(
              (part: { type?: string }) => part.type === "output_text",
            );

            if (textPart?.text) {
              outputText = textPart.text;
              break;
            }
          }
        }
      }

      if (!outputText) {
        throw new Error("Grok returned an empty evaluation.");
      }

      const jsonStart = outputText.indexOf("{");
      const jsonEnd = outputText.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd <= jsonStart) {
        throw new Error("Grok returned an invalid JSON evaluation.");
      }

      const parsed = JSON.parse(
        outputText.slice(jsonStart, jsonEnd + 1),
      );

      const validCriteria = args.evaluationCriteria.map((criterion) => {
        const match = Array.isArray(parsed.criteriaCoverage)
          ? parsed.criteriaCoverage.find(
              (item: { criterion?: string }) =>
                item.criterion?.toLowerCase() === criterion.toLowerCase(),
            )
          : undefined;

        return {
          criterion,
          covered: Boolean(match?.covered),
        };
      });

      const analysis = {
        alignmentScore: Math.max(
          0,
          Math.min(100, Math.round(Number(parsed.alignmentScore) || 0)),
        ),
        summary:
          typeof parsed.summary === "string"
            ? parsed.summary.slice(0, 2000)
            : fallback.summary,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((x: unknown) => typeof x === "string").slice(0, 4)
          : fallback.strengths,
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses.filter((x: unknown) => typeof x === "string").slice(0, 3)
          : fallback.weaknesses,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((x: unknown) => typeof x === "string").slice(0, 4)
          : fallback.recommendations,
        criteriaCoverage: validCriteria,
        model: "grok-4.7",
      };

      await ctx.runMutation(internal.aiEvaluation.saveAnalysis, {
        submissionId: args.submissionId,
        problemId: args.problemId,
        analysis,
      });

      return { success: true, model: "grok-4.7" };
    } catch (error) {
      console.error("Grok evaluation failed:", error);

      await ctx.runMutation(internal.aiEvaluation.saveAnalysis, {
        submissionId: args.submissionId,
        problemId: args.problemId,
        analysis: {
          ...fallback,
          model: "udbhava-review-fallback-v1",
        },
      });

      return { success: false, model: "udbhava-review-fallback-v1" };
    }
  },
});