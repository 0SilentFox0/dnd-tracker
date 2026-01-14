import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";

// Схема для одного заклинання в імпорті
const importSpellSchema = z.object({
  name: z.string().min(1),
  level: z.number().min(0).max(9).default(0),
  school: z.string().optional(),
  type: z.enum(["target", "aoe"]).default("target"),
  damageType: z.enum(["damage", "heal"]).default("damage"),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  components: z.string().optional(),
  duration: z.string().optional(),
  concentration: z.union([z.boolean(), z.string()]).optional().transform((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      return lower === "true" || lower === "yes" || lower === "1" || lower === "так";
    }
    return false;
  }),
  damageDice: z.string().optional(),
  savingThrowAbility: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]).optional(),
  savingThrowOnSuccess: z.enum(["half", "none"]).optional(),
  description: z.string().min(1),
  groupId: z.string().optional(),
});

// Схема для масового імпорту
const importSpellsSchema = z.object({
  spells: z.array(importSpellSchema),
  groupId: z.string().optional(), // Опціональна група для всіх заклинань
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
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

    const body = await request.json();
    const data = importSpellsSchema.parse(body);

    // Створюємо або отримуємо групи заклинань на основі school з CSV
    const spellGroups: Record<string, string> = {};
    
    // Визначаємо унікальні школи з даних
    const schoolMap: Record<string, string> = {
      "Dark": "Dark",
      "Destr": "Destr", 
      "Summ": "Summ",
      "Light": "Light",
    };

    // Збираємо всі унікальні школи з заклинань
    const uniqueSchools = new Set<string>();
    for (const spell of data.spells) {
      const spellAny = spell as any;
      if (spellAny.School) {
        uniqueSchools.add(spellAny.School);
      }
    }

    // Створюємо або отримуємо групи
    for (const school of uniqueSchools) {
      const existing = await prisma.spellGroup.findFirst({
        where: { campaignId: id, name: school },
      });
      if (existing) {
        spellGroups[school] = existing.id;
      } else {
        const group = await prisma.spellGroup.create({
          data: { campaignId: id, name: school },
        });
        spellGroups[school] = group.id;
      }
    }

    // Перевіряємо існуючі заклинання для уникнення дублікатів
    const existingSpellNames = await prisma.spell.findMany({
      where: {
        campaignId: id,
        name: {
          in: data.spells.map((s) => s.name),
        },
      },
      select: {
        name: true,
      },
    });

    const existingNamesSet = new Set(existingSpellNames.map((s) => s.name));

    // Фільтруємо заклинання, які ще не існують
    const spellsToCreate = data.spells
      .filter((spell) => !existingNamesSet.has(spell.name))
      .map((spell) => ({
        campaignId: id,
        name: spell.name,
        level: spell.level,
        school: spell.school || null,
        type: spell.type,
        damageType: spell.damageType,
        castingTime: spell.castingTime || null,
        range: spell.range || null,
        components: spell.components || null,
        duration: spell.duration || null,
        concentration: spell.concentration ?? false,
        damageDice: spell.damageDice || null,
        savingThrow: spell.savingThrowAbility
          ? ({
              ability: spell.savingThrowAbility,
              onSuccess: spell.savingThrowOnSuccess || "half",
            } as unknown as Prisma.InputJsonValue)
          : undefined,
        description: spell.description,
        groupId: spell.groupId || 
                 ((spell as any).School && spellGroups[(spell as any).School]) ||
                 data.groupId || 
                 null,
      }));

    // Створюємо тільки нові заклинання
    let result;
    if (spellsToCreate.length > 0) {
      result = await prisma.spell.createMany({
        data: spellsToCreate,
        skipDuplicates: true,
      });
    } else {
      result = { count: 0 };
    }

    // Отримуємо створені заклинання для повернення
    const createdSpells = await prisma.spell.findMany({
      where: {
        campaignId: id,
        name: {
          in: data.spells.map((s) => s.name),
        },
      },
      include: {
        spellGroup: true,
      },
      orderBy: {
        level: "asc",
      },
    });

    const skipped = data.spells.length - spellsToCreate.length;

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: data.spells.length,
      skipped,
      spells: createdSpells,
    });
  } catch (error) {
    console.error("Error importing spells:", error);
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
