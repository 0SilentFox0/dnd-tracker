import type { Prisma } from "@prisma/client";

export const characteristicsJson = (c: object) => c as Prisma.InputJsonObject;
