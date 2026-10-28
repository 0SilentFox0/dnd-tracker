import { type NextResponse } from "next/server";

import type { CreateCharacterInput } from "./create-character-schema";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/utils/api/api-response";

type Owner = { controlledBy: string } | { error: NextResponse };

export async function resolveCharacterOwner(campaignId: string, dmUserId: string, data: Pick<CreateCharacterInput, "type" | "controlledBy">): Promise<Owner> {
  if (data.type === CharacterType.NPC_HERO) return { controlledBy: dmUserId };

  const ownerId = data.controlledBy.trim();

  if (!ownerId) return { error: errorResponse("Оберіть гравця для персонажа типу «Гравець».", 400) };

  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });

  if (!owner) {
    return {
      error: errorResponse("Користувача з обраним ID немає в базі (наприклад, після зміни Supabase або міграції). Оновіть сторінку та оберіть гравця знову.", 400),
    };
  }

  const membership = await prisma.campaignMember.findFirst({ where: { campaignId, userId: ownerId }, select: { id: true } });

  if (!membership) return { error: errorResponse("Обраний користувач не є учасником цієї кампанії.", 400) };

  return { controlledBy: ownerId };
}
