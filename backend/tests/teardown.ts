import { prisma } from "../src/database/prisma.js";

export default async function teardown() {
  await prisma.$disconnect();
}
