import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_MESSAGE_MAX } from "../../src/config/constants.js";
import { visitorReviewSchema } from "../../src/validators/visitor-review.validator.js";

type ReviewRow = {
  id: string;
  userId: string;
  experienceId: string;
  rating: number;
  organizationRating: number | null;
  valueRating: number | null;
  recommended: boolean | null;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; avatarUrl: string | null };
  images?: Array<{ id: string; imageUrl: string; publicId: string | null; position: number }>;
};

function completeInput(input: { rating: number; comment: string; organizationRating?: number; valueRating?: number; recommended?: boolean }) {
  return {
    organizationRating: 4,
    valueRating: 4,
    recommended: true,
    ...input,
  };
}

const users: Record<string, { id: string; name: string; avatarUrl: string | null }> = {
  "user-a": { id: "user-a", name: "Ana", avatarUrl: null },
  "user-b": { id: "user-b", name: "Luis", avatarUrl: null },
};

const harness = vi.hoisted(() => {
  const state = {
    published: new Set<string>(),
    visits: [] as Array<{ userId: string; experienceId: string }>,
    reviews: [] as ReviewRow[],
    sequence: 1,
  };

  const prismaMock = {
    experience: { findFirst: vi.fn() },
    experienceVisit: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    experienceVisitorReview: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return { state, prismaMock };
});

const uploadHarness = vi.hoisted(() => ({
  persistReviewImage: vi.fn(async (file: { originalname: string }) => ({
    url: `https://cdn.example/${file.originalname}`,
    publicId: `reviews/${file.originalname}`,
  })),
  destroyStoredImage: vi.fn(async () => undefined),
}));

vi.mock("../../src/database/prisma.js", () => ({
  prisma: harness.prismaMock,
}));

vi.mock("../../src/services/upload.service.js", () => uploadHarness);

import { VISITOR_REVIEW_MESSAGES } from "../../src/validators/visitor-review.validator.js";
import { VISIT_HAS_REVIEW_CODE } from "../../src/services/visit.service.js";
import { removeVisit } from "../../src/services/visit.service.js";
import {
  createVisitorReview,
  deleteVisitorReview,
  listVisitorReviews,
  updateVisitorReview,
} from "../../src/services/visitor-review.service.js";

const { state, prismaMock } = harness;

function keyOf(where: { experienceId_userId?: { experienceId: string; userId: string } }) {
  return where.experienceId_userId;
}

function wireMocks() {
  prismaMock.experience.findFirst.mockReset();
  prismaMock.experience.findFirst.mockImplementation(async (args: { where: { id: string; status?: string } }) => {
    if (args.where.status === "PUBLISHED" && state.published.has(args.where.id)) {
      return { id: args.where.id };
    }
    return null;
  });

  prismaMock.experienceVisit.findUnique.mockReset();
  prismaMock.experienceVisit.findUnique.mockImplementation(
    async (args: { where: { experienceId_userId: { experienceId: string; userId: string } } }) => {
      const key = args.where.experienceId_userId;
      const found = state.visits.some((visit) => visit.userId === key.userId && visit.experienceId === key.experienceId);
      return found ? { id: `visit-${key.userId}` } : null;
    },
  );

  prismaMock.experienceVisit.deleteMany.mockReset();
  prismaMock.experienceVisit.deleteMany.mockImplementation(async (args: { where: { userId: string; experienceId: string } }) => {
    const before = state.visits.length;
    state.visits = state.visits.filter(
      (visit) => !(visit.userId === args.where.userId && visit.experienceId === args.where.experienceId),
    );
    return { count: before - state.visits.length };
  });

  prismaMock.experienceVisitorReview.findUnique.mockReset();
  prismaMock.experienceVisitorReview.findUnique.mockImplementation(async (args: { where: { experienceId_userId?: { experienceId: string; userId: string } } }) => {
    const key = keyOf(args.where);
    if (!key) {
      return null;
    }
    return state.reviews.find((review) => review.userId === key.userId && review.experienceId === key.experienceId) ?? null;
  });

  prismaMock.experienceVisitorReview.findMany.mockReset();
  prismaMock.experienceVisitorReview.findMany.mockImplementation(async (args: { where: { experienceId: string } }) => {
    return state.reviews
      .filter((review) => review.experienceId === args.where.experienceId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  });

  prismaMock.experienceVisitorReview.aggregate.mockReset();
  prismaMock.experienceVisitorReview.aggregate.mockImplementation(async (args: { where: { experienceId: string } }) => {
    const rows = state.reviews.filter((review) => review.experienceId === args.where.experienceId);
    const count = rows.length;
    const average = count ? rows.reduce((sum, review) => sum + review.rating, 0) / count : null;
    return { _avg: { rating: average }, _count: { _all: count } };
  });

  prismaMock.experienceVisitorReview.create.mockReset();
  prismaMock.experienceVisitorReview.create.mockImplementation(
    async (args: {
      data: {
        userId: string;
        experienceId: string;
        rating: number;
        organizationRating: number;
        valueRating: number;
        recommended: boolean;
        comment: string;
      };
    }) => {
      const duplicate = state.reviews.some(
        (review) => review.userId === args.data.userId && review.experienceId === args.data.experienceId,
      );
      if (duplicate) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        });
      }
      const now = new Date();
      const row: ReviewRow = {
        id: `review-${state.sequence++}`,
        userId: args.data.userId,
        experienceId: args.data.experienceId,
        rating: args.data.rating,
        organizationRating: args.data.organizationRating,
        valueRating: args.data.valueRating,
        recommended: args.data.recommended,
        comment: args.data.comment,
        createdAt: now,
        updatedAt: now,
        user: users[args.data.userId],
      };
      state.reviews.push(row);
      return row;
    },
  );

  prismaMock.experienceVisitorReview.update.mockReset();
  prismaMock.experienceVisitorReview.update.mockImplementation(
    async (args: {
      where: { id: string };
      data: { rating: number; organizationRating: number; valueRating: number; recommended: boolean; comment: string };
    }) => {
      const row = state.reviews.find((review) => review.id === args.where.id);
      if (!row) {
        throw new Error("missing review");
      }
      row.rating = args.data.rating;
      row.organizationRating = args.data.organizationRating;
      row.valueRating = args.data.valueRating;
      row.recommended = args.data.recommended;
      row.comment = args.data.comment;
      row.updatedAt = new Date();
      return row;
    },
  );

  prismaMock.experienceVisitorReview.delete.mockReset();
  prismaMock.experienceVisitorReview.delete.mockImplementation(async (args: { where: { id: string } }) => {
    const index = state.reviews.findIndex((review) => review.id === args.where.id);
    if (index < 0) {
      throw new Error("missing review");
    }
    const [row] = state.reviews.splice(index, 1);
    return row;
  });
}

function seedReview(userId: string, experienceId: string, rating: number, comment: string) {
  const now = new Date("2026-10-01T12:00:00.000Z");
  const row: ReviewRow = {
    id: `review-${state.sequence++}`,
    userId,
    experienceId,
    rating,
    organizationRating: null,
    valueRating: null,
    recommended: null,
    comment,
    createdAt: now,
    updatedAt: now,
    user: users[userId],
  };
  state.reviews.push(row);
  return row;
}

beforeEach(() => {
  state.published = new Set(["exp-1"]);
  state.visits = [];
  state.reviews = [];
  state.sequence = 1;
  uploadHarness.persistReviewImage.mockClear();
  uploadHarness.destroyStoredImage.mockClear();
  wireMocks();
});

describe("HU-11 reseñas de visitantes", () => {
  it("cualquiera puede consultar reseñas sin sesión ni visita", async () => {
    seedReview("user-a", "exp-1", 5, "Volvería.");
    const data = await listVisitorReviews("exp-1");
    expect(data.mine).toBeNull();
    expect(data.summary).toEqual({ averageRating: 5, count: 1 });
    expect(data.reviews).toHaveLength(1);
    expect(data.reviews[0]?.comment).toBe("Volvería.");
    expect(data.reviews[0]?.score).toBe(5);
    expect(data.reviews[0]?.organizationRating).toBeNull();
    expect(data.reviews[0]?.valueRating).toBeNull();
    expect(data.reviews[0]?.recommended).toBeNull();
    expect(data.reviews[0]?.user).toEqual({ id: "user-a", name: "Ana", avatarUrl: null });
  });

  it("un usuario que no la visitó no puede crear reseña", async () => {
    await expect(
      createVisitorReview("user-a", "exp-1", completeInput({ rating: 5, comment: "Me encantó." })),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Marca esta experiencia como visitada para poder compartir tu reseña.",
    });
    expect(state.reviews).toHaveLength(0);
  });

  it("un usuario que la visitó puede crear su reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    const data = await createVisitorReview("user-a", "exp-1", completeInput({ rating: 4, comment: "Muy buena guía." }));
    expect(data.review.rating).toBe(4);
    expect(data.review.comment).toBe("Muy buena guía.");
    expect(data.summary).toEqual({ averageRating: 4, count: 1 });
    expect(state.visits).toEqual([{ userId: "user-a", experienceId: "exp-1" }]);
  });

  it("un usuario no puede crear dos reseñas de la misma experiencia", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    await createVisitorReview("user-a", "exp-1", completeInput({ rating: 4, comment: "Primera." }));
    await expect(
      createVisitorReview("user-a", "exp-1", completeInput({ rating: 2, comment: "Segunda." })),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(state.reviews).toHaveLength(1);
    expect(state.reviews[0]?.comment).toBe("Primera.");
  });

  it("si la restricción única de la base rechaza el duplicado, no se crea otra reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    prismaMock.experienceVisitorReview.findUnique.mockResolvedValueOnce(null);
    prismaMock.experienceVisitorReview.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(
      createVisitorReview("user-a", "exp-1", completeInput({ rating: 3, comment: "Carrera perdida." })),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(state.reviews).toHaveLength(0);
  });

  it("un fallo al guardar la reseña no usa el mensaje de experiencias", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    prismaMock.experienceVisitorReview.create.mockRejectedValueOnce(new Error("column comment does not exist"));
    await expect(
      createVisitorReview("user-a", "exp-1", completeInput({ rating: 4, comment: "Muy buena guía." })),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: VISITOR_REVIEW_MESSAGES.publishFailed,
    });
    expect(VISITOR_REVIEW_MESSAGES.publishFailed).not.toMatch(/datos de la experiencia/i);
  });

  it("la experiencia general acepta pasos de 0.5 entre 1 y 5", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    for (const rating of [0, 0.5, 4.2, 5.5, 6]) {
      await expect(
        createVisitorReview("user-a", "exp-1", completeInput({ rating, comment: "Texto." })),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: VISITOR_REVIEW_MESSAGES.ratingStep,
      });
    }
    expect(state.reviews).toHaveLength(0);
    const valid = { organizationRating: 4, valueRating: 3, recommended: true };
    for (const rating of [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
      expect(visitorReviewSchema.safeParse({ ...valid, rating, comment: "Bien." }).success).toBe(true);
    }
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 0, comment: "No." }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 0.5, comment: "No." }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 4.2, comment: "No." }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 5.5, comment: "No." }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 4, comment: "x".repeat(CONTACT_MESSAGE_MAX) }).success).toBe(true);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 4, comment: "x".repeat(CONTACT_MESSAGE_MAX + 1) }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ rating: 4, comment: "Bien." }).success).toBe(false);
    expect(visitorReviewSchema.safeParse({ ...valid, rating: 4, recommended: "sí", comment: "Bien." }).success).toBe(false);
  });

  it("el puntaje de la reseña pondera 70/15/15 y el promedio usa ese puntaje", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" }, { userId: "user-b", experienceId: "exp-1" });
    const first = await createVisitorReview(
      "user-a",
      "exp-1",
      completeInput({ rating: 5, organizationRating: 5, valueRating: 4, comment: "Casi perfecta." }),
    );
    expect(first.review.score).toBe(4.85);
    expect(first.summary.averageRating).toBe(4.9);

    const edited = await updateVisitorReview(
      "user-a",
      "exp-1",
      completeInput({ rating: 4.5, organizationRating: 5, valueRating: 5, comment: "Con media estrella." }),
    );
    expect(edited.review.rating).toBe(4.5);
    expect(edited.review.score).toBe(4.65);

    const second = await createVisitorReview(
      "user-b",
      "exp-1",
      completeInput({ rating: 5, organizationRating: 3, valueRating: 4, comment: "Otra." }),
    );
    expect(second.review.score).toBe(4.55);
    const listed = await listVisitorReviews("exp-1");
    expect(listed.summary).toEqual({ averageRating: 4.6, count: 2 });

    const even = await createVisitorReview(
      "user-a",
      "exp-2",
      completeInput({ rating: 3, organizationRating: 3, valueRating: 3, comment: "Pareja." }),
    ).catch(() => null);
    expect(even).toBeNull();
    state.published.add("exp-2");
    state.visits.push({ userId: "user-a", experienceId: "exp-2" });
    const balanced = await createVisitorReview(
      "user-a",
      "exp-2",
      completeInput({ rating: 3, organizationRating: 3, valueRating: 3, comment: "Pareja." }),
    );
    expect(balanced.review.score).toBe(3);
    expect(balanced.summary.averageRating).toBe(3);
  });

  it("puede editar su propia reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    await createVisitorReview("user-a", "exp-1", completeInput({ rating: 3, comment: "Regular." }));
    const data = await updateVisitorReview(
      "user-a",
      "exp-1",
      completeInput({ rating: 5, organizationRating: 5, valueRating: 5, comment: "La repetiría.", recommended: false }),
    );
    expect(data.review.comment).toBe("La repetiría.");
    expect(data.summary).toEqual({ averageRating: 5, count: 1 });
    expect(state.reviews[0]?.rating).toBe(5);
  });

  it("no puede editar la reseña de otra persona", async () => {
    seedReview("user-a", "exp-1", 5, "De Ana.");
    await expect(
      updateVisitorReview("user-b", "exp-1", completeInput({ rating: 1, comment: "La cambio." })),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(state.reviews[0]?.comment).toBe("De Ana.");
    expect(state.reviews[0]?.rating).toBe(5);
  });

  it("puede eliminar su propia reseña y la visita sigue marcada", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    await createVisitorReview("user-a", "exp-1", completeInput({ rating: 4, comment: "Buena." }));
    const data = await deleteVisitorReview("user-a", "exp-1");
    expect(data.summary).toEqual({ averageRating: null, count: 0 });
    expect(state.reviews).toHaveLength(0);
    expect(state.visits).toEqual([{ userId: "user-a", experienceId: "exp-1" }]);
  });

  it("no puede eliminar la reseña de otra persona", async () => {
    seedReview("user-a", "exp-1", 4, "De Ana.");
    await expect(deleteVisitorReview("user-b", "exp-1")).rejects.toMatchObject({ statusCode: 404 });
    expect(state.reviews).toHaveLength(1);
  });

  it("puede desmarcar Visitado si no tiene reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    await expect(removeVisit("user-a", "exp-1")).resolves.toEqual({ visited: false });
    expect(state.visits).toHaveLength(0);
  });

  it("no puede desmarcar Visitado mientras exista su reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    seedReview("user-a", "exp-1", 5, "Publicada.");
    await expect(removeVisit("user-a", "exp-1")).rejects.toMatchObject({
      statusCode: 409,
      code: VISIT_HAS_REVIEW_CODE,
    });
    expect(state.visits).toHaveLength(1);
    expect(state.reviews).toHaveLength(1);
  });

  it("no sube más de 5 fotos", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    const files = Array.from({ length: 6 }, (_, index) => ({
      originalname: `foto-${index}.jpg`,
      mimetype: "image/jpeg",
      size: 1200,
    })) as Express.Multer.File[];
    await expect(
      createVisitorReview("user-a", "exp-1", completeInput({ rating: 5, comment: "Con fotos." }), files),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: VISITOR_REVIEW_MESSAGES.photosMax,
    });
    expect(uploadHarness.persistReviewImage).not.toHaveBeenCalled();
    expect(state.reviews).toHaveLength(0);
  });

  it("guarda una reseña con una foto y elimina el recurso al borrar la reseña", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    const file = { originalname: "parada.jpg", mimetype: "image/jpeg", size: 1200 } as Express.Multer.File;
    await createVisitorReview("user-a", "exp-1", completeInput({ rating: 5, comment: "Con foto." }), [file]);
    expect(uploadHarness.persistReviewImage).toHaveBeenCalledTimes(1);
    expect(prismaMock.experienceVisitorReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          images: {
            create: [{ imageUrl: "https://cdn.example/parada.jpg", publicId: "reviews/parada.jpg", position: 0 }],
          },
        }),
      }),
    );
    const created = state.reviews[0];
    if (created) {
      created.images = [
        { id: "img-1", imageUrl: "https://cdn.example/parada.jpg", publicId: "reviews/parada.jpg", position: 0 },
      ];
    }
    await deleteVisitorReview("user-a", "exp-1");
    expect(uploadHarness.destroyStoredImage).toHaveBeenCalledWith("reviews/parada.jpg");
    expect(state.reviews).toHaveLength(0);
  });

  it("eliminar la reseña vuelve a permitir desmarcar Visitado", async () => {
    state.visits.push({ userId: "user-a", experienceId: "exp-1" });
    seedReview("user-a", "exp-1", 5, "Publicada.");
    await deleteVisitorReview("user-a", "exp-1");
    await expect(removeVisit("user-a", "exp-1")).resolves.toEqual({ visited: false });
    expect(state.visits).toHaveLength(0);
  });
});
