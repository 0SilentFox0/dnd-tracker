import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isCriticalHit,
  isCriticalMiss,
  isHit,
  rollDamage,
  getAbilityModifier,
  getAttackDamageModifier,
  getArtifactDamageBonus,
  getArtifactAttackBonus,
  getSkillTreeBonus,
} from "@/lib/utils/calculations";
import { Artifact, ArtifactModifier } from "@/lib/types/artifacts";
import { CharacterSkill } from "@/lib/types/skills";
import { EquippedItems } from "@/lib/types/inventory";
import { BattleLogEntry, InitiativeParticipant } from "@/lib/types/battle";
import { Prisma } from "@prisma/client";
import { getDamageElementLabel } from "@/lib/constants/damage";

const attackSchema = z.object({
  attackerId: z.string(),
  attackerType: z.enum(["character", "unit"]),
  targetId: z.string(),
  targetType: z.enum(["character", "unit"]),
  attackRoll: z.number().min(1).max(20),
  damageRolls: z.array(z.number()),
  attackType: z.enum(["melee", "ranged"]).optional(), // Тип атаки: ближня або дальня
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = attackSchema.parse(body);

    // Отримуємо дані атакуючого та цілі
    type AttackerData = {
      name: string;
      strength: number;
      dexterity: number;
      armorClass: number;
      damageModifier?: string | null;
      unitGroup?: { damageModifier: string | null } | null;
      inventory?: { equipped: EquippedItems } | null;
      characterSkills?: CharacterSkill[];
    };
    type TargetData = {
      name: string;
      armorClass: number;
    };
    let attacker: AttackerData | null = null;
    let target: TargetData | null = null;
    let attackerAC = 10;
    let targetAC = 10;

    // Отримуємо артефакти кампанії для розрахунку модифікаторів
    const campaignArtifacts = await prisma.artifact.findMany({
      where: { campaignId: id },
    });

    if (data.attackerType === "character") {
      const characterData = await prisma.character.findUnique({
        where: { id: data.attackerId },
        include: {
          inventory: true,
          characterSkills: {
            include: {
              skillTree: true,
            },
          },
        },
      });
      if (characterData) {
        attacker = {
          name: characterData.name,
          strength: characterData.strength,
          dexterity: characterData.dexterity,
          armorClass: characterData.armorClass,
          inventory: characterData.inventory
            ? {
                equipped: characterData.inventory.equipped as EquippedItems,
              }
            : undefined,
          characterSkills:
            characterData.characterSkills as unknown as CharacterSkill[],
        };
        attackerAC = characterData.armorClass;
      }
    } else {
      attacker = await prisma.unit.findUnique({
        where: { id: data.attackerId },
        include: { unitGroup: true },
      });
      attackerAC = attacker?.armorClass || 10;
    }

    if (data.targetType === "character") {
      target = await prisma.character.findUnique({
        where: { id: data.targetId },
      });
      targetAC = target?.armorClass || 10;
    } else {
      target = await prisma.unit.findUnique({
        where: { id: data.targetId },
      });
      targetAC = target?.armorClass || 10;
    }

    if (!attacker || !target) {
      return NextResponse.json(
        { error: "Attacker or target not found" },
        { status: 404 }
      );
    }

    // Перевіряємо чи попадання успішне
    const criticalHit = isCriticalHit(data.attackRoll);
    const criticalMiss = isCriticalMiss(data.attackRoll);
    const hit =
      !criticalMiss && (criticalHit || isHit(data.attackRoll, targetAC));

    let damage = 0;
    let result = "";

    if (hit) {
      // Розраховуємо базовий урон з кубиків
      damage = data.damageRolls.reduce((sum, roll) => sum + roll, 0);

      // Додаємо модифікатори з характеристик (STR для ближньої атаки, DEX для дальньої)
      if (data.attackerType === "character" && data.attackType) {
        const abilityModifier = getAttackDamageModifier(
          data.attackType,
          attacker.strength,
          attacker.dexterity
        );
        damage += abilityModifier;

        // Додаємо бонуси з артефактів
        if (attacker.inventory?.equipped) {
          const artifacts: Artifact[] = campaignArtifacts.map((a) => ({
            id: a.id,
            bonuses: (a.bonuses || {}) as Record<string, unknown>,
            modifiers: Array.isArray(a.modifiers)
              ? (a.modifiers as ArtifactModifier[])
              : [],
          }));
          const artifactDamageBonus = getArtifactDamageBonus(
            attacker.inventory.equipped as EquippedItems,
            artifacts
          );
          damage += artifactDamageBonus;
        }

        // Додаємо бонуси з дерева скілів
        if (attacker.characterSkills && attacker.characterSkills.length > 0) {
          const skillName =
            data.attackType === "melee" ? "melee_damage" : "ranged_damage";
          attacker.characterSkills.forEach((cs: CharacterSkill) => {
            const skillBonus = getSkillTreeBonus(
              [cs],
              cs.skillTreeId,
              skillName
            );
            damage += skillBonus;
          });
        }
      }

      let damageModifierLabel = "";
      if (data.attackerType === "unit") {
        const modifiers = [
          attacker.damageModifier || null,
          attacker.unitGroup?.damageModifier || null,
        ].filter(Boolean) as string[];
        if (modifiers.length > 0) {
          damageModifierLabel = ` (${modifiers
            .map((modifier) => getDamageElementLabel(modifier))
            .join(", ")})`;
        }
      }

      if (criticalHit) {
        damage *= 2; // Критичне попадання подвоює урон
        result = `Критичне попадання! ${attacker.name} завдав ${damage} урону${damageModifierLabel} ${target.name}`;
      } else {
        result = `${attacker.name} завдав ${damage} урону${damageModifierLabel} ${target.name}`;
      }

      // Оновлюємо HP цілі в initiativeOrder
      const initiativeOrder =
        battle.initiativeOrder as unknown as InitiativeParticipant[];

      const targetInOrder = initiativeOrder.find(
        (p) =>
          p.participantId === data.targetId &&
          (data.targetType === "character" || p.instanceId === data.targetId)
      );

      if (targetInOrder) {
        // Спочатку віднімаємо з tempHp, потім з currentHp
        let remainingDamage = damage;
        if (targetInOrder.tempHp > 0) {
          const tempDamage = Math.min(targetInOrder.tempHp, remainingDamage);
          targetInOrder.tempHp -= tempDamage;
          remainingDamage -= tempDamage;
        }
        targetInOrder.currentHp = Math.max(
          0,
          targetInOrder.currentHp - remainingDamage
        );

        // Оновлюємо статус
        if (targetInOrder.currentHp <= 0) {
          targetInOrder.status = "dead";
        }
      }

      // Оновлюємо бій
      const currentBattleLog = (battle.battleLog ||
        []) as unknown as BattleLogEntry[];
      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          initiativeOrder: initiativeOrder as unknown as Prisma.InputJsonValue,
          battleLog: [
            ...currentBattleLog,
            {
              round: battle.currentRound,
              timestamp: new Date().toISOString(),
              actorName: attacker.name,
              action: "Attack",
              target: target.name,
              result,
              damage,
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json(updatedBattle);
    } else {
      result = `${attacker.name} промахнувся по ${target.name}`;

      const currentBattleLog = (battle.battleLog ||
        []) as unknown as BattleLogEntry[];
      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          battleLog: [
            ...currentBattleLog,
            {
              round: battle.currentRound,
              timestamp: new Date().toISOString(),
              actorName: attacker.name,
              action: "Attack",
              target: target.name,
              result,
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      // Відправляємо real-time оновлення через Pusher
      if (process.env.PUSHER_APP_ID) {
        const { pusherServer } = await import("@/lib/pusher");
        await pusherServer.trigger(
          `battle-${battleId}`,
          "battle-updated",
          updatedBattle
        );
      }

      return NextResponse.json(updatedBattle);
    }
  } catch (error) {
    console.error("Error processing attack:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
