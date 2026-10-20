import { PrismaClient } from "@prisma/client";
import { seedFaqs } from "../prisma/seed.js";

const prisma = new PrismaClient();

const before = await prisma.faq.count({ where: { status: "PUBLISHED" } });
await seedFaqs();
const after = await prisma.faq.count({ where: { status: "PUBLISHED" } });
const categories = await prisma.faqCategory.findMany({
  orderBy: { sortOrder: "asc" },
  include: { _count: { select: { faqs: true } } },
});
console.log(JSON.stringify({
  before,
  after,
  categories: categories.map((category) => ({
    slug: category.slug,
    sort: category.sortOrder,
    faqs: category._count.faqs,
  })),
}));
await prisma.$disconnect();
