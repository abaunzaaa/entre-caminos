import { prisma } from "../src/database/prisma.js";
import { generateItinerary } from "../src/services/planner.service.js";
import { savePlannerSchema } from "../src/validators/planner.validator.js";

const published = await prisma.experience.findFirst({
  where: { status: "PUBLISHED", title: { contains: "Avistamiento", mode: "insensitive" } },
  select: { id: true, title: true, price: true, status: true },
});

const plan = await generateItinerary({
  date: "2026-11-15",
  budgetCop: 500000,
  categoryIds: [],
  interests: ["Naturaleza"],
  environments: [],
  durationKey: "3-5",
  municipality: "Medellín",
  people: 1,
  note: "Quiero un plan tranquilo para observar aves.",
  avoid: [],
  profileEnvironments: [],
  profileCompanions: [],
});

const saveShape = savePlannerSchema.safeParse({
  date: plan.date,
  budgetCop: plan.budgetCop,
  categoryIds: [],
  interests: ["Naturaleza"],
  environments: [],
  durationKey: plan.durationKey,
  municipality: plan.municipality,
  people: plan.people,
  note: plan.note,
  title: plan.title,
  summary: plan.summary,
  why: plan.why,
  scheduleLabel: plan.scheduleLabel,
  costNotes: plan.costNotes,
  alternativeMessage: plan.alternativeMessage,
  folderKey: "naturaleza",
  stops: plan.stops.map((stop) => ({
    experienceId: stop.experienceId,
    suggestedAt: stop.suggestedAt,
    suggestedEnd: stop.suggestedEnd,
    blurb: stop.description,
    title: stop.title,
    location: stop.location,
    stopType: stop.stopType,
    included: stop.included,
    additionalCost: stop.additionalCost,
    durationMinutes: stop.durationMinutes,
  })),
});

console.log(JSON.stringify({
  publishedExample: published,
  selectedExperienceId: plan.primaryExperienceId,
  title: plan.title,
  summary: plan.summary,
  why: plan.why,
  date: plan.date,
  municipality: plan.municipality,
  estimatedCop: plan.estimatedCop,
  hasImage: Boolean(plan.coverImageUrl),
  scheduleLabel: plan.scheduleLabel,
  scheduleIsSuggested: plan.scheduleIsSuggested,
  stopCount: plan.stops.length,
  stops: plan.stops.map((stop) => ({
    title: stop.title,
    type: stop.stopType,
    minutes: stop.durationMinutes,
    at: stop.suggestedAt,
    end: stop.suggestedEnd,
    experienceId: stop.experienceId,
  })),
  saveCompatible: saveShape.success,
  saveIssues: saveShape.success ? [] : saveShape.error.issues.map((issue) => issue.message),
}, null, 2));

await prisma.$disconnect();
