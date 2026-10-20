#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any -- сценарій ганяє сирі JSON-відповіді API */
/**
 * Наскрізна перевірка бою на копії прод-БД кампанії HoMM5: усі герої на 9 рівні (з 9-го можна стати Експертом гілки), три ротації білдів дерев
 * (дві легальні для L9 і одна примусова — расові «Просунутий/Експерт» та ультимати), сети артефактів,
 * 5-раундові бої проти всіх юнітів через справжні мутації API (runBattleMutation), цільові сценарії
 * (рідкісні тригери), контроль юнітів і закляття 5-го рівня від імені гравця.
 * Змінює героїв і створює бої в БД — лише локальна копія (`scripts/db/prodcopy-db.sh`).
 *
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep [--mode all|sweep|targeted|control|level5] [--campaign <id>] [--out <dir>] [--consistency] [--keep-battles]
 *
 * Звіт: <out>/battle-sweep.md (+ data.json, log.txt). Код виходу 1, якщо є помилки.
 * Створені бої видаляються після прогону; --keep-battles лишає їх для огляду в браузері.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { abilityActionSchema, createAbilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { attackBodySchema, createAttackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { auraZoneMutation, auraZoneSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/aura-zone/aura-zone-mutation";
import { bonusActionSchema, createBonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { mapTerrainMutation, mapTerrainSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/map-terrain/map-terrain-mutation";
import { mazeActionSchema, mazeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-mutation";
import { mazeMarkMutation, mazeMarkSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/maze-mark/maze-mark-mutation";
import { moraleCheckMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/morale-check/morale-check-mutation";
import { moveMutation, moveSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { patchParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation";
import { patchParticipantSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-schema";
import { revealParticipantMutation, revealParticipantSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation";
import { spellSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { createStartMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import { unitControlMutation, unitControlSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/unit-control/unit-control-mutation";
import { BATTLE_LOG_RECENT_EVENTS, emptyMaze, MAZE_SCATTER_MIN_GAP, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { moraleCheckSchema } from "@/lib/schemas";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { pendingAreaAuras, zoneCandidates, zoneMembers } from "@/lib/utils/abilities/engine/effects/area-aura";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { cellDistance, cellKey, neighbors } from "@/lib/utils/battle/grid/geometry";
import { cellsOf } from "@/lib/utils/battle/grid/occupancy";
import { allReachExit, canStep, isMazeHero, MAZE_DARK_ERROR, MAZE_DARK_SKIP, mazeDistances, type MazeGrid, mazeReachable, mazeVision, seesParticipant, viewpointOf, wallSet } from "@/lib/utils/battle/maze";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { loadSpellsFromDb } from "@/lib/utils/battle/spell/load-spells-db";
import { spellTargetingFor } from "@/lib/utils/battle/spell/spell-targeting";
import { loadBattle, loadRecentEvents, saveBattle } from "@/lib/utils/battle/store";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import { needsMoraleCheck } from "@/lib/utils/battle/view";
import { rollDiceList } from "@/lib/utils/common/dice";
import { branchLevelNodeId, canLearn, normalizeTree, racialNodeId, writeUnlocked } from "@/lib/utils/skills/progression";
import { fullSpellSlots } from "@/lib/utils/spells/spell-slots";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
  console.error("❌ battle-sweep змінює героїв і створює бої — лише локальна БД (DATABASE_URL на localhost).");
  process.exit(1);
}

const argv = process.argv.slice(2);

const arg = (name: string) => { const i = argv.indexOf(`--${name}`);

 return i >= 0 ? argv[i + 1] : undefined; };

const MODE = arg("mode") ?? "all";

const CAMPAIGN = arg("campaign");

const OUT = arg("out") ?? join(tmpdir(), "battle-sweep");

const CONSISTENCY = argv.includes("--consistency");

const KEEP_BATTLES = argv.includes("--keep-battles");

const ROUNDS = 5;

const HERO_LEVEL = 9;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(7);

const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];

const createdBattles: string[] = [];

async function createTestBattle(args: Parameters<typeof prisma.battleScene.create>[0]) {
  const b = await prisma.battleScene.create(args);

  createdBattles.push(b.id);

  return b;
}

async function removeTestBattles() {
  if (KEEP_BATTLES || !createdBattles.length) return;

  await prisma.battleScene.deleteMany({ where: { id: { in: createdBattles } } });
}

let actingUser = "";

let dmId = "";

const ctx = { campaignId: "", battleId: "" };

let state: any;

let battleLabel = "";

const deps: any = {
  getUserId: async () => actingUser,
  rateLimit: async () => ({ allowed: true, count: 0, limit: 1e6, resetInSeconds: 0 }),
  loadBattle: (a: any) => loadBattle(prisma, a),
  saveBattle: (b: any, o: any) => saveBattle(prisma, b, o),
  loadRecentEvents: (id: string, l: number) => loadRecentEvents(prisma, id, l),
  publish: () => {},
  rng: () => rng(),
};

// ---------- журнали ----------
const issues: Array<{ level: "error" | "warn"; where: string; text: string }> = [];

const issue = (level: "error" | "warn", text: string) => issues.push({ level, where: `${battleLabel} р${state?.currentRound ?? "?"}`, text });

const fullLog: string[] = [];

const rejections = new Map<string, number>();

type Cov = { source: string; owner: string; name: string; event: string; effects: string; battles: number; fired: number; passiveOk: number; passiveMiss: number; owners: Set<string>; note: boolean; conditional: boolean };

const coverage = new Map<string, Cov>();

const spellStats = new Map<string, { school: string; level: number; casts: number; ok: number; noEffect: number; rejected: string[]; samples: string[]; kinds: string }>();

const treeChecks: string[] = [];

async function readState() {
  const res = await runBattleMutation(new Request("http://localhost/battle"), { params: { id: ctx.campaignId, battleId: ctx.battleId }, access: "member", dryRun: () => true, includeRecentEvents: BATTLE_LOG_RECENT_EVENTS, mutate: (c: any) => ({ participants: c.participants, pending: c.pending, events: [] }) } as any, deps);

  return res.json();
}

const P = () => state.initiativeOrder as any[];

const byId = (id: string) => P().find((p) => p.basicInfo.id === id);

const current = () => P()[state.currentTurnIndex];

const alive = (p: any) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

const foesOf = (p: any) => P().filter((x) => x.basicInfo.side !== p.basicInfo.side && alive(x));

const friendsOf = (p: any) => P().filter((x) => x.basicInfo.side === p.basicInfo.side && alive(x));

function invariants(label: string) {
  for (const p of P()) {
    const hp = p.combatStats.currentHp, max = p.combatStats.maxHp;

    if (!Number.isFinite(hp) || !Number.isFinite(max)) issue("error", `${label}: ${p.basicInfo.name} HP не число (${hp}/${max})`);
    else if (hp < 0) issue("error", `${label}: ${p.basicInfo.name} HP < 0 (${hp})`);
    else if (hp > max + (p.combatStats.tempHp ?? 0) + 0) issue("warn", `${label}: ${p.basicInfo.name} HP ${hp} > max ${max}`);

    if (hp <= 0 && p.combatStats.status === "active") issue("error", `${label}: ${p.basicInfo.name} має 0 HP, але статус active`);
  }
}

async function call(label: string, options: any, body: any = {}, as?: string) {
  actingUser = as ?? dmId;

  const req = new Request(`http://localhost/api/campaigns/${ctx.campaignId}/battles/${ctx.battleId}/${label}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  let res: Response;

  try {
    res = await runBattleMutation(req, { ...options, params: { id: ctx.campaignId, battleId: ctx.battleId } }, deps);
  } catch (e: any) {
    issue("error", `${label}: виняток ${e?.message}`);

    return { status: 599, body: {} as any, log: [] as any[] };
  }

  const json: any = await res.json();

  const curBefore = state?.initiativeOrder?.[state.currentTurnIndex]?.basicInfo.id;

  const orderBefore = state?.initiativeOrder?.map((p: any) => p.basicInfo.name);

  let newLog: any[] = [];

  if (res.status === 200 && "delta" in json) {
    const applied = applyBattleDelta(state, json.delta);

    state = applied === "refetch" ? await readState() : applied;
    newLog = json.delta.log ?? [];

    if (CONSISTENCY) {
      const full: any = await readState();

      const a = state.initiativeOrder.map((p: any) => p.basicInfo.id).join(","), b = full.initiativeOrder.map((p: any) => p.basicInfo.id).join(",");

      const ca = state.initiativeOrder[state.currentTurnIndex]?.basicInfo.name, cb = full.initiativeOrder[full.currentTurnIndex]?.basicInfo.name;

      if (a !== b || ca !== cb || state.currentRound !== full.currentRound) issue("error", `DELTA≠GET після ${label}: поточний ${ca} vs ${cb}; порядок ${a === b ? "збігається" : "різний"}; раунд ${state.currentRound}/${full.currentRound}; delta.scene=${JSON.stringify(json.delta.scene ?? json.delta.battle ?? Object.keys(json.delta)).slice(0, 300)}`);

      const fa = JSON.stringify(state.initiativeOrder.map((p: any) => [p.basicInfo.id, p.actionFlags, p.combatStats.currentHp])), fb = JSON.stringify(full.initiativeOrder.map((p: any) => [p.basicInfo.id, p.actionFlags, p.combatStats.currentHp]));

      if (fa !== fb && a === b) issue("error", `DELTA≠GET (флаги/HP) після ${label}`);

      state = full;
    }
  } else if (res.status === 200) {
    state = await readState();
  } else {
    const key = `${label} ${res.status} ${json.code ?? ""} ${json.error ?? ""}`.slice(0, 160);

    rejections.set(key, (rejections.get(key) ?? 0) + 1);

    if (res.status >= 500) issue("error", `${label}: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }

  for (const e of newLog) {
    const t = `[${battleLabel} р${e.round}] ${e.resultText}`;

    fullLog.push(t);

    if (/NaN|undefined|\[object|null\b/.test(e.resultText ?? "")) issue("error", `підозрілий текст логу: ${e.resultText}`);
  }

  if (res.status === 200) invariants(label);

  if (res.status === 200 && !["next-turn", "start", "attack"].includes(label) && !(label === "move" && newLog.some((e: any) => /вибрався/.test(e.resultText ?? ""))) && state.status === "active") {
    const curAfter = state.initiativeOrder[state.currentTurnIndex]?.basicInfo.id;

    if (curBefore && curAfter !== curBefore) issue("error", `TURN: після ${label} змінився поточний учасник ${byId(curBefore)?.basicInfo.name ?? curBefore} → ${byId(curAfter)?.basicInfo.name}; порядок до=${orderBefore?.join(",")}; після=${state.initiativeOrder.map((p: any) => p.basicInfo.name).join(",")}; log=${JSON.stringify(newLog.map((e: any) => e.resultText)).slice(0, 300)}`);
  }

  return { status: res.status, body: json, log: newLog };
}

const summonDeps = { loadPool: async (campaignId: string) => ({ units: await prisma.unit.findMany({ where: { campaignId } }), races: await prisma.race.findMany({ where: { campaignId } }) }) };

const START = { access: "dm", requireStatus: "prepared", mutate: createStartMutation() };

const NEXT = { access: "currentController", requireStatus: "active", mutate: nextTurnMutation };

const ATTACK = { access: "member", requireStatus: "active", blockedInDark: true, schema: attackBodySchema, mutate: createAttackMutation({ ...summonDeps, loadSpells: loadSpellsFromDb }) };

const BONUS = { access: "member", requireStatus: "active", blockedInDark: true, schema: bonusActionSchema, mutate: createBonusActionMutation(summonDeps) };

const ABILITY = { access: "member", requireStatus: "active", blockedInDark: true, schema: abilityActionSchema, mutate: createAbilityActionMutation(summonDeps) };

const SPELL = { access: "member", requireStatus: "active", blockedInDark: true, schema: spellSchema, dryRun: (b: any) => b.preview === true, mutate: createSpellMutation({ loadSpell: (id: string) => prisma.spell.findUnique({ where: { id } }), ...summonDeps } as any) };

const UNIT_CONTROL = { access: "dm", requireStatus: "active", schema: unitControlSchema, mutate: unitControlMutation };

const AURA_ZONE = { access: "member", requireStatus: "active", blockedInDark: true, schema: auraZoneSchema, mutate: auraZoneMutation };

const MORALE = { access: "member", requireStatus: "active", blockedInDark: true, schema: moraleCheckSchema, respond: "wrapped", mutate: moraleCheckMutation };

const PATCH = (id: string) => ({ access: "dm", requireStatus: "active", schema: patchParticipantSchema, mutate: (c: any, b: any) => patchParticipantMutation(c, id, b) });

const REVEAL = { access: "dm", requireStatus: "active", allowWhileAwaitingDm: true, schema: revealParticipantSchema, mutate: revealParticipantMutation };

const MOVE = { access: "member", requireStatus: "active", respond: "wrapped", schema: moveSchema, mutate: moveMutation };

const MAP_TERRAIN = { access: "dm", requireStatus: "active", schema: mapTerrainSchema, mutate: mapTerrainMutation };

const MAZE = { access: "dm", requireStatus: "active", schema: mazeActionSchema, mutate: mazeMutation };

const MAZE_MARK = { access: "member", requireStatus: "active", blockedInDark: true, schema: mazeMarkSchema, mutate: mazeMarkMutation };

const KILL = (id: string) => ({ ...PATCH(id), allowWhileAwaitingDm: true });

// ---------- підготовка ----------
const HEROES = ["Лорд Годрик Єдиноріг", "Ізабель Грейхаунд", "Зехір", "Аграїл", "Айвен", "Маркел", "Раїлаг", "Семгрун"];

const PERSONAL: Record<string, string> = { "Лорд Годрик Єдиноріг": "Годрик:", "Ізабель Грейхаунд": "Ізабель:", Зехір: "Зехір:", Аграїл: "Аграїл:", Айвен: "Айвен:", Маркел: "Маркел:", Раїлаг: "Раїлаг:", Семгрун: "Семгрун:" };

const SETS: Record<string, string> = { "Лорд Годрик Єдиноріг": "Регалії світанку", Айвен: "Мрія лучника", Семгрун: "Обладунки гномських королів", Зехір: "Регалії Сар-Ісси", Раїлаг: "Кігті Ігг-Шайла", Аграїл: "Дух лева" };

type Build = { branch: string; kind: "A" | "B" | "F" };

const ROTATIONS: Record<string, Build>[] = [
  { "Лорд Годрик Єдиноріг": { branch: "Світло", kind: "A" }, "Ізабель Грейхаунд": { branch: "Лідерство", kind: "A" }, Зехір: { branch: "Хаос", kind: "A" }, Аграїл: { branch: "Напад", kind: "A" }, Айвен: { branch: "Природа", kind: "A" }, Маркел: { branch: "Темрява", kind: "A" }, Раїлаг: { branch: "Стрільба", kind: "A" }, Семгрун: { branch: "Захист", kind: "A" } },
  { "Лорд Годрик Єдиноріг": { branch: "Лідерство", kind: "B" }, "Ізабель Грейхаунд": { branch: "Світло", kind: "B" }, Зехір: { branch: "Природа", kind: "B" }, Аграїл: { branch: "Темрява", kind: "B" }, Айвен: { branch: "Стрільба", kind: "B" }, Маркел: { branch: "Захист", kind: "B" }, Раїлаг: { branch: "Хаос", kind: "B" }, Семгрун: { branch: "Напад", kind: "B" } },
  { "Лорд Годрик Єдиноріг": { branch: "Напад", kind: "F" }, "Ізабель Грейхаунд": { branch: "Захист", kind: "F" }, Зехір: { branch: "Темрява", kind: "F" }, Аграїл: { branch: "Хаос", kind: "F" }, Айвен: { branch: "Лідерство", kind: "F" }, Маркел: { branch: "Стрільба", kind: "F" }, Раїлаг: { branch: "Темрява", kind: "F" }, Семгрун: { branch: "Світло", kind: "F" } },
];

const trees: Record<string, any> = {};

let heroRows: any[] = [];

const hero = (name: string) => heroRows.find((h) => h.name === name) ?? {};

let campaign: any;

function buildNodes(tree: any, branchName: string, kind: Build["kind"]): { order: string[]; forced: boolean } {
  const br = tree.branches.find((b: any) => b.name === branchName);

  if (!br) throw new Error(`${tree.race}: немає гілки ${branchName}`);

  const g = tree.grid.get(br.id);

  const lvl = (l: string) => branchLevelNodeId(br.id, l as any);

  if (kind === "A") return { order: [lvl("basic"), g.outer[0], lvl("advanced"), g.outer[1], lvl("expert"), g.middle[0], g.inner[0]], forced: false };

  if (kind === "B") {
    const other = tree.branches.find((b: any) => b.id !== br.id && b.spellGroupId) ?? tree.branches.find((b: any) => b.id !== br.id);

    return { order: [lvl("basic"), g.outer[2], lvl("advanced"), lvl("expert"), g.middle[1], racialNodeId("basic"), branchLevelNodeId(other.id, "basic")], forced: false };
  }

  return { order: [lvl("basic"), g.outer[0], lvl("advanced"), lvl("expert"), g.middle[0], g.inner[0], racialNodeId("basic"), racialNodeId("advanced"), racialNodeId("expert"), [...tree.nodes.values()].find((n: any) => n.kind === "ultimate")?.nodeId].filter(Boolean), forced: true };
}

function learnLegally(tree: any, order: string[], level: number, who: string) {
  const learned: string[] = [];

  for (const id of order) {
    const r = canLearn(tree, learned, level, id);

    if (!r.ok) { issue("error", `${who}: не вдалося вивчити ${id} легально (${(r as any).reason})`); continue; }

    learned.push(id);
  }

  return learned;
}

async function prepare() {
  campaign = await prisma.campaign.findFirstOrThrow({ where: CAMPAIGN ? { id: CAMPAIGN } : { name: "HOMM5" } });
  ctx.campaignId = campaign.id;
  dmId = campaign.dmUserId;
  for (const row of await prisma.skillTree.findMany({ where: { campaignId: campaign.id } })) trees[row.race] = normalizeTree(row);

  // статична перевірка: кожне дерево можна вивчити повністю (без обмеження очок) у правильному порядку
  for (const t of Object.values(trees)) {
    const learned: string[] = [];

    let progress = true;

    while (progress) {
      progress = false;
      for (const id of t.nodes.keys()) if (!learned.includes(id) && canLearn(t, learned, 99, id).ok) { learned.push(id); progress = true; }
    }

    const missing = [...t.nodes.keys()].filter((id) => !learned.includes(id));

    const noSkill = [...t.nodes.values()].filter((n: any) => n.kind !== "branchLevel" && n.kind !== "racial" && !n.skillId).length;

    treeChecks.push(`${t.race}: вузлів ${t.nodes.size}, вивчається повністю: ${missing.length === 0 ? "так" : `ні (${missing.join(", ")})`}${noSkill ? `, порожніх слотів ${noSkill}` : ""}`);

    if (missing.length) issue("error", `Дерево ${t.race}: недосяжні вузли ${missing.join(", ")}`);
  }

  const skills = await prisma.skill.findMany({ where: { campaignId: campaign.id } });

  const races = await prisma.race.findMany({ where: { campaignId: campaign.id } });

  heroRows = [];
  for (const name of HEROES) {
    const h = await prisma.character.findFirstOrThrow({ where: { campaignId: campaign.id, name } });

    const race = races.find((r) => r.name === h.race);

    const personal = skills.find((s) => s.name.startsWith(PERSONAL[name]));

    if (!personal) issue("warn", `${name}: персональне вміння «${PERSONAL[name]}…» не знайдено`);

    const slots = fullSpellSlots(HERO_LEVEL, (race?.spellSlotProgression as any) ?? [], campaign.maxLevel ?? 20);

    const setName = SETS[name];

    const equipped: Record<string, string> = {};

    if (setName) {
      const set = await prisma.artifactSet.findFirstOrThrow({ where: { campaignId: campaign.id, name: setName } });

      for (const a of await prisma.artifact.findMany({ where: { setId: set.id } })) equipped[a.slot === "ring" ? "ring1" : a.slot] = a.id;
    }

    await prisma.character.update({ where: { id: h.id }, data: { level: HERO_LEVEL, spellSlots: slots as any, personalSkillId: personal?.id ?? h.personalSkillId } });
    await prisma.characterInventory.upsert({ where: { characterId: h.id }, update: { equipped }, create: { characterId: h.id, equipped } });
    heroRows.push({ ...h, slots });
  }
}

async function applyRotation(r: number) {
  const rot = ROTATIONS[r];

  const lines: string[] = [];

  for (const h of heroRows) {
    const tree = trees[h.race];

    const b = rot[h.name];

    const { order, forced } = buildNodes(tree, b.branch, b.kind);

    const unlocked = forced ? order : learnLegally(tree, order, HERO_LEVEL, h.name);

    await prisma.character.update({ where: { id: h.id }, data: { skillTreeProgress: writeUnlocked(tree, {}, unlocked) as any } });
    lines.push(`${h.name} (${h.race}): ${b.branch} ${b.kind === "F" ? "+ раса просунутий/експерт + ультимат (ПРИМУСОВО, поза правилами рівня)" : b.kind} — ${unlocked.length} вузлів`);
  }

  return lines;
}

// ---------- покриття ----------
function recordCoverage() {
  for (const p of P()) {
    for (const a of p.battleData.resolvedAbilities ?? []) {
      const owner = p.basicInfo.sourceType === ParticipantSourceType.UNIT ? p.basicInfo.name.replace(/ #\d+$/, "") : p.basicInfo.name;

      const key = `${a.source.type}|${a.source.name}|${a.name}|${a.trigger.event}`;

      const c = coverage.get(key) ?? { source: a.source.type, owner: a.source.name, name: a.name, event: a.trigger.event, effects: a.effects.map((e: any) => e.kind).join("+"), battles: 0, fired: 0, passiveOk: 0, passiveMiss: 0, owners: new Set(), note: a.effects.every((e: any) => e.kind === "note"), conditional: !!a.condition };

      c.battles++;
      c.owners.add(owner);
      c.fired += p.battleData.abilityUsage?.[a.key]?.battle ?? 0;
      coverage.set(key, c);
    }
  }
}

function recordPassives() {
  for (const p of P()) {
    for (const a of p.battleData.resolvedAbilities ?? []) {
      if (a.trigger.event !== "passive" || a.effects.every((e: any) => e.kind === "note")) continue;

      const key = `${a.source.type}|${a.source.name}|${a.name}|${a.trigger.event}`;

      const c: any = coverage.get(key) ?? { source: a.source.type, owner: a.source.name, name: a.name, event: a.trigger.event, effects: a.effects.map((e: any) => e.kind).join("+"), battles: 0, fired: 0, passiveOk: 0, passiveMiss: 0, owners: new Set(), note: false, conditional: !!a.condition, baked: 0, missDetail: "" };

      const r = passiveApplies(p, a);

      if (r === true) c.passiveOk++; else if (r === "baked") c.baked = (c.baked ?? 0) + 1; else { c.passiveMiss++; c.missDetail = r; }

      coverage.set(key, c);
    }
  }
}

const BAKED = new Set(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "maxHp", "initiative", "spellSlots", "speed"]);

function passiveApplies(p: any, a: any): true | "baked" | string {
  if (a.effects.every((e: any) => e.kind === "modifyStat" && BAKED.has(e.stat) && (!e.target || e.target === "self"))) {
    const ab = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];

    const hero = heroRows.find((h) => p.basicInfo.sourceId === h.id || p.basicInfo.name === h.name);

    if (!hero) return "baked";

    for (const e of a.effects) {
      if (ab.includes(e.stat)) {
        const expected = hero[e.stat] + (p.battleData.resolvedAbilities ?? []).filter((x: any) => x.trigger.event === "passive").flatMap((x: any) => x.effects).filter((x: any) => x.kind === "modifyStat" && x.stat === e.stat && (!x.target || x.target === "self") && typeof x.flat === "number").reduce((n: number, x: any) => n + x.flat, 0);

        if (p.abilities[e.stat] !== expected) return `${e.stat}: ${p.abilities[e.stat]} ≠ очікувано ${expected} (база ${hero[e.stat]})`;
      } else if (e.stat === "initiative" && e.flat >= 100) {
        if ((p.combatStats.initiative ?? 0) < e.flat) return `initiative ${p.combatStats.initiative} < ${e.flat}`;
      } else if (e.stat === "spellSlots") {
        for (const lvl of e.spellLevels ?? []) if (((p.spellcasting.spellSlots?.[String(lvl)]?.max ?? 0) - (hero.slots?.[String(lvl)]?.max ?? 0)) < e.flat) return `слоти ${lvl}-го: ${p.spellcasting.spellSlots?.[String(lvl)]?.max ?? 0} (база ${hero.slots?.[String(lvl)]?.max ?? 0})`;
      } else return "baked";
    }

    return true;
  }

  if (a.effects.some((e: any) => e.perMark)) return "baked";

  return passiveViaModifiers(p, a) ? true : "немає запису в collectModifiers";
}

function passiveViaModifiers(p: any, a: any): boolean {
  const ps = P();

  for (const e of a.effects) {
    let q: any = null;

    if (e.kind === "modifyStat") q = { stat: e.stat };
    else if (e.kind === "damageBonus") q = { damage: { kind: e.filter?.kind === "all" || e.filter?.kind === "physical" ? "melee" : (e.filter?.kind ?? "melee"), school: e.filter?.school ?? null } };
    else if (e.kind === "flag") q = { flag: e.flag };

    if (!q) return true;

    const subjects = !e.target || e.target === "self" ? [p] : ps.filter((x) => x.basicInfo.side === p.basicInfo.side || /enem/i.test(e.target));

    for (const s of subjects) {
      const r = collectModifiers(ps, s.basicInfo.id, q);

      if (r.entries.some((en: any) => en.label === a.name || en.label === a.source.name || en.label?.includes(a.name) || en.label?.includes(a.source.name))) return true;
    }
  }

  return false;
}

// ---------- дії ----------
const triedSpells = new Map<string, number>();

const triedAbilities = new Map<string, number>();

async function adaptiveAbility(label: "bonus-action" | "ability-action", actor: any, a: any) {
  const opts = label === "bonus-action" ? BONUS : ABILITY;

  const dead = P().filter((x) => !alive(x));

  const tries: string[][] = [[], foesOf(actor).slice(0, 1).map((x) => x.basicInfo.id), friendsOf(actor).filter((x) => x !== actor).slice(0, 1).map((x) => x.basicInfo.id), [actor.basicInfo.id], dead.slice(0, 1).map((x) => x.basicInfo.id)];

  for (const t of tries) {
    const r = await call(label, opts, { participantId: actor.basicInfo.id, abilityKey: a.key, targetParticipantIds: t });

    if (r.status === 200) return r;

    if (r.body?.code !== "invalid_target") return r;
  }

  return null;
}

function spellTargets(actor: any, spell: any): string[] | "needDead" {
  const t = spell.targeting ?? {};

  const foes = foesOf(actor), friends = friendsOf(actor);

  switch (t.kind) {
    case "enemy": return foes.length ? [pick(foes).basicInfo.id] : [];
    case "ally": {
      const hurt = [...friends].sort((a, b) => a.combatStats.currentHp / a.combatStats.maxHp - b.combatStats.currentHp / b.combatStats.maxHp);

      return [(spell.spellEffects ?? []).some((e: any) => e.kind === "heal" || e.kind === "hot") ? hurt[0].basicInfo.id : pick(friends).basicInfo.id];
    }
    case "area":
    case "template": return (t.side === "ally" ? friends : foes).slice(0, t.maxTargets ?? 3).map((x: any) => x.basicInfo.id);
    case "allyDead": {
      const d = P().find((x) => x.basicInfo.side === actor.basicInfo.side && !alive(x) && x.basicInfo.sourceType === ParticipantSourceType.CHARACTER);

      return d ? [d.basicInfo.id] : "needDead";
    }
    case "allAlliesDead": return P().some((x) => x.basicInfo.side === actor.basicInfo.side && !alive(x)) ? [] : "needDead";
    default: return [];
  }
}

const snap = (ids: string[]) => new Map(ids.map((id) => { const p = byId(id);

 return [id, p ? JSON.stringify({ hp: p.combatStats.currentHp, st: p.combatStats.status, fx: p.battleData.activeEffects.map((e: any) => `${e.name}:${e.duration ?? ""}`), m: p.combatStats.morale }) : "gone"]; }));

async function castSpell(actor: any, spell: any) {
  let targets = spellTargets(actor, spell);

  if (targets === "needDead") {
    const victim = friendsOf(actor).filter((x) => x !== actor && x.basicInfo.sourceType === ParticipantSourceType.CHARACTER).sort((a, b) => a.combatStats.currentHp - b.combatStats.currentHp)[0];

    if (!victim) return null;

    await call("participants", PATCH(victim.basicInfo.id), { kill: true });
    targets = spellTargets(actor, spell);

    if (targets === "needDead") return null;
  }

  const dice = casterSpellDice(actor, { dice: spell.dice ?? 0, groupId: spell.groupId ?? null });

  const diceRolls = dice.count > 0 ? rollDiceList(`${dice.count}d${dice.sides}`, rng) : [];

  const watched = [...new Set([...(targets as string[]), ...P().map((p: any) => p.basicInfo.id)])];

  const before = snap(watched);

  const countBefore = P().length;

  const saveRolls = (targets as string[]).map((id) => ({ participantId: id, roll: 1 }));

  const r = await call("spell", SPELL, { casterId: actor.basicInfo.id, spellId: spell.id, targetIds: targets, diceRolls, saveRolls });

  const s = spellStats.get(spell.id) as NonNullable<ReturnType<typeof spellStats.get>>;

  s.casts++;

  if (r.status !== 200) { s.rejected.push(`${r.status} ${r.body?.code ?? ""} ${r.body?.error ?? ""}`.trim());

 return r; }

  const after = snap(watched);

  const changed = [...before.keys()].some((id) => before.get(id) !== after.get(id)) || P().length !== countBefore;

  const onlyNote = (spell.spellEffects ?? []).every((e: any) => e.kind === "note");

  if (changed || onlyNote) s.ok++; else { s.noEffect++; issue("warn", `${spell.name} (${actor.basicInfo.name}): каст пройшов, але жодних змін у цілей`); }

  if (s.samples.length < 2) s.samples.push(r.log.map((e: any) => e.resultText).join(" | ").slice(0, 400));

  return r;
}

async function attack(actor: any) {
  const foes = foesOf(actor);

  const weapon: any = actor.battleData.attacks?.length ? pick(actor.battleData.attacks as any[]) : null;

  if (!foes.length || !weapon) return null;

  const target = pick(foes);

  const formula = heroAttackDamageParts(actor, weapon).formula;

  const d20 = rng() < 0.1 ? 20 : 6 + Math.floor(rng() * 15);

  return call("attack", ATTACK, { attackerId: actor.basicInfo.id, targetId: target.basicInfo.id, attackId: weapon.id, d20Roll: Math.min(20, d20), damageRolls: rollDiceList(formula, rng), endTurn: true });
}

async function takeTurn(spells: Map<string, any>) {
  const actor = current();

  if (!actor) return;

  const id = actor.basicInfo.id;

  if (alive(actor) && needsMoraleCheck(actor, P(), state.pendingMoraleCheck)) await call("morale-check", MORALE, { participantId: id, d10Roll: 1 + Math.floor(rng() * 10) });

  const me = () => byId(id);

  if (me() && alive(me())) {
    for (const aura of pendingAreaAuras(P(), id, state.currentRound)) {
      const pool = zoneCandidates(P(), me(), aura.target).filter(() => rng() < 0.6);

      await call("aura-zone", AURA_ZONE, { participantId: id, auraId: aura.id, targetIds: pool.map((x: any) => x.basicInfo.id) }, me().basicInfo.controlledBy === CONTROLLED_BY_DM ? undefined : me().basicInfo.controlledBy);
    }
  }

  if (!me() || !alive(me()) || current()?.basicInfo.id !== id) { if (current()?.basicInfo.id === id) await call("next-turn", NEXT);

 return; }

  const abilities = me().battleData.resolvedAbilities ?? [];

  const least = (list: any[]) => list.sort((a, b) => (triedAbilities.get(a.name) ?? 0) - (triedAbilities.get(b.name) ?? 0))[0];

  const bonus = least(abilities.filter((a: any) => a.trigger.event === "bonusAction"));

  if (bonus && !me().actionFlags.hasUsedBonusAction && (triedAbilities.get(bonus.name) ?? 0) < 3) {
    triedAbilities.set(bonus.name, (triedAbilities.get(bonus.name) ?? 0) + 1);
    await adaptiveAbility("bonus-action", me(), bonus);
  }

  if (!me() || !alive(me()) || current()?.basicInfo.id !== id) return;

  const known: any[] = (me().spellcasting?.knownSpells ?? []).map((s: any) => spells.get(typeof s === "string" ? s : s.id)).filter(Boolean);

  const freshSpell = known.sort((a, b) => (triedSpells.get(a.id) ?? 0) - (triedSpells.get(b.id) ?? 0))[0];

  const action = least(abilities.filter((a: any) => a.trigger.event === "action"));

  let acted = false;

  if (action && (triedAbilities.get(action.name) ?? 0) < 2) {
    triedAbilities.set(action.name, (triedAbilities.get(action.name) ?? 0) + 1);

    const r = await adaptiveAbility("ability-action", me(), action);

    acted = r?.status === 200;
  } else if (freshSpell && ((triedSpells.get(freshSpell.id) ?? 0) < 3 || rng() < 0.3)) {
    triedSpells.set(freshSpell.id, (triedSpells.get(freshSpell.id) ?? 0) + 1);

    const r = await castSpell(me(), freshSpell);

    acted = r?.status === 200;
  }

  if (!acted && me() && alive(me()) && current()?.basicInfo.id === id) await attack(me());

  if (current()?.basicInfo.id === id && state.status === "active") await call("next-turn", NEXT);
}

async function runBattle(label: string, unitIds: string[], spells: Map<string, any>, battleNo: number) {
  battleLabel = label;

  const setup = mixedSides(unitIds, battleNo);

  const battle = await createTestBattle({ data: { campaignId: ctx.campaignId, name: `ТЕСТ ${label}`, status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = battle.id;
  state = await readState();

  const s = await call("start", START);

  if (s.status !== 200) { issue("error", `старт бою не вдався: ${JSON.stringify(s.body).slice(0, 300)}`);

 return null; }

  recordPassives();
  for (let step = 0; step < 600 && state.status === "active" && state.currentRound <= ROUNDS; step++) await takeTurn(spells);
  recordCoverage();

  const allies = P().filter((p) => p.basicInfo.side === "ally");

  const enemies = P().filter((p) => p.basicInfo.side === "enemy");

  return `${label}: раундів ${Math.min(state.currentRound, ROUNDS)}${state.status === "completed" ? " (завершено)" : ""}; союзники живі ${allies.filter(alive).length}/${allies.length}, вороги живі ${enemies.filter(alive).length}/${enemies.length}`;
}

/** Герої й юніти на обох сторонах; герой міняє сторону від бою до бою, щоб кожен побув і союзником, і ворогом. */
function mixedSides(unitIds: string[], battleNo: number) {
  const heroes = heroRows.map((h, i) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: (i + battleNo) % 2 ? "enemy" : "ally" }));

  const units = unitIds.map((id, i) => ({ id, type: ParticipantSourceType.UNIT, side: (i + battleNo) % 2 ? "ally" : "enemy", quantity: 1 }));

  return [...heroes, ...units];
}

/** Юніти по черзі з різних рас, щоб у кожній пачці зустрілися різні раси. */
function interleaveByRace(units: { id: string; raceId: string | null }[]) {
  const byRace = new Map<string, string[]>();

  for (const u of [...units].sort(() => rng() - 0.5)) byRace.set(u.raceId ?? "-", [...(byRace.get(u.raceId ?? "-") ?? []), u.id]);

  const queues = [...byRace.values()];

  const out: string[] = [];

  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift() as string);

  return out;
}

async function sweep(spells: Map<string, any>, report: string[]) {
  const shuffled = interleaveByRace(await prisma.unit.findMany({ where: { campaignId: ctx.campaignId }, select: { id: true, raceId: true } }));

  const chunks: string[][] = [];

  for (let i = 0; i < shuffled.length; i += 7) chunks.push(shuffled.slice(i, i + 7));

  let battleNo = 0;

  for (let r = 0; r < ROTATIONS.length; r++) {
    report.push(`\n### Ротація ${r + 1}`, ...(await applyRotation(r)).map((l) => `- ${l}`));

    const per = Math.ceil(chunks.length / ROTATIONS.length);

    for (const chunk of chunks.slice(r * per, (r + 1) * per)) {
      battleNo++;

      const res = await runBattle(`Б${battleNo}/Р${r + 1}`, chunk, spells, battleNo);

      if (res) report.push(`- ${res}`);
    }
  }
}

function coverageReport(): string[] {
  const status = (c: any) => (c.note ? "note" : c.event === "passive" ? (c.passiveMiss > 0 ? "MISS" : c.passiveOk > 0 ? "ok" : "baked") : c.fired > 0 ? "fired" : "NOT-FIRED");

  const out = ["\n## Покриття вмінь", "Не спрацювали тригерні вміння (часто шанс або умова) та пасивки без запису в модифікаторах:"];

  for (const src of ["skill", "race", "artifact", "artifactSet", "unit"]) {
    const list = [...coverage.values()].filter((c) => c.source === src);

    const counts = list.reduce((m: Record<string, number>, c) => ({ ...m, [status(c)]: (m[status(c)] ?? 0) + 1 }), {});

    out.push(`\n### ${src}: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    for (const c of list) if (["NOT-FIRED", "MISS"].includes(status(c))) out.push(`- ${status(c)} ${c.event} · ${c.owner} · ${c.name} (${c.effects}${c.conditional ? ", з умовою" : ""}) ${(c as any).missDetail ?? ""}`);
  }
  out.push("\n## Заклинання");
  for (const [, s] of [...spellStats.entries()].sort((a, b) => a[1].school.localeCompare(b[1].school) || a[1].level - b[1].level)) {
    const name = (s as any).name;

    out.push(`- ${s.casts === 0 ? "⚪" : s.ok > 0 ? "✅" : "❌"} ${s.school} L${s.level} ${name}: кастів ${s.casts}, з ефектом ${s.ok}, без ефекту ${s.noEffect}${s.rejected.length ? `, відхилено: ${[...new Set(s.rejected)].join("; ")}` : ""}`);
  }

  return out;
}

async function main() {
  await prepare();

  const spellRows = await prisma.spell.findMany({ where: { campaignId: ctx.campaignId }, include: { spellGroup: true } });

  const spells = new Map(spellRows.map((s: any) => [s.id, s]));

  for (const s of spellRows as any[]) spellStats.set(s.id, { name: s.name, school: s.spellGroup?.name ?? "-", level: s.level, casts: 0, ok: 0, noEffect: 0, rejected: [], samples: [], kinds: (s.spellEffects ?? []).map((e: any) => e.kind).join("+") } as any);

  const report: string[] = [`# Battle sweep: ${campaign.name}`, "", "## Дерева", ...treeChecks.map((t) => `- ${t}`)];

  if (MODE === "all" || MODE === "sweep") await sweep(spells, report);

  if (MODE === "all" || MODE === "targeted") await targeted(spells);

  if (MODE === "all" || MODE === "control") await controlCheck(spells);

  if (MODE === "all" || MODE === "level5") await level5Check(spells);

  if (MODE === "all" || MODE === "targeted" || MODE === "aura") await auraZoneCheck();

  if (MODE === "all" || MODE === "targeted" || MODE === "reserve") await reserveCheck();

  if (MODE === "all" || MODE === "targeted" || MODE === "map") await mapCheck(spells);

  if (MODE === "all" || MODE === "targeted" || MODE === "maze") await mazeCheck();

  if (targetedResults.length) report.push("\n## Цільові перевірки", ...targetedResults.map((t) => `- ${t}`));

  if (MODE === "all" || MODE === "sweep") report.push(...coverageReport());

  const errors = issues.filter((i) => i.level === "error");

  report.push("\n## Помилки", ...(errors.length ? errors.map((i) => `- ${i.where}: ${i.text}`) : ["- немає"]));
  report.push("\n## Відмови API (законні правила гри — для огляду)", ...[...rejections.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${v} × ${k}`));

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "battle-sweep.md"), report.join("\n"));
  writeFileSync(join(OUT, "data.json"), JSON.stringify({ issues, coverage: [...coverage.values()].map((c) => ({ ...c, owners: [...c.owners] })), spells: [...spellStats.values()] }, null, 1));
  writeFileSync(join(OUT, "log.txt"), fullLog.join("\n"));
  console.info(targetedResults.join("\n"));
  await removeTestBattles();
  console.info(`\n${errors.length ? "❌" : "✅"} помилок: ${errors.length}, попереджень: ${issues.length - errors.length}. Звіт: ${join(OUT, "battle-sweep.md")}`);
  await prisma.$disconnect();
  process.exit(errors.length ? 1 : 0);
}


// ---------- цільові сценарії ----------
const targetedResults: string[] = [];

const tcheck = (name: string, ok: boolean, detail: string) => { targetedResults.push(`${ok ? "✅" : "❌"} ${name} — ${detail}`);

 if (!ok) issue("error", `ЦІЛЬОВИЙ: ${name} — ${detail}`); };

/** Сценарій не склався (напр., бій уже завершився) — пропуск із поясненням замість хибного провалу. */
const tskip = (name: string, detail: string) => { targetedResults.push(`⏭️ ${name} — пропущено: ${detail}`);

  issue("warn", `ЦІЛЬОВИЙ пропущено: ${name} — ${detail}`); };

const byName = (n: string) => P().find((p) => p.basicInfo.name === n);

const nextOnly = async () => { if (state.status === "active") await call("next-turn", NEXT); };

async function untilTurnOf(pred: (p: any) => boolean) {
  for (let i = 0; i < 60 && state.status === "active" && !pred(current()); i++) await nextOnly();

  return pred(current());
}

async function hitBy(target: any, logs: string[], hpBeforeHit?: number, d20 = 20) {
  await nextOnly();

  const ok = await untilTurnOf((p) => p.basicInfo.side !== target.basicInfo.side && alive(p) && p.battleData.attacks?.length && !p.actionFlags.hasUsedAction);

  if (!ok) return null;

  const a = current();

  const w = a.battleData.attacks[0];

  // HP ставимо вже на ходу атакувальника: регенерація на старті ходу не встигне підлікувати
  if (hpBeforeHit !== undefined) await call("participants", PATCH(target.basicInfo.id), { currentHp: hpBeforeHit });

  const r = await call("attack", ATTACK, { attackerId: a.basicInfo.id, targetId: target.basicInfo.id, attackId: w.id, d20Roll: d20, disadvantageRoll: d20, advantageRoll: d20, damageRolls: rollDiceList(heroAttackDamageParts(a, w).formula, rng), endTurn: false });

  logs.push(...r.log.map((e: any) => e.resultText));

  return r;
}

async function targeted(spells: Map<string, any>) {
  const easy = (await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })).filter((u: any) => !/дракон|титан|архангел|ліч/i.test(u.name)).slice(0, 3).map((u: any) => u.id);

  await applyRotation(0);
  battleLabel = "ЦІЛЬ-1";

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), ...easy.map((id) => ({ id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }))];

  const mkBattle = async (label: string) => {
    battleLabel = label;

    const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: `ТЕСТ ${label}`, status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

    ctx.battleId = b.id; state = await readState(); await call("start", START);
  };

  await mkBattle("ЦІЛЬ-1");

  // Битва до останнього (Семгрун, Захист middle)
  let sem = byName("Семгрун");


  let logs: string[] = [];

  await hitBy(byName("Семгрун"), logs, 1);
  sem = byName("Семгрун");
  tcheck("Битва до останнього: смертельний удар → живий з 1 HP", alive(sem) && sem.combatStats.currentHp >= 1, `HP ${sem.combatStats.currentHp}, статус ${sem.combatStats.status}; ${logs.join(" | ").slice(0, 300)}`);

  // Супротив: HP < 15 %, негативний ефект, удар → очищення
  await call("participants", PATCH(sem.basicInfo.id), { currentHp: Math.max(2, Math.floor(sem.combatStats.maxHp * 0.1)) });

  // not Сповільнення: Семгрун's Helm of the Dwarven Kings makes the party immune to it (and Сліпота)
  const dark = [...spells.values()].find((s: any) => s.name === "Немічність");

  await nextOnly();
  await untilTurnOf((p) => p.basicInfo.side === "enemy" && alive(p) && !p.actionFlags.hasUsedAction);

  const caster = current();

  await call("spell", SPELL, { casterId: caster.basicInfo.id, spellId: dark.id, targetIds: [sem.basicInfo.id], free: true, diceRolls: [], saveRolls: [{ participantId: sem.basicInfo.id, roll: 1 }] });

  const fxBefore = byName("Семгрун").battleData.activeEffects.map((e: any) => e.name);

  logs = [];
  for (let i = 0; i < 12; i++) {
    const s0 = byName("Семгрун");

    // a crit at ~10 % HP is lethal, and abilities of a downed hero never fire: hit without a crit at exactly 15 %
    await hitBy(s0, logs, Math.floor(s0.combatStats.maxHp * 0.15), 15);

    if (logs.some((l) => /→ Семгрун: \d+ шкоди/.test(l))) break;
  }

  const fxAfter = byName("Семгрун").battleData.activeEffects.map((e: any) => e.name);

  tcheck("Супротив: при HP < 15 % влучання запускає очищення", fxBefore.includes(dark.name) && !fxAfter.includes(dark.name) && logs.some((l) => /Супротив/.test(l)), `до: [${fxBefore}] після: [${fxAfter}]; ${logs.join(" | ").slice(0, 300)}`);

  // Друге серце (Намисто лева на Аграїлі)
  logs = [];
  await hitBy(byName("Аграїл"), logs, 1);

  const agr2 = byName("Аграїл");

  tcheck("Друге серце (Намисто лева): смертельний удар → 25 % HP", alive(agr2) && agr2.combatStats.currentHp >= Math.floor(agr2.combatStats.maxHp * 0.25) - 1, `HP ${agr2.combatStats.currentHp}/${agr2.combatStats.maxHp}; ${logs.join(" | ").slice(0, 300)}`);

  // Світло корони: Зехір (Корона Сар-Ісси) кастує заклинання Світла
  const light = [...spells.values()].find((s: any) => s.name === "Поспіх");

  const zeh = byName("Зехір");

  for (const p of friendsOf(zeh)) if (p.combatStats.currentHp > 5) await call("participants", PATCH(p.basicInfo.id), { currentHp: Math.floor(p.combatStats.maxHp / 2) });

  const hpB = friendsOf(zeh).reduce((n: number, p: any) => n + p.combatStats.currentHp, 0);

  const lr = await call("spell", SPELL, { casterId: zeh.basicInfo.id, spellId: light.id, targetIds: [zeh.basicInfo.id], diceRolls: [], free: true });

  const hpA = friendsOf(byName("Зехір")).reduce((n: number, p: any) => n + p.combatStats.currentHp, 0);

  tcheck("Світло корони: каст Світла лікує союзників на 5 % HP", lr.status === 200 && hpA > hpB, `HP союзників ${hpB} → ${hpA}; ${lr.status} ${lr.log.map((e: any) => e.resultText).join(" | ").slice(0, 300)} ${lr.status !== 200 ? JSON.stringify(lr.body).slice(0, 200) : ""}`);

  // Вибух мани: ворог кастує в Зехіра (шанс 50 %, до 2 разів)
  const bolt = [...spells.values()].find((s: any) => s.name === "Потойбічна стріла");

  let burst = false;

  for (let i = 0; i < 6 && !burst; i++) {
    await nextOnly();

    if (!(await untilTurnOf((p) => p.basicInfo.side === "enemy" && alive(p) && !p.actionFlags.hasUsedAction))) break;

    const ec = current();

    const dice = casterSpellDice(ec, { dice: bolt.dice, groupId: bolt.groupId });

    const r = await call("spell", SPELL, { casterId: ec.basicInfo.id, spellId: bolt.id, targetIds: [byName("Зехір").basicInfo.id], free: true, diceRolls: rollDiceList(`${dice.count}d${dice.sides}`, rng) });

    burst = r.log.some((e: any) => /Вибух мани/.test(e.resultText));

    if (r.status !== 200) break;
  }
  tcheck("Вибух мани: ворожий каст у Зехіра відповідає шкодою (шанс 50 %)", burst, burst ? "спрацював" : "не спрацював за 6 кастів");

  // Ангел Хранитель (ультимат Людей) — ротація 3
  await applyRotation(2);
  await mkBattle("ЦІЛЬ-2");

  const god = byName("Лорд Годрик Єдиноріг");

  const victim = byName("Айвен");

  await call("participants", PATCH(victim.basicInfo.id), { kill: true });

  const angel = (god.battleData.resolvedAbilities ?? []).find((a: any) => a.name === "Ангел Хранитель");

  const ok = await untilTurnOf((p) => p.basicInfo.name === god.basicInfo.name);

  const ar = angel && ok ? await call("ability-action", ABILITY, { participantId: god.basicInfo.id, abilityKey: angel.key, targetParticipantIds: [victim.basicInfo.id] }) : null;

  const v2 = byName("Айвен");

  tcheck("Ангел Хранитель: воскрешає полеглого союзника з 50 % HP", !!ar && ar.status === 200 && alive(v2), `${ar?.status} HP ${v2.combatStats.currentHp}/${v2.combatStats.maxHp}; ${ar?.log.map((e: any) => e.resultText).join(" | ").slice(0, 250)} ${ar && ar.status !== 200 ? JSON.stringify(ar.body).slice(0, 200) : ""}`);
}

async function controlCheck(spells: Map<string, any>) {
  await applyRotation(0);

  const realPlayers = heroRows.filter((h) => h.controlledBy !== dmId);

  const top = realPlayers[2];

  await prisma.character.update({ where: { id: top.id }, data: { level: HERO_LEVEL + 1 } });

  const units = (await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })).filter((u: any) => !/дракон|титан|архангел/i.test(u.name));

  const setup = [
    ...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })),
    { id: units[0].id, type: ParticipantSourceType.UNIT, side: "ally", quantity: 2 },
    { id: units[1].id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 2 },
  ];

  battleLabel = "КОНТРОЛЬ";

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ контроль", status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const allyUnits = P().filter((p) => p.basicInfo.side === "ally" && p.basicInfo.sourceType === "unit");

  const enemyUnits = P().filter((p) => p.basicInfo.side === "enemy");

  tcheck("Союзні юніти за замовчуванням під DM (без автопризначення)", allyUnits.length === 2 && allyUnits.every((u) => u.basicInfo.controlledBy === "dm"), allyUnits.map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy}`).join(", "));

  for (const x of allyUnits) await call("unit-control", UNIT_CONTROL, { mode: "assign", participantId: x.basicInfo.id, controlledBy: top.controlledBy });

  const assigned = P().filter((p) => p.basicInfo.side === "ally" && p.basicInfo.sourceType === "unit");

  tcheck("DM передає союзних юнітів гравцю (unit-control)", assigned.length === 2 && assigned.every((u) => u.basicInfo.controlledBy === top.controlledBy), `${top.name} (${top.controlledBy.slice(0, 8)}): ${assigned.map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy.slice(0, 8)}`).join(", ")}`);
  tcheck("Ворожі юніти без гравців — під DM", enemyUnits.every((u) => u.basicInfo.controlledBy === "dm"), enemyUnits.map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy}`).join(", "));

  // хід союзного юніта: інший гравець — 403, власник — 200
  const other = realPlayers.find((h) => h.controlledBy !== top.controlledBy);

  await untilTurnOf((p) => p.basicInfo.side === "ally" && p.basicInfo.sourceType === "unit" && alive(p));

  const u = current();

  const foe = foesOf(u)[0];

  const w = u.battleData.attacks[0];

  const body = { attackerId: u.basicInfo.id, targetId: foe.basicInfo.id, attackId: w.id, d20Roll: 15, damageRolls: rollDiceList(heroAttackDamageParts(u, w).formula, rng), endTurn: false };

  const r1 = await call("attack", ATTACK, body, other?.controlledBy);

  const r2 = await call("attack", ATTACK, body, top.controlledBy);

  tcheck("Чужий гравець не може ходити юнітом", r1.status === 403, `${r1.status} ${JSON.stringify(r1.body).slice(0, 120)}`);
  tcheck("Гравець-власник ходить союзним юнітом", r2.status === 200, `${r2.status} ${r2.log.map((e: any) => e.resultText).join(" | ").slice(0, 150)} ${r2.status !== 200 ? JSON.stringify(r2.body).slice(0, 150) : ""}`);

  const nt = await call("next-turn", NEXT, {}, top.controlledBy);

  tcheck("Власник завершує хід юніта (next-turn)", nt.status === 200, `${nt.status} ${nt.status !== 200 ? JSON.stringify(nt.body).slice(0, 150) : ""}`);

  // прикликання гравцем: Айвен (Природа) кастує Призив Фенікса як гравець
  const ivan = hero("Айвен");

  await untilTurnOf((p) => p.basicInfo.name === "Айвен");

  const phoenix = [...spells.values()].find((s: any) => s.name === "Прикликання елементаля: Вогонь");

  const before = new Set(P().map((p) => p.basicInfo.id));

  const sr = await call("spell", SPELL, { casterId: byName("Айвен").basicInfo.id, spellId: phoenix.id, targetIds: [], diceRolls: [] }, ivan.controlledBy);

  const summoned = [...P(), ...(state.pendingParticipants ?? [])].filter((p) => !before.has(p.basicInfo.id));

  const pend = (await prisma.$queryRawUnsafe(`select "controlledBy", snapshot->'basicInfo'->>'name' n from battle_participants where "battleId"='${ctx.battleId}' and "isPending"`)) as any[];

  tcheck("Прикликаний гравцем юніт належить цьому гравцю", sr.status === 200 && (summoned.length > 0 || pend.length > 0) && [...summoned.map((s) => s.basicInfo.controlledBy), ...pend.map((x) => x.controlledBy)].every((c) => c === ivan.controlledBy), `${sr.status} нові: ${summoned.map((s) => `${s.basicInfo.name}→${s.basicInfo.controlledBy.slice(0, 8)}`).join(", ")} pending: ${pend.map((x) => `${x.n}→${String(x.controlledBy).slice(0, 8)}`).join(", ")}; Айвен=${ivan.controlledBy.slice(0, 8)} ${sr.status !== 200 ? JSON.stringify(sr.body).slice(0, 150) : ""}`);

  // бій без гравців: усі союзні юніти й герої DM
  const dmOnly = [...heroRows.filter((h) => h.controlledBy === dmId).map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), { id: units[0].id, type: ParticipantSourceType.UNIT, side: "ally", quantity: 1 }, { id: units[1].id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }];

  const b2 = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ контроль без гравців", status: "prepared", participants: dmOnly as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b2.id; state = await readState(); await call("start", START);

  const au = P().filter((p) => p.basicInfo.side === "ally" && p.basicInfo.sourceType === "unit");

  const rr = await call("unit-control", UNIT_CONTROL, { mode: "random" });

  tcheck("Без гравців «роздати випадково» відхиляється", rr.status >= 400, `${rr.status}`);
  tcheck("Сторона лише з героями DM: союзні юніти під DM", au.length > 0 && au.every((x) => x.basicInfo.controlledBy === "dm"), au.map((x) => `${x.basicInfo.name}→${x.basicInfo.controlledBy}`).join(", "));
  await prisma.character.update({ where: { id: top.id }, data: { level: HERO_LEVEL } });
}

async function level5Check(spells: Map<string, any>) {
  const races = await prisma.race.findMany({ where: { campaignId: ctx.campaignId } });

  for (const h of heroRows) {
    const race = races.find((r) => r.name === h.race);

    h.slots = fullSpellSlots(9, (race?.spellSlotProgression as any) ?? [], campaign.maxLevel ?? 20);
    await prisma.character.update({ where: { id: h.id }, data: { level: 9, spellSlots: h.slots as any } });
  }

  // раси, на які діють усі закляття (Слово світла не карає Людей, Ельфів, Гномів і Магів)
  const exposed = new Set(races.filter((r) => ["Демони", "Некроманти", "Темні ельфи"].includes(r.name)).map((r) => r.id));

  const easy = (await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })).filter((u: any) => exposed.has(u.raceId) && !/дракон|титан|ліч|аватар|диявол|архідемон/i.test(u.name)).slice(0, 3).map((u: any) => u.id);

  const plan: Array<[number, string, string]> = [[0, "Світло", "Лорд Годрик Єдиноріг"], [0, "Хаос", "Зехір"], [0, "Природа", "Айвен"], [1, "Темрява", "Аграїл"]];

  for (const [rot, school, casterName] of plan) {
    await applyRotation(rot);

    const owner = hero(casterName);

    const list = [...spells.values()].filter((s: any) => s.level === 5 && s.spellGroup?.name === school);

    for (const sp of list) {
      battleLabel = `L5 ${sp.name}`;

      const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), ...easy.map((id) => ({ id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }))];

      const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: `ТЕСТ ${battleLabel}`, status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

      ctx.battleId = b.id; state = await readState(); await call("start", START);
      await untilTurnOf((p) => p.basicInfo.name === casterName);

      const me = byName(casterName);

      const knows = (me.spellcasting?.knownSpells ?? []).includes(sp.id);

      if ((sp.targeting?.kind ?? "").includes("Dead")) await call("participants", PATCH(byName("Семгрун").basicInfo.id), { kill: true });

      for (const p of friendsOf(me)) await call("participants", PATCH(p.basicInfo.id), { currentHp: Math.max(1, Math.floor(p.combatStats.maxHp / 2)) });

      const targets = spellTargets(byName(casterName), sp);

      const dice = casterSpellDice(byName(casterName), { dice: sp.dice ?? 0, groupId: sp.groupId ?? null });

      const before = snap(P().map((p: any) => p.basicInfo.id));

      const n0 = P().length;

      const slot0 = byName(casterName).spellcasting.spellSlots["5"]?.current;

      const r = await call("spell", SPELL, { casterId: me.basicInfo.id, spellId: sp.id, targetIds: targets === "needDead" ? [] : targets, diceRolls: dice.count ? rollDiceList(`${dice.count}d${dice.sides}`, rng) : [] }, owner.controlledBy);

      const slot1 = byName(casterName).spellcasting.spellSlots["5"]?.current;

      const after = snap(P().map((p: any) => p.basicInfo.id));

      const saved = r.log.some((e: any) => /рятівний кидок [^|]*— успіх(\s\||$)/.test(e.resultText));

      const changed = [...before.keys()].some((id) => before.get(id) !== after.get(id)) || P().length !== n0 || saved;

      tcheck(`L5 ${school}: ${sp.name} (${casterName}, гравець)`, knows && r.status === 200 && slot1 === slot0 - 1 && changed, `знає=${knows} статус=${r.status} слот 5: ${slot0}→${slot1} зміни=${changed}; ${r.status === 200 ? r.log.map((e: any) => e.resultText).join(" | ").slice(0, 220) : JSON.stringify(r.body).slice(0, 200)}`);
    }
  }
  // другий каст 5-го рівня в тому ж бою — немає слота
  await call("next-turn", NEXT);
  await untilTurnOf((p) => p.basicInfo.name === "Аграїл");

  const sp2 = [...spells.values()].find((s: any) => s.name === "Вампіризм");

  const ag = hero("Аграїл");

  const r2 = await call("spell", SPELL, { casterId: byName("Аграїл").basicInfo.id, spellId: sp2.id, targetIds: [byName("Аграїл").basicInfo.id], diceRolls: [] }, ag.controlledBy);

  tcheck("Другий каст 5-го рівня без слота відхиляється", r2.status === 422, `${r2.status} ${JSON.stringify(r2.body).slice(0, 150)}`);

  // Аватар Маркела
  await applyRotation(0);
  battleLabel = "Аватар";

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), ...easy.map((id) => ({ id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }))];

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Аватар", status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);
  await untilTurnOf((p) => p.basicInfo.name === "Маркел");

  const av = [...spells.values()].find((s: any) => s.name === "Аватар");

  const mk = byName("Маркел");

  const knowsAv = (mk.spellcasting?.knownSpells ?? []).includes(av.id);

  const ids0 = new Set(P().map((p: any) => p.basicInfo.id));

  const ra = await call("spell", SPELL, { casterId: mk.basicInfo.id, spellId: av.id, targetIds: [], diceRolls: [] });

  const fresh = P().filter((p: any) => !ids0.has(p.basicInfo.id));

  tcheck("Аватар: Маркел знає закляття і прикликає Аватара Смерті під своїм контролером", knowsAv && ra.status === 200 && fresh.some((p: any) => /Аватар Смерті/.test(p.basicInfo.name) && p.basicInfo.controlledBy === mk.basicInfo.controlledBy && p.basicInfo.side === "ally"), `знає=${knowsAv} ${ra.status} нові: ${fresh.map((p: any) => `${p.basicInfo.name} (${p.basicInfo.side}, ${p.basicInfo.controlledBy.slice(0, 8)}) HP ${p.combatStats.maxHp}`).join(", ")}; ${ra.log.map((e: any) => e.resultText).join(" | ").slice(0, 200)}`);
  for (const h of heroRows) await prisma.character.update({ where: { id: h.id }, data: { level: HERO_LEVEL, spellSlots: fullSpellSlots(HERO_LEVEL, ((await prisma.race.findFirst({ where: { campaignId: ctx.campaignId, name: h.race } }))?.spellSlotProgression as any) ?? [], campaign.maxLevel ?? 20) as any } });
}

// Аура страху Кошмару: зона на двох героях, решта без штрафу; гравець не може задати зону ворожому юніту
async function auraZoneCheck() {
  await applyRotation(0);
  battleLabel = "Зона аури";

  const nightmare = await prisma.unit.findFirst({ where: { campaignId: ctx.campaignId, name: "Кошмар" } });

  if (!nightmare) return tcheck("Зона аури", false, "немає юніта Кошмар");

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), { id: nightmare.id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }];

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Зона аури", status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const heroes = P().filter((p) => p.basicInfo.side === "ally");

  const armorBefore = heroes.map((h) => statWithModifiers(P(), h.basicInfo.id, "armor", 10));

  await untilTurnOf((p) => p.basicInfo.name.startsWith("Кошмар"));

  const nm = current();

  const pending = pendingAreaAuras(P(), nm.basicInfo.id, state.currentRound);

  const zone = heroes.slice(0, 2).map((h) => h.basicInfo.id);

  const asPlayer = await call("aura-zone", AURA_ZONE, { participantId: nm.basicInfo.id, auraId: pending[0]?.id, targetIds: zone }, heroRows.find((h) => h.controlledBy !== dmId)?.controlledBy ?? "nobody");

  const r = await call("aura-zone", AURA_ZONE, { participantId: nm.basicInfo.id, auraId: pending[0]?.id, targetIds: zone });

  const members = zoneMembers(P(), nm.basicInfo.id, pending[0]?.id ?? "").ids;

  const inZone = (id: string) => (byId(id).battleData.activeEffects ?? []).some((e: any) => e.zone?.ownerId === nm.basicInfo.id && e.abilityEffects?.some((x: any) => x.stat === "morale"));

  const outside = heroes.slice(2).every((h) => !inZone(h.basicInfo.id));

  const armorSame = heroes.every((h, i) => statWithModifiers(P(), h.basicInfo.id, "armor", 10) === armorBefore[i]);

  tcheck("Зона аури: Кошмар задає зону, штраф моралі лише на обраних", pending.length === 1 && asPlayer.status === 403 && r.status === 200 && members.join() === zone.join() && zone.every(inZone) && outside && armorSame && pendingAreaAuras(P(), nm.basicInfo.id, state.currentRound).length === 0, `аур=${pending.length} гравець=${asPlayer.status} DM=${r.status} у зоні: ${members.map((id) => byId(id).basicInfo.name).join(", ")}; ${r.log.map((e: any) => e.resultText).join(" | ")}`);
}

async function reserveCheck() {
  await applyRotation(0);
  battleLabel = "Резерв";

  const [front, back] = await prisma.unit.findMany({ where: { campaignId: ctx.campaignId }, take: 2 });

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), { id: front.id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }, { id: back.id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 2, reserved: 2 }];

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Резерв", status: "prepared", participants: setup as any, map: { cols: 12, rows: 8, background: null, opacity: 0.5 }, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const reserve = () => (state.pendingSummons ?? []).filter((p: any) => p.battleData.reserved);

  const startedOk = P().length === heroRows.length + 1 && reserve().length === 2 && reserve().every((p: any) => p.battleData.hpMultiplier !== undefined);

  const before = current().basicInfo.id;

  const revealedId = reserve()[0].basicInfo.id;

  const r = await call("reveal-participant", REVEAL, { participantIds: [revealedId] });

  const placedAt = byId(revealedId)?.battleData.position;

  const occupied = P().filter((p) => p.basicInfo.id !== revealedId && p.battleData.position).some((p) => cellsOf(p).some((c) => c.x === placedAt?.x && c.y === placedAt?.y));

  tcheck("Резерв на карті: введений отримує вільну клітинку", r.status === 200 && !!placedAt && !occupied, `reveal=${r.status} позиція=${JSON.stringify(placedAt)} зайнята=${occupied}`);

  await nextOnly();

  const actedNext = current().basicInfo.id === revealedId && before !== revealedId;

  for (const e of P().filter((p) => p.basicInfo.side === "enemy" && alive(p))) await call("participants", KILL(e.basicInfo.id), { kill: true });

  const awaitingOk = state.status === "active" && reserve().length === 1;

  const blocked = await call("next-turn", NEXT);

  const r2 = await call("reveal-participant", REVEAL, { participantIds: [reserve()[0].basicInfo.id] });

  tcheck("Резерв: старт, введення, очікування рішення ДМ", startedOk && r.status === 200 && actedNext && awaitingOk && blocked.status === 422 && r2.status === 200 && state.status === "active", `старт=${startedOk} reveal=${r.status} ходить-наступним=${actedNext} очікування=${awaitingOk} next-turn=${blocked.status} reveal2=${r2.status}`);
}

async function mapCheck(spells: Map<string, any>) {
  await applyRotation(0);
  battleLabel = "Карта";

  const units = interleaveByRace(await prisma.unit.findMany({ where: { campaignId: ctx.campaignId }, select: { id: true, raceId: true } })).slice(0, 4);

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), ...units.map((id, i) => ({ id, type: ParticipantSourceType.UNIT, side: i === 3 ? "ally" : "enemy", quantity: 1 }))];

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Карта", status: "prepared", participants: setup as any, map: { cols: 12, rows: 8, background: null, opacity: 0.5 }, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const posOf = (p: any) => p.battleData.position as { x: number; y: number } | undefined;

  const isHero = (p: any) => p.basicInfo.side === "ally" && alive(p);

  const placed = P().filter(alive).every((p) => posOf(p));

  tcheck("Карта: розстановка після старту", placed, `${P().filter((p) => posOf(p)).length}/${P().length} учасників мають позицію`);

  await untilTurnOf(isHero);

  const mover = current();

  const from = posOf(mover);

  const taken = new Set(P().filter(alive).map((p) => `${posOf(p)?.x}:${posOf(p)?.y}`));

  const near = from ? [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ x: from.x + dx, y: from.y + dy }))).filter((c) => (c.x !== from.x || c.y !== from.y) && c.x >= 0 && c.y >= 0 && c.x < 12 && c.y < 8 && !taken.has(`${c.x}:${c.y}`)) : [];

  let mv: Awaited<ReturnType<typeof call>> | undefined;

  for (const c of near) {
    mv = await call("move", MOVE, { participantId: mover.basicInfo.id, to: c });

    if (mv.status === 200) break;
  }

  const to = posOf(byId(mover.basicInfo.id));

  tcheck("Карта: рух на сусідню клітинку", mv?.status === 200 && !!from && !!to && (to.x !== from.x || to.y !== from.y), `${mover.basicInfo.name} ${JSON.stringify(from)} → ${JSON.stringify(to)}, статус ${mv?.status ?? "немає вільної клітинки"}${mv && mv.status !== 200 ? ` ${JSON.stringify(mv.body).slice(0, 150)}` : ""}`);

  const dist = (a: any, c: any) => Math.max(Math.abs(a.battleData.position.x - c.battleData.position.x), Math.abs(a.battleData.position.y - c.battleData.position.y));

  const meleeOk = await untilTurnOf((p) => isHero(p) && !p.actionFlags.hasUsedAction && p.battleData.attacks?.some((a: any) => /melee|ближн/i.test(a.type ?? "")) && foesOf(p).some((f) => dist(p, f) > 1));

  const att = current();

  const w = att.battleData.attacks?.find((a: any) => /melee|ближн/i.test(a.type ?? ""));

  const far = foesOf(att).find((f) => dist(att, f) > 1);

  const rm = meleeOk && w && far ? await call("attack", ATTACK, { attackerId: att.basicInfo.id, targetId: far.basicInfo.id, attackId: w.id, d20Roll: 15, disadvantageRoll: 15, advantageRoll: 15, damageRolls: [], endTurn: false }) : null;

  tcheck("Карта: ближня атака не дістає далекої цілі", rm?.status === 422 && /не поруч/.test(JSON.stringify(rm.body)), `${att.basicInfo.name} → ${far?.basicInfo.name}: ${rm?.status ?? "немає сценарію"} ${rm ? JSON.stringify(rm.body).slice(0, 150) : ""}`);

  const fire = [...spells.values()].find((s: any) => s.name === "Вогняна куля");

  const caster = current();

  const foe = foesOf(caster)[0];

  const targetCell = posOf(foe);

  const fdice = fire && casterSpellDice(caster, { dice: fire.dice ?? 0, groupId: fire.groupId ?? null });

  // мінімальні кубики — щоб куля не завершила бій до перевірки небезпеки
  const fr = fire && fdice && foe && targetCell ? await call("spell", SPELL, { casterId: caster.basicInfo.id, spellId: fire.id, targetIds: [], targetCell, diceRolls: Array.from({ length: fdice.count }, () => 1), free: true }) : null;

  const cast = fr?.log.find((e: any) => e.actionType === "spell");

  const aim = cast?.actionDetails?.aimCell;

  const hitIds: string[] = (cast?.targets ?? []).map((t: any) => t.participantId);

  tcheck("Карта: шаблон «Вогняна куля» по клітинці", fr?.status === 200 && aim?.x === targetCell?.x && aim?.y === targetCell?.y && !!foe && hitIds.includes(foe.basicInfo.id), `${fr?.status ?? "немає закляття/цілі"} aimCell=${JSON.stringify(aim)} ціль ${foe?.basicInfo.name} у ${JSON.stringify(targetCell)}; цілей: ${hitIds.length}${fr && fr.status !== 200 ? ` ${JSON.stringify(fr.body).slice(0, 200)}` : ""}`);

  await mapRingAndEmptyCheck(spells);

  const hazardName = "Карта: небезпека б'є на початку ходу й пишеться в журнал";

  if (state.status !== "active") return tskip(hazardName, `бій уже не активний (${state.status}) після «Вогняної кулі»`);

  const victim = P().filter(isHero).find((p) => p.basicInfo.id !== current().basicInfo.id && posOf(p));

  const cell = victim && posOf(victim);

  const tr = cell ? await call("map-terrain", MAP_TERRAIN, { cells: [`${cell.x}:${cell.y}`], terrain: { kind: "hazard", label: "Жар", damage: { dice: "1d4", type: "fire" } } }) : null;

  const hpBefore = victim?.combatStats.currentHp ?? 0;

  const hazardLogs: any[] = [];

  for (let i = 0; victim && i < 60 && state.status === "active" && current().basicInfo.id !== victim.basicInfo.id; i++) {
    const r = await call("next-turn", NEXT);

    hazardLogs.push(...r.log);
  }

  const entry = hazardLogs.find((e: any) => e.actionDetails?.hazard);

  const after = victim && byId(victim.basicInfo.id);

  const change = entry?.hpChanges?.[0];

  // change > 0 — шкода (oldHp − newHp), як у решти журналу
  const signOk = !!change && change.change === change.oldHp - change.newHp && change.change > 0;

  tcheck(hazardName, tr?.status === 200 && !!entry && signOk && !!after && after.combatStats.currentHp < hpBefore, `${victim?.basicInfo.name} HP ${hpBefore} → ${after?.combatStats.currentHp}; terrain=${tr?.status}; ${entry ? `${entry.resultText}; hpChanges ${JSON.stringify(change)}` : "запису hazard немає"}`);

  await mapSkillAllCheck(spells);
}

/** Вміння «all» на карті: одиночне вороже заклинання б'є всю ворожу сторону без точки й дальності. */
async function mapSkillAllCheck(spells: Map<string, any>) {
  const name = "Карта: вміння «all» — уся ворожа сторона без наведення";

  if (state.status !== "active") return tskip(name, `бій не активний (${state.status})`);

  const widenedAll = (p: any, s: any) => s?.targeting?.kind === "enemy" && spellTargetingFor(P(), p.basicInfo.id, { id: s.id, groupId: s.groupId ?? null, level: s.level }).mode === "all";

  const found = P().filter((p) => p.basicInfo.side === "ally" && alive(p)).flatMap((p) => (p.spellcasting?.knownSpells ?? []).map((id: string) => spells.get(id)).filter((s: any) => widenedAll(p, s)).map((s: any) => ({ p, s })))[0];

  if (!found) return tskip(name, "жоден герой не має вміння «all» на відоме вороже заклинання");

  const foes = foesOf(found.p).filter((f) => !f.battleData.airborne).map((f) => f.basicInfo.id as string);

  const dice = casterSpellDice(found.p, { dice: found.s.dice ?? 0, groupId: found.s.groupId ?? null });

  const r = await call("spell", SPELL, { casterId: found.p.basicInfo.id, spellId: found.s.id, targetIds: [], diceRolls: Array.from({ length: dice.count }, () => 1), free: true });

  const cast = r.log.find((e: any) => e.actionType === "spell");

  const hitIds: string[] = (cast?.targets ?? []).map((t: any) => t.participantId);

  const ok = r.status === 200 && !cast?.actionDetails?.aimCell && hitIds.length === foes.length && foes.every((id) => hitIds.includes(id));

  tcheck(name, ok, `${found.p.basicInfo.name} «${found.s.name}»: ${r.status}; цілей ${hitIds.length}/${foes.length}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ""}`);
}

/** Кільце «Коло зими» по зайнятому центру й «Вогняна куля» в порожню зону: обидва — каст з aimCell. */
async function mapRingAndEmptyCheck(spells: Map<string, any>) {
  const ringName = "Карта: кільце «Коло зими» — центр не ціль, кільце — цілі";

  const emptyName = "Карта: каст у порожню зону — прийнято, aimCell є, цілей 0";

  const cols = 12;

  const rows = 8;

  const footprint = (p: any) => new Set(cellsOf(p).map((c) => `${c.x}:${c.y}`));

  const near = (c: { x: number; y: number }) => [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: c.x + dx, y: c.y + dy }))).filter((n) => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < rows);

  const onCells = (cells: string[]) => P().filter((p) => alive(p) && p.battleData.position && cellsOf(p).some((c) => cells.includes(`${c.x}:${c.y}`)));

  const castAt = async (spell: any, targetCell: { x: number; y: number }) => {
    const caster = current();

    const dice = casterSpellDice(caster, { dice: spell.dice ?? 0, groupId: spell.groupId ?? null });

    const r = await call("spell", SPELL, { casterId: caster.basicInfo.id, spellId: spell.id, targetIds: [], targetCell, diceRolls: Array.from({ length: dice.count }, () => 1), free: true });

    const cast = r.log.find((e: any) => e.actionType === "spell");

    return { r, aim: cast?.actionDetails?.aimCell, hitIds: (cast?.targets ?? []).map((t: any) => t.participantId) as string[] };
  };

  const winter = [...spells.values()].find((s: any) => s.name === "Коло зими");

  if (state.status !== "active") tskip(ringName, `бій не активний (${state.status})`);
  else if (!winter) tskip(ringName, "закляття «Коло зими» немає в кампанії");
  else {
    const centreOf = P().filter((p) => alive(p) && p.battleData.position && cellsOf(p).length === 1).map((p) => {
      const c = p.battleData.position;

      const ring = near(c).filter((n) => n.x !== c.x || n.y !== c.y).map((n) => `${n.x}:${n.y}`);

      return { p, c, ring: onCells(ring).filter((o) => !footprint(o).has(`${c.x}:${c.y}`)) };
    });

    const pick = centreOf.find((x) => x.ring.length > 0);

    if (!pick) tskip(ringName, "немає учасника 1×1 із сусідом у кільці");
    else {
      const { r, aim, hitIds } = await castAt(winter, pick.c);

      const ringIds = pick.ring.map((o) => o.basicInfo.id);

      const ok = r.status === 200 && aim?.x === pick.c.x && aim?.y === pick.c.y && !hitIds.includes(pick.p.basicInfo.id) && ringIds.every((id) => hitIds.includes(id));

      tcheck(ringName, ok, `${r.status} центр ${pick.p.basicInfo.name} у ${JSON.stringify(pick.c)}; кільце: ${pick.ring.map((o) => o.basicInfo.name).join(", ")}; цілі: ${hitIds.length}; aimCell=${JSON.stringify(aim)}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ""}`);
    }
  }

  const fire = [...spells.values()].find((s: any) => s.name === "Вогняна куля");

  if (state.status !== "active") return tskip(emptyName, `бій не активний (${state.status})`);

  if (!fire) return tskip(emptyName, "закляття «Вогняна куля» немає в кампанії");

  const all = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => ({ x, y }))).flat();

  const empty = all.find((c) => onCells(near(c).map((n) => `${n.x}:${n.y}`)).length === 0);

  if (!empty) return tskip(emptyName, "немає вільної зони 3×3");

  const { r, aim, hitIds } = await castAt(fire, empty);

  tcheck(emptyName, r.status === 200 && aim?.x === empty.x && aim?.y === empty.y && hitIds.length === 0, `${r.status} точка ${JSON.stringify(empty)}; aimCell=${JSON.stringify(aim)}; цілей ${hitIds.length}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ""}`);
}

main().catch(async (e) => { console.error(e); await removeTestBattles().catch(() => undefined); await prisma.$disconnect(); process.exit(1); });


// ---------- лабіринт ----------
const mazeGrid = (): MazeGrid => ({ cols: state.map.cols, rows: state.map.rows, maze: state.map.maze });

const posOf = (p: any) => p.battleData.position as { x: number; y: number } | undefined;

const onField = (p: any) => !!posOf(p) && !p.battleData.reserved && !p.battleData.escaped && alive(p);

const isMazeAlly = (p: any) => p.basicInfo.side === "ally" && onField(p);

const logText = (log: any[]) => log.map((e: any) => e.resultText ?? "").join(" | ");

/** Сплять рівно ті вороги, яких не бачить жоден герой. */
function sleepersMatchSight() {
  const grid = mazeGrid();

  const watchers = P().filter((p) => isMazeHero(p) && viewpointOf(p)).map((p) => ({ at: posOf(p) as any, vision: mazeVision(grid, viewpointOf(p) as any) }));

  const enemies = P().filter((p) => p.basicInfo.side === "enemy" && onField(p));

  const bad = enemies.filter((e) => !!e.battleData.dormant === watchers.some((w) => seesParticipant(grid, w.vision, w.at, posOf(e) as any)));

  return { ok: bad.length === 0, detail: bad.map((e) => e.basicInfo.name).join(", ") };
}

/** Стоячий на шляху учасник (прокинутий ворог не рухається сам) — ДМ переставляє його подалі від виходу. */
async function mazeClearBlocker(mover: any) {
  const grid = mazeGrid();

  const walls = wallSet(grid.maze);

  const exitDist = mazeDistances(grid, [grid.maze.exit as any]);

  const at = posOf(mover) as any;

  const here = exitDist.get(cellKey(at)) ?? Infinity;

  const occupied = new Map(P().filter(onField).map((p) => [cellKey(posOf(p) as any), p]));

  const blocker = neighbors(at).filter((n) => canStep(grid, walls, at, n) && (exitDist.get(cellKey(n)) ?? Infinity) < here).map((n) => occupied.get(cellKey(n))).find(Boolean);

  const special = new Set([cellKey(grid.maze.exit as any), ...grid.maze.teleports.flat().map(cellKey)]);

  const spot = [...exitDist.entries()].filter(([k]) => !occupied.has(k) && !special.has(k)).sort((a, b) => b[1] - a[1])[0];

  if (!blocker || !spot) return false;

  const [x, y] = spot[0].split(":").map(Number);

  return (await call("move", MOVE, { participantId: blocker.basicInfo.id, to: { x, y }, free: true })).status === 200;
}

async function mazeStepToExit(mover: any, retry = true): Promise<Awaited<ReturnType<typeof call>> | null> {
  const grid = mazeGrid();

  const exitDist = mazeDistances(grid, [grid.maze.exit as any]);

  const teleports = new Set(grid.maze.teleports.flat().map(cellKey));

  const reach = [...mazeReachable(grid, { participants: P(), mover, budget: 3 - (mover.battleData.movementUsed ?? 0) }).entries()].filter(([k]) => exitDist.has(k));

  const here = exitDist.get(cellKey(posOf(mover) as any)) ?? Infinity;

  const best = reach.sort((a, b) => (exitDist.get(a[0]) as number) - (exitDist.get(b[0]) as number) || Number(teleports.has(a[0])) - Number(teleports.has(b[0])))[0];

  if (!best || (exitDist.get(best[0]) as number) >= here) return retry && (await mazeClearBlocker(mover)) ? mazeStepToExit(byId(mover.basicInfo.id), false) : null;

  const [x, y] = best[0].split(":").map(Number);

  return call("move", MOVE, { participantId: mover.basicInfo.id, to: { x, y } });
}

async function mazeWalkAllies(maxTurns: number) {
  for (let i = 0; i < maxTurns && state.status === "active"; i++) {
    if (!P().some(isMazeAlly)) return;

    const c = current();

    const moved = isMazeAlly(c) ? await mazeStepToExit(c) : null;

    if (!(moved && moved.status === 200 && c.battleData.escaped) && state.status === "active" && current()?.basicInfo.id === c.basicInfo.id) await call("next-turn", NEXT);
  }
}

async function mazeCheck() {
  await applyRotation(0);
  battleLabel = "Лабіринт";

  const allyHeroes = heroRows.filter((h, i, all) => all.findIndex((x) => x.race === h.race) === i).slice(0, 2);

  const enemyHero = heroRows.find((h) => !allyHeroes.includes(h));

  const units = interleaveByRace(await prisma.unit.findMany({ where: { campaignId: ctx.campaignId }, select: { id: true, raceId: true } })).slice(0, 4);

  const setup = [
    ...allyHeroes.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })),
    ...(enemyHero ? [{ id: enemyHero.id, type: ParticipantSourceType.CHARACTER, side: "enemy" }] : []),
    ...units.map((id, i) => ({ id, type: ParticipantSourceType.UNIT, side: i === 3 ? "ally" : "enemy", quantity: 1 })),
  ];

  const b = await createTestBattle({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Лабіринт", status: "prepared", participants: setup as any, map: { cols: 14, rows: 10, background: null, opacity: 0.5, maze: emptyMaze("medium") } as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const enemies = () => P().filter((p) => p.basicInfo.side === "enemy");

  tcheck("Лабіринт: після старту вороги сплять", enemies().length > 0 && enemies().every((e) => e.battleData.dormant), `сплять ${enemies().filter((e) => e.battleData.dormant).length}/${enemies().length}; ворожий герой ${enemyHero ? "є" : "немає"}`);

  const gen = await call("maze", MAZE, { op: "generate", difficulty: "medium", teleportPairs: 2, fogPatches: 2, exit: null });

  const maze = state.map?.maze;

  tcheck("Лабіринт: генерація (вихід, 2 телепорти, туман, усі досяжні до виходу)", gen.status === 200 && !!maze?.exit && maze.teleports.length === 2 && maze.fog.length >= 2 && allReachExit(mazeGrid(), P().filter(onField).map((p) => posOf(p) as any)), `${gen.status} вихід ${JSON.stringify(maze?.exit)} телепортів ${maze?.teleports?.length} туман ${maze?.fog?.length}${gen.status !== 200 ? ` ${JSON.stringify(gen.body).slice(0, 200)}` : ""}`);

  if (gen.status !== 200 || !maze?.exit) return;

  const watcher = P().find((p) => isMazeAlly(p) && p.basicInfo.sourceType !== ParticipantSourceType.UNIT) ?? P().find(isMazeAlly);

  const sleeper = enemies().find((e) => e.battleData.dormant && posOf(e));

  const taken = new Set(P().filter(onField).map((p) => cellKey(posOf(p) as any)));

  const nearCell = watcher && neighbors(posOf(watcher) as any).find((n) => n.x >= 0 && n.y >= 0 && n.x < 14 && n.y < 10 && !taken.has(cellKey(n)) && canStep(mazeGrid(), wallSet(mazeGrid().maze), posOf(watcher) as any, n) && cellKey(n) !== cellKey(maze.exit) && !maze.teleports.flat().some((t: any) => cellKey(t) === cellKey(n)));

  const home = sleeper && posOf(sleeper);

  const wake = sleeper && nearCell ? await call("move", MOVE, { participantId: sleeper.basicInfo.id, to: nearCell, free: true }) : null;

  tcheck("Лабіринт: ворог у полі зору прокидається, подія «помітив»", !!wake && wake.status === 200 && !byId(sleeper.basicInfo.id).battleData.dormant && /помітив/.test(logText(wake.log)), `${sleeper?.basicInfo.name}: ${wake?.status ?? "немає сценарію"} ${wake ? logText(wake.log).slice(0, 150) : ""}`);

  if (wake?.status === 200 && home) await call("move", MOVE, { participantId: sleeper.basicInfo.id, to: home, free: true });

  await untilTurnOf(isMazeAlly);

  const hero = current();

  const grid = mazeGrid();

  const walls = wallSet(grid.maze);

  const fromHero = mazeDistances(grid, [posOf(hero) as any]);

  const blockedCell = neighbors(posOf(hero) as any).find((n) => n.x >= 0 && n.y >= 0 && n.x < 14 && n.y < 10 && !canStep(grid, walls, posOf(hero) as any, n) && (fromHero.get(cellKey(n)) ?? Infinity) > 3 && !P().filter(onField).some((p) => cellKey(posOf(p) as any) === cellKey(n)));

  const wallMove = blockedCell ? await call("move", MOVE, { participantId: hero.basicInfo.id, to: blockedCell }) : null;

  if (wallMove) tcheck("Лабіринт: крок крізь стіну → 422", wallMove.status === 422, `${hero.basicInfo.name} → ${JSON.stringify(blockedCell)}: ${wallMove.status}`);
  else tskip("Лабіринт: крок крізь стіну → 422", "за стіною від героя немає клітинки без обходу ≤ 3 кроків");

  const dist4 = [...mazeDistances(grid, [posOf(hero) as any]).entries()].find(([k, d]) => d === 4 && !P().filter(onField).some((p) => cellKey(posOf(p) as any) === k) && cellKey(maze.exit) !== k && !maze.teleports.flat().some((t: any) => cellKey(t) === k));

  const far = dist4 && (await call("move", MOVE, { participantId: hero.basicInfo.id, to: { x: Number(dist4[0].split(":")[0]), y: Number(dist4[0].split(":")[1]) } }));

  if (far) tcheck("Лабіринт: 4-й крок за хід → 422", far.status === 422, `${hero.basicInfo.name} → ${dist4[0]}: ${far.status}`);
  else tskip("Лабіринт: 4-й крок за хід → 422", "немає клітинки на відстані 4");

  const mark = await call("maze-mark", MAZE_MARK, { participantId: hero.basicInfo.id, symbol: "star" });

  const markKey = cellKey(posOf(byId(hero.basicInfo.id)) as any);

  tcheck("Лабіринт: мітка гравця з'являється на клітинці", mark.status === 200 && state.map.maze.marks?.[markKey]?.symbol === "star", `${mark.status} ${markKey}${mark.status !== 200 ? ` ${JSON.stringify(mark.body).slice(0, 150)}` : ""}`);

  const step = await mazeStepToExit(byId(hero.basicInfo.id));

  tcheck("Лабіринт: кроки до виходу (≤3 за хід)", !!step && step.status === 200 && (byId(hero.basicInfo.id).battleData.movementUsed ?? 0) <= 3, `${step?.status ?? "немає прогресу"} витрачено ${byId(hero.basicInfo.id).battleData.movementUsed}`);

  const over = await call("move", MOVE, { participantId: hero.basicInfo.id, to: neighbors(posOf(byId(hero.basicInfo.id)) as any).find((n) => canStep(mazeGrid(), wallSet(mazeGrid().maze), posOf(byId(hero.basicInfo.id)) as any, n) && !P().filter(onField).some((p) => cellKey(posOf(p) as any) === cellKey(n))) ?? { x: 0, y: 0 } });

  if ((byId(hero.basicInfo.id).battleData.movementUsed ?? 0) >= 3 && state.currentTurnIndex !== undefined && current().basicInfo.id === hero.basicInfo.id) tcheck("Лабіринт: ліміт кроків вичерпано → 422", over.status === 422, `${over.status}`);

  await untilTurnOf(isMazeAlly);

  const darkHero = current();

  const attacker = byId(darkHero.basicInfo.id);

  const foe = foesOf(attacker)[0];

  const atkBody = { attackerId: attacker.basicInfo.id, targetId: foe?.basicInfo.id, attackId: attacker.battleData.attacks?.[0]?.id ?? "x", d20Roll: 10, disadvantageRoll: 10, advantageRoll: 10, damageRolls: [], endTurn: false };

  await call("maze", MAZE, { op: "dark", on: true });

  const darkAtk = await call("attack", ATTACK, atkBody);

  const darkNext = await call("next-turn", NEXT);

  tcheck("Лабіринт: темрява блокує атаку (422), next-turn пропускає хід", darkAtk.status === 422 && JSON.stringify(darkAtk.body).includes(MAZE_DARK_ERROR) && darkNext.status === 200 && logText(darkNext.log).includes(MAZE_DARK_SKIP), `атака ${darkAtk.status} ${JSON.stringify(darkAtk.body).slice(0, 100)}; next-turn ${darkNext.status} ${logText(darkNext.log).slice(0, 100)}`);

  const darkOff = await call("maze", MAZE, { op: "dark", on: false });

  tcheck("Лабіринт: темряву вимкнено", darkOff.status === 200 && state.map.maze.dark === false, `${darkOff.status}`);

  const exitBefore = JSON.stringify(state.map.maze.exit);

  const rw = await call("maze", MAZE, { op: "reshuffle", mode: "walls", teleportPairs: 2, fogPatches: 2 });

  const sleepW = sleepersMatchSight();

  tcheck("Лабіринт: перетасовка стін — той самий вихід, невидимі вороги сплять", rw.status === 200 && JSON.stringify(state.map.maze.exit) === exitBefore && allReachExit(mazeGrid(), P().filter(onField).map((p) => posOf(p) as any)) && sleepW.ok, `${rw.status} вихід ${exitBefore === JSON.stringify(state.map.maze.exit) ? "той самий" : "інший"}; невідповідність сну: ${sleepW.detail || "немає"}${rw.status !== 200 ? ` ${JSON.stringify(rw.body).slice(0, 150)}` : ""}`);

  const rs = await call("maze", MAZE, { op: "reshuffle", mode: "scatter", teleportPairs: 2, fogPatches: 2 });

  const cells = P().filter(onField).map((p) => posOf(p) as any);

  const minGap = Math.min(...cells.flatMap((a, i) => cells.slice(i + 1).map((c) => cellDistance(a, c))));

  const sleepS = sleepersMatchSight();

  tcheck(`Лабіринт: розкидання — відстань між учасниками ≥ ${MAZE_SCATTER_MIN_GAP}`, rs.status === 200 && minGap >= MAZE_SCATTER_MIN_GAP && allReachExit(mazeGrid(), cells) && sleepS.ok, `${rs.status} мін. відстань ${minGap}; невідповідність сну: ${sleepS.detail || "немає"}${rs.status !== 200 ? ` ${JSON.stringify(rs.body).slice(0, 150)}` : ""}`);

  await mazeWalkAllies(120);

  const allies = P().filter((p) => p.basicInfo.side === "ally" && alive(p));

  const escapedAll = allies.length > 0 && allies.every((p) => p.battleData.escaped);

  const awaiting = checkVictoryConditions(P(), [], { maze: true }).awaiting;

  tcheck("Лабіринт: усі союзники вибралися → очікування рішення ДМ", escapedAll && awaiting === "victory" && state.status === "active", `вибралися ${allies.filter((p) => p.battleData.escaped).length}/${allies.length}; awaiting=${awaiting}; статус ${state.status}`);
}
