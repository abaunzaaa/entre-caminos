import type { Request, Response } from "express";
import * as categoryService from "../services/category.service.js";
import { parseLimitQuery } from "../utils/query.js";

export async function listPublic(_req: Request, res: Response) {
  const categories = await categoryService.listCategories({ includeHidden: false });
  return res.json({ success: true, data: { categories } });
}

export async function listAdmin(req: Request, res: Response) {
  const take = parseLimitQuery(req.query.limit);
  const categories = await categoryService.listCategories({
    includeHidden: true,
    take,
    viewer: req.user,
  });
  return res.json({ success: true, data: { categories } });
}

export async function getById(req: Request, res: Response) {
  const category = await categoryService.getCategory(req.params.id, { approvedOnly: true });
  return res.json({ success: true, data: { category } });
}

export async function create(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.user!, req.body);
  return res.status(201).json({ success: true, data: { category } });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(req.user!, req.params.id, req.body);
  return res.json({ success: true, data: { category } });
}

export async function approve(req: Request, res: Response) {
  const category = await categoryService.approveCategory(req.user!, req.params.id);
  return res.json({ success: true, data: { category } });
}

export async function reject(req: Request, res: Response) {
  const category = await categoryService.rejectCategory(req.user!, req.params.id, req.body.reason);
  return res.json({ success: true, data: { category } });
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(req.user!, req.params.id);
  return res.json({ success: true, message: "Categoría eliminada" });
}
