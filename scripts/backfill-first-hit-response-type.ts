#!/usr/bin/env tsx
/**
 * Backfill для skillTriggers:
 * для simple trigger "onFirstHitTakenPerRound" додає modifiers.responseType = "melee",
 * якщо це поле відсутнє або невалідне.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-first-hit-response-type.ts [--dry-run]
 *   pnpm run backfill-first-hit-response-type -- --dry-run
 */

import { PrismaClient } from "@prisma/client";

type JsonObj = Record<string, unknown>;

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

function isAllowedResponseType(v: unknown): v is "melee" | "ranged" | "magic" {
  return v === "melee" || v === "ranged" || v === "magic";
}

function normalizeSkillTriggers(value: unknown): {
  changed: boolean;
  next: unknown;
} {
  if (!Array.isArray(value)) {
    return { changed: false, next: value };
  }

  let changed = false;

  const next = value.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;

    const trigger = raw as JsonObj;

    if (
      trigger.type !== "simple" ||
      trigger.trigger !== "onFirstHitTakenPerRound"
    ) {
      return raw;
    }

    const modifiersRaw = trigger.modifiers;

    const modifiers =
      modifiersRaw && typeof modifiersRaw === "object"
        ? (modifiersRaw as JsonObj)
        : {};

    if (isAllowedResponseType(modifiers.responseType)) {
      return raw;
    }

    changed = true;

    return {
      ...trigger,
      modifiers: {
        ...modifiers,
        responseType: "melee",
      },
    };
  });

  return { changed, next };
}

async function main() {
  const skills = await prisma.skill.findMany({
    select: {
      id: true,
      name: true,
      campaignId: true,
      skillTriggers: true,
    },
  });

  let scanned = 0;

  let changedCount = 0;

  for (const skill of skills) {
    scanned += 1;

    const { changed, next } = normalizeSkillTriggers(skill.skillTriggers);

    if (!changed) continue;

    changedCount += 1;

    console.log(
      `[update] ${skill.name} (${skill.id}) in campaign ${skill.campaignId}`,
    );

    if (!DRY_RUN) {
      await prisma.skill.update({
        where: { id: skill.id },
        data: {
          skillTriggers: next as object,
        },
      });
    }
  }

  console.log(
    DRY_RUN
      ? `[dry-run] scanned=${scanned}, would-update=${changedCount}`
      : `Done. scanned=${scanned}, updated=${changedCount}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

