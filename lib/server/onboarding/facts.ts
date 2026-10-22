import { Prisma } from "@prisma/client";

import "server-only";
import { BattleStatus } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { PLAYER_SHEET_HINT_ID } from "@/lib/onboarding/checklists";
import { HIDE_ALL_HINTS_KEY, hintKey } from "@/lib/onboarding/flag-keys";
import type { DmFacts, OnboardingFacts } from "@/lib/onboarding/types";

// один запит замість 11 count: на Vercel connection_limit = 1, тож окремі count ішли б послідовно
async function readDmFacts(campaignId: string, userId: string): Promise<DmFacts> {
  const [row] = await prisma.$queryRaw<DmFacts[]>(Prisma.sql`
    SELECT
      (SELECT count(*)::int FROM races WHERE "campaignId" = ${campaignId}) AS races,
      (SELECT count(*)::int FROM units WHERE "campaignId" = ${campaignId}) AS units,
      (SELECT count(*)::int FROM campaign_members WHERE "campaignId" = ${campaignId} AND role = ${CampaignRole.PLAYER}) AS players,
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND type = ${CharacterType.PLAYER} AND status = ${CharacterStatus.ACTIVE}) AS "activePlayerCharacters",
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND status = ${CharacterStatus.PENDING}) AS "pendingDrafts",
      (SELECT count(*)::int FROM battle_scenes WHERE "campaignId" = ${campaignId}) AS battles,
      (SELECT count(*)::int FROM battle_scenes WHERE "campaignId" = ${campaignId} AND status IN (${BattleStatus.ACTIVE}, ${BattleStatus.COMPLETED})) AS "battlesStarted",
      (SELECT count(*)::int FROM scenario_pages WHERE "campaignId" = ${campaignId}) AS "scenarioPages",
      (SELECT count(*)::int FROM slide_decks WHERE "campaignId" = ${campaignId}) AS decks,
      (SELECT count(*)::int FROM campaign_tracks WHERE "campaignId" = ${campaignId}) AS tracks,
      (SELECT count(*)::int FROM ai_credentials WHERE "userId" = ${userId}) AS "aiKeys"
  `);

  return row;
}

type PlayerRow = { activeCharacter: number; pendingCharacter: number; inActiveBattle: number };

async function readPlayerRow(campaignId: string, userId: string): Promise<PlayerRow> {
  const [row] = await prisma.$queryRaw<PlayerRow[]>(Prisma.sql`
    SELECT
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND type = ${CharacterType.PLAYER} AND status = ${CharacterStatus.ACTIVE}) AS "activeCharacter",
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND status = ${CharacterStatus.PENDING}) AS "pendingCharacter",
      (SELECT count(*)::int FROM battle_participants p JOIN battle_scenes b ON b.id = p."battleId"
        WHERE b."campaignId" = ${campaignId} AND b.status = ${BattleStatus.ACTIVE} AND p."controlledBy" = ${userId}) AS "inActiveBattle"
  `);

  return row;
}

export async function readOnboardingFacts(campaignId: string, userId: string, isDM: boolean, flagKeys: Set<string>): Promise<OnboardingFacts> {
  if (isDM) return { role: "dm", dm: await readDmFacts(campaignId, userId) };

  const row = await readPlayerRow(campaignId, userId);

  return {
    role: "player",
    player: {
      ownCharacter: row.activeCharacter > 0 ? "active" : row.pendingCharacter > 0 ? "pending" : "none",
      sheetSeen: flagKeys.has(hintKey(PLAYER_SHEET_HINT_ID)) || flagKeys.has(HIDE_ALL_HINTS_KEY),
      inActiveBattle: row.inActiveBattle > 0,
    },
  };
}
