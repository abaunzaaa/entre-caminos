import type { FaqSource, FaqStatus, Prisma } from "@prisma/client";
import { FAQ_SUBJECT_MAX } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { recordAudit } from "./audit.service.js";
import {
  FAQ_STATUS,
  type FaqStatusName,
  resolveFaqPublication,
  statusAfterUnpublish,
} from "./faq-rules.js";
import { faqCategorySlug } from "./faq-catalog.js";
import { notifyFaqAnswered, notifyFaqReceived } from "./notification.service.js";
import type {
  AdminFaqCreateInput,
  AdminFaqListQuery,
  AdminFaqUpdateInput,
  AnswerFaqInput,
  SubmitFaqInput,
} from "../validators/faq.validator.js";

const categorySelect = { select: { id: true, name: true, slug: true } } satisfies Prisma.FaqCategoryDefaultArgs;

const adminFaqInclude = {
  user: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  category: categorySelect,
} satisfies Prisma.FaqInclude;

const publicFaqSelect = {
  id: true,
  subject: true,
  question: true,
  answer: true,
  publishedAt: true,
  category: categorySelect,
} satisfies Prisma.FaqSelect;

function visibleWhere(categorySlug = ""): Prisma.FaqWhereInput {
  const filters: Prisma.FaqWhereInput[] = [
    { status: FAQ_STATUS.PUBLISHED },
    { answer: { not: null } },
    { NOT: { answer: "" } },
  ];
  if (categorySlug) {
    filters.push({ category: { slug: categorySlug } });
  }
  return { AND: filters };
}

async function assertCategory(categoryId: string | null | undefined) {
  if (categoryId == null) {
    return categoryId;
  }
  const category = await prisma.faqCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) {
    throw ApiError.unprocessable("Esa categoría de preguntas no existe.");
  }
  return category.id;
}

function pageMeta(total: number, page: number, limit: number) {
  const pageCount = total === 0 ? 0 : Math.ceil(total / limit);
  const current = pageCount === 0 ? 1 : Math.min(Math.max(page, 1), pageCount);
  return { pageCount, current, skip: (current - 1) * limit };
}

async function requireFaq(id: string) {
  const faq = await prisma.faq.findUnique({ where: { id }, include: adminFaqInclude });
  if (!faq) {
    throw ApiError.notFound("No encontramos esa pregunta.");
  }
  return faq;
}

function applyPublication(status: FaqStatusName, answer: string | null, publishedAt: Date | null) {
  const resolved = resolveFaqPublication({ status, answer, publishedAt });
  if (!resolved.ok) {
    throw ApiError.unprocessable(resolved.message);
  }
  return resolved;
}

const publicOrder = [{ category: { sortOrder: "asc" as const } }, { publishedAt: "desc" as const }, { createdAt: "desc" as const }];

export async function listPublicFaqs(input: { q: string; category: string; page: number; limit: number }) {
  const query = input.q.trim();
  const category = input.category.trim().toLowerCase();
  const where: Prisma.FaqWhereInput = query
    ? {
        AND: [
          visibleWhere(category),
          {
            OR: [
              { subject: { contains: query, mode: "insensitive" } },
              { question: { contains: query, mode: "insensitive" } },
              { answer: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      }
    : visibleWhere(category);

  const requestedPage = Math.max(1, input.page);
  const skip = (requestedPage - 1) * input.limit;
  const [total, rows, categories] = await Promise.all([
    prisma.faq.count({ where }),
    prisma.faq.findMany({
      where,
      select: publicFaqSelect,
      orderBy: publicOrder,
      skip,
      take: input.limit,
    }),
    prisma.faqCategory.findMany({
      where: { faqs: { some: visibleWhere() } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);
  const { pageCount, current } = pageMeta(total, requestedPage, input.limit);
  const faqs =
    current === requestedPage
      ? rows
      : await prisma.faq.findMany({
          where,
          select: publicFaqSelect,
          orderBy: publicOrder,
          skip: (current - 1) * input.limit,
          take: input.limit,
        });

  return { faqs, categories, total, page: current, limit: input.limit, pageCount };
}

export async function submitFaq(userId: string, authorName: string, input: SubmitFaqInput) {
  const subject = input.question.replace(/\s+/g, " ").trim().slice(0, FAQ_SUBJECT_MAX);
  const faq = await prisma.faq.create({
    data: {
      subject,
      question: input.question,
      answer: null,
      status: FAQ_STATUS.PENDING,
      source: "USER_SUBMISSION",
      userId,
    },
  });

  let notified = false;
  try {
    await notifyFaqReceived({
      faqId: faq.id,
      subject: faq.subject,
      excerpt: faq.question,
      authorName,
    });
    notified = true;
  } catch (error) {
    logger.error("No se pudo notificar la pregunta frecuente", {
      faqId: faq.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await recordAudit({ userId, action: "FAQ_SUBMIT", entity: "Faq", entityId: faq.id });
  } catch (error) {
    logger.error("No se pudo auditar el envío de la pregunta frecuente", {
      faqId: faq.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return {
    id: faq.id,
    subject: faq.subject,
    status: faq.status,
    createdAt: faq.createdAt,
    notified,
  };
}

function emptyCounts() {
  return { total: 0, pending: 0, answered: 0, published: 0, hidden: 0, discarded: 0 };
}

export async function listAdminFaqs(query: AdminFaqListQuery) {
  const where: Prisma.FaqWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.source) {
    where.source = query.source;
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  const text = query.q?.trim();
  if (text) {
    where.OR = [
      { subject: { contains: text, mode: "insensitive" } },
      { question: { contains: text, mode: "insensitive" } },
      { answer: { contains: text, mode: "insensitive" } },
      { user: { name: { contains: text, mode: "insensitive" } } },
      { user: { email: { contains: text, mode: "insensitive" } } },
    ];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 8;
  const order = query.sort === "oldest" ? "asc" : "desc";

  const [total, grouped, categories] = await Promise.all([
    prisma.faq.count({ where }),
    prisma.faq.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.faqCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);
  const { pageCount, current, skip } = pageMeta(total, page, limit);
  const faqs = await prisma.faq.findMany({
    where,
    include: adminFaqInclude,
    orderBy: { createdAt: order },
    skip,
    take: limit,
  });

  const counts = emptyCounts();
  for (const group of grouped) {
    const amount = group._count._all;
    counts.total += amount;
    if (group.status === "PENDING") counts.pending = amount;
    if (group.status === "ANSWERED") counts.answered = amount;
    if (group.status === "PUBLISHED") counts.published = amount;
    if (group.status === "HIDDEN") counts.hidden = amount;
    if (group.status === "DISCARDED") counts.discarded = amount;
  }

  return { faqs, categories, total, page: current, limit, pageCount, counts };
}

export async function createFaqCategory(name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 40) {
    throw ApiError.unprocessable("El nombre de la categoría debe tener entre 2 y 40 caracteres.");
  }
  const slug = faqCategorySlug(clean);
  const existing = await prisma.faqCategory.findUnique({ where: { slug } });
  if (existing) {
    return existing;
  }
  const last = await prisma.faqCategory.aggregate({ _max: { sortOrder: true } });
  return prisma.faqCategory.create({
    data: { name: clean, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    select: { id: true, name: true, slug: true },
  });
}

export async function getAdminFaq(id: string) {
  return requireFaq(id);
}

export async function getOwnAnsweredFaq(userId: string, id: string) {
  const faq = await prisma.faq.findFirst({
    where: { id, userId },
    select: { id: true, question: true, answer: true, updatedAt: true },
  });
  if (!faq?.answer?.trim()) {
    throw ApiError.notFound("No encontramos la respuesta de esa pregunta.");
  }
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    answeredAt: faq.updatedAt,
  };
}

async function notifyAuthorIfNewAnswer(
  existing: { id: string; userId: string | null; answer: string | null },
  nextAnswer: string,
) {
  const previous = existing.answer?.trim() ?? "";
  const next = nextAnswer.trim();
  if (!existing.userId || !next || previous === next) {
    return false;
  }
  try {
    return await notifyFaqAnswered({ userId: existing.userId, faqId: existing.id });
  } catch (error) {
    logger.error("No se pudo avisar al autor de la respuesta", {
      faqId: existing.id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function createAdminFaq(actorId: string, input: AdminFaqCreateInput) {
  const answer = input.answer ?? null;
  const publication = applyPublication(input.status, answer, null);
  const categoryId = await assertCategory(input.categoryId ?? null);
  const faq = await prisma.faq.create({
    data: {
      subject: input.subject,
      question: input.question,
      answer,
      status: publication.status,
      source: "ADMIN_CREATED",
      categoryId,
      reviewedById: actorId,
      publishedAt: publication.publishedAt,
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action: "FAQ_CREATE", entity: "Faq", entityId: faq.id });
  return faq;
}

export async function updateAdminFaq(actorId: string, id: string, input: AdminFaqUpdateInput) {
  const existing = await requireFaq(id);
  const answer = input.answer === undefined ? existing.answer : input.answer;
  let status = (input.status ?? existing.status) as FaqStatusName;
  if (status === FAQ_STATUS.PENDING && typeof answer === "string" && answer.trim()) {
    status = FAQ_STATUS.ANSWERED;
  }
  const publication = applyPublication(status, answer, existing.publishedAt);
  const categoryId = input.categoryId === undefined ? undefined : await assertCategory(input.categoryId);
  const faq = await prisma.faq.update({
    where: { id },
    data: {
      subject: input.subject ?? existing.subject,
      question: input.question ?? existing.question,
      answer,
      status: publication.status,
      publishedAt: publication.publishedAt,
      reviewedById: actorId,
      ...(categoryId !== undefined ? { categoryId } : {}),
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action: "FAQ_UPDATE", entity: "Faq", entityId: faq.id });
  if (typeof answer === "string") {
    await notifyAuthorIfNewAnswer(existing, answer);
  }
  return faq;
}

export async function answerFaq(actorId: string, id: string, input: AnswerFaqInput) {
  const existing = await requireFaq(id);
  const status: FaqStatusName = input.publish ? FAQ_STATUS.PUBLISHED : FAQ_STATUS.ANSWERED;
  const publication = applyPublication(status, input.answer, existing.publishedAt);
  const categoryId = input.categoryId === undefined ? undefined : await assertCategory(input.categoryId);
  const faq = await prisma.faq.update({
    where: { id },
    data: {
      answer: input.answer,
      status: publication.status,
      publishedAt: publication.publishedAt,
      reviewedById: actorId,
      ...(categoryId !== undefined ? { categoryId } : {}),
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action: "FAQ_ANSWER", entity: "Faq", entityId: faq.id });
  const notified = await notifyAuthorIfNewAnswer(existing, input.answer);
  return { faq, notified };
}

async function changeStatus(actorId: string, id: string, status: FaqStatusName, action: string) {
  const existing = await requireFaq(id);
  const nextStatus = status === FAQ_STATUS.ANSWERED ? statusAfterUnpublish(existing.answer) : status;
  const publication = applyPublication(nextStatus, existing.answer, existing.publishedAt);
  const faq = await prisma.faq.update({
    where: { id },
    data: {
      status: publication.status,
      publishedAt: publication.publishedAt,
      reviewedById: actorId,
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action, entity: "Faq", entityId: faq.id });
  return faq;
}

export function publishFaq(actorId: string, id: string) {
  return changeStatus(actorId, id, FAQ_STATUS.PUBLISHED, "FAQ_PUBLISH");
}

export function unpublishFaq(actorId: string, id: string) {
  return changeStatus(actorId, id, FAQ_STATUS.ANSWERED, "FAQ_UNPUBLISH");
}

export function hideFaq(actorId: string, id: string) {
  return changeStatus(actorId, id, FAQ_STATUS.HIDDEN, "FAQ_HIDE");
}

export function discardFaq(actorId: string, id: string) {
  return changeStatus(actorId, id, FAQ_STATUS.DISCARDED, "FAQ_DISCARD");
}

export async function deleteFaq(actorId: string, id: string) {
  await requireFaq(id);
  await prisma.faq.delete({ where: { id } });
  await recordAudit({ userId: actorId, action: "FAQ_DELETE", entity: "Faq", entityId: id });
}

export type { FaqSource, FaqStatus };
