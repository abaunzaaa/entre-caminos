import { z } from "zod";

const experienceContextSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().max(200).optional(),
    category: z.string().trim().max(120).optional(),
    location: z.string().trim().max(200).optional(),
    price: z.union([z.string(), z.number()]).optional(),
    duration: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).optional(),
    availableDays: z.unknown().optional(),
    howToGetThere: z.string().trim().max(800).optional(),
    imageUrl: z.string().trim().max(500).optional(),
  })
  .optional();

export const assistantChatSchema = z
  .object({
    message: z.string().trim().max(1200).optional(),
    conversationId: z.string().uuid().optional(),
    regenerate: z.boolean().optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().max(4000),
        }),
      )
      .max(20)
      .optional()
      .default([]),
    experienceId: z.string().trim().min(8).max(80).optional(),
    context: z
      .object({
        mode: z.enum(["general", "experience"]).optional(),
        experience: experienceContextSchema,
      })
      .optional(),
    location: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        city: z.string().trim().max(80).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.regenerate && !value.message?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe un mensaje",
        path: ["message"],
      });
    }
  });

export const createConversationSchema = z.object({
  contextType: z.enum(["general", "experience"]).optional(),
  experienceId: z.string().trim().min(8).max(80).optional(),
  experienceName: z.string().trim().max(200).optional(),
  experienceData: experienceContextSchema,
  starter: z.enum(["plan", "search", "nearby", "interests"]).optional(),
});

export const updateConversationSchema = z.object({
  favorite: z.boolean().optional(),
  pinned: z.boolean().optional(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(80).optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const folderIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(40).optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
});
