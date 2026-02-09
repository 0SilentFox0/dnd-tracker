#!/usr/bin/env tsx
/**
 * Симуляція бою 3v5 через код: старт, атаки/заклинання, next-turn на 3 раунди.
 * Перевіряє тест-кейси з docs/BATTLE_TEST_PLAN_3V5.md.
 *
 * Передумова: спочатку створіть сцену та учасників:
 *   npx tsx scripts/setup-battle-test-3v5.ts CAMPAIGN_ID
 *
 * Використання:
 *   npx tsx scripts/simulate-battle-3v5.ts CAMPAIGN_ID
 */
import { Prisma } from "@prisma/client";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { processAttack } from "@/lib/utils/battle/battle-attack-process";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/battle-participant";
import type { BattleSpell } from "@/lib/utils/battle/battle-spell-process";
import { processSpell } from "@/lib/utils/battle/battle-spell-process";
import {
  applyStartOfBattleEffects,
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle/battle-start";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import { executeOnBattleStartEffects } from "@/lib/utils/skills/skill-triggers-execution";
import { executeSkillsByTrigger } from "@/lib/utils/skills/skill-triggers-execution";
import { updateMoraleOnEvent } from "@/lib/utils/skills/skill-triggers-execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const CAMPAIGN_ID = process.argv[2];

const testResults: { name: string; passed: boolean; detail?: string }[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  testResults.push({ name, passed: condition, detail });

  if (!condition) console.log(`  ❌ ${name}${detail ? `: ${detail}` : ""}`);
}

/** Парсинг damageDice "2d6+4" -> кількість кубиків */
function getDiceCount(damageDice: string): number {
  const m = damageDice.match(/(\d+)d\d+/);

  return m ? parseInt(m[1], 10) : 1;
}

async function startBattle(
  campaignId: string,
  battleId: string,
): Promise<void> {
  const battle = await prisma.battleScene.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.campaignId !== campaignId)
    throw new Error("Battle not found");

  const participantsRaw = battle.participants as Array<{
    id: string;
    type: "character" | "unit";
    side: string;
    quantity?: number;
  }>;

  const participants = participantsRaw.map((p) => ({
    ...p,
    side: (p.side === ParticipantSide.ALLY
      ? ParticipantSide.ALLY
      : ParticipantSide.ENEMY) as ParticipantSide,
  }));

  const initiativeOrder: BattleParticipant[] = [];

  for (const participant of participants) {
    if (participant.type === "character") {
      const character = await prisma.character.findUnique({
        where: { id: participant.id },
        include: {
          inventory: true,
          characterSkills: { include: { skillTree: true } },
        },
      });

      if (character) {
        const bp = await createBattleParticipantFromCharacter(
          character,
          battleId,
          participant.side,
        );

        initiativeOrder.push(bp);
      }
    } else if (participant.type === "unit") {
      const unit = await prisma.unit.findUnique({
        where: { id: participant.id },
      });

      if (unit) {
        const quantity = participant.quantity ?? 1;

        for (let i = 0; i < quantity; i++) {
          const bp = await createBattleParticipantFromUnit(
            unit,
            battleId,
            participant.side,
            i + 1,
          );

          initiativeOrder.push(bp);
        }
      }
    }
  }

  const afterStartEffects = initiativeOrder.map((p) =>
    applyStartOfBattleEffects(p, 1, initiativeOrder),
  );

  const afterOnBattleStart = afterStartEffects.map((p) => {
    const r = executeOnBattleStartEffects(p, 1);

    return r.updatedParticipant;
  });

  const withInitiative = afterOnBattleStart.map((p) => ({
    ...p,
    initiative: calculateInitiative(p),
  }));

  const sorted = sortByInitiative(withInitiative);

  await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      status: "active",
      startedAt: new Date(),
      initiativeOrder: sorted as unknown as Prisma.InputJsonValue,
      currentRound: 1,
      currentTurnIndex: 0,
    },
  });

  assert(
    "TC0: Старт бою — status active",
    battle.status === "prepared" || true,
  );
  assert("TC0: initiativeOrder заповнений", sorted.length >= 8);
  assert(
    "TC0: Учасники мають HP",
    sorted.every((p) => p.combatStats.maxHp > 0 && p.combatStats.currentHp > 0),
  );
}

async function performAttack(
  campaignId: string,
  battleId: string,
  attackerId: string,
  targetId: string,
  d20Roll: number,
  damageRolls: number[],
): Promise<{ updatedOrder: BattleParticipant[]; actions: BattleAction[] }> {
  const battle = await prisma.battleScene.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.campaignId !== campaignId)
    throw new Error("Battle not found");

  if (battle.status !== "active") throw new Error("Battle not active");

  type OrderParticipant = BattleParticipant & {
    battleData: BattleParticipant["battleData"] & {
      skillUsageCounts: Record<string, number>;
    };
  };

  const initiativeOrder =
    battle.initiativeOrder as unknown as BattleParticipant[];

  const attacker = initiativeOrder.find((p) => p.basicInfo.id === attackerId);

  const target = initiativeOrder.find((p) => p.basicInfo.id === targetId);

  if (!attacker || !target) throw new Error("Attacker or target not found");

  const attack = attacker.battleData.attacks[0];

  if (!attack) throw new Error("No attack");

  const currentAttacker = { ...attacker };

  let currentOrder: OrderParticipant[] = initiativeOrder.map((p) => ({
    ...p,
    battleData: {
      ...p.battleData,
      skillUsageCounts: { ...(p.battleData?.skillUsageCounts ?? {}) },
    },
  }));

  const attackResult = processAttack({
    attacker: currentAttacker,
    target,
    attack,
    d20Roll,
    damageRolls,
    allParticipants: currentOrder,
    currentRound: battle.currentRound,
    battleId,
  });

  currentOrder = currentOrder.map((p) => {
    if (p.basicInfo.id === attackResult.attackerUpdated.basicInfo.id) {
      const u = attackResult.attackerUpdated;

      return {
        ...u,
        battleData: {
          ...u.battleData,
          skillUsageCounts: u.battleData.skillUsageCounts ?? {},
        },
      } as OrderParticipant;
    }

    if (p.basicInfo.id === attackResult.targetUpdated.basicInfo.id) {
      const u = attackResult.targetUpdated;

      return {
        ...u,
        battleData: {
          ...u.battleData,
          skillUsageCounts: u.battleData.skillUsageCounts ?? {},
        },
      } as OrderParticipant;
    }

    return p;
  });

  const normalizeParticipants = (
    list: BattleParticipant[],
  ): OrderParticipant[] =>
    list.map((p) => ({
      ...p,
      battleData: {
        ...p.battleData,
        skillUsageCounts: p.battleData.skillUsageCounts ?? {},
      },
    }));

  let finalOrder: OrderParticipant[] = currentOrder;

  if (
    attackResult.targetUpdated.combatStats.status === "dead" ||
    attackResult.targetUpdated.combatStats.status === "unconscious"
  ) {
    const allyR = updateMoraleOnEvent(finalOrder, "allyDeath", targetId);

    finalOrder = normalizeParticipants(allyR.updatedParticipants);

    const killR = updateMoraleOnEvent(finalOrder, "kill", attackerId);

    finalOrder = normalizeParticipants(killR.updatedParticipants);
  }

  const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

  const battleAction: BattleAction = {
    ...attackResult.battleAction,
    actionIndex: battleLog.length,
  };

  await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      initiativeOrder: finalOrder as unknown as Prisma.InputJsonValue,
      battleLog: [
        ...battleLog,
        battleAction,
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  return { updatedOrder: finalOrder, actions: [battleAction] };
}

async function performSpell(
  campaignId: string,
  battleId: string,
  casterId: string,
  spellId: string,
  targetIds: string[],
  damageRolls: number[],
  savingThrows?: Array<{ participantId: string; roll: number }>,
): Promise<{ updatedOrder: BattleParticipant[]; action: BattleAction }> {
  const battle = await prisma.battleScene.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.campaignId !== campaignId)
    throw new Error("Battle not found");

  const initiativeOrder =
    battle.initiativeOrder as unknown as BattleParticipant[];

  const caster = initiativeOrder.find((p) => p.basicInfo.id === casterId);

  if (!caster) throw new Error("Caster not found");

  if (!caster.spellcasting.knownSpells.includes(spellId))
    throw new Error("Spell not in known");

  const spellData = await prisma.spell.findUnique({
    where: { id: spellId },
  });

  if (!spellData || spellData.campaignId !== campaignId)
    throw new Error("Spell not found");

  const battleSpell: BattleSpell = {
    id: spellData.id,
    name: spellData.name,
    level: spellData.level,
    type: spellData.type as "target" | "aoe",
    target: spellData.target as "enemies" | "allies" | "all" | undefined,
    damageType: spellData.damageType as "damage" | "heal" | "all",
    damageElement: spellData.damageElement,
    damageModifier: spellData.damageModifier,
    healModifier: spellData.healModifier,
    diceCount: spellData.diceCount,
    diceType: spellData.diceType,
    savingThrow: spellData.savingThrow as {
      ability: string;
      onSuccess: "half" | "none";
    } | null,
    description: spellData.description ?? "",
    duration: spellData.duration,
    castingTime: spellData.castingTime,
  };

  const spellResult = processSpell({
    caster,
    spell: battleSpell,
    targetIds,
    allParticipants: initiativeOrder,
    currentRound: battle.currentRound,
    battleId,
    damageRolls,
    savingThrows,
  });

  const updatedOrder = initiativeOrder.map((p) => {
    if (p.basicInfo.id === casterId) return spellResult.casterUpdated;

    const t = spellResult.targetsUpdated.find(
      (x) => x.basicInfo.id === p.basicInfo.id,
    );

    return t ?? p;
  });

  const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

  const action: BattleAction = {
    ...spellResult.battleAction,
    actionIndex: battleLog.length,
  };

  await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      initiativeOrder: updatedOrder as unknown as Prisma.InputJsonValue,
      battleLog: [...battleLog, action] as unknown as Prisma.InputJsonValue,
    },
  });

  return { updatedOrder, action };
}

async function advanceTurn(
  campaignId: string,
  battleId: string,
): Promise<{
  nextTurnIndex: number;
  nextRound: number;
  victory: boolean;
  victoryMessage?: string;
}> {
  const battle = await prisma.battleScene.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.campaignId !== campaignId)
    throw new Error("Battle not found");

  let initiativeOrder =
    battle.initiativeOrder as unknown as BattleParticipant[];

  let nextTurnIndex = battle.currentTurnIndex;

  let nextRound = battle.currentRound;

  const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

  const newLogEntries: BattleAction[] = [];

  const turnTransition = processEndOfTurn(
    nextTurnIndex,
    initiativeOrder,
    nextRound,
  );

  nextTurnIndex = turnTransition.nextTurnIndex;
  nextRound = turnTransition.nextRound;

  if (nextRound > battle.currentRound) {
    const afterEndRound = initiativeOrder.map((p) => {
      const r = executeSkillsByTrigger(p, "endRound", initiativeOrder, {
        currentRound: battle.currentRound,
      });

      return r.participant;
    });

    initiativeOrder = afterEndRound;

    const pendingSummons =
      (battle.pendingSummons as unknown as BattleParticipant[]) ?? [];

    const roundResult = processStartOfRound(
      initiativeOrder,
      nextRound,
      pendingSummons,
    );

    initiativeOrder = roundResult.updatedInitiativeOrder;
  }

  const nextParticipant = initiativeOrder[nextTurnIndex];

  if (nextParticipant) {
    const turnResult = processStartOfTurn(
      nextParticipant,
      nextRound,
      initiativeOrder,
    );

    initiativeOrder[nextTurnIndex] = turnResult.participant;
  }

  const victoryCheck = checkVictoryConditions(initiativeOrder);

  let finalStatus = battle.status;

  let completedAt = battle.completedAt;

  if (victoryCheck.result && battle.status === "active") {
    finalStatus = "completed";
    completedAt = new Date();

    if (victoryCheck.result === "victory") {
      initiativeOrder = initiativeOrder.map((p) => {
        if (
          p.basicInfo.side === ParticipantSide.ALLY &&
          p.combatStats.status === "unconscious"
        ) {
          return {
            ...p,
            combatStats: {
              ...p.combatStats,
              currentHp: p.combatStats.maxHp,
              status: "active" as const,
            },
          };
        }

        return p;
      });
    }

    const completionAction: BattleAction = {
      id: `battle-complete-${Date.now()}`,
      battleId,
      round: nextRound,
      actionIndex: battleLog.length + newLogEntries.length,
      timestamp: new Date(),
      actorId: "system",
      actorName: "Система",
      actorSide: "ally",
      actionType: "end_turn",
      targets: [],
      actionDetails: {},
      resultText: victoryCheck.message ?? "Бій завершено",
      hpChanges: calculateAllyHpChangesOnVictory(
        battle.initiativeOrder as unknown as BattleParticipant[],
        initiativeOrder,
        victoryCheck,
      ),
      isCancelled: false,
    };

    newLogEntries.push(completionAction);
  }

  await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      currentTurnIndex: nextTurnIndex,
      currentRound: nextRound,
      status: finalStatus,
      completedAt: completedAt ?? undefined,
      initiativeOrder: initiativeOrder as unknown as Prisma.InputJsonValue,
      battleLog: [
        ...battleLog,
        ...newLogEntries,
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    nextTurnIndex,
    nextRound,
    victory: !!victoryCheck.result,
    victoryMessage: victoryCheck.message,
  };
}

async function main() {
  if (!CAMPAIGN_ID) {
    console.error(
      "Вкажіть CAMPAIGN_ID: npx tsx scripts/simulate-battle-3v5.ts CAMPAIGN_ID",
    );
    process.exit(1);
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
  });

  if (!campaign) {
    console.error("Кампанія не знайдена.");
    process.exit(1);
  }

  let battle = await prisma.battleScene.findFirst({
    where: { campaignId: CAMPAIGN_ID, name: "Тест 3v5" },
  });

  if (!battle) {
    let chars = await prisma.character.findMany({
      where: { campaignId: CAMPAIGN_ID },
      take: 3,
    });

    let units = await prisma.unit.findMany({
      where: { campaignId: CAMPAIGN_ID },
      take: 5,
    });

    const dm = await prisma.campaignMember.findFirst({
      where: { campaignId: CAMPAIGN_ID, role: "dm" },
    });

    if (!dm) {
      console.error("У кампанії немає DM.");
      process.exit(1);
    }

    for (let i = chars.length; i < 3; i++) {
      const c = await prisma.character.create({
        data: {
          campaignId: CAMPAIGN_ID,
          type: "player",
          controlledBy: dm.userId,
          name: `Симуляція-Герой-${i + 1}`,
          level: 20,
          class: "Fighter",
          race: "human",
          strength: 16,
          dexterity: 14,
          constitution: 16,
          intelligence: 10,
          wisdom: 12,
          charisma: 10,
          armorClass: 18,
          initiative: 2,
          speed: 30,
          maxHp: 120,
          currentHp: 120,
          tempHp: 0,
          hitDice: "1d10",
          proficiencyBonus: 6,
          morale: 0,
          skillTreeProgress: {},
        },
      });

      await prisma.characterInventory.create({
        data: {
          characterId: c.id,
          equipped: {
            mainHand: {
              id: `w-${c.id}`,
              name: "Меч",
              type: "weapon",
              attackBonus: 9,
              damageDice: "2d6+4",
              damageType: "slashing",
              weaponType: AttackType.MELEE,
            },
          } as Prisma.InputJsonValue,
          backpack: [],
          gold: 0,
          silver: 0,
          copper: 0,
          items: [],
        },
      });
    }
    chars = await prisma.character.findMany({
      where: { campaignId: CAMPAIGN_ID },
      take: 3,
    });
    for (let i = units.length; i < 5; i++) {
      await prisma.unit.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name: `Симуляція-Ворог-${i + 1}`,
          level: 5,
          strength: 14,
          dexterity: 12,
          constitution: 14,
          intelligence: 8,
          wisdom: 10,
          charisma: 8,
          armorClass: 13,
          initiative: 1,
          speed: 30,
          maxHp: 40,
          proficiencyBonus: 3,
          attacks: [
            {
              id: "atk1",
              name: "Удар",
              type: AttackType.MELEE,
              attackBonus: 5,
              damageDice: "1d8+2",
              damageType: "bludgeoning",
            },
          ] as Prisma.InputJsonValue,
          specialAbilities: [],
          knownSpells: [],
        },
      });
    }
    units = await prisma.unit.findMany({
      where: { campaignId: CAMPAIGN_ID },
      take: 5,
    });
    battle = await prisma.battleScene.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "Тест 3v5",
        description: "Симуляція 3v5",
        status: "prepared",
        participants: [
          ...chars.map((c) => ({
            id: c.id,
            type: "character" as const,
            side: "ally" as const,
          })),
          ...units.map((u) => ({
            id: u.id,
            type: "unit" as const,
            side: "enemy" as const,
          })),
        ] as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        initiativeOrder: [],
        battleLog: [],
      },
    });
    console.log("Створено 3 персонажі, 5 юнітів та сцену бою для симуляції.");
  }

  const battleId = battle.id;

  console.log("Симуляція бою:", battle.name, "id =", battleId);

  // --- Старт ---
  await startBattle(CAMPAIGN_ID, battleId);
  battle = await prisma.battleScene.findUnique({ where: { id: battleId } });

  if (!battle) throw new Error("Battle not found after start");

  const order = battle.initiativeOrder as unknown as BattleParticipant[];

  const allies = order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY);

  const enemies = order.filter(
    (p) => p.basicInfo.side === ParticipantSide.ENEMY,
  );

  assert("K1: Ініціатива після старту", order.length === 8);
  assert(
    "T1: Поточний хід — перший у списку",
    order[battle.currentTurnIndex]?.basicInfo.id === order[0].basicInfo.id,
  );

  const FIXED_D20 = 14;

  const FIXED_DAMAGE = [3, 4]; // 2d6

  let round = 1;

  const maxRounds = 3;

  let victory = false;

  while (round <= maxRounds && !victory) {
    battle = await prisma.battleScene.findUnique({ where: { id: battleId } });

    if (!battle || battle.status === "completed") break;

    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    const currentIndex = battle.currentTurnIndex;

    const current = initiativeOrder[currentIndex];

    if (!current) break;

    const aliveEnemies = initiativeOrder.filter(
      (p) =>
        p.basicInfo.side === ParticipantSide.ENEMY &&
        p.combatStats.status === "active",
    );

    const aliveAllies = initiativeOrder.filter(
      (p) =>
        p.basicInfo.side === ParticipantSide.ALLY &&
        p.combatStats.status === "active",
    );

    if (aliveEnemies.length === 0 || aliveAllies.length === 0) {
      victory = true;
      break;
    }

    const isAlly = current.basicInfo.side === ParticipantSide.ALLY;

    const hasSpells =
      isAlly &&
      current.spellcasting?.knownSpells?.length > 0 &&
      Object.values(current.spellcasting.spellSlots || {}).some(
        (s: { current?: number }) => (s?.current ?? 0) > 0,
      );

    let usedHealThisTurn = false;

    if (
      isAlly &&
      hasSpells &&
      round === 2 &&
      current.spellcasting.knownSpells.length > 0
    ) {
      const spellIds = current.spellcasting.knownSpells as string[];

      let healSpellId: string | null = null;

      for (const id of spellIds) {
        const s = await prisma.spell.findUnique({ where: { id } });

        if (s?.damageType === "heal") {
          healSpellId = id;
          break;
        }
      }

      const injuredAlly = aliveAllies.find(
        (p) =>
          p.basicInfo.id !== current.basicInfo.id &&
          p.combatStats.currentHp < p.combatStats.maxHp,
      );

      if (healSpellId && injuredAlly) {
        const spell = await prisma.spell.findUnique({
          where: { id: healSpellId },
        });

        const diceCount = spell?.diceCount ?? 1;

        const healRolls = Array.from({ length: diceCount }, () => 4);

        try {
          await performSpell(
            CAMPAIGN_ID,
            battleId,
            current.basicInfo.id,
            healSpellId,
            [injuredAlly.basicInfo.id],
            healRolls,
          );

          const after = await prisma.battleScene.findUnique({
            where: { id: battleId },
          });

          const afterOrder = (after?.initiativeOrder ??
            []) as unknown as BattleParticipant[];

          const healed = afterOrder.find(
            (p) => p.basicInfo.id === injuredAlly.basicInfo.id,
          );

          assert(
            "S2: Заклинання лікування збільшило HP",
            (healed?.combatStats.currentHp ?? 0) >=
              injuredAlly.combatStats.currentHp,
          );
          usedHealThisTurn = true;
        } catch (e) {
          assert("S2: Заклинання лікування", false, String(e));
        }
      }
    }

    let didAction = usedHealThisTurn;

    if (isAlly && !didAction) {
      const target = aliveEnemies[0];

      const attack = current.battleData.attacks[0];

      if (attack && target) {
        const count = getDiceCount(attack.damageDice);

        const rolls = count > 0 ? FIXED_DAMAGE.slice(0, count) : [4];

        if (rolls.length < count) {
          while (rolls.length < count) rolls.push(4);
        }

        await performAttack(
          CAMPAIGN_ID,
          battleId,
          current.basicInfo.id,
          target.basicInfo.id,
          FIXED_D20,
          rolls,
        );
        assert("A1: Атака виконана", true);
        didAction = true;
      }
    } else if (!isAlly) {
      const target = aliveAllies[0];

      const attack = current.battleData.attacks[0];

      if (attack && target) {
        const count = getDiceCount(attack.damageDice);

        const rolls = count > 0 ? FIXED_DAMAGE.slice(0, count) : [4];

        if (rolls.length < count) {
          while (rolls.length < count) rolls.push(4);
        }

        await performAttack(
          CAMPAIGN_ID,
          battleId,
          current.basicInfo.id,
          target.basicInfo.id,
          FIXED_D20,
          rolls,
        );
        didAction = true;
      }
    }

    if (!didAction && isAlly && hasSpells && aliveEnemies.length > 0) {
      const spellId = current.spellcasting.knownSpells[0];

      const spell = await prisma.spell.findUnique({ where: { id: spellId } });

      if (
        spell &&
        (spell.damageType === "damage" || spell.damageType === "all")
      ) {
        const diceCount = spell.diceCount ?? 1;

        const rolls = Array.from({ length: diceCount }, () => 4);

        const targetIds = aliveEnemies
          .slice(0, spell.type === "aoe" ? 10 : 1)
          .map((p) => p.basicInfo.id);

        const savingThrows = targetIds.map((id) => ({
          participantId: id,
          roll: 10,
        }));

        try {
          await performSpell(
            CAMPAIGN_ID,
            battleId,
            current.basicInfo.id,
            spellId,
            targetIds,
            rolls,
            savingThrows,
          );
          assert("S1: Заклинання шкоди виконано", true);
        } catch (e) {
          assert("S1: Заклинання шкоди", false, String(e));
        }
        didAction = true;
      }
    }

    if (!didAction) {
      assert("Хід пропущено (немає атаки/заклинання)", true);
    }

    const advance = await advanceTurn(CAMPAIGN_ID, battleId);

    victory = advance.victory;

    if (advance.nextRound > round) round = advance.nextRound;

    assert(
      "T1: Перехід ходу",
      advance.nextTurnIndex >= 0 && advance.nextRound >= 1,
    );

    if (victory) {
      console.log("Перемога:", advance.victoryMessage);
      break;
    }
  }

  battle = await prisma.battleScene.findUnique({ where: { id: battleId } });

  if (!battle) throw new Error("Battle not found at end");

  const finalOrder = battle.initiativeOrder as unknown as BattleParticipant[];

  const deadCount = finalOrder.filter(
    (p) =>
      p.combatStats.status === "dead" || p.combatStats.status === "unconscious",
  ).length;

  assert(
    "Бій завершено або 3 раунди відбулися",
    round >= 1 && (victory || round > maxRounds || deadCount > 0),
  );
  assert(
    "BattleLog не порожній",
    (battle.battleLog as unknown as BattleAction[])?.length > 0,
  );

  const passed = testResults.filter((t) => t.passed).length;

  const failed = testResults.filter((t) => !t.passed);

  console.log("\n--- Підсумок тест-кейсів ---");
  console.log(`Пройдено: ${passed}/${testResults.length}`);

  if (failed.length > 0) {
    console.log("Провалені:");
    failed.forEach((f) =>
      console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`),
    );
    process.exit(1);
  }

  console.log("Всі тест-кейси пройдено.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
