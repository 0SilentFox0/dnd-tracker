import "server-only";
import { prisma } from "@/lib/db";
import { paletteFor } from "@/lib/theme/palettes";
import type { PaletteId } from "@/types/theme";

export async function getUserPalette(userId: string): Promise<PaletteId> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { palette: true } });

  return paletteFor(user?.palette);
}

export async function saveUserPalette(userId: string, palette: PaletteId): Promise<boolean> {
  const result = await prisma.user.updateMany({ where: { id: userId }, data: { palette } });

  return result.count === 1;
}
