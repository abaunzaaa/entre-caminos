import { prisma } from "../database/prisma.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";
import { livingUserWhere } from "../utils/account.js";

export const NOTIFICATION_TYPES = {
  EXPERIENCE_PENDING: "EXPERIENCE_PENDING",
  EXPERIENCE_APPROVED: "EXPERIENCE_APPROVED",
  EXPERIENCE_REJECTED: "EXPERIENCE_REJECTED",
  CATEGORY_PENDING: "CATEGORY_PENDING",
  CATEGORY_REJECTED: "CATEGORY_REJECTED",
  CATEGORY_APPROVED: "CATEGORY_APPROVED",
  FAQ_RECEIVED: "FAQ_RECEIVED",
  FAQ_ANSWERED: "FAQ_ANSWERED",
  REVIEW_PUBLISHED: "REVIEW_PUBLISHED",
} as const;

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  entity?: string | null;
  entityId?: string | null;
};

export async function createNotifications(items: CreateNotificationInput[]) {
  if (!items.length) {
    return;
  }
  await prisma.notification.createMany({ data: items });
}

export async function findExperienceReviewerIds(excludeUserId?: string) {
  const reviewers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      OR: [
        { role: { name: ROLES.SUPER_ADMIN } },
        {
          role: {
            permissions: { some: { permission: { name: PERMISSIONS.EXPERIENCES_REVIEW } } },
          },
        },
      ],
    },
    select: { id: true },
  });
  return [...new Set(reviewers.map((item) => item.id))];
}

export async function findSuperAdminIds(excludeUserId?: string) {
  const reviewers = await prisma.user.findMany({
    where: {
      ...livingUserWhere,
      status: "ACTIVE",
      role: { name: ROLES.SUPER_ADMIN },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return reviewers.map((item) => item.id);
}

export async function notifyExperienceSubmitted(input: {
  experienceId: string;
  title: string;
  creatorId: string;
  creatorName: string;
}) {
  const reviewerIds = await findExperienceReviewerIds(input.creatorId);
  await createNotifications(
    reviewerIds.map((userId) => ({
      userId,
      type: NOTIFICATION_TYPES.EXPERIENCE_PENDING,
      title: "Nueva experiencia pendiente",
      body: `Hay una nueva experiencia pendiente de revisión: ${input.title}.\nAdministrador: ${input.creatorName}\nEstado: Pendiente de revisión`,
      link: "/admin/experiencias?vista=pendientes",
      entity: "Experience",
      entityId: input.experienceId,
    })),
  );
}

export async function notifyExperienceApproved(input: {
  experienceId: string;
  title: string;
  creatorId: string;
}) {
  await createNotifications([
    {
      userId: input.creatorId,
      type: NOTIFICATION_TYPES.EXPERIENCE_APPROVED,
      title: "Experiencia aprobada",
      body: `Tu experiencia "${input.title}" fue aprobada y ya está disponible en Entre Caminos.`,
      link: `/admin/experiencias/${input.experienceId}/ver`,
      entity: "Experience",
      entityId: input.experienceId,
    },
  ]);
}

export async function notifyExperienceRejected(input: {
  experienceId: string;
  title: string;
  creatorId: string;
  reason: string;
}) {
  await createNotifications([
    {
      userId: input.creatorId,
      type: NOTIFICATION_TYPES.EXPERIENCE_REJECTED,
      title: "Experiencia rechazada",
      body: `Tu experiencia "${input.title}" fue rechazada.\n\nMotivo:\n"${input.reason}"`,
      link: `/admin/experiencias/${input.experienceId}`,
      entity: "Experience",
      entityId: input.experienceId,
    },
  ]);
}

export async function notifyCategorySubmitted(input: {
  categoryId: string;
  name: string;
  creatorId: string;
}) {
  const reviewerIds = await findSuperAdminIds(input.creatorId);
  await createNotifications(
    reviewerIds.map((userId) => ({
      userId,
      type: NOTIFICATION_TYPES.CATEGORY_PENDING,
      title: "Nueva categoría pendiente",
      body: `La categoría "${input.name}" requiere revisión.`,
      link: "/admin/categorias",
      entity: "Category",
      entityId: input.categoryId,
    })),
  );
}

export async function notifyCategoryRejected(input: {
  categoryId: string;
  name: string;
  creatorId: string;
  reason: string;
}) {
  await createNotifications([
    {
      userId: input.creatorId,
      type: NOTIFICATION_TYPES.CATEGORY_REJECTED,
      title: "Categoría rechazada",
      body: `Tu categoría "${input.name}" fue rechazada.\n\nMotivo:\n${input.reason}`,
      link: "/admin/categorias",
      entity: "Category",
      entityId: input.categoryId,
    },
  ]);
}

export async function notifyCategoryApproved(input: {
  categoryId: string;
  name: string;
  creatorId: string;
}) {
  await createNotifications([
    {
      userId: input.creatorId,
      type: NOTIFICATION_TYPES.CATEGORY_APPROVED,
      title: "Categoría aprobada",
      body: `Tu categoría "${input.name}" fue aprobada y ya está disponible.`,
      link: "/admin/categorias",
      entity: "Category",
      entityId: input.categoryId,
    },
  ]);
}

export async function notifyFaqAnswered(input: { userId: string; faqId: string }) {
  const recipient = await prisma.user.findFirst({
    where: { id: input.userId, ...livingUserWhere, status: "ACTIVE" },
    select: { id: true },
  });
  if (!recipient) {
    return false;
  }
  await createNotifications([
    {
      userId: recipient.id,
      type: NOTIFICATION_TYPES.FAQ_ANSWERED,
      title: "¡Tu pregunta fue respondida!",
      body: "Nuestro equipo ya respondió tu pregunta. Puedes consultar la respuesta aquí.",
      entity: "Faq",
      entityId: input.faqId,
    },
  ]);
  return true;
}

export async function notifyFaqReceived(input: {
  faqId: string;
  subject: string;
  excerpt: string;
  authorName: string;
}) {
  const reviewerIds = await findSuperAdminIds();
  const excerpt = input.excerpt.trim();
  const preview = excerpt.length > 160 ? `${excerpt.slice(0, 157).trimEnd()}…` : excerpt;
  await createNotifications(
    reviewerIds.map((userId) => ({
      userId,
      type: NOTIFICATION_TYPES.FAQ_RECEIVED,
      title: "Nueva pregunta recibida",
      body: `Un usuario ha enviado una pregunta frecuente para revisión.${preview ? `\n${preview}` : ""}\nDe: ${input.authorName}`,
      link: `/admin/preguntas-frecuentes?faq=${input.faqId}`,
      entity: "Faq",
      entityId: input.faqId,
    })),
  );
}

export async function notifyReviewPublished(input: {
  userId: string;
  reviewId: string;
  experienceId: string;
}) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      type: NOTIFICATION_TYPES.REVIEW_PUBLISHED,
      entity: "ExperienceVisitorReview",
      entityId: input.reviewId,
    },
    select: { id: true },
  });
  if (existing) {
    return;
  }
  const experience = await prisma.experience.findFirst({
    where: { id: input.experienceId },
    select: { title: true },
  });
  const experienceTitle = experience?.title?.trim() || "esta experiencia";
  await createNotifications([
    {
      userId: input.userId,
      type: NOTIFICATION_TYPES.REVIEW_PUBLISHED,
      title: "Reseña publicada correctamente",
      body: `Tu reseña de ${experienceTitle} ya está publicada.`,
      link: `/explorar/${input.experienceId}`,
      entity: "ExperienceVisitorReview",
      entityId: input.reviewId,
    },
  ]);
}

export async function listNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) {
    return null;
  }
  if (notification.readAt) {
    return notification;
  }
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
