import type { Request, Response } from "express";
import * as contactService from "../services/contact.service.js";

export async function create(req: Request, res: Response) {
  const contact = await contactService.submitContact(req.body);

  return res.status(201).json({
    success: true,
    message: "Gracias por escribirnos. Pronto estaremos en contacto contigo.",
    data: {
      id: contact.id,
      kind: contact.type,
      createdAt: contact.createdAt,
    },
  });
}
