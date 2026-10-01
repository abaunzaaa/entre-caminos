import type { Request, Response } from "express";
import * as collectionService from "../services/favorite-collection.service.js";
import { ApiError } from "../utils/api-error.js";

function readName(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }
  const name = (body as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function readExperienceId(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const experienceId = (body as { experienceId?: unknown }).experienceId;
  return typeof experienceId === "string" && experienceId.trim() ? experienceId.trim() : undefined;
}

function readCollectionIds(body: unknown) {
  if (!body || typeof body !== "object") {
    return [];
  }
  const value = (body as { collectionIds?: unknown }).collectionIds;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}

export async function list(req: Request, res: Response) {
  const collections = await collectionService.listCollections(req.user!.id);
  return res.json({ success: true, data: { collections } });
}

export async function getOne(req: Request, res: Response) {
  const collection = await collectionService.getCollection(req.user!.id, req.params.collectionId);
  return res.json({ success: true, data: { collection } });
}

export async function create(req: Request, res: Response) {
  const collection = await collectionService.createCollection(req.user!.id, {
    name: readName(req.body),
    experienceId: readExperienceId(req.body),
  });
  return res.status(201).json({ success: true, data: { collection } });
}

export async function rename(req: Request, res: Response) {
  const collection = await collectionService.renameCollection(
    req.user!.id,
    req.params.collectionId,
    readName(req.body),
  );
  return res.json({ success: true, data: { collection } });
}

export async function remove(req: Request, res: Response) {
  const data = await collectionService.deleteCollection(req.user!.id, req.params.collectionId);
  return res.json({ success: true, data });
}

export async function addExperience(req: Request, res: Response) {
  const experienceId = readExperienceId(req.body);
  if (!experienceId) {
    throw ApiError.badRequest("experienceId es obligatorio");
  }
  const collection = await collectionService.addExperienceToCollection(
    req.user!.id,
    req.params.collectionId,
    experienceId,
  );
  return res.status(201).json({ success: true, data: { collection } });
}

export async function removeExperience(req: Request, res: Response) {
  const collection = await collectionService.removeExperienceFromCollection(
    req.user!.id,
    req.params.collectionId,
    req.params.experienceId,
  );
  return res.json({ success: true, data: { collection } });
}

export async function setExperienceCollections(req: Request, res: Response) {
  const data = await collectionService.setExperienceCollections(
    req.user!.id,
    req.params.experienceId,
    readCollectionIds(req.body),
  );
  return res.json({ success: true, data });
}

export async function listForExperience(req: Request, res: Response) {
  const collectionIds = await collectionService.listCollectionsForExperience(
    req.user!.id,
    req.params.experienceId,
  );
  return res.json({ success: true, data: { collectionIds } });
}
