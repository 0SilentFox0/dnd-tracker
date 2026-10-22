import { Prisma } from "@prisma/client";

import "server-only";
import { BattleStatus } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { checklistKey, PLAYER_SHEET_SEEN_KEY } from "@/lib/onboarding/flag-keys";
import type { DmFacts, OnboardingFacts } from "@/lib/onboarding/types";

type ChecklistFlag = { checklistFlag: string | null };

export type OnboardingSnapshot = { facts: OnboardingFacts; checklistFlag: string | null };

const checklistFlagSql = (campaignId: string, userId: string) =>
  Prisma.sql`(SELECT value FROM user_onboarding_flags WHERE "userId" = ${userId} AND key = ${checklistKey(campaignId)}) AS "checklistFlag"`;

// один запит (факти + прапорці) замість кількох: на Vercel connection_limit = 1, тож окремі запити йшли б послідовно
async function readDmRow(campaignId: string, userId: string): Promise<DmFacts & ChecklistFlag> {
  const [row] = await prisma.$queryRaw<(DmFacts & ChecklistFlag)[]>(Prisma.sql`
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
      (SELECT count(*)::int FROM ai_credentials WHERE "userId" = ${userId}) AS "aiKeys",
      ${checklistFlagSql(campaignId, userId)}
  `);

  return row;
}

type PlayerRow = { activeCharacter: number; pendingCharacter: number; joinedBattle: number; sheetSeen: boolean } & ChecklistFlag;

async function readPlayerRow(campaignId: string, userId: string): Promise<PlayerRow> {
  const [row] = await prisma.$queryRaw<PlayerRow[]>(Prisma.sql`
    SELECT
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND type = ${CharacterType.PLAYER} AND status = ${CharacterStatus.ACTIVE}) AS "activeCharacter",
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND status = ${CharacterStatus.PENDING}) AS "pendingCharacter",
      (SELECT count(*)::int FROM battle_participants p JOIN battle_scenes b ON b.id = p."battleId"
        WHERE b."campaignId" = ${campaignId} AND b.status IN (${BattleStatus.ACTIVE}, ${BattleStatus.COMPLETED}) AND p."controlledBy" = ${userId}) AS "joinedBattle",
      EXISTS (SELECT 1 FROM user_onboarding_flags WHERE "userId" = ${userId} AND key = ${PLAYER_SHEET_SEEN_KEY}) AS "sheetSeen",
      ${checklistFlagSql(campaignId, userId)}
  `);

  return row;
}

export async function readOnboardingSnapshot(campaignId: string, userId: string, isDM: boolean): Promise<OnboardingSnapshot> {
  if (isDM) {
    const { checklistFlag, ...dm } = await readDmRow(campaignId, userId);

    return { facts: { role: "dm", dm }, checklistFlag };
  }

  const row = await readPlayerRow(campaignId, userId);

  return {
    facts: {
      role: "player",
      player: {
        ownCharacter: row.activeCharacter > 0 ? "active" : row.pendingCharacter > 0 ? "pending" : "none",
        sheetSeen: row.sheetSeen,
        joinedBattle: row.joinedBattle > 0,
      },
    },
    checklistFlag: row.checklistFlag,
  };
}
