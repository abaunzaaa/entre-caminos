import type { Request, Response } from "express";
import * as categoryService from "../services/category.service.js";

export async function listPublic(_req: Request, res: Response) {
  const categories = await categoryService.listCategories({ includeInactive: false });
  return res.json({ success: true, data: { categories } });
}

export async function listAdmin(_req: Request, res: Response) {
  const categories = await categoryService.listCategories({ includeInactive: true });
  return res.json({ success: true, data: { categories } });
}

export async function getById(req: Request, res: Response) {
  const category = await categoryService.getCategory(req.params.id);
  return res.json({ success: true, data: { category } });
}

export async function create(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.user!.id, req.body);
  return res.status(201).json({ success: true, data: { category } });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(req.user!.id, req.params.id, req.body);
  return res.json({ success: true, data: { category } });
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(req.user!.id, req.params.id);
  return res.json({ success: true, message: "Categoría eliminada" });
}
