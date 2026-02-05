import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const artifacts = await prisma.artifact.findMany({
    where: { slot: "weapon" },
    take: 10,
  });

  console.log(
    "Found weapon artifacts:",
    artifacts.map((a) => ({ id: a.id, name: a.name })),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
