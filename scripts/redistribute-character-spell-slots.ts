#!/usr/bin/env tsx
/**
 * Перерозподіл spell slots для існуючих персонажів за новою логікою
 * (більш рівномірний розподіл по рівнях 1–3, обмеження слотів 1 рівня).
 *
 * Оновлює character.spellSlots: max з перерахунку, current = max (повні слоти).
 *
 * Usage: pnpm run redistribute-character-spell-slots [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

import {
  calculateCharacterSpellSlots,
  calculateSpellSlotsForLevel,
} from "../lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "../types/races";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      race: true,
      campaignId: true,
      spellSlots: true,
    },
  });

  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: [...new Set(characters.map((c) => c.campaignId))] } },
    select: { id: true, maxLevel: true },
  });

  const campaignMaxLevel: Record<string, number> = Object.fromEntries(
    campaigns.map((c) => [c.id, c.maxLevel ?? 20]),
  );

  const racesByCampaignAndName = new Map<string, { spellSlotProgression: unknown }>();

  for (const c of characters) {
    const key = `${c.campaignId}:${c.race}`;

    if (racesByCampaignAndName.has(key)) continue;

    const race = await prisma.race.findFirst({
      where: { campaignId: c.campaignId, name: c.race },
      select: { spellSlotProgression: true },
    });

    racesByCampaignAndName.set(key, {
      spellSlotProgression: race?.spellSlotProgression ?? null,
    });
  }

  let updated = 0;

  for (const char of characters) {
    const maxLevel = campaignMaxLevel[char.campaignId] ?? 20;

    const raceData = racesByCampaignAndName.get(`${char.campaignId}:${char.race}`);

    const progression = (
      Array.isArray(raceData?.spellSlotProgression)
        ? raceData.spellSlotProgression
        : []
    ) as SpellSlotProgression[];

    const computed =
      progression.length > 0
        ? calculateSpellSlotsForLevel(char.level, maxLevel, progression)
        : calculateCharacterSpellSlots(char.level);

    const newSlots: Record<string, { max: number; current: number }> = {};

    for (const [levelKey, slot] of Object.entries(computed)) {
      if (slot.max > 0) {
        newSlots[levelKey] = { max: slot.max, current: slot.max };
      }
    }

    const oldSlots = (char.spellSlots as Record<string, { max: number; current: number }>) ?? {};

    const oldStr = JSON.stringify(oldSlots);

    const newStr = JSON.stringify(newSlots);

    if (oldStr === newStr) continue;

    console.log(
      `[${char.name}] lv${char.level} ${char.race}: ${oldStr} → ${newStr}`,
    );

    if (!DRY_RUN) {
      await prisma.character.update({
        where: { id: char.id },
        data: { spellSlots: newSlots as object },
      });
    }

    updated++;
  }

  console.log(
    DRY_RUN
      ? `[dry-run] Would update ${updated} character(s). Run without --dry-run to apply.`
      : `Updated ${updated} character(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
