import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { analyseSubmission } from "../services/aiAnalysis";
import type { Difficulty } from "../schema";

const DAY = 24 * 60 * 60 * 1000;

type PhaseSeed = {
  title: string;
  description: string;
  evaluationCriteria: string[];
  skills: string[];
  durationWeeks: number;
};

type ProblemSeed = {
  key: string;
  orgEmail: string;
  title: string;
  summary: string;
  description: string;
  domain: string;
  skills: string[];
  difficulty: Difficulty;
  deadlineInDays: number;
  solutionCap: number;
  solutionCount: number;
  state: "published" | "closed";
  closedReason?: "cap";
  phases: PhaseSeed[];
};

const ORGANIZATIONS = [
  {
    email: "priya@kettleandco.demo",
    companyName: "Kettle & Co.",
    contactName: "Priya Raghavan",
    website: "https://kettleandco.example.com",
    industry: "D2C kitchenware",
    companySize: "11–50 people",
    location: "Bengaluru",
    about:
      "We make small-batch kitchenware for Indian homes and ship 4,000 orders a month. Every box is packed by hand, and we care as much about the unboxing as the pan inside.",
    verified: true,
  },
  {
    email: "aditya@neelamhealth.demo",
    companyName: "Neelam Health",
    contactName: "Dr. Aditya Menon",
    website: "https://neelamhealth.example.com",
    industry: "Rural healthcare",
    companySize: "11–50 people",
    location: "Jaipur",
    about:
      "A telehealth service connecting ASHA workers and rural families with doctors. We serve 38 districts and measure success in consultations completed, not app downloads.",
    verified: true,
  },
  {
    email: "rhea@tenfoldstudio.demo",
    companyName: "Tenfold Studio",
    contactName: "Rhea Kulkarni",
    website: "https://tenfold.example.com",
    industry: "Design operations",
    companySize: "1–10 people",
    location: "Pune",
    about:
      "A five-person studio running brand and product sprints for early-stage founders. We build fast, hand over cleanly, and keep the process human.",
    verified: true,
  },
  {
    email: "karthik@loopwise.demo",
    companyName: "Loopwise",
    contactName: "Karthik Iyer",
    website: "https://loopwise.example.com",
    industry: "Circular packaging",
    companySize: "1–10 people",
    location: "Chennai",
    about:
      "We are proving that reusable food packaging can work in Indian cities. Currently running three pilots with cloud kitchens and one zero-waste store.",
    verified: true,
  },
];

const STUDENTS = [
  {
    email: "ananya.shah@udbhava.demo",
    fullName: "Ananya Shah",
    headline: "Product designer who likes messy service problems",
    university: "IIT Bombay",
    year: "Final year",
    bio: "I design for services where the real interface is a person with a clipboard. Currently exploring packaging and repair journeys.",
    skills: ["Figma", "Packaging Design", "Prototyping", "Storytelling"],
    interests: ["Sustainability", "D2C brands", "Craft"],
    domains: ["Brand & Packaging", "Product & Service Design"],
    availability: "12 hrs / week",
  },
  {
    email: "rohit.verma@udbhava.demo",
    fullName: "Rohit Verma",
    headline: "Frontend engineer shipping small, useful tools",
    university: "VIT Vellore",
    year: "Third year",
    bio: "I build React apps that people actually use, with a soft spot for offline-first and good empty states.",
    skills: ["React", "TypeScript", "Tailwind CSS", "Firebase", "Accessibility"],
    interests: ["Developer tools", "Fintech", "Gig work"],
    domains: ["Software", "Marketing"],
    availability: "15 hrs / week",
  },
  {
    email: "meera.nair@udbhava.demo",
    fullName: "Meera Nair",
    headline: "Design researcher focused on health and behaviour",
    university: "NID Ahmedabad",
    year: "Final year",
    bio: "I run small field studies and turn them into prototypes. I care about behaviour change that respects the user's time.",
    skills: [
      "User Research",
      "Journey Mapping",
      "Behavioural Design",
      "Figma",
      "Prototyping",
    ],
    interests: ["Public health", "ASHA workers", "Accessibility"],
    domains: ["Product & Service Design", "Sustainability"],
    availability: "10 hrs / week",
  },
  {
    email: "kabir.deshpande@udbhava.demo",
    fullName: "Kabir Deshpande",
    headline: "Economics student making sustainability add up",
    university: "BITS Pilani",
    year: "Third year",
    bio: "I build financial models for climate-positive businesses and explain them without jargon.",
    skills: [
      "Financial Modelling",
      "Spreadsheets",
      "Storytelling",
      "Sustainability",
      "Market Research",
    ],
    interests: ["Circular economy", "Climate finance", "Packaging"],
    domains: ["Sustainability", "Marketing"],
    availability: "8 hrs / week",
  },
];

const PROBLEMS: ProblemSeed[] = [
  {
    key: "kettle-unboxing",
    orgEmail: "priya@kettleandco.demo",
    title: "Design a subscription box unboxing that survives Indian courier routes",
    summary:
      "Our monthly bakeware box arrives dented in one out of nine deliveries. Redesign the packaging so the arrival feels as considered as the product.",
    description:
      "Kettle & Co. ships a monthly box with three bakeware pieces, a recipe card, and a small utensil. Courier partners handle it four to five times before it reaches a customer, and the current carton uses a single layer of recycled pulp.\n\nWe need a packaging concept that protects the product on real routes without becoming a landfill problem. You can use our packing room data, order a small set of material samples, and talk to two of our packers. The output should be a tested concept, not a moodboard.\n\nWhat you have: order volumes, damage data from the last 90 days, a ₹96 packaging budget per box, and photos of the current carton. What you don't have: a big budget for custom tooling.",
    domain: "Brand & Packaging",
    skills: ["Packaging Design", "Materials Research", "Prototyping", "Cost Analysis"],
    difficulty: "intermediate",
    deadlineInDays: 18,
    solutionCap: 50,
    solutionCount: 23,
    state: "published",
    phases: [
      {
        title: "Discovery & material shortlist",
        description:
          "Map the damage points in the current journey and shortlist three material systems that could survive it within the ₹96 budget.",
        evaluationCriteria: [
          "Understanding of courier constraints",
          "Material choices with cost ranges",
          "Clear assumptions and open questions",
        ],
        skills: ["Materials Research", "User Research"],
        durationWeeks: 2,
      },
      {
        title: "Prototype & courier test",
        description:
          "Build one physical prototype and run a drop test or a real courier loop. Document what failed, not just what worked.",
        evaluationCriteria: [
          "Test plan quality",
          "Evidence from a real drop or courier test",
          "Prototype photos or sketches",
        ],
        skills: ["Prototyping", "Packaging Design"],
        durationWeeks: 3,
      },
      {
        title: "Costed rollout plan",
        description:
          "Turn the tested concept into a plan Priya can approve: unit economics, supplier path, and a 90-day rollout.",
        evaluationCriteria: [
          "Unit economics",
          "Manufacturing feasibility",
          "90-day rollout plan",
        ],
        skills: ["Cost Analysis", "Storytelling"],
        durationWeeks: 2,
      },
    ],
  },
  {
    key: "neelam-no-shows",
    orgEmail: "aditya@neelamhealth.demo",
    title: "Reduce no-shows for rural telehealth consultations",
    summary:
      "One in three booked consultations never happens. Find out why and prototype an intervention that works for ASHA workers and families.",
    description:
      "Neelam Health books 1,800 consultations a month across 38 districts. Patients are usually introduced to the service by an ASHA worker, then connected to a doctor over a phone or a shared smartphone.\n\nNobody is malicious here. The no-shows come from a knot of small frictions: network windows, family schedules, unclear expectations, and reminders that arrive at the wrong time. We want a behavioural diagnosis and a low-cost intervention that can be tested in two blocks.\n\nYou will get access to de-identified no-show data, three recorded ASHA interviews, and a ₹40 per-booking intervention budget. Field visits can be arranged in Jaipur district.",
    domain: "Product & Service Design",
    skills: ["User Research", "Journey Mapping", "Behavioural Design", "WhatsApp"],
    difficulty: "advanced",
    deadlineInDays: 26,
    solutionCap: 50,
    solutionCount: 31,
    state: "published",
    phases: [
      {
        title: "Field research & no-show map",
        description:
          "Speak to ASHA workers and patients, then map the moments where a booking quietly dies.",
        evaluationCriteria: [
          "Interview quality",
          "Root-cause clarity",
          "Segment definition",
        ],
        skills: ["User Research", "Journey Mapping"],
        durationWeeks: 3,
      },
      {
        title: "Intervention prototype & pilot plan",
        description:
          "Prototype one intervention and define a two-block pilot with a measurable success signal.",
        evaluationCriteria: [
          "Behavioural mechanism",
          "Feasibility for ASHA workers",
          "Pilot measurement plan",
        ],
        skills: ["Behavioural Design", "WhatsApp", "Prototyping"],
        durationWeeks: 3,
      },
    ],
  },
  {
    key: "tenfold-client-portal",
    orgEmail: "rhea@tenfoldstudio.demo",
    title: "Build a lightweight client feedback portal",
    summary:
      "Our clients send feedback across WhatsApp, email, and PDFs. Build the smallest useful portal that pulls it into one calm place.",
    description:
      "Tenfold runs 4–6 design sprints at a time. Each client gives feedback in a different place, and our project leads spend hours copying comments into Notion.\n\nWe want a small internal-first portal where a client can open a share link, see the latest work, leave threaded comments with a status, and approve a milestone. No accounts for clients, no complex permissions. We will use it with real clients in the next sprint.\n\nThe repo and Firebase project are ready. You can choose the stack within reason. We care most about the review flow being obvious on a phone.",
    domain: "Software",
    skills: ["React", "TypeScript", "Firebase", "UX Writing"],
    difficulty: "intermediate",
    deadlineInDays: 12,
    solutionCap: 50,
    solutionCount: 41,
    state: "published",
    phases: [
      {
        title: "Working prototype",
        description:
          "Ship a working prototype with a share link, threaded comments, and one approval action.",
        evaluationCriteria: [
          "Usable core flow",
          "Code quality and accessibility",
          "Handling of real feedback cases",
        ],
        skills: ["React", "TypeScript", "Firebase"],
        durationWeeks: 4,
      },
    ],
  },
  {
    key: "loopwise-economics",
    orgEmail: "karthik@loopwise.demo",
    title: "Model the unit economics of a reusable packaging loop",
    summary:
      "Help us answer the question every partner asks: at what return rate does a reusable container beat a disposable one?",
    description:
      "Loopwise runs returnable packaging pilots with cloud kitchens. The operational model is simple: a container is delivered, collected on the next order, washed, and returned to service.\n\nWe have three months of pilot data and a spreadsheet that has outgrown its author. We need a clear model with assumptions a partner can challenge, plus a one-page story for a pitch.\n\nThis is a good fit if you like making financial models legible to people who don't build financial models.",
    domain: "Sustainability",
    skills: [
      "Financial Modelling",
      "Spreadsheets",
      "Sustainability",
      "Storytelling",
    ],
    difficulty: "starter",
    deadlineInDays: 33,
    solutionCap: 50,
    solutionCount: 12,
    state: "published",
    phases: [
      {
        title: "Unit economics model",
        description:
          "Build a model with a clear break-even return rate and sensitivity to wash cost, loss, and logistics.",
        evaluationCriteria: [
          "Assumption quality",
          "Model clarity",
          "Sensitivity analysis",
        ],
        skills: ["Financial Modelling", "Spreadsheets"],
        durationWeeks: 3,
      },
      {
        title: "Partner pitch",
        description:
          "Turn the model into a one-page commercial story and a clear next-step ask for a cloud kitchen.",
        evaluationCriteria: [
          "Commercial logic",
          "Visual storytelling",
          "Next-step ask",
        ],
        skills: ["Storytelling", "Sustainability"],
        durationWeeks: 2,
      },
    ],
  },
  {
    key: "kettle-copper-copy",
    orgEmail: "priya@kettleandco.demo",
    title: "Write product pages that convert for our new copper range",
    summary:
      "A six-page copper cookware range needs copy that explains the craft without sounding like every other D2C brand.",
    description:
      "Our copper range launches in six weeks. The product pages exist, but the copy reads like a manufacturer's spec sheet. We need warm, specific writing that helps a first-time buyer understand why copper behaves differently and what to expect in the first month of use.\n\nThis brief reached its 50-solution cap, which is why the board shows it as full. It is a useful example of how demand looks on Udbhava.",
    domain: "Marketing",
    skills: ["Copywriting", "E-commerce", "SEO"],
    difficulty: "starter",
    deadlineInDays: 9,
    solutionCap: 50,
    solutionCount: 50,
    state: "closed",
    closedReason: "cap",
    phases: [
      {
        title: "Page copy for the copper range",
        description:
          "Write the six product pages and one care guide, with a clear point of view.",
        evaluationCriteria: [
          "Voice and specificity",
          "Product clarity",
          "Conversion structure",
        ],
        skills: ["Copywriting", "SEO"],
        durationWeeks: 2,
      },
    ],
  },
  {
    key: "neelam-intake",
    orgEmail: "aditya@neelamhealth.demo",
    title: "Prototype a low-bandwidth intake form for ASHA workers",
    summary:
      "Our intake form drops data on patchy networks. Design a forgiving flow that works offline and respects a busy ASHA worker's hands.",
    description:
      "ASHA workers fill a 14-field intake form before every consultation. On a good network it takes four minutes. On a patchy one, it takes twelve and sometimes loses the last three fields.\n\nWe want a prototype of an offline-first intake flow with clear save states, Hindi-first copy, and a summary the ASHA worker can read back to the family. You can use our staging data and three recorded field sessions.",
    domain: "Software",
    skills: [
      "React Native",
      "Offline-first Design",
      "Accessibility",
      "Hindi UX",
    ],
    difficulty: "advanced",
    deadlineInDays: 40,
    solutionCap: 50,
    solutionCount: 7,
    state: "published",
    phases: [
      {
        title: "Offline architecture & flow",
        description:
          "Map the failure cases and design the save/resume model before writing UI code.",
        evaluationCriteria: [
          "Failure-case thinking",
          "Data integrity plan",
          "Flow clarity",
        ],
        skills: ["Offline-first Design", "React Native"],
        durationWeeks: 2,
      },
      {
        title: "Hindi-first prototype",
        description:
          "Prototype the full intake against three field scenarios, including a mid-form network drop.",
        evaluationCriteria: [
          "Accessibility",
          "Hindi UX quality",
          "Usability in field conditions",
        ],
        skills: ["Hindi UX", "Accessibility", "React Native"],
        durationWeeks: 3,
      },
      {
        title: "Field test notes",
        description:
          "Test with five ASHA workers and write the notes Neelam can act on.",
        evaluationCriteria: [
          "Test rigour",
          "Honest findings",
          "Prioritised fixes",
        ],
        skills: ["User Research", "Prototyping"],
        durationWeeks: 2,
      },
    ],
  },
];

function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: {
    type: "team_invite" | "feedback_ready" | "shortlisted" | "offer" | "submission" | "comment" | "system";
    title: string;
    body: string;
    link?: string;
  },
) {
  return ctx.db.insert("notifications", {
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false,
    createdAt: Date.now(),
  });
}

async function findUserByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
}

async function findProblemByKey(
  ctx: MutationCtx,
  key: string,
): Promise<Doc<"problems"> | null> {
  return await ctx.db
    .query("problems")
    .withIndex("by_demo_key", (q) => q.eq("demoKey", key))
    .first();
}

async function phasesFor(ctx: MutationCtx, problemId: Id<"problems">) {
  return (
    await ctx.db
      .query("phases")
      .withIndex("by_problem", (q) => q.eq("problemId", problemId))
      .collect()
  ).sort((a, b) => a.order - b.order);
}

export async function ensureSeed(ctx: MutationCtx): Promise<void> {
  if (await findUserByEmail(ctx, ORGANIZATIONS[0].email)) return;

  const orgUsers = new Map<string, Doc<"users">>();
  for (const org of ORGANIZATIONS) {
    const userId = await ctx.db.insert("users", {
      email: org.email,
      name: org.companyName,
      role: "organization",
      status: "active",
      demo: true,
    });
    await ctx.db.insert("organizationProfiles", {
      userId,
      companyName: org.companyName,
      contactName: org.contactName,
      website: org.website,
      industry: org.industry,
      companySize: org.companySize,
      location: org.location,
      about: org.about,
      verified: org.verified,
    });
    orgUsers.set(org.email, await ctx.db.get(userId) as Doc<"users">);
  }

  const studentUsers = new Map<string, Doc<"users">>();
  for (const student of STUDENTS) {
    const userId = await ctx.db.insert("users", {
      email: student.email,
      name: student.fullName,
      role: "student",
      status: "active",
      demo: true,
    });
    await ctx.db.insert("studentProfiles", {
      userId,
      fullName: student.fullName,
      headline: student.headline,
      university: student.university,
      year: student.year,
      bio: student.bio,
      skills: student.skills,
      interests: student.interests,
      domains: student.domains,
      availability: student.availability,
      links: [],
      showcase: [],
    });
    studentUsers.set(student.email, await ctx.db.get(userId) as Doc<"users">);
  }

  const problemDocs = new Map<string, Doc<"problems">>();
  for (const seed of PROBLEMS) {
    const org = orgUsers.get(seed.orgEmail);
    if (!org) continue;
    const orgProfile = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", org._id))
      .first();
    const problemId = await ctx.db.insert("problems", {
      orgId: org._id,
      orgName: orgProfile?.companyName ?? "Udbhava startup",
      orgIndustry: orgProfile?.industry ?? "Startup",
      orgVerified: orgProfile?.verified ?? false,
      title: seed.title,
      summary: seed.summary,
      description: seed.description,
      domain: seed.domain,
      skills: seed.skills,
      difficulty: seed.difficulty,
      deadline: Date.now() + seed.deadlineInDays * DAY,
      state: seed.state,
      closedReason: seed.closedReason,
      solutionCap: seed.solutionCap,
      solutionCount: seed.solutionCount,
      isMultiPhase: seed.phases.length > 1,
      demoKey: seed.key,
    });
    for (const [index, phase] of seed.phases.entries()) {
      await ctx.db.insert("phases", {
        problemId,
        order: index + 1,
        title: phase.title,
        description: phase.description,
        evaluationCriteria: phase.evaluationCriteria,
        skills: phase.skills,
        durationWeeks: phase.durationWeeks,
      });
    }
    problemDocs.set(seed.key, (await ctx.db.get(problemId)) as Doc<"problems">);
  }

  const seedSubmission = async (input: {
    email: string;
    problemKey: string;
    phaseIndex: number;
    title: string;
    approach: string;
    repoUrl?: string;
    links?: Array<{ label: string; url: string }>;
    versions?: number;
  }) => {
    const student = studentUsers.get(input.email);
    const problem = problemDocs.get(input.problemKey);
    if (!student || !problem) return null;
    const phases = await phasesFor(ctx, problem._id);
    const phase = phases[input.phaseIndex];
    if (!phase) return null;

    const assignmentId = await ctx.db.insert("assignments", {
      problemId: problem._id,
      studentId: student._id,
      mode: "solo",
      phaseId: phase._id,
      status: "active",
      createdAt: Date.now() - 5 * DAY,
    });

    let submissionId: Id<"submissions"> | null = null;
    const versions = input.versions ?? 1;
    for (let version = 1; version <= versions; version += 1) {
      const approach =
        version === 1
          ? input.approach
          : `${input.approach}\n\nUpdate after reviewer feedback: I tightened the pilot into a two-week window, named the metric we will watch, and added the assumptions that could make this fail.`;
      submissionId = await ctx.db.insert("submissions", {
        problemId: problem._id,
        assignmentId,
        phaseId: phase._id,
        submitterId: student._id,
        version,
        title: input.title,
        approach,
        repoUrl: input.repoUrl,
        links: input.links ?? [],
        files: [],
        createdAt: Date.now() - (5 - version) * DAY,
      });
      const analysis = analyseSubmission({
        problemTitle: problem.title,
        domain: problem.domain,
        phaseTitle: phase.title,
        evaluationCriteria: phase.evaluationCriteria,
        approach,
        repoUrl: input.repoUrl ?? null,
        linkCount: input.links?.length ?? 0,
        fileCount: 0,
        version,
      });
      await ctx.db.insert("aiAnalyses", {
        submissionId,
        problemId: problem._id,
        alignmentScore: analysis.alignmentScore,
        summary: analysis.summary,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        criteriaCoverage: analysis.criteriaCoverage,
        model: analysis.model,
        createdAt: Date.now(),
      });
    }
    return submissionId;
  };

  const meeraP2 = await seedSubmission({
    email: "meera.nair@udbhava.demo",
    problemKey: "neelam-no-shows",
    phaseIndex: 0,
    title: "The booking dies in the gap between the ASHA visit and the call",
    approach:
      "I mapped twelve recent no-shows with two ASHA workers in Jaipur. The most common failure was not network coverage; it was the gap between the house visit and the call. Families agreed to a time that collided with school pickup or field work, and the reminder arrived as an automated Hindi message the patient could not reply to.\n\nMy recommendation is a two-step reminder owned by the ASHA worker: a WhatsApp voice note the evening before, followed by a one-tap confirmation. If there is no confirmation by 10am, the ASHA worker calls. The pilot would run for two weeks across two blocks with the same doctors, comparing completed consultations against a matched control block. I would measure confirmation rate, completion rate, and the number of reminders per booking. The main risk is that ASHA workers already carry a heavy load, so the intervention has to take under 30 seconds of their time.",
    links: [
      { label: "No-show map", url: "https://example.com/neelam-no-show-map" },
    ],
    versions: 2,
  });

  const ananyaP1 = await seedSubmission({
    email: "ananya.shah@udbhava.demo",
    problemKey: "kettle-unboxing",
    phaseIndex: 0,
    title: "Three material systems that fit the ₹96 box",
    approach:
      "I started from the damage photos: the dent is almost always on the corner where the pan handle meets the carton wall. The current pulp tray only protects the base.\n\nI shortlisted three systems. First, a moulded pulp corner cradle with a kraft sleeve, estimated ₹78 per box at 5,000 units. Second, a die-cut honeycomb board insert with a recycled paper wrap, around ₹92 but lighter and easier to recycle. Third, a reusable cotton-padded bag inside a standard carton, ₹110 and only viable if we run a returnable loop. I would drop the third for this launch unless Priya wants to test a subscription tier.\n\nMy assumptions: 4–5 courier touchpoints, 4,000 monthly boxes, and no custom steel tooling. Before testing I would confirm the minimum order quantity for the honeycomb board and run a corner-drop test on the two cheapest options.",
    links: [
      { label: "Material comparison sheet", url: "https://example.com/kettle-materials" },
    ],
  });

  const rohitP3 = await seedSubmission({
    email: "rohit.verma@udbhava.demo",
    problemKey: "tenfold-client-portal",
    phaseIndex: 0,
    title: "A share-link review room in React and Firebase",
    approach:
      "The prototype has three screens: a client review room, a thread sheet, and a milestone approval state. A share link opens the room without an account. Comments are threaded one level deep and carry a status of open, addressed, or approved. Project leads see the same room with an internal note field that clients never see.\n\nThe core flow is built in React and TypeScript with Tailwind, and Firebase anonymous auth back the share links. Files are not uploaded; instead the room embeds a Figma link and a staging URL. I chose that deliberately for version one — the goal is to prove the review flow, not to build a file manager. I tested the flow on a 390px viewport with a long comment thread and fixed the sticky composer overlap. The next iteration would add email digests and a CSV export of open comments.",
    repoUrl: "https://github.com/example/tenfold-review-room",
    links: [{ label: "Live prototype", url: "https://example.com/tenfold-review" }],
    versions: 2,
  });

  const meeraP1b = await seedSubmission({
    email: "meera.nair@udbhava.demo",
    problemKey: "kettle-unboxing",
    phaseIndex: 1,
    title: "Corner cradle prototype: what survived the courier loop",
    approach:
      "I built two prototypes from the shortlist. Prototype A was a pulp corner cradle inside a kraft sleeve. Prototype B used honeycomb board corners with a paper wrap. I sent both through a real three-stop courier loop with a dummy load matched to the pan weight, then opened each box and photographed the result.\n\nPrototype B held its shape, but the wrap tore at the tape line. Prototype A protected the handle corner better and is easier to pack in the current process. Both survived a 1.2 metre drop on a corner. The honest limitation is sample size: I tested two boxes per design, so this is directional, not conclusive. For the rollout I would ask the packers to test ten boxes each over one week and track damage against the current baseline of one in nine.",
    links: [{ label: "Drop test notes", url: "https://example.com/kettle-drop-test" }],
    versions: 2,
  });

  const kabirP4 = await seedSubmission({
    email: "kabir.deshpande@udbhava.demo",
    problemKey: "loopwise-economics",
    phaseIndex: 0,
    title: "Break-even at 6.8 returns per container",
    approach:
      "I rebuilt the model around one question: how many times must a container return before it beats a disposable alternative? At a ₹140 container cost, ₹9 wash cost, and ₹22 reverse logistics per return, the break-even is 6.8 returns. The disposable equivalent costs ₹18 per order all-in.\n\nThe model is sensitive to loss and wash cost, not to fuel. A 10% monthly loss rate pushes break-even to 9.1 returns; a ₹6 wash cost brings it down to 5.4. I put these in a one-page sensitivity table with the assumptions a partner can challenge. The biggest open question is whether cloud kitchens can hold containers for a week without losing counter space. I have flagged that as a field assumption rather than hiding it in the spreadsheet.",
    links: [{ label: "Model and assumptions", url: "https://example.com/loopwise-model" }],
  });

  if (meeraP2) {
    await ctx.db.insert("shortlists", {
      problemId: problemDocs.get("neelam-no-shows")!._id,
      submissionId: meeraP2,
      orgId: orgUsers.get("aditya@neelamhealth.demo")!._id,
      studentId: studentUsers.get("meera.nair@udbhava.demo")!._id,
      createdAt: Date.now() - DAY,
    });
    await ctx.db.insert("reviews", {
      submissionId: meeraP2,
      problemId: problemDocs.get("neelam-no-shows")!._id,
      orgId: orgUsers.get("aditya@neelamhealth.demo")!._id,
      comment:
        "The distinction between network coverage and the scheduling gap is exactly the insight we were missing. Could you add what the ASHA worker's 30 seconds looks like in practice?",
      createdAt: Date.now() - DAY,
    });
  }
  if (rohitP3) {
    await ctx.db.insert("shortlists", {
      problemId: problemDocs.get("tenfold-client-portal")!._id,
      submissionId: rohitP3,
      orgId: orgUsers.get("rhea@tenfoldstudio.demo")!._id,
      studentId: studentUsers.get("rohit.verma@udbhava.demo")!._id,
      createdAt: Date.now() - 2 * DAY,
    });
  }

  void ananyaP1;
  void meeraP1b;
  void kabirP4;

  await ctx.db.insert("opportunities", {
    orgId: orgUsers.get("priya@kettleandco.demo")!._id,
    orgName: "Kettle & Co.",
    studentId: studentUsers.get("meera.nair@udbhava.demo")!._id,
    problemId: problemDocs.get("kettle-unboxing")!._id,
    type: "internship",
    title: "Packaging research internship · 3 months",
    message:
      "Your courier test notes were the most useful thing we've read on this brief. We'd like to bring you in for a paid three-month packaging research project, starting with ten boxes and our packers.",
    status: "sent",
    createdAt: Date.now() - DAY,
  });
  await ctx.db.insert("opportunities", {
    orgId: orgUsers.get("aditya@neelamhealth.demo")!._id,
    orgName: "Neelam Health",
    studentId: studentUsers.get("meera.nair@udbhava.demo")!._id,
    problemId: problemDocs.get("neelam-no-shows")!._id,
    type: "project",
    title: "Two-block reminder pilot · paid project",
    message:
      "We would like to run your two-step reminder in two blocks. Six weeks, paid, with our field team supporting the ASHA coordination.",
    status: "sent",
    createdAt: Date.now(),
  });
}

/** Student demo: a rich profile plus one live assignment with feedback. */
export async function startStudentDemo(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<{ role: "student" }> {
  await ensureSeed(ctx);

  const existingProfile = await ctx.db
    .query("studentProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!existingProfile) {
    await ctx.db.insert("studentProfiles", {
      userId: user._id,
      fullName: "Aanya Kapoor",
      headline: "Service designer who prototypes in the field",
      university: "Srishti Manipal",
      year: "Final year",
      bio: "I look for the small frictions that quietly kill a service, then build the smallest prototype that can test them. Lately that means health workers, WhatsApp, and very careful pilots.",
      skills: [
        "User Research",
        "Journey Mapping",
        "Behavioural Design",
        "Figma",
        "Prototyping",
      ],
      interests: ["Public health", "Accessibility", "ASHA workers"],
      domains: ["Product & Service Design", "Software"],
      availability: "12 hrs / week",
      links: [
        { label: "Portfolio", url: "https://example.com/aanya" },
        { label: "LinkedIn", url: "https://linkedin.com/in/example" },
      ],
      showcase: [
        {
          title: "Reminder study, 14 households",
          description:
            "A two-week diary study on why appointment reminders get ignored. Turned into a one-tap confirmation for a local clinic.",
          link: "https://example.com/aanya/reminders",
        },
        {
          title: "Offline intake, concept",
          description:
            "A tap-through of a form that survives a dropped network — built after sitting with two community health workers.",
          link: "https://example.com/aanya/offline-intake",
        },
      ],
    });
  }
  await ctx.db.patch(user._id, {
    role: "student",
    name: existingProfile?.fullName ?? "Aanya Kapoor",
    demo: true,
    status: "active",
  });

  const problem = await findProblemByKey(ctx, "neelam-no-shows");
  if (problem) {
    const phases = await phasesFor(ctx, problem._id);
    const phase = phases[1] ?? phases[0];
    const already = await ctx.db
      .query("assignments")
      .withIndex("by_problem_and_student", (q) =>
        q.eq("problemId", problem._id).eq("studentId", user._id),
      )
      .first();

    if (phase && !already) {
      await ctx.db.patch(problem._id, {
        solutionCount: problem.solutionCount + 1,
      });
      const assignmentId = await ctx.db.insert("assignments", {
        problemId: problem._id,
        studentId: user._id,
        mode: "solo",
        phaseId: phase._id,
        status: "active",
        createdAt: Date.now(),
      });
      await ctx.db.insert("submissions", {
        problemId: problem._id,
        assignmentId,
        phaseId: phase._id,
        submitterId: user._id,
        version: 1,
        title: "Voice-note reminder with a one-tap reply",
        approach:
          "The research points to the gap between the ASHA visit and the call, so I would prototype a reminder that lives where the family already is: WhatsApp. The ASHA worker records a 20-second voice note the evening before, naming the doctor and the time in the family's language. The message carries one button: “We'll be there” or “Call me”. If there is no reply by 10am, the ASHA worker makes a short call.\n\nThe behavioural mechanism is a concrete commitment made by the family, plus one familiar human voice instead of an automated text. It takes the ASHA worker under 30 seconds per booking. For the pilot, two blocks receive the intervention and two matched blocks remain on the current reminder. I would track confirmation rate, completed consultations, and the number of reminders per booking, with a baseline from the last four weeks. The main risk is voice-note fatigue, so the pilot caps reminders at two per booking. If confirmation does not lift within two weeks, I would test a family-nominated call window instead.",
        links: [
          {
            label: "Reminder flow",
            url: "https://example.com/aanya/neelam-reminder-flow",
          },
        ],
        files: [],
        createdAt: Date.now(),
      });

      const analysis = analyseSubmission({
        problemTitle: problem.title,
        domain: problem.domain,
        phaseTitle: phase.title,
        evaluationCriteria: phase.evaluationCriteria,
        approach:
          "The research points to the gap between the ASHA visit and the call, so I would prototype a reminder that lives where the family already is: WhatsApp. The ASHA worker records a 20-second voice note the evening before, naming the doctor and the time in the family's language. The message carries one button. The behavioural mechanism is a concrete commitment made by the family, plus one familiar human voice instead of an automated text. It takes the ASHA worker under 30 seconds per booking. For the pilot, two blocks receive the intervention and two matched blocks remain on the current reminder. I would track confirmation rate, completed consultations, and the number of reminders per booking, with a baseline from the last four weeks. The main risk is voice-note fatigue.",
        repoUrl: null,
        linkCount: 1,
        fileCount: 0,
        version: 1,
      });
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
        .first();
      if (submission) {
        await ctx.db.insert("aiAnalyses", {
          submissionId: submission._id,
          problemId: problem._id,
          alignmentScore: analysis.alignmentScore,
          summary: analysis.summary,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendations: analysis.recommendations,
          criteriaCoverage: analysis.criteriaCoverage,
          model: analysis.model,
          createdAt: Date.now(),
        });
      }

      await notify(ctx, user._id, {
        type: "feedback_ready",
        title: "Your first feedback is ready",
        body: `The review of your ${phase.title.toLowerCase()} submission is in. Open My Work to read it.`,
        link: "/student/work",
      });

      const kettle = await findUserByEmail(ctx, "priya@kettleandco.demo");
      if (kettle) {
        await ctx.db.insert("opportunities", {
          orgId: kettle._id,
          orgName: "Kettle & Co.",
          studentId: user._id,
          problemId: problem._id,
          type: "project",
          title: "Short discovery project · packaging",
          message:
            "We saw your health-service work and liked the way you frame field constraints. We have a small paid discovery project on our packaging journey — would you like the brief?",
          status: "sent",
          createdAt: Date.now(),
        });
        await notify(ctx, user._id, {
          type: "offer",
          title: "New project opportunity from Kettle & Co.",
          body: "Short discovery project · packaging",
          link: "/student/work",
        });
      }
    }
  }

  return { role: "student" };
}

/** Organization demo: two owned problems with real submissions to review. */
export async function startOrganizationDemo(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<{ role: "organization" }> {
  await ensureSeed(ctx);

  const existingProfile = await ctx.db
    .query("organizationProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!existingProfile) {
    await ctx.db.insert("organizationProfiles", {
      userId: user._id,
      companyName: "Atelier Nine",
      contactName: "Demo founder",
      website: "https://ateliernine.example.com",
      industry: "Operations design",
      companySize: "1–10 people",
      location: "Indiranagar, Bengaluru",
      about:
        "A small operations studio helping growing service businesses turn messy handovers into calm, repeatable systems. We post the real internal problems we are stuck on.",
      verified: true,
    });
  }
  await ctx.db.patch(user._id, {
    role: "organization",
    name: existingProfile?.companyName ?? "Atelier Nine",
    demo: true,
    status: "active",
  });

  const existingProblem = await ctx.db
    .query("problems")
    .withIndex("by_org", (q) => q.eq("orgId", user._id))
    .first();
  if (existingProblem) return { role: "organization" };

  const students = {
    rohit: await findUserByEmail(ctx, "rohit.verma@udbhava.demo"),
    meera: await findUserByEmail(ctx, "meera.nair@udbhava.demo"),
    kabir: await findUserByEmail(ctx, "kabir.deshpande@udbhava.demo"),
  };

  const gigProblemId = await ctx.db.insert("problems", {
    orgId: user._id,
    orgName: "Atelier Nine",
    orgIndustry: "Operations design",
    orgVerified: true,
    title: "Design a 10-minute onboarding for first-time gig workers",
    summary:
      "New delivery partners drop off in their first week because onboarding is a 40-minute video and a WhatsApp group. Make the first ten minutes count.",
    description:
      "We run the partner operations for two small delivery businesses. A new rider signs up, watches a 40-minute safety video, joins a WhatsApp group, and then waits for a human to explain the app.\n\nOne in four never completes their first delivery. We want a first-ten-minutes experience that gets someone from sign-up to a confident first run, without pretending the job is easier than it is. You can access our anonymised first-week data and talk to three current riders.",
    domain: "Product & Service Design",
    skills: ["Journey Mapping", "Service Design", "Content Design", "Figma"],
    difficulty: "intermediate",
    deadline: Date.now() + 21 * DAY,
    state: "published",
    solutionCap: 30,
    solutionCount: 3,
    isMultiPhase: true,
  });
  for (const [index, phase] of [
    {
      title: "Shadowing & journey map",
      description:
        "Shadow two first-week riders and find the moment confidence drops.",
      evaluationCriteria: [
        "Field evidence",
        "Journey clarity",
        "Clear root causes",
      ],
      skills: ["User Research", "Journey Mapping"],
      durationWeeks: 2,
    },
    {
      title: "Prototype the first shift",
      description:
        "Prototype the first ten minutes and the first delivery hand-off together.",
      evaluationCriteria: [
        "Usability under pressure",
        "Content clarity",
        "Test plan",
      ],
      skills: ["Service Design", "Content Design", "Figma"],
      durationWeeks: 3,
    },
  ].entries()) {
    await ctx.db.insert("phases", {
      problemId: gigProblemId,
      order: index + 1,
      ...phase,
    });
  }

  const handoverProblemId = await ctx.db.insert("problems", {
    orgId: user._id,
    orgName: "Atelier Nine",
    orgIndustry: "Operations design",
    orgVerified: true,
    title: "Turn our messy client handover into a repeatable checklist",
    summary:
      "Every project handover lives in a different Notion page. Build the one-page toolkit our project leads will actually use.",
    description:
      "We hand over 3–4 client projects a month. The quality depends on which lead runs the handover, and clients feel the difference. We want a lightweight, opinionated handover kit: a checklist, a one-page client summary, and a definition of done.\n\nThis is a short brief. We care more about adoption than completeness — if the project leads won't use it on a busy Friday, it has failed.",
    domain: "Operations",
    skills: ["Documentation", "Notion", "Service Design", "Storytelling"],
    difficulty: "starter",
    deadline: Date.now() + 11 * DAY,
    state: "published",
    solutionCap: 20,
    solutionCount: 2,
    isMultiPhase: false,
  });
  await ctx.db.insert("phases", {
    problemId: handoverProblemId,
    order: 1,
    title: "Handover toolkit",
    description:
      "Ship a usable toolkit plus evidence of one project lead trying it on a real handover.",
    evaluationCriteria: [
      "Adoption logic",
      "Clarity of the checklist",
      "Evidence from one real use",
    ],
    skills: ["Documentation", "Notion"],
    durationWeeks: 2,
  });

  const addSubmission = async (input: {
    userId: Id<"users"> | undefined;
    problemId: Id<"problems">;
    phaseIndex: number;
    title: string;
    approach: string;
    repoUrl?: string;
    links?: Array<{ label: string; url: string }>;
  }) => {
    if (!input.userId) return null;
    const phases = await phasesFor(ctx, input.problemId);
    const phase = phases[input.phaseIndex];
    if (!phase) return null;
    const assignmentId = await ctx.db.insert("assignments", {
      problemId: input.problemId,
      studentId: input.userId,
      mode: "solo",
      phaseId: phase._id,
      status: "active",
      createdAt: Date.now() - 3 * DAY,
    });
    const submissionId = await ctx.db.insert("submissions", {
      problemId: input.problemId,
      assignmentId,
      phaseId: phase._id,
      submitterId: input.userId,
      version: 1,
      title: input.title,
      approach: input.approach,
      repoUrl: input.repoUrl,
      links: input.links ?? [],
      files: [],
      createdAt: Date.now() - 2 * DAY,
    });
    const problem = await ctx.db.get(input.problemId);
    if (!problem) return submissionId;
    const analysis = analyseSubmission({
      problemTitle: problem.title,
      domain: problem.domain,
      phaseTitle: phase.title,
      evaluationCriteria: phase.evaluationCriteria,
      approach: input.approach,
      repoUrl: input.repoUrl ?? null,
      linkCount: input.links?.length ?? 0,
      fileCount: 0,
      version: 1,
    });
    await ctx.db.insert("aiAnalyses", {
      submissionId,
      problemId: input.problemId,
      alignmentScore: analysis.alignmentScore,
      summary: analysis.summary,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      criteriaCoverage: analysis.criteriaCoverage,
      model: analysis.model,
      createdAt: Date.now(),
    });
    return submissionId;
  };

  const rohitSubmission = await addSubmission({
    userId: students.rohit?._id,
    problemId: gigProblemId,
    phaseIndex: 0,
    title: "The confidence drop happens at the first customer door",
    approach:
      "I shadowed two riders on their first three deliveries. The onboarding content is not the problem; the drop happens at the first customer door, when the rider has to explain a delay while the app is still loading the route. Neither rider had practised that sentence, and both had been told to “just call support”.\n\nI would rebuild the first ten minutes around three rehearsals: accepting an order, finding the door, and handling one delay script. Each is a two-minute role-play with a photo prompt in the app. The WhatsApp group stays, but it becomes the place for a daily one-question check-in. I would measure first-week completion and time to first delivery. The main risk is that role-play feels childish; the tone has to be peer-to-peer, ideally with a rider's own voice.",
    links: [{ label: "Shadowing notes", url: "https://example.com/atelier-shadow" }],
  });

  const meeraSubmission = await addSubmission({
    userId: students.meera?._id,
    problemId: gigProblemId,
    phaseIndex: 1,
    title: "First shift as a guided loop, not a video",
    approach:
      "I designed the first ten minutes as a single guided loop: scan the bag, accept a practice order, read the customer message out loud, mark the drop as complete. The rider does it once with a buddy and once alone. The first real order then reuses the exact same three buttons, so nothing is new under pressure.\n\nThe content is written as short, honest cards — including the fact that customers sometimes do not answer. I tested the click-through with two riders from the shadowing session and one operations lead. Both riders found the practice order first, so I moved it above the safety card. The honest limitation is that I have not tested this with a brand-new rider in the field. The next step is a one-week pilot with five new riders, comparing first-week completion against the current baseline and asking the ops lead to mark where riders abandoned.",
    links: [{ label: "Prototype", url: "https://example.com/atelier-first-shift" }],
  });

  const kabirSubmission = await addSubmission({
    userId: students.kabir?._id,
    problemId: handoverProblemId,
    phaseIndex: 0,
    title: "A two-page handover with a Friday test",
    approach:
      "The toolkit is two pages. Page one is a five-question handover note: what changed, what is still open, who owns it, what the client should do next, and what to check first. Page two is the definition of done, written as a checklist a lead can finish in six minutes.\n\nI tested it on a real handover with one project lead. The first version had eleven questions and the lead skipped four, so I cut it to five and moved the client-facing summary into a copy-paste block. Adoption matters more than completeness here, so I would ask every lead to attach the note to the Notion project page before marking the project closed. I would review the first ten handovers and count how many client follow-up questions reference something already covered in the note. The risk is that the checklist becomes another form to fill; keeping it to five questions is the defence.",
    links: [{ label: "Handover template", url: "https://example.com/atelier-handover" }],
  });

  if (meeraSubmission) {
    await ctx.db.insert("shortlists", {
      problemId: gigProblemId,
      submissionId: meeraSubmission,
      orgId: user._id,
      studentId: students.meera!._id,
      createdAt: Date.now() - DAY,
    });
    await ctx.db.insert("reviews", {
      submissionId: meeraSubmission,
      problemId: gigProblemId,
      orgId: user._id,
      comment:
        "The practice-order insight is strong. Before we pilot, can you write the exact buddy script for the first run?",
      createdAt: Date.now() - DAY,
    });
    await ctx.db.insert("opportunities", {
      orgId: user._id,
      orgName: "Atelier Nine",
      studentId: students.meera!._id,
      problemId: gigProblemId,
      type: "project",
      title: "Four-week onboarding pilot · paid",
      message:
        "We would like to run your guided first-shift loop with five new riders. Paid project, four weeks, with our ops lead available twice a week.",
      status: "sent",
      createdAt: Date.now(),
    });
  }
  void rohitSubmission;
  void kabirSubmission;

  await notify(ctx, user._id, {
    type: "system",
    title: "Welcome to the demo workspace",
    body: "Two live problems, five student submissions, and a shortlist are ready for you to review.",
    link: "/org",
  });

  return { role: "organization" };
}
