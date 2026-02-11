import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  type CampaignSpellContext,
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/battle-participant";
import {
  applyStartOfBattleEffects,
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle/battle-start";
import {
  executeOnBattleStartEffectsForAll,
  executeStartOfRoundTriggers,
} from "@/lib/utils/skills/skill-triggers-execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const participantsRaw = battle.participants as Array<{
      id: string;
      type: "character" | "unit";
      side: string;
      quantity?: number;
    }>;

    const participants = participantsRaw.map((p) => ({
      ...p,
      side: (p.side === ParticipantSide.ALLY ? ParticipantSide.ALLY : ParticipantSide.ENEMY) as ParticipantSide,
    }));

    const { charIds, unitIds } = participants.reduce(
      (acc, p) => {
        if (p.type === "character") acc.charIds.push(p.id);
        else acc.unitIds.push(p.id);
        return acc;
      },
      { charIds: [] as string[], unitIds: [] as string[] },
    );

    // Batch load characters and units
    const [characters, units] = await Promise.all([
      charIds.length > 0
        ? prisma.character.findMany({
            where: { id: { in: charIds } },
            include: {
              inventory: true,
              characterSkills: {
                include: { skillTree: true },
              },
            },
          })
        : [],
      unitIds.length > 0
        ? prisma.unit.findMany({
            where: { id: { in: unitIds } },
          })
        : [],
    ]);

    const characterMap = new Map(characters.map((c) => [c.id, c]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    // Collect all skill IDs and artifact IDs from characters (for batch load)
    const allSkillIds = new Set<string>();
    const allArtifactIds = new Set<string>();
    for (const c of characters) {
      const progress =
        (c.skillTreeProgress as Record<string, { unlockedSkills?: string[] }>) ??
        {};
      for (const prog of Object.values(progress)) {
        for (const sid of prog.unlockedSkills ?? []) {
          allSkillIds.add(sid);
        }
      }
      const personalId = (c as { personalSkillId?: string | null }).personalSkillId;
      if (personalId?.trim()) allSkillIds.add(personalId);
      const equipped =
        (c.inventory?.equipped as Record<string, string | unknown>) ?? {};
      for (const val of Object.values(equipped)) {
        if (typeof val === "string" && val) allArtifactIds.add(val);
      }
    }

    // Collect unique races from characters and units
    const uniqueRaces = new Set<string>();
    for (const c of characters) {
      if (c.race) uniqueRaces.add(c.race);
    }
    for (const u of units) {
      if (u.race) uniqueRaces.add(u.race);
    }

    // Batch load campaign context (races for all; spell tree data only for characters)
    const uniqueRaceNames = Array.from(uniqueRaces);
    const [races, campaign, ...characterContext] = await Promise.all([
      uniqueRaceNames.length > 0
        ? prisma.race.findMany({
            where: {
              campaignId: id,
              name: { in: uniqueRaceNames },
            },
          })
        : [],
      prisma.campaign.findUnique({
        where: { id },
        select: { maxLevel: true },
      }),
      ...(characters.length > 0
        ? [
            uniqueRaceNames.length > 0
              ? prisma.skillTree.findMany({
                  where: {
                    campaignId: id,
                    race: { in: uniqueRaceNames },
                  },
                })
              : [],
            prisma.mainSkill.findMany({
              where: { campaignId: id },
              select: { id: true, spellGroupId: true, name: true },
            }),
            prisma.spell.findMany({
              where: { campaignId: id },
              include: { spellGroup: { select: { id: true } } },
            }),
            prisma.skill.findMany({
              where: { campaignId: id },
              include: { spellGroup: { select: { id: true } } },
            }),
            allSkillIds.size > 0
              ? prisma.skill.findMany({
                  where: {
                    id: { in: Array.from(allSkillIds) },
                    campaignId: id,
                  },
                })
              : [],
            allArtifactIds.size > 0
              ? prisma.artifact.findMany({
                  where: {
                    id: { in: Array.from(allArtifactIds) },
                    campaignId: id,
                  },
                })
              : [],
          ]
        : []),
    ]);

    const racesByName: Record<string, (typeof races)[0] | null> = {};
    for (const r of races) {
      racesByName[r.name] = r;
    }
    for (const rn of uniqueRaceNames) {
      if (!(rn in racesByName)) racesByName[rn] = null;
    }

    let campaignContext: CampaignSpellContext | undefined;
    if (characters.length > 0 && characterContext.length >= 4) {
      const [skillTrees, mainSkills, spells, allSkills, batchSkills, batchArtifacts] =
        characterContext;
      const skillTreeByRace: Record<string, NonNullable<(typeof skillTrees)[number]> | null> = {};
      const treesArr = (Array.isArray(skillTrees) ? skillTrees : []) as Array<{ race: string }>;
      for (const st of treesArr) {
        if (st?.race) skillTreeByRace[st.race] = st as NonNullable<(typeof skillTrees)[number]>;
      }
      for (const rn of uniqueRaceNames) {
        if (!(rn in skillTreeByRace)) skillTreeByRace[rn] = null;
      }
      const skillsById: Record<string, Prisma.SkillGetPayload<object>> = {};
      const skillsArr = Array.isArray(batchSkills) ? batchSkills : [];
      for (const s of skillsArr) {
        if (s && typeof s === "object" && "id" in s) {
          skillsById[(s as { id: string }).id] = s as Prisma.SkillGetPayload<object>;
        }
      }
      const artifactsById: Record<string, Prisma.ArtifactGetPayload<object>> = {};
      const artifactsArr = Array.isArray(batchArtifacts) ? batchArtifacts : [];
      for (const a of artifactsArr) {
        if (a && typeof a === "object" && "id" in a) {
          artifactsById[(a as { id: string }).id] = a as Prisma.ArtifactGetPayload<object>;
        }
      }
      campaignContext = {
        skillTreeByRace: skillTreeByRace as CampaignSpellContext["skillTreeByRace"],
        mainSkills: mainSkills as CampaignSpellContext["mainSkills"],
        spells: spells as CampaignSpellContext["spells"],
        allSkills: allSkills as CampaignSpellContext["allSkills"],
        racesByName,
        campaign: { maxLevel: (campaign as { maxLevel?: number })?.maxLevel ?? 20 },
        skillsById: Object.keys(skillsById).length > 0 ? skillsById : undefined,
        artifactsById: Object.keys(artifactsById).length > 0 ? artifactsById : undefined,
      };
    }

    // Build participant slots and create in parallel
    type ParticipantSlot =
      | { type: "character"; character: (typeof characters)[number]; side: ParticipantSide }
      | { type: "unit"; unit: (typeof units)[number]; side: ParticipantSide; instanceNumber: number };
    const slots: ParticipantSlot[] = [];
    for (const participant of participants) {
      if (participant.type === "character") {
        const character = characterMap.get(participant.id);
        if (character) {
          slots.push({ type: "character", character, side: participant.side });
        }
      } else if (participant.type === "unit") {
        const unit = unitMap.get(participant.id);
        if (unit) {
          const quantity = participant.quantity || 1;
          for (let i = 0; i < quantity; i++) {
            slots.push({
              type: "unit",
              unit,
              side: participant.side,
              instanceNumber: i + 1,
            });
          }
        }
      }
    }

    const initiativeOrder = await Promise.all(
      slots.map((slot) =>
        slot.type === "character"
          ? createBattleParticipantFromCharacter(
              slot.character,
              battleId,
              slot.side,
              undefined,
              campaignContext,
            )
          : createBattleParticipantFromUnit(
              slot.unit,
              battleId,
              slot.side,
              slot.instanceNumber,
              uniqueRaceNames.length > 0 ? racesByName : undefined,
            ),
      ),
    );

    // Застосовуємо початкові ефекти для всіх учасників (start_of_battle тригери)
    const updatedInitiativeOrder = initiativeOrder.map((participant) => {
      return applyStartOfBattleEffects(participant, 1, initiativeOrder);
    });

    // Скіли з тригером onBattleStart (наприклад +2 ініціатива, бонус на перший удар)
    const { updatedParticipants: afterOnBattleStart, messages: onBattleStartMessages } =
      executeOnBattleStartEffectsForAll(updatedInitiativeOrder, 1);

    // Тригери початку раунду (раунд 1) — щоб бонуси ініціативи з startRound скілів потрапили до розрахунку
    const { updatedParticipants: afterStartOfRound, messages: startOfRoundMessages } =
      executeStartOfRoundTriggers(afterOnBattleStart, 1);

    // Збираємо всі повідомлення тригерів для логу бою
    const allTriggerMessages = [
      ...onBattleStartMessages,
      ...startOfRoundMessages,
    ].filter(Boolean);

    // Розраховуємо ініціативу з урахуванням спеціальних правил та ефектів
    const initiativeOrderWithCalculatedInitiative = afterStartOfRound.map(
      (participant) => {
        const calculatedInitiative = calculateInitiative(participant);

        return {
          ...participant,
          abilities: {
            ...participant.abilities,
            initiative: calculatedInitiative,
          },
        };
      }
    );

    // Сортуємо за ініціативою (initiative → baseInitiative → dexterity)
    const sortedInitiativeOrder = sortByInitiative(initiativeOrderWithCalculatedInitiative);

    // Записи логу бою: спрацювання тригерів на початку бою
    const triggerLogEntries: BattleAction[] = [];
    if (allTriggerMessages.length > 0) {
      triggerLogEntries.push({
        id: `triggers-start-${Date.now()}`,
        battleId,
        round: 1,
        actionIndex: 0,
        timestamp: new Date(),
        actorId: "system",
        actorName: "Система",
        actorSide: "ally",
        actionType: "ability",
        targets: [],
        actionDetails: { triggeredAbilities: [] },
        resultText: `Тригери початку бою: ${allTriggerMessages.join("; ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: undefined,
      });
    }

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "active",
        startedAt: new Date(),
        initiativeOrder: sortedInitiativeOrder as unknown as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        battleLog: triggerLogEntries as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-started", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error starting battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
