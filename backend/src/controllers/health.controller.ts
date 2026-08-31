import type { Request, Response } from "express";

export function health(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      service: "entre-caminos-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
}
