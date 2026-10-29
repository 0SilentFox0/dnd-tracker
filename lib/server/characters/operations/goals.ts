import type { Prisma } from "@prisma/client";

import { requireCharacterSelect } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { parseGoals, putGoalsSchema } from "@/lib/schemas/character-goals";
import { mergeDmGoals, mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

export const goalsOperation = defineCharacterOperation({
  name: "goals",
  action: "update character goals",
  schema: putGoalsSchema,
  parseMessage: API_ERRORS.CHARACTER_GOALS_INVALID,
  gate: ctx => requireCharacterSelect(ctx.campaignId, ctx.characterId, { id: true, campaignId: true, controlledBy: true, goals: true }, { ...gateOptions(ctx), notFound: API_ERRORS.NOT_FOUND, foreign404: true }),
  run: async ({ access, character }, parsed) => {
    const current = parseGoals(character.goals);

    const goals: CharacterGoal[] = access.isDM ? mergeDmGoals(current, parsed.goals, parsed.seen) : mergePlayerGoals(current, parsed.goals);

    const updated = await prisma.character.update({ where: { id: character.id }, data: { goals: goals as unknown as Prisma.InputJsonValue }, select: { goals: true } });

    return { goals: parseGoals(updated.goals) };
  },
});

export const PUT = characterRoute(goalsOperation);
