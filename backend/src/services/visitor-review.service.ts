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
  location: { select: { id: true, municipality: true, address: true, position: true } },
} as const;

type SedeRow = { id: string; municipality: string; address: string; position: number };

function sedeOptionLabel(place: SedeRow, places: SedeRow[], index: number) {
  const city = place.municipality.trim();
  if (!city) {
    return `Sede ${index + 1}`;
  }
  const sameCity = places.filter((item) => item.municipality.trim() === city);
  if (sameCity.length < 2) {
    return city;
  }
  const reference = place.address.trim();
  if (reference) {
    return `${city} · ${reference}`;
  }
  const nth = places.slice(0, index + 1).filter((item) => item.municipality.trim() === city).length;
  return `${city} ${nth}`;
}

function sedeLabels(places: SedeRow[]) {
  const ordered = [...places].sort((left, right) => left.position - right.position);
  const base = ordered.map((place, index) => sedeOptionLabel(place, ordered, index));
  const counts = new Map<string, number>();
  base.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  ordered.forEach((place, index) => {
    const label = base[index] ?? "Sede";
    if ((counts.get(label) ?? 0) < 2) {
      labels.set(place.id, label);
      return;
    }
    const nth = (seen.get(label) ?? 0) + 1;
    seen.set(label, nth);
    labels.set(place.id, `${label} ${nth}`);
  });
  return labels;
}

async function sedesFor(experienceId: string) {
  return prisma.experienceLocation.findMany({
    where: { experienceId },
    orderBy: { position: "asc" },
    select: { id: true, municipality: true, address: true, position: true },
  });
}

function resolveLocationId(places: SedeRow[], requested?: string) {
  if (!places.length) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.locationMissing);
  }
  if (places.length === 1) {
    const only = places[0]?.id;
    if (!only || (requested && requested !== only)) {
      throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.locationInvalid);
    }
    return only;
  }
  if (!requested) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.locationRequired);
  }
  if (!places.some((place) => place.id === requested)) {
    throw ApiError.badRequest(VISITOR_REVIEW_MESSAGES.locationInvalid);
  }
  return requested;
}

async function locationForUnassignedReview(
  existing: { id: string; locationId: string | null },
  userId: string,
  experienceId: string,
  requested?: string,
) {
  if (existing.locationId) {
    return undefined;
  }
  const places = await sedesFor(experienceId);
  const locationId = resolveLocationId(places, requested);
  const taken = await prisma.experienceVisitorReview.findFirst({
    where: {
      userId,
      experienceId,
      locationId,
      NOT: { id: existing.id },
    },
    select: { id: true },
  });
  if (taken) {
    throw ApiError.conflict(VISITOR_REVIEW_MESSAGES.duplicate);
  }
  return locationId;
}

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
  locationId?: string;
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

function serializeReview(row: ReviewRow, labels: Map<string, string>) {
  const images = row.images ?? [];
  const rating = ratingNumber(row.rating);
  const place = row.location;
  return {
    id: row.id,
    experienceId: row.experienceId,
    location: place
      ? { id: place.id, label: labels.get(place.id) ?? (place.municipality.trim() || "Sede") }
      : null,
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
  // Promedio de todas las sedes. locationId queda en cada reseña para filtrar después.
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

async function reviewOwnedBy(reviewId: string, userId: string, experienceId: string) {
  return prisma.experienceVisitorReview.findFirst({
    where: { id: reviewId, userId, experienceId },
    include: reviewInclude,
  });
}

export async function listVisitorReviews(experienceId: string, viewerId?: string) {
  await assertPublishedExperience(experienceId);
  const [summary, reviews, places] = await Promise.all([
    summaryFor(experienceId),
    prisma.experienceVisitorReview.findMany({
      where: { experienceId },
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    sedesFor(experienceId),
  ]);
  const labels = sedeLabels(places);

  return {
    summary,
    reviews: reviews.map((review) => serializeReview(review, labels)),
    mine: viewerId
      ? reviews.filter((review) => review.userId === viewerId).map((review) => serializeReview(review, labels))
      : [],
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

  const places = await sedesFor(experienceId);
  const locationId = resolveLocationId(places, input.locationId);
  const existing = await prisma.experienceVisitorReview.findFirst({
    where: { userId, experienceId, locationId },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict(VISITOR_REVIEW_MESSAGES.duplicate);
  }

  const uploaded = await storeReviewPhotos(files);
  const labels = sedeLabels(places);
  try {
    const review = await prisma.experienceVisitorReview.create({
      data: {
        userId,
        experienceId,
        locationId,
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
      review: serializeReview(review, labels),
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
  reviewId: string,
  input: ReviewWrite,
  extras?: { files?: Express.Multer.File[]; keepImageIds?: string[] },
) {
  const data = assertReviewInput(input);
  const files = extras?.files ?? [];
  await assertPublishedExperience(experienceId);

  const existing = await reviewOwnedBy(reviewId, userId, experienceId);
  if (!existing) {
    throw ApiError.notFound("No tienes una reseña en esta experiencia.");
  }

  const assignedLocationId = await locationForUnassignedReview(existing, userId, experienceId, input.locationId);
  const write = assignedLocationId ? { ...data, locationId: assignedLocationId } : data;

  const currentImages = existing.images ?? [];
  const keepIds = extras?.keepImageIds;
  const kept = keepIds
    ? currentImages.filter((image) => keepIds.includes(image.id)).sort((left, right) => left.position - right.position)
    : currentImages;
  assertReviewPhotos(files, keepIds ? kept.length : currentImages.length);
  const removed = keepIds ? currentImages.filter((image) => !keepIds.includes(image.id)) : [];
  const uploaded = await storeReviewPhotos(files);

  try {
    const labels = sedeLabels(await sedesFor(experienceId));
    if (!files.length && keepIds === undefined) {
      const review = await prisma.experienceVisitorReview.update({
        where: { id: existing.id },
        data: write,
        include: reviewInclude,
      });
      return {
        review: serializeReview(review, labels),
        summary: await summaryFor(experienceId),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.experienceVisitorReview.update({
        where: { id: existing.id },
        data: write,
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
    const review = await reviewOwnedBy(existing.id, userId, experienceId);
    return {
      review: serializeReview(review ?? existing, labels),
      summary: await summaryFor(experienceId),
    };
  } catch (error) {
    await Promise.all(uploaded.map((item) => destroyStoredImage(item.publicId)));
    rethrowReviewWrite(error);
  }
}

export async function deleteVisitorReview(userId: string, experienceId: string, reviewId: string) {
  await assertPublishedExperience(experienceId);

  const existing = await reviewOwnedBy(reviewId, userId, experienceId);
  if (!existing) {
    throw ApiError.notFound("No tienes una reseña en esta experiencia.");
  }

  const photos = existing.images ?? [];
  await prisma.experienceVisitorReview.delete({ where: { id: existing.id } });
  await Promise.all(photos.map((image) => destroyStoredImage(image.publicId)));

  return { summary: await summaryFor(experienceId) };
}
