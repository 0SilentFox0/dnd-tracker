#!/usr/bin/env tsx
/**
 * Будує промпти для AI-генерації іконок (CSV + markdown) у docs/assets/icon-prompts.
 *
 *   pnpm assets:icon-prompts --srd <Open5e srd-2024 dir> [--campaign <id>] [--out <dir>]
 *
 * SRD: Creature/CreatureTrait/CreatureAction/Spell/Weapon/Armor .json (Django fixtures).
 * HOMM5: з БД (DATABASE_URL) за id кампанії; суб'єкти — scripts/assets/icon-subjects/homm5-*.json.
 */
import * as fs from "fs";
import * as path from "path";

import {
  assertCleanPrompt,
  assertUniqueFiles,
  autoCreatureSubject,
  autoSpellSubject,
  composeCreature,
  composeItem,
  composeSkill,
  composeSpell,
  creatureFraming,
  PromptRow,
  rarityFlair,
  SKILL_GROUP_PALETTES,
  srdSpellPalette,
  tierRing,
  toCsv,
  toMarkdown,
} from "./icon-prompts/compose";

const SUBJECTS_DIR = path.join(__dirname, "icon-subjects");

interface FixtureFields {
  name: string;
  parent: string;
  size: string;
  type: string;
  fly: unknown;
  swim: unknown;
  school: string;
  level: number;
  damage_types?: string[];
  shape_type?: string | null;
  desc?: string;
  is_simple?: boolean;
}

type Fixture = { pk: string; fields: FixtureFields };
type SpellSubject = { palette: string; subject: string };

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8")) as T;

function subjects<T>(name: string): Record<string, T> {
  const file = path.join(SUBJECTS_DIR, `${name}.json`);

  return fs.existsSync(file) ? readJson<Record<string, T>>(file) : {};
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const slugOf = (pk: string) => pk.replace(/^srd-2024_/, "");

function srdCreatures(dir: string): PromptRow[] {
  const creatures = readJson<Fixture[]>(path.join(dir, "Creature.json"));

  const traits = readJson<Fixture[]>(path.join(dir, "CreatureTrait.json"));

  const actions = readJson<Fixture[]>(path.join(dir, "CreatureAction.json"));

  const overrides = subjects<string>("srd-creatures");

  const features = new Map<string, string[]>();

  for (const f of [...traits, ...actions]) {
    const list = features.get(f.fields.parent) ?? [];

    list.push(f.fields.name);
    features.set(f.fields.parent, list);
  }

  return creatures.map((c) => {
    const slug = slugOf(c.pk);

    const f = c.fields;

    const subject =
      overrides[slug] ??
      autoCreatureSubject({
        slug,
        name: f.name,
        size: f.size,
        type: f.type,
        fly: Boolean(f.fly),
        swim: Boolean(f.swim),
        featureNames: features.get(c.pk) ?? [],
      });

    return {
      file: `${c.pk}.png`,
      name: f.name,
      kind: "units",
      prompt: composeCreature(subject, creatureFraming(slug, f.size, f.type)),
      group: title(f.type),
    };
  });
}

function srdSpells(dir: string): PromptRow[] {
  const spells = readJson<Fixture[]>(path.join(dir, "Spell.json"));

  const overrides = subjects<SpellSubject>("srd-spells");

  return spells.map((s) => {
    const f = s.fields;

    const input = {
      name: f.name,
      school: f.school,
      damageTypes: f.damage_types ?? [],
      shapeType: f.shape_type ?? null,
      desc: f.desc ?? "",
    };

    const o = overrides[slugOf(s.pk)];

    const subject = o?.subject ?? autoSpellSubject(input);

    const palette = o?.palette ?? srdSpellPalette(input);

    return {
      file: `${s.pk}.png`,
      name: f.name,
      kind: "spells",
      prompt: composeSpell(subject, palette),
      group: `${title(f.school)}, рівень ${f.level}`,
    };
  });
}

function srdWeapons(dir: string): PromptRow[] {
  const weapons = readJson<Fixture[]>(path.join(dir, "Weapon.json"));

  const shield = readJson<Fixture[]>(path.join(dir, "Armor.json")).filter((a) => a.pk === "srd-2024_shield");

  const overrides = subjects<string>("srd-weapons");

  return [...weapons, ...shield].map((w) => {
    const slug = slugOf(w.pk);

    const subject = overrides[slug] ?? `a ${w.fields.name.toLowerCase()}`;

    return {
      file: `${w.pk}.png`,
      name: w.fields.name,
      kind: "artifacts",
      prompt: composeItem(subject, null),
      group: w.pk === "srd-2024_shield" ? "Щит" : w.fields.is_simple ? "Проста зброя" : "Бойова зброя",
    };
  });
}

function need<T>(map: Record<string, T>, id: string, label: string): T {
  const v = map[id];

  if (!v) throw new Error(`Немає суб'єкта для ${label} (${id}): додайте у scripts/assets/icon-subjects`);

  return v;
}

async function homm5(campaignId: string): Promise<Record<string, PromptRow[]>> {
  const { prisma } = await import("@/lib/db");

  const where = { campaignId };

  const units = subjects<string>("homm5-units");

  const spellSubjects = subjects<SpellSubject>("homm5-spells");

  const artifacts = subjects<string>("homm5-artifacts");

  const skillSubjects = subjects<string>("homm5-skills");

  const mainSubjects = subjects<string>("homm5-main-skills");

  const [unitRows, spellRows, artifactRows, skillRows, mainRows] = await Promise.all([
    prisma.unit.findMany({ where, include: { race: true }, orderBy: [{ raceId: "asc" }, { level: "asc" }, { name: "asc" }] }),
    prisma.spell.findMany({ where, include: { spellGroup: true }, orderBy: [{ groupId: "asc" }, { level: "asc" }, { name: "asc" }] }),
    prisma.artifact.findMany({ where, orderBy: [{ slot: "asc" }, { name: "asc" }] }),
    prisma.skill.findMany({ where, include: { mainSkill: true }, orderBy: [{ mainSkillId: "asc" }, { name: "asc" }] }),
    prisma.mainSkill.findMany({ where, orderBy: { name: "asc" } }),
  ]);

  return {
    "homm5-units": unitRows.map((u) => ({
      file: `${u.name}.png`,
      name: u.name,
      kind: "units",
      prompt: composeCreature(need(units, u.id, `юніт ${u.name}`), "portrait"),
      group: `${u.race?.name ?? "Без раси"}, рівень ${u.level}`,
    })),
    "homm5-spells": spellRows.map((s) => {
      const o = need(spellSubjects, s.id, `закляття ${s.name}`);

      return {
        file: `${s.name}.png`,
        name: s.name,
        kind: "spells",
        prompt: composeSpell(o.subject, o.palette),
        group: s.spellGroup?.name ?? "Без школи",
      };
    }),
    "homm5-artifacts": artifactRows.map((a) => ({
      file: `${a.name}.png`,
      name: a.name,
      kind: "artifacts",
      prompt: composeItem(need(artifacts, a.id, `артефакт ${a.name}`), rarityFlair(a.rarity)),
      group: a.slot,
    })),
    "homm5-skills": skillRows.map((k) => {
      const group = k.mainSkill?.name ?? "Без гілки";

      return {
        file: `${k.name}.png`,
        name: k.name,
        kind: "skills",
        prompt: composeSkill(
          need(skillSubjects, k.id, `навичка ${k.name}`),
          SKILL_GROUP_PALETTES[group] ?? "neutral gold",
          tierRing(k.name),
        ),
        group,
      };
    }),
    "homm5-main-skills": mainRows.map((m) => ({
      file: `${m.name}.png`,
      name: m.name,
      kind: "main-skills",
      prompt: composeSkill(need(mainSubjects, m.id, `головна навичка ${m.name}`), SKILL_GROUP_PALETTES[m.name] ?? "neutral gold", null),
      group: "Головні навички",
    })),
  };
}

const INTROS: Record<string, [string, string]> = {
  "srd-creatures": ["SRD 5.2 — істоти", "Токени істот. Файли: `srd-2024_<slug>.png`."],
  "srd-spells": ["SRD 5.2 — закляття", "Іконки заклять. Файли: `srd-2024_<slug>.png`."],
  "srd-weapons": ["SRD 5.2 — зброя та щит", "Предмети. Файли: `srd-2024_<slug>.png`."],
  "homm5-units": ["HOMM5 — юніти", "Токени юнітів. Файл = точна українська назва."],
  "homm5-spells": ["HOMM5 — закляття", "Іконки заклять. Файл = точна українська назва."],
  "homm5-artifacts": ["HOMM5 — артефакти", "Предмети. Файл = точна українська назва."],
  "homm5-skills": ["HOMM5 — навички", "Іконки навичок. Файл = точна українська назва."],
  "homm5-main-skills": ["HOMM5 — головні навички", "Іконки гілок навичок. Файл = точна українська назва."],
};

function write(outDir: string, sets: Record<string, PromptRow[]>): void {
  fs.mkdirSync(outDir, { recursive: true });

  for (const [name, rows] of Object.entries(sets)) {
    assertUniqueFiles(rows, name);
    rows.forEach(assertCleanPrompt);

    const [heading, intro] = INTROS[name];

    fs.writeFileSync(path.join(outDir, `${name}.csv`), toCsv(rows));
    fs.writeFileSync(path.join(outDir, `${name}.md`), toMarkdown(heading, intro, rows));
    console.info(`${name}: ${rows.length}`);
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);

  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const srd = arg("srd");

  const campaign = arg("campaign");

  const out = path.resolve(arg("out") ?? "docs/assets/icon-prompts");

  if (!srd && !campaign) throw new Error("Вкажіть --srd <dir> та/або --campaign <id>");

  if (srd) {
    write(out, {
      "srd-creatures": srdCreatures(srd),
      "srd-spells": srdSpells(srd),
      "srd-weapons": srdWeapons(srd),
    });
  }

  if (campaign) write(out, await homm5(campaign));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
