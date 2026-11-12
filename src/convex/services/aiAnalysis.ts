/**
 * Isolated AI review stub.
 *
 * ---------------------------------------------------------------------------
 * There is deliberately NO third-party model or network call in this file.
 * `analyseSubmission` is a deterministic mock that produces the same structured
 * shape a real model would return, so the entire feedback UI (score, strengths,
 * weaknesses, recommendations, criteria coverage) is already wired end to end.
 *
 * To plug in a real model later:
 *   1. Turn this module into a Convex `"use node"` action that calls the model.
 *   2. Keep `AiAnalysisResult` exactly as it is (or add optional fields).
 *   3. Persist the result into `aiAnalyses` from an action, then refresh.
 * No UI change is required.
 * ---------------------------------------------------------------------------
 */

export type AiAnalysisInput = {
  problemTitle: string;
  domain: string;
  phaseTitle: string;
  evaluationCriteria: string[];
  approach: string;
  repoUrl: string | null;
  linkCount: number;
  fileCount: number;
  version: number;
};

export type AiAnalysisResult = {
  alignmentScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  criteriaCoverage: Array<{ criterion: string; covered: boolean }>;
  model: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "their",
  "have",
  "will",
  "must",
  "should",
  "which",
  "when",
  "where",
  "what",
  "than",
  "then",
  "them",
  "they",
  "each",
  "also",
  "been",
  "were",
  "are",
  "was",
  "our",
  "you",
]);

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Mock analysis. Score and copy are derived from the submission only, so the
 * same draft always receives the same feedback during a review session.
 */
export function analyseSubmission(input: AiAnalysisInput): AiAnalysisResult {
  const approach = input.approach.trim();
  const approachWords = approach.split(/\s+/).filter(Boolean);
  const lower = approach.toLowerCase();
  const criteria = unique(
    input.evaluationCriteria.length > 0
      ? input.evaluationCriteria
      : ["Problem understanding", "Practical feasibility", "Clarity of plan"],
  );

  const coverage = criteria.map((criterion) => {
    const keywords = words(criterion);
    const hits = keywords.filter((keyword) => lower.includes(keyword));
    return {
      criterion,
      covered: keywords.length === 0 ? true : hits.length / keywords.length >= 0.3,
    };
  });

  const coveredCount = coverage.filter((item) => item.covered).length;
  const coverageRatio = coverage.length === 0 ? 0.5 : coveredCount / coverage.length;

  let score = 46;
  score += Math.min(18, Math.round(approachWords.length / 22));
  score += Math.round(coverageRatio * 20);
  if (input.repoUrl) score += 8;
  score += Math.min(6, input.linkCount * 3);
  score += Math.min(4, input.fileCount * 2);
  if (/\b(metric|measure|kpi|success|impact|baseline)\b/.test(lower)) score += 3;
  if (/\b(test|pilot|validate|experiment|feedback)\b/.test(lower)) score += 2;
  if (approachWords.length < 60) score -= 8;
  const alignmentScore = clamp(score, 32, 96);

  const strengths: string[] = [];
  if (approachWords.length >= 120) {
    strengths.push(
      "The approach is developed in enough depth to see how the work would actually run, not just what it aims to achieve.",
    );
  } else if (approachWords.length >= 60) {
    strengths.push(
      "The submission explains a coherent direction and stays focused on the brief.",
    );
  } else {
    strengths.push(
      "The core idea is clear, which gives the organization an easy starting point for a conversation.",
    );
  }
  if (input.repoUrl) {
    strengths.push(
      "A working repository is attached, so the team can inspect the craft behind the proposal.",
    );
  }
  if (coverageRatio >= 0.66) {
    strengths.push(
      `The proposal speaks directly to ${coveredCount} of ${criteria.length} evaluation criteria, a strong match for the phase brief.`,
    );
  }
  if (input.linkCount > 0) {
    strengths.push(
      "Supporting references are included, which makes the thinking easier to review and challenge.",
    );
  }
  if (/\b(metric|measure|kpi|success|impact|baseline)\b/.test(lower)) {
    strengths.push(
      "Success is described in measurable terms, so progress can be judged later.",
    );
  }
  if (strengths.length < 2) {
    strengths.push(
      `The submission is grounded in the ${input.domain.toLowerCase()} context of the problem.`,
    );
  }

  const weaknesses: string[] = [];
  if (!input.repoUrl && input.fileCount === 0) {
    weaknesses.push(
      "No artifact — repository, file, or prototype — is attached, so the execution still relies on describing intent.",
    );
  }
  if (coverageRatio < 0.66) {
    const missing = coverage
      .filter((item) => !item.covered)
      .map((item) => item.criterion.toLowerCase());
    weaknesses.push(
      `The review criteria are only partly addressed${missing.length > 0 ? `, especially: ${missing.slice(0, 2).join(" and ")}` : ""}.`,
    );
  }
  if (approachWords.length < 120) {
    weaknesses.push(
      "The approach is concise to the point of skipping implementation detail: sequencing, owners, and trade-offs are thin.",
    );
  }
  if (!/\b(risk|constraint|assumption|trade-?off)\b/.test(lower)) {
    weaknesses.push(
      "Risks and assumptions are not named, which makes the plan harder to trust under real constraints.",
    );
  }
  if (!/\b(user|customer|student|patient|team|community)\b/.test(lower)) {
    weaknesses.push(
      "The people affected by the solution are not clearly described, so the value is hard to check.",
    );
  }
  if (weaknesses.length < 2) {
    weaknesses.push(
      "The next iteration should make the first 30 days more concrete so the organization can see what happens after hand-off.",
    );
  }

  const recommendations: string[] = [];
  if (!input.repoUrl && input.fileCount === 0) {
    recommendations.push(
      "Attach a lightweight prototype or repository link — even a clickable flow or a sample sheet is enough to make the proposal tangible.",
    );
  }
  const firstMissing = coverage.find((item) => !item.covered);
  if (firstMissing) {
    recommendations.push(
      `Add a short section that explicitly answers “${firstMissing.criterion}” with your current evidence and what you would still need to verify.`,
    );
  }
  if (approachWords.length < 120) {
    recommendations.push(
      "Expand the plan into three concrete steps with owners, effort estimates, and the decision you would make at each step.",
    );
  }
  recommendations.push(
    "Close with a compact pilot plan: one metric, one baseline, and a two-week checkpoint the organization can approve.",
  );
  if (input.version === 1) {
    recommendations.push(
      "Use the version history to answer the reviewers' concerns directly — a short “what changed” note is often the difference between shortlist and pass.",
    );
  }
  if (recommendations.length < 3) {
    recommendations.push(
      "Include one visual — a flow, before/after, or cost table — so the phase outcome can be understood at a glance.",
    );
  }

  const band =
    alignmentScore >= 80
      ? "A strong alignment with the phase brief"
      : alignmentScore >= 65
        ? "A promising alignment with the phase brief"
        : "A partial alignment with the phase brief";

  return {
    alignmentScore,
    summary: `${band}. This ${input.phaseTitle.toLowerCase()} submission for “${input.problemTitle}” covers ${coveredCount} of ${criteria.length} review criteria. ${
      input.repoUrl || input.fileCount > 0
        ? "The attached artifact gives reviewers something concrete to evaluate."
        : "The next improvement is turning the idea into something reviewers can inspect."
    }`,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 4),
    criteriaCoverage: coverage,
    model: "udbhava-review-stub-v1",
  };
}
