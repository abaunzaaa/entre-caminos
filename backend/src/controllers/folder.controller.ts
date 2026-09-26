import type { Request, Response } from "express";
import * as folderService from "../services/folder.service.js";

export async function list(req: Request, res: Response) {
  const folders = await folderService.listFolders(req.user!.id);
  return res.json({ success: true, data: { folders } });
}

export async function create(req: Request, res: Response) {
  const folder = await folderService.createFolder(req.user!.id, req.body);
  return res.status(201).json({ success: true, data: { folder } });
}

export async function update(req: Request, res: Response) {
  const folder = await folderService.updateFolder(req.user!.id, req.params.id, req.body);
  return res.json({ success: true, data: { folder } });
}

export async function remove(req: Request, res: Response) {
  await folderService.deleteFolder(req.user!.id, req.params.id);
  return res.json({ success: true });
}
