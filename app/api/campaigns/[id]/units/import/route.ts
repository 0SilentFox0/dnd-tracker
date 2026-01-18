import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireDM } from "@/lib/utils/api-auth";
import { Prisma } from "@prisma/client";
import type { ImportUnit } from "@/lib/types/unit-import";
import { convertCSVRowToUnit } from "@/lib/utils/unit-parsing";

// Схема для одного юніта в імпорті
const importUnitSchema = z.object({
  name: z.string().min(1),
  groupId: z.string().optional(),
  damageModifier: z.string().optional(),
  level: z.number().min(1).max(30).default(1),
  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),
  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),
  maxHp: z.number().min(1).default(10),
  proficiencyBonus: z.number().min(0).default(2),
  attacks: z
    .array(
      z.object({
        name: z.string(),
        attackBonus: z.number(),
        damageType: z.string(),
        damageDice: z.string(),
        range: z.string().optional(),
        properties: z.string().optional(),
      })
    )
    .default([]),
  specialAbilities: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        type: z.enum(["passive", "active"]),
        effect: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([]),
  knownSpells: z.array(z.string()).default([]),
  avatar: z.string().optional(),
});

// Схема для масового імпорту
const importUnitsSchema = z.object({
  units: z.array(importUnitSchema.extend({
    groupName: z.string().optional(),
  })),
  groupName: z.string().optional(), // Опціональна група для всіх юнітів
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);
    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();
    const rawUnits = body.units as Array<ImportUnit & { groupName?: string }>;
    const defaultGroupName = body.groupName as string | undefined;

    // Валідуємо units без groupName
    const unitsForValidation = rawUnits.map(({ groupName, ...unit }) => unit);
    const validationResult = importUnitsSchema.parse({
      units: unitsForValidation,
      groupName: defaultGroupName,
    });

    // Об'єднуємо валідовані дані з groupName
    const validatedUnitsWithGroups = validationResult.units.map((unit, index) => ({
      ...unit,
      groupName: rawUnits[index]?.groupName || defaultGroupName,
    }));

    // Створюємо або отримуємо групи юнітів
    const unitGroups: Record<string, string> = {};
    const uniqueGroupNames = new Set<string>();

    // Збираємо всі унікальні групи з юнітів
    for (const unit of validatedUnitsWithGroups) {
      const groupName = unit.groupName;
      if (groupName) {
        uniqueGroupNames.add(groupName);
      }
    }

    // Створюємо або отримуємо групи
    for (const groupName of uniqueGroupNames) {
      const existing = await prisma.unitGroup.findFirst({
        where: { campaignId: id, name: groupName },
      });
      if (existing) {
        unitGroups[groupName] = existing.id;
      } else {
        // Генеруємо колір для групи
        const colors = [
          "#ef4444", // red
          "#f97316", // orange
          "#eab308", // yellow
          "#22c55e", // green
          "#3b82f6", // blue
          "#8b5cf6", // purple
          "#ec4899", // pink
        ];
        const colorIndex = Array.from(uniqueGroupNames).indexOf(groupName);
        const color = colors[colorIndex % colors.length];

        const group = await prisma.unitGroup.create({
          data: { campaignId: id, name: groupName, color },
        });
        unitGroups[groupName] = group.id;
      }
    }

    // Перевіряємо існуючі юніти для уникнення дублікатів
    const existingUnitNames = await prisma.unit.findMany({
      where: {
        campaignId: id,
        name: {
          in: validatedUnitsWithGroups.map((u) => u.name),
        },
      },
      select: {
        name: true,
      },
    });

    const existingNamesSet = new Set(existingUnitNames.map((u) => u.name));

    // Фільтруємо юніти, які ще не існують та отримуємо кольори груп
    const unitsToCreate = await Promise.all(
      validatedUnitsWithGroups
        .filter((unit) => !existingNamesSet.has(unit.name))
        .map(async (unit) => {
          const groupName = unit.groupName;
          const groupId = groupName ? unitGroups[groupName] : undefined;
          
          let groupColor: string | null = null;
          if (groupId) {
            const group = await prisma.unitGroup.findUnique({
              where: { id: groupId },
            });
            groupColor = group?.color || null;
          }

          return {
            campaignId: id,
            name: unit.name,
            groupId: groupId || null,
            groupColor,
            damageModifier: unit.damageModifier || null,
            level: unit.level,
            strength: unit.strength,
            dexterity: unit.dexterity,
            constitution: unit.constitution,
            intelligence: unit.intelligence,
            wisdom: unit.wisdom,
            charisma: unit.charisma,
            armorClass: unit.armorClass,
            initiative: unit.initiative,
            speed: unit.speed,
            maxHp: unit.maxHp,
            proficiencyBonus: unit.proficiencyBonus,
            attacks: unit.attacks as Prisma.InputJsonValue,
            specialAbilities: unit.specialAbilities as Prisma.InputJsonValue,
            knownSpells: unit.knownSpells,
            avatar: unit.avatar || null,
          };
        })
    );

    // Створюємо тільки нові юніти
    let result;
    if (unitsToCreate.length > 0) {
      result = await prisma.unit.createMany({
        data: unitsToCreate,
        skipDuplicates: true,
      });
    } else {
      result = { count: 0 };
    }

    // Отримуємо створені юніти для повернення
    const createdUnits = await prisma.unit.findMany({
      where: {
        campaignId: id,
        name: {
          in: validatedUnitsWithGroups.map((u) => u.name),
        },
      },
      include: {
        unitGroup: true,
      },
      orderBy: {
        level: "asc",
      },
    });

    const skipped = validatedUnitsWithGroups.length - unitsToCreate.length;

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: validatedUnitsWithGroups.length,
      skipped,
      units: createdUnits,
    });
  } catch (error) {
    console.error("Error importing units:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
