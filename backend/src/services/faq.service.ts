import type { FaqSource, FaqStatus, Prisma } from "@prisma/client";
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
import { notifyFaqReceived } from "./notification.service.js";
import type {
  AdminFaqCreateInput,
  AdminFaqListQuery,
  AdminFaqUpdateInput,
  AnswerFaqInput,
  SubmitFaqInput,
} from "../validators/faq.validator.js";

const adminFaqInclude = {
  user: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.FaqInclude;

const publicFaqSelect = {
  id: true,
  subject: true,
  question: true,
  answer: true,
  publishedAt: true,
} satisfies Prisma.FaqSelect;

function visibleWhere(): Prisma.FaqWhereInput {
  return {
    AND: [{ status: FAQ_STATUS.PUBLISHED }, { answer: { not: null } }, { NOT: { answer: "" } }],
  };
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

export async function listPublicFaqs(input: { q: string; page: number; limit: number }) {
  const query = input.q.trim();
  const where: Prisma.FaqWhereInput = query
    ? {
        AND: [
          visibleWhere(),
          {
            OR: [
              { subject: { contains: query, mode: "insensitive" } },
              { question: { contains: query, mode: "insensitive" } },
              { answer: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      }
    : visibleWhere();

  const total = await prisma.faq.count({ where });
  const { pageCount, current, skip } = pageMeta(total, input.page, input.limit);
  const faqs = await prisma.faq.findMany({
    where,
    select: publicFaqSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: input.limit,
  });

  return { faqs, total, page: current, limit: input.limit, pageCount };
}

export async function submitFaq(userId: string, authorName: string, input: SubmitFaqInput) {
  const faq = await prisma.faq.create({
    data: {
      subject: input.subject,
      question: input.question,
      answer: null,
      status: FAQ_STATUS.PENDING,
      source: "USER_SUBMISSION",
      userId,
    },
  });

  try {
    await notifyFaqReceived({
      faqId: faq.id,
      subject: faq.subject,
      excerpt: faq.question,
      authorName,
    });
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

  const [total, grouped] = await Promise.all([
    prisma.faq.count({ where }),
    prisma.faq.groupBy({ by: ["status"], _count: { _all: true } }),
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

  return { faqs, total, page: current, limit, pageCount, counts };
}

export async function getAdminFaq(id: string) {
  return requireFaq(id);
}

export async function createAdminFaq(actorId: string, input: AdminFaqCreateInput) {
  const answer = input.answer ?? null;
  const publication = applyPublication(input.status, answer, null);
  const faq = await prisma.faq.create({
    data: {
      subject: input.subject,
      question: input.question,
      answer,
      status: publication.status,
      source: "ADMIN_CREATED",
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
  const status = (input.status ?? existing.status) as FaqStatusName;
  const publication = applyPublication(status, answer, existing.publishedAt);
  const faq = await prisma.faq.update({
    where: { id },
    data: {
      subject: input.subject ?? existing.subject,
      question: input.question ?? existing.question,
      answer,
      status: publication.status,
      publishedAt: publication.publishedAt,
      reviewedById: actorId,
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action: "FAQ_UPDATE", entity: "Faq", entityId: faq.id });
  return faq;
}

export async function answerFaq(actorId: string, id: string, input: AnswerFaqInput) {
  const existing = await requireFaq(id);
  const status: FaqStatusName = input.publish ? FAQ_STATUS.PUBLISHED : FAQ_STATUS.ANSWERED;
  const publication = applyPublication(status, input.answer, existing.publishedAt);
  const faq = await prisma.faq.update({
    where: { id },
    data: {
      answer: input.answer,
      status: publication.status,
      publishedAt: publication.publishedAt,
      reviewedById: actorId,
    },
    include: adminFaqInclude,
  });
  await recordAudit({ userId: actorId, action: "FAQ_ANSWER", entity: "Faq", entityId: faq.id });
  return faq;
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
