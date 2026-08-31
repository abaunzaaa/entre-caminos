import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const emails = [
  "angie.diaz@entrecaminos.com",
  "natalia.florez@entrecaminos.com",
  "juliana.casas@entrecaminos.com",
];

const users = await prisma.user.findMany({
  where: { email: { in: emails } },
  include: { role: true },
});

for (const email of emails) {
  const user = users.find((item) => item.email === email);
  if (!user) {
    console.log(`${email} MISSING`);
    continue;
  }
  console.log(`${email} ${user.role.name} ${user.status}`);
}

await prisma.$disconnect();
