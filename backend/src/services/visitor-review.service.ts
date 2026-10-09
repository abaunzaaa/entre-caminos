import { Prisma } from "@prisma/client";
import { CONTACT_MESSAGE_MAX } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import {
  VISITOR_REVIEW_MESSAGES,
  VISITOR_REVIEW_PHOTO_BYTES,
  VISITOR_REVIEW_PHOTO_MAX,
} from "../validators/visitor-review.validator.js";
import { ratingNumber, reviewScore, roundRating } from "./review-score.js";
import { destroyStoredImage, persistReviewImage } from "./upload.service.js";
import { assertPublishedExperience, isExperienceVisited } from "./visit.service.js";

const reviewUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

const reviewInclude = {
  user: { select: reviewUserSelect },
  images: { orderBy: { position: "asc" as const } },
} as const;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ReviewRow = Prisma.ExperienceVisitorReviewGetPayload<{ include: typeof reviewInclude }>;

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type ReviewWrite = {
  rating: number;
  organizationRating: number;
  valueRating: number;
  recommended: boolean;
  comment: string;
};

function assertStar(value: number, message: string) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw ApiError.badRequest(message);
  }
}

function assertHalfStar(value: number) {
  const doubled = value * 2;
  const allowed = Number.isFinite(value) && value >= 1 && value <= 5 && Math.abs(doubled - Math.round(doubled)) < 1e-6;
  if (!allowed) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.ratingStep);
  }
}

function assertReviewInput(input: ReviewWrite) {
  assertHalfStar(input.rating);
  assertStar(input.organizationRating, VISITOR_REVIEW_MESSAGES.organization);
  assertStar(input.valueRating, VISITOR_REVIEW_MESSAGES.value);
  if (typeof input.recommended !== "boolean") {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.recommended);
  }
  const text = input.comment.trim();
  if (!text) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.commentRequired);
  }
  if (text.length > CONTACT_MESSAGE_MAX) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.commentTooLong);
  }
  return {
    rating: input.rating,
    organizationRating: input.organizationRating,
    valueRating: input.valueRating,
    recommended: input.recommended,
    comment: text,
  };
}

function rethrowReviewWrite(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw ApiError.conflict(VISITOR_REVIEW_MESSAGES.duplicate);
  }
  throw new ApiError(500, VISITOR_REVIEW_MESSAGES.publishFailed, "REVIEW_PUBLISH_FAILED");
}

function assertReviewPhotos(files: Express.Multer.File[], keptCount: number) {
  if (keptCount + files.length > VISITOR_REVIEW_PHOTO_MAX) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.photosMax);
  }
  files.forEach((file) => {
    const name = file.originalname.toLowerCase();
    const allowed = PHOTO_TYPES.has(file.mimetype) || /\.(jpe?g|png|webp)$/.test(name);
    if (!allowed) {
      throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.photoType);
    }
    if (file.size > VISITOR_REVIEW_PHOTO_BYTES) {
      throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.photoSize);
    }
  });
}

async function storeReviewPhotos(files: Express.Multer.File[]) {
  const stored: Array<{ url: string; publicId: string | null }> = [];
  try {
    for (const file of files) {
      stored.push(await persistReviewImage(file));
    }
    return stored;
  } catch (error) {
    await Promise.all(stored.map((item) => destroyStoredImage(item.publicId)));
    throw error;
  }
}

function serializeReview(row: ReviewRow) {
  const images = row.images ?? [];
  const rating = ratingNumber(row.rating);
  return {
    id: row.id,
    experienceId: row.experienceId,
    rating,
    score: reviewScore(rating, row.organizationRating, row.valueRating),
    organizationRating: row.organizationRating,
    valueRating: row.valueRating,
    recommended: row.recommended,
    comment: row.comment,
    images: images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      position: image.position,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: {
      id: row.user.id,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
    },
  };
}

async function summaryFor(experienceId: string) {
  const rows = await prisma.experienceVisitorReview.findMany({
    where: { experienceId },
    select: { rating: true, organizationRating: true, valueRating: true },
  });
  if (!rows.length) {
    return { averageRating: null, count: 0 };
  }
  const total = rows.reduce(
    (sum, row) => sum + reviewScore(ratingNumber(row.rating), row.organizationRating, row.valueRating),
    0,
  );
  return {
    averageRating: roundRating(total / rows.length),
    count: rows.length,
  };
}

async function ownReview(experienceId: string, userId: string) {
  return prisma.experienceVisitorReview.findUnique({
    where: { experienceId_userId: { experienceId, userId } },
    include: reviewInclude,
  });
}

export async function listVisitorReviews(experienceId: string, viewerId?: string) {
  await assertPublishedExperience(experienceId);
  const [summary, reviews, mine] = await Promise.all([
    summaryFor(experienceId),
    prisma.experienceVisitorReview.findMany({
      where: { experienceId },
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    viewerId ? ownReview(experienceId, viewerId) : Promise.resolve(null),
  ]);

  return {
    summary,
    reviews: reviews.map(serializeReview),
    mine: mine ? serializeReview(mine) : null,
  };
}

export async function createVisitorReview(
  userId: string,
  experienceId: string,
  input: ReviewWrite,
  files: Express.Multer.File[] = [],
) {
  const data = assertReviewInput(input);
  assertReviewPhotos(files, 0);
  await assertPublishedExperience(experienceId);

  const visited = await isExperienceVisited(userId, experienceId);
  if (!visited) {
    throw ApiError.forbidden(VISITOR_REVIEW_MESSAGES.notVisited);
  }

  const existing = await ownReview(experienceId, userId);
  if (existing) {
    throw ApiError.conflict(VISITOR_REVIEW_MESSAGES.duplicate);
  }

  const uploaded = await storeReviewPhotos(files);
  try {
    const review = await prisma.experienceVisitorReview.create({
      data: {
        userId,
        experienceId,
        ...data,
        ...(uploaded.length
          ? {
              images: {
                create: uploaded.map((item, index) => ({
                  imageUrl: item.url,
                  publicId: item.publicId,
                  position: index,
                })),
              },
            }
          : {}),
      },
      include: reviewInclude,
    });
    return {
      review: serializeReview(review),
      summary: await summaryFor(experienceId),
    };
  } catch (error) {
    await Promise.all(uploaded.map((item) => destroyStoredImage(item.publicId)));
    rethrowReviewWrite(error);
  }
}

export async function updateVisitorReview(
  userId: string,
  experienceId: string,
  input: ReviewWrite,
  extras?: { files?: Express.Multer.File[]; keepImageIds?: string[] },
) {
  const data = assertReviewInput(input);
  const files = extras?.files ?? [];
  await assertPublishedExperience(experienceId);

  const existing = await ownReview(experienceId, userId);
  if (!existing) {
    throw ApiError.notFound("No tienes una reseña en esta experiencia.");
  }

  const currentImages = existing.images ?? [];
  const keepIds = extras?.keepImageIds;
  const kept = keepIds
    ? currentImages.filter((image) => keepIds.includes(image.id)).sort((left, right) => left.position - right.position)
    : currentImages;
  assertReviewPhotos(files, keepIds ? kept.length : currentImages.length);
  const removed = keepIds ? currentImages.filter((image) => !keepIds.includes(image.id)) : [];
  const uploaded = await storeReviewPhotos(files);

  try {
    if (!files.length && keepIds === undefined) {
      const review = await prisma.experienceVisitorReview.update({
        where: { id: existing.id },
        data,
        include: reviewInclude,
      });
      return {
        review: serializeReview(review),
        summary: await summaryFor(experienceId),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.experienceVisitorReview.update({
        where: { id: existing.id },
        data,
      });
      if (removed.length) {
        await tx.experienceVisitorReviewImage.deleteMany({
          where: { reviewId: existing.id, id: { in: removed.map((image) => image.id) } },
        });
      }
      await Promise.all(
        kept.map((image, index) =>
          tx.experienceVisitorReviewImage.update({
            where: { id: image.id },
            data: { position: index },
          }),
        ),
      );
      if (uploaded.length) {
        await tx.experienceVisitorReviewImage.createMany({
          data: uploaded.map((item, index) => ({
            reviewId: existing.id,
            imageUrl: item.url,
            publicId: item.publicId,
            position: kept.length + index,
          })),
        });
      }
    });
    await Promise.all(removed.map((image) => destroyStoredImage(image.publicId)));
    const review = await ownReview(experienceId, userId);
    return {
      review: serializeReview(review ?? existing),
      summary: await summaryFor(experienceId),
    };
  } catch (error) {
    await Promise.all(uploaded.map((item) => destroyStoredImage(item.publicId)));
    rethrowReviewWrite(error);
  }
}

export async function deleteVisitorReview(userId: string, experienceId: string) {
  await assertPublishedExperience(experienceId);

  const existing = await ownReview(experienceId, userId);
  if (!existing) {
    throw ApiError.notFound("No tienes una reseña en esta experiencia.");
  }

  const photos = existing.images ?? [];
  await prisma.experienceVisitorReview.delete({ where: { id: existing.id } });
  await Promise.all(photos.map((image) => destroyStoredImage(image.publicId)));

  return { summary: await summaryFor(experienceId) };
}
