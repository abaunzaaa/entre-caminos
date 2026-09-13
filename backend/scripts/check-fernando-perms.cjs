const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: {
      OR: [
        { email: { contains: "fer", mode: "insensitive" } },
        { name: { contains: "fernando", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: {
        select: {
          name: true,
          permissions: { select: { permission: { select: { name: true } } } },
        },
      },
    },
  });

  const adminRole = await p.role.findUnique({
    where: { name: "ADMIN" },
    select: {
      name: true,
      permissions: { select: { permission: { select: { name: true } } } },
    },
  });

  console.log(
    JSON.stringify(
      {
        users: users.map((u) => ({
          ...u,
          permissions: u.role.permissions.map((x) => x.permission.name),
        })),
        adminRolePermissions: adminRole?.permissions.map((x) => x.permission.name) ?? [],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
