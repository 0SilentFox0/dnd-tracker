#!/usr/bin/env tsx
/**
 * Створює героїв і NPC кампанії «HoMM5: Імперія Грифона» з heroes.json / npcs.json + портрети.
 * Ідемпотентно: персонажа шукає за іменем у кампанії → оновлює біографію/цілі/параметри, інакше створює.
 * Портрет завантажується в bucket avatars лише якщо в персонажа ще немає аватара (або --force-avatars).
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/seed-homm5-characters.ts \
 *     [--campaign <id>] [--heroes <file>] [--npcs <file>] [--photos <dir>] [--only <keys>] [--initiative-only] [--dry-run] [--force-avatars] [--allow-remote]
 *
 * --only markel,tieru — лише вказані ключі (id з json). Без --campaign береться єдина кампанія, в назві якої є «HoMM».
 */
import type { Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CharacterType, clampHeroInitiative, GoalAuthor, GoalKind, GoalStatus } from "../lib/constants/characters";
import type { HeroArchetypeKey } from "../lib/constants/hero-archetypes";
import { prisma } from "../lib/db";
import { characterGoalsSchema } from "../lib/schemas/character-goals";
import { uploadArtifactIconDataUrlToSupabase } from "../lib/supabase/artifact-icon-storage";
import { AVATARS_BUCKET } from "../lib/supabase/avatar-storage";
import { fullSpellSlots } from "../lib/utils/spells/spell-slots";
import type { CharacterGoal } from "../types/characters";
import type { SpellSlotProgression } from "../types/races";
import { assertSeedTarget } from "./seed-library-lib";

type Note = { title: string; text: string };
type Quest = { id: string; title: string; type: string; hook: string; motivation: string };
type HeroGoal = { id: string; title: string; type: string; text: string; status: string };
type Hero = { id: string; name: string; title: string; race: string; faction: string; class: string; quote: string; appearance: string; history: string[]; secrets: Note[]; playNotes: Note[]; goals?: HeroGoal[]; quests?: Quest[]; relationships: { name: string; text: string }[]; values: string[] };
type Npc = { id: string; name: string; title: string; role: string; description: string; motivation: string; methods?: string[]; crimes?: string[]; tells?: string[]; masks?: { scenes: string; as: string; note: string }[]; keyLines?: string[]; branches?: { choice: string; result: string }[]; appearsIn: string[]; dmSecrets: string[] };

type Ability = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

type Build = {
  type: (typeof CharacterType)[keyof typeof CharacterType];
  race: string;
  className?: string;
  archetype: HeroArchetypeKey | null;
  primary: Ability;
  /** Стандартний набір 15/14/13/12/10/8 у цьому порядку. */
  order: [Ability, Ability, Ability, Ability, Ability, Ability];
  saves: Ability[];
  casting: "intelligence" | "wisdom" | "charisma" | null;
  ac: number;
  speed?: number;
  photo?: string;
  /** Назва персонального вміння в кампанії. */
  personalSkill?: string;
};

const STANDARD = [15, 14, 13, 12, 10, 8];

const ARCHETYPE_INITIATIVE: Record<string, number> = { rogue: 3, ranger: 2, warrior: 1, paladin: 1, mage: 0 };

const heroInitiative = (dex: number, archetype: HeroArchetypeKey | null) =>
  clampHeroInitiative(11 + Math.max(0, Math.floor((dex - 10) / 2)) + (archetype ? ARCHETYPE_INITIATIVE[archetype] : 1));

const BUILDS: Record<string, Build> = {
  izabel: { type: "player", race: "Люди", archetype: null, primary: "wisdom", order: ["wisdom", "constitution", "strength", "charisma", "dexterity", "intelligence"], saves: ["wisdom", "charisma"], casting: "wisdom", ac: 16, photo: "Isabel", personalSkill: "Ізабель: Сурми світанку" },
  godryk: { type: "player", race: "Люди", archetype: "paladin", primary: "strength", order: ["strength", "charisma", "constitution", "wisdom", "dexterity", "intelligence"], saves: ["wisdom", "charisma"], casting: "charisma", ac: 18, photo: "Godric", personalSkill: "Годрик: Непохитний" },
  aiven: { type: "player", race: "Ельфи", archetype: "ranger", primary: "dexterity", order: ["dexterity", "wisdom", "constitution", "strength", "intelligence", "charisma"], saves: ["strength", "dexterity"], casting: "wisdom", ac: 14, photo: "Aiven", personalSkill: "Айвен: Перший постріл" },
  zehir: { type: "player", race: "Маги", archetype: "mage", primary: "intelligence", order: ["intelligence", "constitution", "dexterity", "wisdom", "charisma", "strength"], saves: ["intelligence", "wisdom"], casting: "intelligence", ac: 12, photo: "Zehir", personalSkill: "Зехір: Учень усіх шкіл" },
  semgrun: { type: "player", race: "Гноми", archetype: "warrior", primary: "strength", order: ["strength", "constitution", "dexterity", "wisdom", "charisma", "intelligence"], saves: ["strength", "constitution"], casting: null, ac: 17, speed: 25, photo: "Semgrun", personalSkill: "Семгрун: Невловима" },
  agrail: { type: "player", race: "Демони", archetype: "warrior", primary: "strength", order: ["strength", "charisma", "constitution", "dexterity", "wisdom", "intelligence"], saves: ["strength", "charisma"], casting: null, ac: 16, photo: "Agrail", personalSkill: "Аграїл: Полум'яна аура" },
  railag: { type: "player", race: "Темні ельфи", archetype: "rogue", primary: "dexterity", order: ["dexterity", "constitution", "strength", "wisdom", "charisma", "intelligence"], saves: ["dexterity", "constitution"], casting: null, ac: 15, photo: "Railag", personalSkill: "Раїлаг: Отрута Ігг-Шайла" },
  "kha-beleh": { type: "npc_hero", race: "Демони", className: "Володар Демонів", archetype: "mage", primary: "charisma", order: ["charisma", "intelligence", "constitution", "wisdom", "strength", "dexterity"], saves: ["wisdom", "charisma"], casting: "charisma", ac: 17, photo: "KhaBeleh", personalSkill: "Кха-Белех: Кара Безодні" },
  biara: { type: "npc_hero", race: "Демони", className: "Суккуб", archetype: "rogue", primary: "charisma", order: ["charisma", "dexterity", "constitution", "intelligence", "wisdom", "strength"], saves: ["dexterity", "charisma"], casting: "charisma", ac: 15, photo: "Biara" },
  tieru: { type: "npc_hero", race: "Ельфи", className: "Король ельфів", archetype: null, primary: "charisma", order: ["charisma", "wisdom", "dexterity", "constitution", "intelligence", "strength"], saves: ["wisdom", "charisma"], casting: "charisma", ac: 15, photo: "Tieru" },
  markel: { type: "npc_hero", race: "Некроманти", className: "Лорд некромантів", archetype: "mage", primary: "intelligence", order: ["intelligence", "constitution", "wisdom", "charisma", "dexterity", "strength"], saves: ["intelligence", "wisdom"], casting: "intelligence", ac: 13, photo: "Markel", personalSkill: "Маркел: Поклик Аватара" },
  "aramon-harkonid": { type: "npc_hero", race: "Маги", className: "Архімаг", archetype: "mage", primary: "intelligence", order: ["intelligence", "constitution", "wisdom", "dexterity", "charisma", "strength"], saves: ["intelligence", "wisdom"], casting: "intelligence", ac: 13 },
};

// Маркела немає в npcs.json — чернетка за лором HoMM5, майстер поправить у профілі
const EXTRA_NPCS: Npc[] = [
  {
    id: "markel",
    name: "Маркел",
    title: "Лорд некромантів, служитель Аші",
    role: "Третя сила: ворог Пекла, але не друг живим (ЧЕРНЕТКА — уточнити роль і сцени)",
    description:
      "Колишній маг, що обрав шлях Аші, Богині-Павучихи, і для якого смерть лише інша форма служіння. Блідий, рудобородий, з книгою, яку ніколи не відкладає, і зеленим вогнем некромантії на пальцях. Говорить ввічливо й тихо, мислить століттями, а людей бачить як майбутніх слуг.",
    motivation: "Зупинити Пекло й Темного Месію, бо вони загрожують Колу Аші, — але на своїх умовах, і так, щоб після війни Некрополіс став сильнішим за Імперію.",
    methods: ["Підіймає полеглих з обох боків фронту", "Пропонує живим союз, коли тим нікуди відступати", "Грає на страху втратити близьких: обіцяє, що смерть не кінець"],
    keyLines: ["Смерть — не ворог. Ворог — той, хто хоче, щоб вона прийшла назавжди.", "Ти просиш мене про допомогу, Імператрице? Тоді не питай, яку ціну заплатять мертві."],
    appearsIn: [],
    dmSecrets: ["Роль у сюжеті ще не визначена: союзник за потреби, суперник Біари чи той, хто захоче підняти полеглого Ніколаса.", "Знає більше про тавро Ізабель, ніж каже: Кола Аші давно стежать за пророцтвом про Темного Месію."],
  },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);

  return i >= 0 ? process.argv[i + 1] : undefined;
}

const flag = (name: string) => process.argv.includes(`--${name}`);

// Розмітка BiographyText: «# заголовок», «> цитата», «• пункт», **жирне**
const section = (title: string, lines: string[]) => (lines.length ? [`# ${title}\n${lines.join("\n")}`] : []);

const bullets = (items: string[] | undefined) => (items ?? []).map((s) => `• ${s}`);

const note = (n: Note) => `• **${n.title.replace(/[.:]$/, "")}.** ${n.text}`;

function heroBiography(h: Hero): string {
  const [firstHistory, ...restHistory] = h.history;

  return [
    `> «${h.quote}»\n${h.title}`,
    `# Фракція\n${h.faction}`,
    `# Зовнішність\n${h.appearance}`,
    ...(firstHistory ? [`# Історія\n${firstHistory}`, ...restHistory] : []),
    ...section("Цінності", bullets(h.values)),
    ...section("Стосунки", h.relationships.map((r) => `• **${r.name}** — ${r.text}`)),
    ...section("Як грати", h.playNotes.map(note)),
    ...section("Таємниці", h.secrets.map(note)),
  ].join("\n\n");
}

function npcBiography(n: Npc): string {
  return [
    `${n.title}\n${n.role}`,
    n.description,
    `**Мотивація.** ${n.motivation}`,
    ...section("Методи", bullets(n.methods)),
    ...section("Злочини", bullets(n.crimes)),
    ...section("Личини", (n.masks ?? []).map((m) => `• **${m.as}** (сцени ${m.scenes}) — ${m.note}`)),
    ...section("Ознаки", bullets(n.tells)),
    ...section("Ключові репліки", (n.keyLines ?? []).map((l) => `> «${l}»`)),
    ...section("Розвилки", (n.branches ?? []).map((b) => `• **${b.choice}** → ${b.result}`)),
    ...section("Сцени", bullets(n.appearsIn)),
    ...section("Для майстра", bullets(n.dmSecrets)),
  ].join("\n\n");
}

const KINDS = new Set<string>(Object.values(GoalKind));

const STATUSES = new Set<string>(Object.values(GoalStatus));

// heroes.json v2 має goals; Раілаг у npcs.json досі у форматі quests — одна мета на квест
function heroGoals(h: Hero): CharacterGoal[] {
  const source = h.goals ?? (h.quests ?? []).map((q) => ({ id: q.id, title: q.title, type: q.type, text: `${q.hook} ${q.motivation}`, status: "active" }));

  const goals = source.map((g): CharacterGoal => ({
    id: g.id.slice(0, 40),
    title: g.title,
    ...(KINDS.has(g.type) && { kind: g.type as GoalKind }),
    text: g.text,
    status: STATUSES.has(g.status) ? (g.status as GoalStatus) : GoalStatus.ACTIVE,
    author: GoalAuthor.DM,
  }));

  return characterGoalsSchema.parse(goals);
}

function stats(b: Build) {
  const scores = Object.fromEntries(b.order.map((a, i) => [a, STANDARD[i]])) as Record<Ability, number>;

  return {
    ...scores,
    armorClass: b.ac,
    initiative: heroInitiative(scores.dexterity, b.archetype),
    speed: b.speed ?? 30,
    savingThrows: Object.fromEntries(b.saves.map((s) => [s, true])),
    spellcastingAbility: b.casting,
    primaryAbility: b.primary,
    archetype: b.archetype,
  };
}

function photoDataUrl(dir: string, name: string): string | null {
  const src = ["jpeg", "jpg", "png", "webp"].map((ext) => join(dir, `${name}.${ext}`)).find(existsSync);

  if (!src) return null;

  const out = join(mkdtempSync(join(tmpdir(), "homm5-avatar-")), `${name}.jpg`);

  // 3 МБ оригінали → ~100 КБ: аватари віддаються через next/image, egress Supabase обмежений
  execFileSync("sips", ["-Z", "768", "-s", "format", "jpeg", "-s", "formatOptions", "82", src, "--out", out], { stdio: "ignore" });

  return `data:image/jpeg;base64,${readFileSync(out).toString("base64")}`;
}

async function resolveCampaign() {
  const id = arg("campaign");

  if (id) return prisma.campaign.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, dmUserId: true } });

  const found = await prisma.campaign.findMany({ where: { name: { contains: "HoMM", mode: "insensitive" } }, select: { id: true, name: true, dmUserId: true } });

  if (found.length !== 1) throw new Error(`Знайдено ${found.length} кампаній з «HoMM» у назві — вкажіть --campaign <id>. ${found.map((c) => `${c.id} «${c.name}»`).join(", ")}`);

  return found[0];
}

async function main() {
  const host = assertSeedTarget(process.env.DATABASE_URL, flag("allow-remote"));

  const dryRun = flag("dry-run");

  const heroesFile = JSON.parse(readFileSync(arg("heroes") ?? "/Users/silentfox/Downloads/heroes (1).json", "utf8"));

  const npcsFile = JSON.parse(readFileSync(arg("npcs") ?? "/Users/silentfox/Downloads/npcs.json", "utf8"));

  const photos = arg("photos") ?? "/Users/silentfox/Desktop/Heroes";

  const campaign = await resolveCampaign();

  console.log(`БД: ${host} · кампанія «${campaign.name}» (${campaign.id})${dryRun ? " · DRY RUN" : ""}`);

  const races = await prisma.race.findMany({ where: { campaignId: campaign.id }, select: { name: true, spellSlotProgression: true } });

  const raceByName = new Map(races.map((r) => [r.name, r]));

  const skillIdByName = new Map((await prisma.skill.findMany({ where: { campaignId: campaign.id }, select: { id: true, name: true } })).map((sk) => [sk.name, sk.id]));

  const heroes: Hero[] = [...heroesFile.characters, npcsFile.railag];

  const npcs: Npc[] = [...npcsFile.npcs, ...EXTRA_NPCS];

  const entries = [
    ...heroes.map((h) => ({ key: h.id, name: h.name, className: h.class, subrace: h.race, background: heroBiography(h), goals: heroGoals(h) })),
    ...npcs.map((n) => ({ key: n.id, name: n.name, className: undefined, subrace: undefined, background: npcBiography(n), goals: [] as CharacterGoal[] })),
  ];

  const only = arg("only")?.split(",");

  for (const e of entries.filter((x) => !only || only.includes(x.key))) {
    const b = BUILDS[e.key];

    if (!b) throw new Error(`Немає параметрів для «${e.key}»`);

    const race = raceByName.get(b.race);

    if (!race) console.warn(`⚠ «${e.name}»: раси «${b.race}» немає в кампанії — запишу назву як є`);

    const personalSkillId = b.personalSkill ? skillIdByName.get(b.personalSkill) : undefined;

    if (b.personalSkill && !personalSkillId) console.warn(`⚠ «${e.name}»: вміння «${b.personalSkill}» немає в кампанії`);

    const data = {
      type: b.type,
      name: e.name,
      class: e.className ?? b.className ?? "Герой",
      race: b.race,
      subrace: e.subrace ?? null,
      background: e.background,
      goals: e.goals as unknown as Prisma.InputJsonValue,
      ...stats(b),
      ...(personalSkillId && { personalSkillId }),
    };

    const existing = await prisma.character.findFirst({ where: { campaignId: campaign.id, name: e.name }, select: { id: true, avatar: true } });

    const needsAvatar = !!b.photo && !flag("initiative-only") && (!existing?.avatar || flag("force-avatars"));

    let avatar: string | undefined;

    if (needsAvatar && !dryRun) {
      const dataUrl = photoDataUrl(photos, b.photo as string);

      if (!dataUrl) {
        console.warn(`⚠ «${e.name}»: немає фото ${b.photo}.* у ${photos}`);
      } else {
        const hash = createHash("sha256").update(dataUrl).digest("hex").slice(0, 24);

        const up = await uploadArtifactIconDataUrlToSupabase(dataUrl, { campaignId: campaign.id, objectBaseName: `${e.key}-${hash}`, bucket: AVATARS_BUCKET, cacheControl: "31536000" });

        if (!up.ok) throw new Error(`Аватар «${e.name}»: ${up.message}`);

        avatar = up.publicUrl;
      }
    }

    if (flag("initiative-only")) {
      if (!existing) {
        console.warn(`⚠ «${e.name}» не знайдено`);
        continue;
      }

      if (!dryRun) await prisma.character.update({ where: { id: existing.id }, data: { initiative: data.initiative, ...(personalSkillId && { personalSkillId }) } });

      console.log(`ініціатива ${data.initiative}${personalSkillId ? ` + вміння «${b.personalSkill}»` : ""}: ${e.name}`);
      continue;
    }

    const summary = `${e.name} · ${data.type} · ініц. ${data.initiative} · ${data.race}/${data.class} · ${e.goals.length} цілей · біографія ${e.background.length} симв.${needsAvatar ? " · аватар" : ""}`;

    if (dryRun) {
      console.log(`${existing ? "оновив би" : "створив би"}: ${summary}`);
      continue;
    }

    if (existing) {
      await prisma.character.update({ where: { id: existing.id }, data: { ...data, ...(avatar && { avatar }) } });
      console.log(`оновлено: ${summary}`);
      continue;
    }

    const progression = Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as unknown as SpellSlotProgression[]) : null;

    await prisma.$transaction(async (tx) => {
      const created = await tx.character.create({
        data: { ...data, campaignId: campaign.id, controlledBy: campaign.dmUserId, level: 1, avatar, spellSlots: fullSpellSlots(1, progression), skillTreeProgress: {} },
        select: { id: true },
      });

      await tx.characterInventory.create({ data: { characterId: created.id, equipped: {}, backpack: [], gold: 0, silver: 0, copper: 0, items: [] } });
    });

    console.log(`створено: ${summary}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
