import { prisma } from "../database/prisma.js";

export async function recordAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
}) {
  await prisma.auditLog.create({ data: params });
}
