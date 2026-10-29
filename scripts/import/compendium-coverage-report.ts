#!/usr/bin/env tsx
// COMPENDIUM_REAL_FILE=<5etools json> DATABASE_URL=postgresql://postgres:postgres@localhost:54322/obojima pnpm compendium:coverage [--keep]
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import Module from "node:module";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- raw rows of a foreign JSON

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };

const load = loader._load;

loader._load = function (request, ...rest) {
  return request === "next/cache" ? { unstable_cache: (fn: unknown) => fn, revalidateTag: () => undefined, revalidatePath: () => undefined } : load.call(this, request, ...rest);
};

const secret = "compendium-coverage-report-local-secret-0123456789";

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((n / d) * 1000) / 10}%`);

const array = (v: unknown): any[] => (Array.isArray(v) ? v : []); // eslint-disable-line @typescript-eslint/no-explicit-any

async function main() {
  const file = process.env.COMPENDIUM_REAL_FILE;

  if (!file) throw new Error("COMPENDIUM_REAL_FILE is required");

  if (!/@(localhost|127\.0\.0\.1):54322\//.test(process.env.DATABASE_URL ?? "")) throw new Error("local docker DB only (localhost:54322)");

  const { COMPENDIUM_REF_KINDS } = await import("@/lib/constants/compendium-import");

  const { prisma } = await import("@/lib/db");

  const { importTargetOptions, previewPresentation } = await import("@/lib/server/compendium-import/presentation");

  const { prismaImportRepository } = await import("@/lib/server/compendium-import/repository");

  const { confirmImport, previewImport } = await import("@/lib/server/compendium-import/service");

  const { createCampaignFromBundle } = await import("@/lib/server/campaigns/create-campaign");

  const { categoryInventory, projectInput } = await import("@/lib/utils/compendium-import/flow");

  const { itemStatsFromRow } = await import("@/lib/utils/items/item-row");

  const root = JSON.parse(readFileSync(file, "utf8")) as Row;

  const userId = randomUUID();

  await prisma.user.create({ data: { id: userId, email: `${userId}@coverage.example.test`, displayName: "Coverage report DM" } });

  const campaignId = (await createCampaignFromBundle({ userId, name: `Coverage report ${userId}`, bundle: null })).campaign.id;

  const actor = { campaignId, userId, isDM: true, via: "session" as const, scopes: null };

  try {
    const base = projectInput(root, categoryInventory(root).filter((c) => c.selected).map((c) => c.kind), { rulesPatch: { classes: { enabled: true } }, allowMixedEdition: true });

    const { graph } = previewPresentation(base);

    const own = new Set(graph.map((r) => r.key));

    const [template] = (await importTargetOptions(actor)).templates;

    const dependencies = new Map<string, NonNullable<typeof base.dependencies>[number]>();

    const refs = graph.flatMap((r) => r.refs);

    for (const ref of refs) {
      const target = own.has(ref.key) ? undefined : template.rows.find((t) => t.kind === COMPENDIUM_REF_KINDS[ref.kind] && t.name.toLowerCase() === ref.name.toLowerCase());

      if (target) dependencies.set(ref.key, { refKey: ref.key, templateId: template.id, kind: target.kind as never, localId: target.id, edition: template.edition });
    }

    const bindings: NonNullable<typeof base.bindings> = {};

    const stubs: string[] = [];

    for (const ref of refs.filter((r) => r.kind === "spell" && !own.has(r.key) && !dependencies.has(r.key))) {
      if (bindings[ref.key]) continue;

      bindings[ref.key] = { kind: "spells", id: (await prisma.spell.create({ data: { campaignId, name: ref.name, executionMode: "manual", type: "damage", damageType: "none" } })).id };
      stubs.push(ref.name);
    }

    const input = { ...base, dependencies: [...dependencies.values()], bindings };

    const unresolved = [...new Set(refs.filter((r) => !own.has(r.key) && !dependencies.has(r.key) && !bindings[r.key]).map((r) => `${r.kind}:${r.name}`))];

    const first = await previewImport(actor, input, secret, prismaImportRepository);

    const errors = first.report.rows.flatMap((r) => r.issues.filter((i) => i.severity === "error").map((i) => `${r.kind} ${i.code}`));

    const confirmed = await confirmImport(actor, input, first.token, "coverage", secret, prismaImportRepository);

    const again = await previewImport(actor, input, secret, prismaImportRepository);

    const names = (...kinds: string[]) => ({ in: kinds.flatMap((k) => array(root[k]).map((r) => String(r.name))) });

    const codes = (kinds?: string[]) => {
      const tally: Record<string, number> = {};

      for (const r of confirmed.rows.filter((x) => !kinds || kinds.includes(x.kind))) for (const i of r.issues) tally[i.code] = (tally[i.code] ?? 0) + 1;

      return Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(", ") || "-";
    };

    const lines: string[] = [`# Coverage report: ${file.split("/").pop()}`, ""];

    const section = (title: string, body: string[]) => lines.push(`## ${title}`, ...body.map((l) => `- ${l}`), "");

    const countOf = (kind: string) => array(root[kind]).length;

    section("1. Імпорт без помилок, ідемпотентність", [
      `помилок у preview: ${first.report.counts.errors}${errors.length ? ` (${[...new Set(errors)].slice(0, 6).join("; ")})` : ""}`,
      `створено/оновлено/без змін (confirm): ${confirmed.counts.created}/${confirmed.counts.updated}/${confirmed.counts.unchanged}`,
      `другий preview: created ${again.report.counts.created}, updated ${again.report.counts.updated}, errors ${again.report.counts.errors}, LOCAL_CONFLICT ${again.report.nextActions.filter((i) => i.code === "LOCAL_CONFLICT").length}`,
    ]);

    const classes = await prisma.gameClass.findMany({ where: { campaignId } });

    const subNames = new Set(array(root.subclass).map((s) => String(s.name)));

    const importedSubclasses = classes.flatMap((c) => array(c.subclasses)).filter((s) => subNames.has(String(s.name)));

    section("2. Підкласи", [
      `у файлі: ${countOf("subclass")}, імпортовано: ${importedSubclasses.length}`,
      `фіч підкласів у файлі: ${countOf("subclassFeature")}, перенесено (окремо або вбудовано в батьківську): ${first.report.countsByCategory.subclassFeature?.mapped ?? 0}`,
      `батьківські класи з шаблону SRD: ${[...dependencies.values()].filter((d) => d.kind === "classes").length}; нерозв'язані посилання: ${unresolved.length ? unresolved.join(", ") : "0"}`,
    ]);

    const [races, backgrounds, feats] = await Promise.all([prisma.race.findMany({ where: { campaignId, name: names("race") } }), prisma.background.findMany({ where: { campaignId, name: names("background") } }), prisma.feat.findMany({ where: { campaignId, name: names("feat") } })]);

    const withEffects = (rows: Row[]) => rows.filter((r) => JSON.stringify(r.abilities ?? []).includes("modifyStat")).length;

    section("3. Лист героя (раса + підраса + бекґраунд + фіт)", [
      `раси ${countOf("race")}→${races.length} (з modifyStat ${withEffects(races)}), підраси ${countOf("subrace")}, бекґраунди ${countOf("background")}→${backgrounds.length} (з originFeat ${backgrounds.filter((b) => b.originFeatId).length}), риси ${countOf("feat")}→${feats.length}`,
      `режим класів: ${first.report.recommendedRulesPatch ? "ще потрібно увімкнути (рекомендація в звіті)" : "увімкнено патчем імпорту"}`,
      `попередження рас/бекґраундів/рис: ${codes(["races", "backgrounds", "feats"])}`,
    ]);

    const units = await prisma.unit.findMany({ where: { campaignId, name: names("monster") } });

    const monsters = array(root.monster);

    const flies = (u: Row) => JSON.stringify(u.statblock ?? {}).includes('"fly"');

    section("4. Монстри (статично; бій — real-file.integration.test.ts)", [
      `у файлі ${monsters.length}, юнітів ${units.length}`,
      `з атаками ${units.filter((u) => array(u.attacks).length > 0).length}, зі швидкістю>0 ${units.filter((u) => u.speed > 0).length}, мультиатака>1 ${units.filter((u) => u.multiattack > 1).length}`,
      `літуни ${units.filter(flies).length}, з рухом ${units.filter((u) => flies(u) && u.speed > 0).length}`,
      `легендарні дії: файл ${monsters.filter((m) => array(m.legendary).length).length}, юніти ${units.filter((u) => u.legendaryActions > 0).length}; з опором/імунітетом ${units.filter((u) => JSON.stringify(u.abilities).includes("resistance") || array(u.immunities).length).length}; з рятівними ${units.filter((u) => array(u.saveProficiencies).length).length}`,
      `попередження: ${codes(["units"])}`,
    ]);

    const spells = await prisma.spell.findMany({ where: { campaignId, name: names("spell") } });

    const native = spells.filter((s) => s.executionMode === "native");

    const narrative = confirmed.rows.filter((r) => r.kind === "spells" && r.issues.some((i) => i.code === "SPELL_NARRATIVE_ONLY")).length;

    const withRiders = confirmed.rows.filter((r) => r.kind === "spells" && r.issues.some((i) => i.code === "SPELL_RIDER_MANUAL")).length;

    section("5. Заклинання", [
      `у файлі ${countOf("spell")}, імпортовано ${spells.length}: native ${native.length} (${pct(native.length, spells.length)}; з них наративних ${narrative}, механічних ${native.length - narrative} (M+R з додатковими ефектами в описі ${withRiders}, чисті M ${native.length - narrative - withRiders})), manual ${spells.length - native.length}`,
      `причини: ${codes(["spells"])}`,
      `заглушки SRD-заклинань для посилань: ${stubs.length ? stubs.join(", ") : "0"}`,
    ]);

    const artifacts = await prisma.artifact.findMany({ where: { campaignId, name: names("item", "baseitem") } });

    const stats = artifacts.map((a) => itemStatsFromRow(a));

    section("6. Предмети", [
      `у файлі item ${countOf("item")} + baseitem ${countOf("baseitem")}, артефактів ${artifacts.length}`,
      `consumable ${stats.filter((s) => s?.consumable).length}, не unique ${stats.filter((s) => s?.unique === false).length}, з abilities ${artifacts.filter((a) => array(a.abilities).length > 0).length}, слоти: ${Object.entries(artifacts.reduce<Record<string, number>>((m, a) => ({ ...m, [a.slot]: (m[a.slot] ?? 0) + 1 }), {})).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      `попередження: ${codes(["artifacts"])}`,
    ]);

    const otherActions = Object.entries(again.report.issueCounts).filter(([c]) => !/^MANUAL_/.test(c)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `${c}=${n}`);

    section("7. Звіт покриття", [
      `readyToImport ${first.report.readyToImport}, readyToPlay ${first.report.readyToPlay}`,
      `MANUAL_* у звіті: ${Object.entries(first.report.issueCounts).filter(([c]) => /^MANUAL_/.test(c)).reduce((n, [, v]) => n + v, 0)}`,
      `інші коди: ${otherActions.join(", ") || "-"}`,
      `за категоріями (present/mapped/skipped): ${Object.entries(first.report.countsByCategory).map(([k, v]) => `${k} ${v.present}/${v.mapped}/${v.skipped}`).join(", ")}`,
    ]);

    section("8. Живий прогін", ["не автоматизується: ДМ-імпорт через UI, бій і каст — крок E4"]);

    console.info(lines.join("\n"));
  } finally {
    if (!process.argv.includes("--keep")) {
      await prisma.campaign.deleteMany({ where: { id: campaignId, dmUserId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } else console.info(`kept campaign ${campaignId}`);

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
