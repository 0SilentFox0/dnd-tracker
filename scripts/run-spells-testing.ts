#!/usr/bin/env tsx
/**
 * Тестування заклинань за docs/SPELLS_TESTING.md.
 * Парсить тест-кейси, для кожного spell id завантажує заклинання з БД і викликає processSpell з мок-учасниками.
 * Звітує які тести пройшли / впали.
 *
 * Опції:
 *   --fix                 PATCH заклинання (ST/HT) за тест-кейсом і повторна перевірка лише провалених
 *   --update-descriptions Оновити Spell.description для кожного заклинання з ефектів тест-кейсу
 *   --iterate N           Максимум ітерацій при --fix (за замовчуванням 5)
 *
 * Використання:
 *   npx tsx scripts/run-spells-testing.ts [CAMPAIGN_ID] [--fix] [--update-descriptions] [--iterate N]
 *
 *   CAMPAIGN_ID — обов'язковий для --update-descriptions (інакше заклинання не знайдуться)
 */
import { Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

import {
  buildDescriptionFromTestCase,
  formatEffect,
  formatTestCase,
  getParticipantStats,
  type RunResult,
  spellRowFields,
  type SpellRowSelect,
  spellToBattleSpell,
  type TargetStats,
} from "./run-spells-testing-helpers";
import {
  createMockAlly,
  createMockCaster,
  createMockEnemy,
  generateDamageRolls,
  mod,
} from "./run-spells-testing-mocks";

import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { BattleSpell } from "@/lib/utils/battle/spell";
import { processSpell } from "@/lib/utils/battle/spell";
import {
  getUniqueSpellIds,
  parseAssertionsToEffectDetails,
  parseSpellsTestingMd,
  type SpellTestCase,
} from "@/lib/utils/spells/spells-testing-parser";
import type { BattleParticipant } from "@/types/battle";

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const CAMPAIGN_ID = ARGS[0] || DEFAULT_CAMPAIGN_ID;

const DO_FIX = process.argv.includes("--fix");

const DO_UPDATE_DESCRIPTIONS = process.argv.includes("--update-descriptions");

const ITERATE = (() => {
  const i = process.argv.indexOf("--iterate");

  if (i === -1 || !process.argv[i + 1]) return 5;

  return Math.max(1, parseInt(process.argv[i + 1], 10) || 5);
})();

async function runOne(
  campaignId: string,
  tc: SpellTestCase,
  spellRow: SpellRowSelect | null,
): Promise<RunResult> {
  if (!spellRow) {
    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: false,
      reason: "заклинання не знайдено в БД",
    };
  }

  const caster = createMockCaster(tc.spellId, 10, spellRow.level);

  const enemyId = "enemy-1";

  const allyId = "ally-1";

  const enemy = createMockEnemy(enemyId);

  const ally = createMockAlly(allyId);

  const allParticipants: BattleParticipant[] = [caster, enemy, ally];

  const targetFromSpell = (spellRow.target as string)?.toLowerCase();

  const assertionsLower = tc.assertions.join(" ").toLowerCase();

  const targetAllies =
    targetFromSpell === "allies" ||
    /\bta\b|target ally|for ta\b/i.test(assertionsLower);

  const targetIds =
    spellRow.type === "no_target" ? [] : targetAllies ? [allyId] : [enemyId];

  let damageRolls = generateDamageRolls(spellRow.diceCount, spellRow.diceType);

  const addLevel =
    /level|lelvel/i.test(spellRow.damageModifier ?? "") ||
    /level/.test(tc.assertions.join(" "));

  if (
    addLevel &&
    (spellRow.damageType === "damage" || spellRow.damageType === "all")
  ) {
    damageRolls = [...damageRolls, caster.abilities.level];
  }

  const savingThrows =
    tc.savingThrow !== "no" && targetIds.length > 0
      ? [{ participantId: enemyId, roll: 10 }]
      : undefined;

  const hitRoll =
    tc.hitCheck !== "no" && tc.hitCheck
      ? Math.max(
          1,
          Math.min(20, tc.hitCheck.dc - mod(caster.abilities.intelligence) + 1),
        )
      : undefined;

  const isCleansing =
    spellRow.name === "Cleansing" ||
    spellRow.name === "Очищення" ||
    spellRow.healModifier === "dispel";

  if (isCleansing && targetIds.length > 0) {
    const debuff: BattleParticipant["battleData"]["activeEffects"][0] = {
      id: "pre-debuff-slow",
      name: "Slow",
      type: "debuff",
      duration: 3,
      appliedAt: { round: 1, timestamp: new Date() },
      effects: [{ type: "speed", value: -50, isPercentage: true }],
    };

    for (const tid of targetIds) {
      const idx = allParticipants.findIndex((p) => p.basicInfo.id === tid);

      if (idx >= 0) {
        allParticipants[idx] = {
          ...allParticipants[idx],
          battleData: {
            ...allParticipants[idx].battleData,
            activeEffects: [
              ...allParticipants[idx].battleData.activeEffects,
              debuff,
            ],
          },
        };
      }
    }
  }

  const targetsBefore = targetIds
    .map((id) => allParticipants.find((p) => p.basicInfo.id === id))
    .filter((p): p is BattleParticipant => !!p)
    .map((p) => ({
      id: p.basicInfo.id,
      name: p.basicInfo.name,
      stats: getParticipantStats(p),
    }));

  // Для тесту підставляємо effectDetails з тест-кейсу, якщо в БД їх ще немає
  const parsedFromTc = parseAssertionsToEffectDetails(tc.assertions);

  const spellFromDb = spellToBattleSpell(spellRow, {
    savingThrow: tc.savingThrow,
    hitCheck: tc.hitCheck,
  });

  const spell: BattleSpell =
    !spellFromDb.effectDetails?.effects?.length &&
    parsedFromTc.effects.length > 0
      ? {
          ...spellFromDb,
          effectDetails: {
            duration: parsedFromTc.duration || undefined,
            effects: parsedFromTc.effects,
          },
        }
      : spellFromDb;

  try {
    const result = processSpell({
      caster,
      spell,
      targetIds,
      allParticipants,
      currentRound: 1,
      battleId: "test-battle",
      damageRolls,
      savingThrows,
      hitRoll,
    });

    if (
      !result.success &&
      result.battleAction.resultText?.includes("немає доступних spell slots")
    ) {
      return {
        spellId: tc.spellId,
        name: tc.name,
        passed: false,
        reason: "немає spell slots",
      };
    }

    // Збираємо очікувані ефекти з тест-кейсу
    const expectedEffects = parsedFromTc.effects;

    const expectedDuration = parsedFromTc.duration;

    // Збираємо фактично застосовані ефекти з targetsUpdated
    const appliedEffects: Array<{
      type: string;
      value: number;
      isPercentage?: boolean;
    }> = [];

    let appliedDuration = 0;

    for (const target of result.targetsUpdated) {
      for (const ae of target.battleData.activeEffects) {
        if (ae.name === spell.name) {
          appliedDuration = Math.max(appliedDuration, ae.duration ?? 0);
          for (const d of ae.effects) {
            const val = typeof d.value === "number" ? d.value : 0;

            appliedEffects.push({
              type: d.type ?? "unknown",
              value: val,
              isPercentage: d.isPercentage,
            });
          }
        }
      }
    }

    const targetStats: TargetStats[] = [];

    for (const before of targetsBefore) {
      const afterTarget = result.targetsUpdated.find(
        (t) => t.basicInfo.id === before.id,
      );

      if (!afterTarget) continue;

      const afterEffects = afterTarget.battleData.activeEffects.map(
        (e) => `${e.name}(${e.type},D${e.duration})`,
      );

      const effectsRemoved = before.stats.effects.filter(
        (e) => !afterEffects.includes(e),
      );

      targetStats.push({
        participantId: before.id,
        name: before.name,
        before: before.stats,
        after: getParticipantStats(afterTarget),
        hpChange: afterTarget.combatStats.currentHp - before.stats.hp,
        effectsRemoved: effectsRemoved.length > 0 ? effectsRemoved : undefined,
      });
    }

    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: true,
      expectedEffects,
      expectedDuration,
      appliedEffects,
      appliedDuration,
      targetStats,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: false,
      reason: message,
    };
  }
}

async function main() {
  if (!CAMPAIGN_ID) {
    console.error(
      "Вкажіть CAMPAIGN_ID: npx tsx scripts/run-spells-testing.ts CAMPAIGN_ID [--fix] [--iterate N]",
    );
    process.exit(1);
  }

  const mdPath = path.join(process.cwd(), "docs", "SPELLS_TESTING.md");

  const content = fs.readFileSync(mdPath, "utf8");

  const cases = parseSpellsTestingMd(content);

  const uniqueIds = getUniqueSpellIds(cases);

  const caseBySpellId = new Map<string, SpellTestCase>();

  for (const tc of cases) {
    caseBySpellId.set(tc.spellId, tc);
  }
  console.log(
    "Parsed",
    cases.length,
    "test cases,",
    uniqueIds.length,
    "unique spell ids\n",
  );

  if (DO_UPDATE_DESCRIPTIONS) {
    console.log(
      "Оновлення описів, Saving Throw та Hit Check для заклинань з тест-кейсів...\n",
    );

    const byId = await prisma.spell.findMany({
      where: { campaignId: CAMPAIGN_ID, id: { in: uniqueIds } },
      select: { id: true, name: true },
    });

    const spellByIdForUpdate = new Map(byId.map((s) => [s.id, s]));

    const missingForUpdate = uniqueIds.filter(
      (id) => !spellByIdForUpdate.has(id),
    );

    if (missingForUpdate.length > 0) {
      const names = missingForUpdate
        .map((id) => caseBySpellId.get(id)?.name)
        .filter((n): n is string => !!n);

      const byName = await prisma.spell.findMany({
        where: { campaignId: CAMPAIGN_ID, name: { in: names } },
        select: { id: true, name: true },
      });

      const byNameMap = new Map(byName.map((s) => [s.name, s]));

      for (const id of missingForUpdate) {
        const tc = caseBySpellId.get(id);

        const found = tc ? byNameMap.get(tc.name) : null;

        if (found) spellByIdForUpdate.set(id, found);
      }
    }

    let updated = 0;

    for (const spellId of uniqueIds) {
      const tc = caseBySpellId.get(spellId);

      if (!tc) continue;

      const dbSpell = spellByIdForUpdate.get(spellId);

      if (!dbSpell) {
        console.log(
          `  ⚠ ${tc.name}: не знайдено в кампанії (ні за id, ні за назвою)`,
        );
        continue;
      }

      const description = buildDescriptionFromTestCase(tc);

      const savingThrow =
        tc.savingThrow === "no"
          ? Prisma.JsonNull
          : ({
              ability: tc.savingThrow.ability,
              onSuccess: "half",
              dc: tc.savingThrow.dc,
            } as object);

      const hitCheck =
        tc.hitCheck === "no"
          ? Prisma.JsonNull
          : ({ ability: tc.hitCheck.ability, dc: tc.hitCheck.dc } as object);

      const parsed = parseAssertionsToEffectDetails(tc.assertions);

      const effectDetails =
        parsed.effects.length > 0 || parsed.duration > 0
          ? ({
              duration: parsed.duration || undefined,
              effects: parsed.effects,
            } as object)
          : Prisma.JsonNull;

      const result = await prisma.spell.updateMany({
        where: { id: dbSpell.id, campaignId: CAMPAIGN_ID },
        data: {
          description,
          savingThrow,
          hitCheck,
          effectDetails,
        },
      });

      if (result.count > 0) {
        updated++;
        console.log(`  ✓ ${tc.name} (${dbSpell.id})`);
      }
    }
    console.log(
      `\nОновлено (опис + Saving Throw + Hit Check): ${updated} з ${uniqueIds.length}\n`,
    );

    if (!DO_FIX) {
      process.exit(0);
    }
  }

  let toRun = [...uniqueIds];

  let iteration = 0;

  const maxIterations = DO_FIX ? ITERATE : 1;

  const failedReports: Array<{
    spellId: string;
    name: string;
    reason?: string;
  }> = [];

  while (iteration < maxIterations) {
    iteration++;

    if (DO_FIX && iteration > 1) {
      console.log("--- Iteration", iteration, "--- (only failed)\n");
    }

    const results: RunResult[] = [];

    const spellRows = await prisma.spell.findMany({
      where: { campaignId: CAMPAIGN_ID, id: { in: toRun } },
      select: spellRowFields,
    });

    const spellById = new Map(spellRows.map((s) => [s.id, s]));

    // Резервний пошук за назвою — якщо ID з doc не збігаються з БД (інший імпорт)
    const missingIds = toRun.filter((id) => !spellById.has(id));

    if (missingIds.length > 0) {
      const missingNames = missingIds
        .map((id) => caseBySpellId.get(id)?.name)
        .filter((n): n is string => !!n);

      const byName = await prisma.spell.findMany({
        where: { campaignId: CAMPAIGN_ID, name: { in: missingNames } },
        select: spellRowFields,
      });

      const spellByName = new Map(byName.map((s) => [s.name, s]));

      for (const spellId of missingIds) {
        const tc = caseBySpellId.get(spellId);

        const found = tc ? spellByName.get(tc.name) : null;

        if (found) spellById.set(spellId, found);
      }
    }

    for (const spellId of toRun) {
      const tc = caseBySpellId.get(spellId);

      if (!tc) continue;

      const row = spellById.get(spellId) ?? null;

      const result = await runOne(CAMPAIGN_ID, tc, row);

      results.push(result);
    }

    const passed = results.filter((r) => r.passed);

    const failed = results.filter((r) => !r.passed);

    console.log("SPELL — тест-кейс — працює коректно\n");
    for (const r of results) {
      const tc = caseBySpellId.get(r.spellId);

      if (!tc) continue;

      const testCaseStr = formatTestCase(tc);

      const checkbox = r.passed ? "[✓]" : "[ ]";

      console.log(`  ${checkbox} ${r.name} (${r.spellId})`);
      console.log(`      Тест-кейс: ${testCaseStr}`);

      if (r.reason) console.log(`      Причина: ${r.reason}`);

      if (
        r.passed &&
        (r.expectedEffects?.length ||
          r.appliedEffects?.length ||
          r.targetStats?.length)
      ) {
        console.log(`      --- Ефекти та результати ---`);

        if (r.expectedEffects?.length) {
          console.log(
            `      Очікувані ефекти: ${r.expectedDuration ? `D${r.expectedDuration} ` : ""}[${r.expectedEffects.map(formatEffect).join(", ")}]`,
          );
        }

        if (r.appliedEffects?.length) {
          console.log(
            `      Застосовані ефекти: ${r.appliedDuration ? `D${r.appliedDuration} ` : ""}[${r.appliedEffects.map(formatEffect).join(", ")}]`,
          );
        } else if (r.expectedEffects?.length) {
          console.log(`      Застосовані ефекти: (немає)`);
        }

        for (const ts of r.targetStats ?? []) {
          const b = ts.before;

          const d = ts.after;

          const fmt = (val: number, prev: number, pct = false) => {
            const dlt = val - prev;

            if (dlt === 0) return `${val}`;

            const sign = dlt > 0 ? "+" : "";

            return pct ? `${val} (${sign}${dlt}%)` : `${val} (${sign}${dlt})`;
          };

          console.log(`      ${ts.name}:`);
          console.log(`        ДО:   HP ${b.hp}/${b.maxHp} | Speed ${b.speed} | Init ${b.initiative} | AC ${b.ac} | Bonus action: ${b.bonusAction} | Morale: ${b.morale}`);
          console.log(`        Buff: [${b.buffs.join(", ") || "—"}]`);
          console.log(`        Debuff: [${b.debuffs.join(", ") || "—"}]`);
          console.log(`        ПІСЛЯ: HP ${fmt(d.hp, b.hp)}/${d.maxHp} | Speed ${fmt(d.speed, b.speed)} | Init ${fmt(d.initiative, b.initiative)} | AC ${fmt(d.ac, b.ac)} | Bonus action: ${d.bonusAction}${d.bonusAction !== b.bonusAction ? ` (${b.bonusAction})` : ""} | Morale: ${fmt(d.morale, b.morale)}`);
          console.log(`        Buff: [${d.buffs.join(", ") || "—"}]`);
          console.log(`        Debuff: [${d.debuffs.join(", ") || "—"}]`);

          if (ts.effectsRemoved?.length) {
            console.log(`        Знято: [${ts.effectsRemoved.join(", ")}]`);
          }
        }
      }
    }
    console.log(
      "\nПідсумок:",
      passed.length,
      "пройдено,",
      failed.length,
      "впало\n",
    );
    failedReports.length = 0;
    failedReports.push(
      ...failed.map((r) => ({
        spellId: r.spellId,
        name: r.name,
        reason: r.reason,
      })),
    );

    if (failed.length === 0 || !DO_FIX) break;

    // Авто-виправлення: оновлюємо заклинання в БД за тест-кейсом (ST, HT)
    const toFix = failed.filter(
      (r) =>
        r.reason !== "заклинання не знайдено в БД" && spellById.has(r.spellId),
    );

    for (const r of toFix) {
      const tc = caseBySpellId.get(r.spellId);

      if (!tc) continue;

      const savingThrow =
        tc.savingThrow === "no"
          ? Prisma.JsonNull
          : tc.savingThrow
            ? ({
                ability: tc.savingThrow.ability,
                onSuccess: "half",
                dc: tc.savingThrow.dc,
              } as object)
            : undefined;

      const hitCheck =
        tc.hitCheck === "no"
          ? Prisma.JsonNull
          : tc.hitCheck
            ? ({ ability: tc.hitCheck.ability, dc: tc.hitCheck.dc } as object)
            : undefined;

      await prisma.spell.update({
        where: { id: r.spellId },
        data: {
          ...(savingThrow !== undefined && { savingThrow }),
          ...(hitCheck !== undefined && { hitCheck }),
        },
      });
      console.log("  Fixed (PATCH)", r.spellId, r.name);
    }

    if (toFix.length > 0) console.log("");

    toRun = failed.map((r) => r.spellId);
  }

  if (failedReports.length > 0) {
    console.log("--- Впалі тести ---");
    failedReports.forEach((r) => {
      const tc = caseBySpellId.get(r.spellId);

      const testCaseStr = tc ? formatTestCase(tc) : "—";

      console.log(`  [ ] ${r.name} (${r.spellId})`);
      console.log(`      Тест-кейс: ${testCaseStr}`);

      if (r.reason) console.log(`      Причина: ${r.reason}`);
    });
  }

  process.exit(failedReports.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
