#!/usr/bin/env tsx
/**
 * Баланс бібліотеки скілів і заклять: автобої героїв (3 побудови × рівні 3/6/10) проти складів Tier 1/4/7 з imports/units-import.csv.
 * Лише локальна БД. Кампанія «SIM: баланс бібліотеки» створюється разом із сідом бібліотеки й імпортом юнітів.
 *
 *   pnpm balance-library [--runs=6] [--levels=3,6,10] [--parties=mixed,martial,caster,leader] [--reuse]
 */
import type { Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";

import { attackBodySchema, attackMutation } from "../app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { nextTurnMutation } from "../app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { spellSchema } from "../app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "../app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { createStartMutation } from "../app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import { loadCharacterBalanceStats } from "../app/api/campaigns/[id]/battles/balance/character-stats";
import { BATTLE_LOG_RECENT_EVENTS, ParticipantSourceType } from "../lib/constants/battle";
import { CampaignRole } from "../lib/constants/campaigns";
import { prisma } from "../lib/db";
import { computeFairScaling, pickEnemyRoster } from "../lib/utils/battle/balance";
import { loadUnitLibraryStats } from "../lib/utils/battle/balance/unit-library";
import { applyBattleDelta } from "../lib/utils/battle/client/apply-delta";
import { heroAttackDamageParts } from "../lib/utils/battle/damage/hero-damage";
import { type PipelineDeps, runBattleMutation, type RunBattleMutationOptions } from "../lib/utils/battle/pipeline/run-battle-mutation";
import { casterSpellDice } from "../lib/utils/battle/spell/caster-dice";
import { loadBattle, loadRecentEvents, saveBattle } from "../lib/utils/battle/store";
import { rollDiceList } from "../lib/utils/common/dice";
import { branchLevelNodeId, canLearn, normalizeTree, racialNodeId, type TreeNodes } from "../lib/utils/skills/progression";
import type { BattleMutationResponse, BattleScene } from "../types/api";
import type { BattleParticipant } from "../types/battle";
import { SIM_PLAYER, SIM_USER } from "./simulate-battle-scenario";
import { FAIR_WEAPONS } from "./simulate-battle-scenario";

const url = process.env.DATABASE_URL ?? "";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("balance-library працює лише з локальною БД (DATABASE_URL на localhost).");
  process.exit(1);
}

const CAMPAIGN_NAME = "SIM: баланс бібліотеки";

const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const RUNS = Number(arg("runs", "6"));

const LEVELS = arg("levels", "3,6,10").split(",").map(Number);

const TIER_OF_LEVEL: Record<number, number> = { 3: 1, 6: 4, 10: 7 };

const REUSE = process.argv.includes("--reuse");

const STEP_LIMIT = 500;

interface Build {
  key: string;
  race: string;
  class: string;
  branches: string[];
  weapon: keyof typeof FAIR_WEAPONS;
  stats: (level: number) => Record<string, number>;
  caster?: boolean;
}

const prime = (level: number) => (level >= 10 ? 20 : level >= 6 ? 18 : 16);

const BUILDS: Record<string, Build> = {
  martial: { key: "martial", race: "Люди", class: "Fighter", branches: ["Напад", "Захист"], weapon: "sword", stats: (l) => ({ strength: prime(l), dexterity: 12, constitution: 15, armorClass: 15 + Math.floor(l / 4) }) },
  caster: { key: "caster", race: "Маги", class: "Wizard", branches: ["Хаос", "Світло"], weapon: "dagger", caster: true, stats: (l) => ({ intelligence: prime(l), strength: 12, dexterity: 12, constitution: 12, armorClass: 12 + Math.floor(l / 5), spellcastingAbilityScore: 0 }) },
  leader: { key: "leader", race: "Ельфи", class: "Ranger", branches: ["Лідерство", "Стрільба"], weapon: "bow", stats: (l) => ({ strength: 12, dexterity: prime(l), charisma: 14, constitution: 13, armorClass: 14 + Math.floor(l / 5) }) },
};

const PARTIES: Record<string, string[]> = {
  mixed: ["martial", "caster", "leader"],
  martial: ["martial", "martial", "martial"],
  caster: ["caster", "caster", "caster"],
  leader: ["leader", "leader", "leader"],
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let rng: () => number = Math.random;

let casts = 0;

const castLog: Record<string, number> = {};

let dealt: Record<string, { dmg: number; turns: number }> = {};

const deps: PipelineDeps = {
  getUserId: async () => SIM_USER.id,
  rateLimit: async () => ({ allowed: true, count: 0, limit: 1_000_000, resetInSeconds: 0 }) as never,
  loadBattle: (args) => loadBattle(prisma, args),
  saveBattle: (before, outcome) => saveBattle(prisma, before, outcome),
  loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
  publish: () => {},
  rng: () => rng(),
};

let campaignId = "";

let battleId = "";

let state: BattleScene;

async function readState(): Promise<BattleScene> {
  const res = await runBattleMutation(
    new Request("http://localhost/battle"),
    { params: { id: campaignId, battleId }, access: "member", dryRun: () => true, includeRecentEvents: BATTLE_LOG_RECENT_EVENTS, mutate: (c) => ({ participants: c.participants, pending: c.pending, events: [] }) },
    deps,
  );

  return (await res.json()) as BattleScene;
}

async function call<T>(label: string, options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown = {}): Promise<number> {
  const req = new Request(`http://localhost/api/campaigns/${campaignId}/battles/${battleId}/${label}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const res = await runBattleMutation(req, { ...options, params: { id: campaignId, battleId } } as RunBattleMutationOptions<T>, deps);

  const json = (await res.json()) as Record<string, unknown>;

  if (res.status === 200 && "delta" in json) {
    const applied = applyBattleDelta(state, (json as unknown as BattleMutationResponse).delta);

    state = applied === "refetch" ? await readState() : applied;
  } else if (res.status === 200) {
    state = await readState();
  }

  return res.status;
}

const START = { access: "dm" as const, requireStatus: "prepared" as const, mutate: createStartMutation() };

const ATTACK = { access: "member" as const, requireStatus: "active" as const, schema: attackBodySchema, mutate: attackMutation };

const NEXT = { access: "currentController" as const, requireStatus: "active" as const, mutate: nextTurnMutation };

const summonDeps = { loadPool: async (id: string) => ({ units: await prisma.unit.findMany({ where: { campaignId: id } }), races: await prisma.race.findMany({ where: { campaignId: id } }) }) };

const SPELL = { access: "member" as const, requireStatus: "active" as const, schema: spellSchema, dryRun: (b: { preview?: boolean }) => b.preview === true, mutate: createSpellMutation({ loadSpell: (id) => prisma.spell.findUnique({ where: { id } }), ...summonDeps }) };

type SpellRow = Awaited<ReturnType<typeof prisma.spell.findMany>>[number];

let spellById = new Map<string, SpellRow>();

const hp = (p: BattleParticipant) => p.combatStats.currentHp;

const alive = (p: BattleParticipant) => p.combatStats.status === "active" && hp(p) > 0;

function pickSpell(actor: BattleParticipant, foes: BattleParticipant[]): { spell: SpellRow; targets: BattleParticipant[] } | null {
  let best: { spell: SpellRow; targets: BattleParticipant[]; score: number } | null = null;

  for (const id of actor.spellcasting.knownSpells) {
    const spell = spellById.get(id);

    const slot = spell && actor.spellcasting.spellSlots[String(spell.level)];

    if (!spell || !slot || slot.current <= 0) continue;

    const effects = (spell.spellEffects as Array<{ kind: string }>) ?? [];

    if (!effects.some((e) => e.kind === "dealDamage")) continue;

    const targeting = spell.targeting as { kind: string; side?: string; maxTargets?: number };

    const sorted = [...foes].sort((a, b) => hp(a) - hp(b));

    let targets: BattleParticipant[];

    if (targeting.kind === "enemy") targets = sorted.slice(0, 1);
    else if (targeting.kind === "area" && targeting.side === "enemy") targets = sorted.slice(0, targeting.maxTargets ?? 1);
    else if (targeting.kind === "allEnemies") targets = sorted;
    else continue;

    const dice = casterSpellDice(actor, { dice: spell.dice, groupId: spell.groupId });

    const save = (spell.resolution as { kind: string }).kind === "save" ? 0.75 : 1;

    const score = dice.count * ((dice.sides + 1) / 2) * targets.length * save;

    if (!best || score > best.score) best = { spell, targets, score };
  }

  return best;
}

async function playTurn(actor: BattleParticipant, foes: BattleParticipant[]) {
  const weapon = actor.battleData.attacks[0];

  if (actor.basicInfo.sourceType === ParticipantSourceType.CHARACTER) {
    const pick = pickSpell(actor, foes);

    if (pick) {
      const dice = casterSpellDice(actor, { dice: pick.spell.dice, groupId: pick.spell.groupId });

      const rolls = Array.from({ length: dice.count }, () => 1 + Math.floor(rng() * dice.sides));

      const status = await call("spell", SPELL, { casterId: actor.basicInfo.id, spellId: pick.spell.id, targetIds: pick.targets.map((t) => t.basicInfo.id), diceRolls: rolls });

      if (status === 200) {
        casts++;
        castLog[pick.spell.name] = (castLog[pick.spell.name] ?? 0) + 1;
        await call("next-turn", NEXT);

        return;
      }
    }
  }

  if (!weapon) {
    await call("next-turn", NEXT);

    return;
  }

  const target = [...foes].sort((a, b) => hp(a) - hp(b))[0];

  const formula = heroAttackDamageParts(actor, weapon).formula;

  const status = await call("attack", ATTACK, { attackerId: actor.basicInfo.id, targetId: target.basicInfo.id, d20Roll: 1 + Math.floor(rng() * 20), damageRolls: rollDiceList(formula, rng), endTurn: true });

  if (status !== 200) await call("next-turn", NEXT);
}

export interface FightResult {
  rounds: number;
  completed: boolean;
  heroesWon: boolean;
  deaths: number;
  hpLeft: number;
  casts: number;
  dealt: Record<string, { dmg: number; turns: number }>;
}

async function fight(seed: number, setup: Array<Record<string, unknown>>): Promise<FightResult> {
  rng = mulberry32(seed);
  casts = 0;
  dealt = {};

  const battle = await prisma.battleScene.create({ data: { campaignId, name: `Баланс ${seed}`, status: "prepared", participants: setup as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0 } });

  battleId = battle.id;
  state = await readState();
  await call("start", START);

  if (process.argv.includes("--dump") && seed < 200) {
    for (const p of state.initiativeOrder) console.info(`   ${p.basicInfo.name}: HP ${p.combatStats.maxHp} AC ${p.combatStats.armorClass} init ${p.abilities.initiative}`);
  }

  for (let step = 0; step < STEP_LIMIT && state.status === "active"; step++) {
    const actor = state.initiativeOrder[state.currentTurnIndex];

    const foes = state.initiativeOrder.filter((p) => p.basicInfo.side !== actor.basicInfo.side && alive(p));

    if (!alive(actor) || foes.length === 0) {
      await call("next-turn", NEXT);
      continue;
    }

    const foeHp = () => state.initiativeOrder.filter((p) => p.basicInfo.side !== actor.basicInfo.side).reduce((n, p) => n + Math.max(0, hp(p)), 0);

    const before = foeHp();

    await playTurn(actor, foes);

    const key = actor.basicInfo.name.split("-")[0];

    dealt[key] ??= { dmg: 0, turns: 0 };
    dealt[key].dmg += before - foeHp();
    dealt[key].turns += 1;
  }

  const heroes = state.initiativeOrder.filter((p) => p.basicInfo.side === "ally");

  await prisma.battleScene.delete({ where: { id: battleId } }).catch(() => undefined);

  return {
    casts,
    dealt,
    rounds: state.currentRound,
    completed: state.status === "completed",
    heroesWon: heroes.some((p) => hp(p) > 0),
    deaths: heroes.filter((p) => hp(p) <= 0).length,
    hpLeft: Math.round((100 * heroes.reduce((n, p) => n + Math.max(0, hp(p)), 0)) / heroes.reduce((n, p) => n + p.combatStats.maxHp, 0)),
  };
}

function plan(tree: TreeNodes, level: number, branchNames: string[]): string[] {
  const seqs = branchNames.map((name) => {
    const branch = tree.branches.find((b) => b.name === name);

    if (!branch) throw new Error(`Гілку «${name}» не знайдено в дереві ${tree.race}`);

    const cells = tree.grid.get(branch.id);

    const slot = (circle: "outer" | "middle" | "inner", i: number) => cells?.[circle][i] ?? null;

    return [branchLevelNodeId(branch.id, "basic"), slot("outer", 0), branchLevelNodeId(branch.id, "advanced"), slot("outer", 1), slot("middle", 0), branchLevelNodeId(branch.id, "expert"), slot("outer", 2), slot("middle", 1), slot("inner", 0)];
  });

  const order = [racialNodeId("basic"), racialNodeId("advanced"), racialNodeId("expert")];

  for (let i = 0; i < 9; i++) for (const seq of seqs) if (seq[i]) order.push(seq[i] as string);

  const unlocked: string[] = [];

  while (unlocked.length < level) {
    const next = order.find((id) => !unlocked.includes(id) && canLearn(tree, unlocked, level, id).ok);

    if (!next) break;

    unlocked.push(next);
  }

  return unlocked;
}

async function setupCampaign() {
  if (REUSE) {
    const existing = await prisma.campaign.findFirst({ where: { name: CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

    if (existing) return existing.id;
  }

  await prisma.campaign.deleteMany({ where: { name: CAMPAIGN_NAME, dmUserId: SIM_USER.id } });
  await prisma.user.upsert({ where: { id: SIM_USER.id }, update: {}, create: SIM_USER });
  await prisma.user.upsert({ where: { id: SIM_PLAYER.id }, update: {}, create: SIM_PLAYER });

  const campaign = await prisma.campaign.create({ data: { name: CAMPAIGN_NAME, inviteCode: `SIMB-${Date.now()}`, dmUserId: SIM_USER.id } });

  await prisma.campaignMember.create({ data: { campaignId: campaign.id, userId: SIM_USER.id, role: CampaignRole.DM } });
  await prisma.campaignMember.create({ data: { campaignId: campaign.id, userId: SIM_PLAYER.id, role: CampaignRole.PLAYER } });

  const run = (script: string, ...args: string[]) => execFileSync("pnpm", ["exec", "tsx", "--env-file=.env.local", "--tsconfig", "tsconfig.scripts.json", script, ...args], { stdio: "inherit" });

  run("scripts/seed-library.ts", campaign.id);
  run("scripts/import-units.ts", "imports/units-import.csv", campaign.id);

  return campaign.id;
}

function dumpPlan(tree: TreeNodes, ids: string[], skillNames: Map<string, string>, label: string) {
  const names = ids.map((id) => {
    const node = tree.nodes.get(id);

    return skillNames.get(node && "skillId" in node && node.skillId ? node.skillId : id) ?? id;
  });

  console.info(`${label}: ${names.join(", ")}`);
}

async function createParty(partyKey: string, level: number, trees: Map<string, TreeNodes>, weapons: Record<string, string>, skillNames: Map<string, string>) {
  const ids: string[] = [];

  for (const [i, buildKey] of PARTIES[partyKey].entries()) {
    const b = BUILDS[buildKey];

    const tree = trees.get(b.race);

    if (!tree) throw new Error(`Немає дерева раси ${b.race}`);

    const unlocked = plan(tree, level, b.branches);

    if (process.argv.includes("--dump") && i === 0) dumpPlan(tree, unlocked, skillNames, `${buildKey} L${level}`);

    const { spellcastingAbilityScore: _unused, ...stats } = b.stats(level);

    void _unused;

    const row = await prisma.character.create({
      data: {
        campaignId,
        type: "player",
        controlledBy: SIM_PLAYER.id,
        name: `${buildKey}-${partyKey}-${level}-${i}`,
        class: b.class,
        race: b.race,
        level,
        initiative: 1,
        spellcastingAbility: b.caster ? "intelligence" : null,
        spellSlots: {},
        skillTreeProgress: { [tree.treeId]: { unlockedSkills: unlocked } },
        ...stats,
      },
    });

    await prisma.characterInventory.create({ data: { characterId: row.id, equipped: { mainHand: weapons[b.weapon] } } });
    ids.push(row.id);
  }

  return ids;
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

async function main() {
  campaignId = await setupCampaign();

  const treeRows = await prisma.skillTree.findMany({ where: { campaignId } });

  const trees = new Map(treeRows.map((t) => [t.race, normalizeTree(t)]));

  spellById = new Map((await prisma.spell.findMany({ where: { campaignId } })).map((s) => [s.id, s]));

  const weapons: Record<string, string> = {};

  const existingWeapons = await prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true } });

  for (const [key, w] of Object.entries(FAIR_WEAPONS)) {
    weapons[key] = existingWeapons.find((a) => a.name === w.name)?.id ?? (await prisma.artifact.create({ data: { campaignId, abilities: [], ...w } as Prisma.ArtifactUncheckedCreateInput })).id;
  }

  const skillNames = new Map((await prisma.skill.findMany({ where: { campaignId }, select: { id: true, name: true } })).map((k) => [k.id, k.name]));

  const library = await loadUnitLibraryStats(campaignId);

  console.info(`Кампанія ${campaignId}, прогонів на зв'язку: ${RUNS}`);
  console.info("party | рівень | tier | склад | сер. раундів | перемоги | полеглі | HP лишилось | незавершені");

  const rows: string[] = [];

  for (const partyKey of arg("parties", Object.keys(PARTIES).join(",")).split(",")) {
    for (const level of LEVELS) {
      const heroIds = await createParty(partyKey, level, trees, weapons, skillNames);

      const tier = TIER_OF_LEVEL[level] ?? 1;

      const stats = await loadCharacterBalanceStats(campaignId, heroIds);

      const party = { dpr: 0, hp: 0, heroCount: stats.length };

      for (const { stats: s } of stats) {
        party.dpr += s.dpr;
        party.hp += s.hp;
      }

      const pick = pickEnemyRoster(party, library.filter((u) => u.level === tier));

      if (!pick) {
        rows.push(`${partyKey} | ${level} | ${tier} | не вдалося підібрати склад`);
        continue;
      }

      const scaling = computeFairScaling(party, pick.roster, library);

      const setup = [
        ...heroIds.map((id) => ({ id, type: ParticipantSourceType.CHARACTER, side: "ally" })),
        ...pick.roster.map((r) => ({ id: r.unitId, type: ParticipantSourceType.UNIT, side: "enemy", quantity: r.quantity })),
      ];

      const results: FightResult[] = [];

      for (let seed = 1; seed <= RUNS; seed++) results.push(await fight(seed * 101 + level, setup));

      const rosterText = pick.roster.map((r) => `${r.name}×${r.quantity}`).join("+");

      const mults = Object.values(scaling.units).map((u) => `${u.hpMult.toFixed(2)}/${u.dmgMult.toFixed(2)}`).join(",");

      const perBuild = Object.entries(
        results.reduce<Record<string, { dmg: number; turns: number }>>((acc, r) => {
          for (const [k, v] of Object.entries(r.dealt)) {
            acc[k] ??= { dmg: 0, turns: 0 };
            acc[k].dmg += v.dmg;
            acc[k].turns += v.turns;
          }

          return acc;
        }, {}),
      )
        .map(([k, v]) => `${k} ${(v.dmg / Math.max(1, v.turns)).toFixed(1)}/хід`)
        .join(" ");

      const row = `${partyKey} | L${level} | T${tier} | ${rosterText} (hp/дмг ${mults}) | ${avg(results.map((r) => r.rounds))} | ${results.filter((r) => r.completed && r.heroesWon).length}/${RUNS} | ${avg(results.map((r) => r.deaths))} | ${avg(results.map((r) => r.hpLeft))}% | ${results.filter((r) => !r.completed).length} | casts ${avg(results.map((r) => r.casts))} | ${perBuild}`;

      rows.push(row);
      console.info(row);
    }
  }

  console.info("\n" + rows.join("\n"));
  console.info(`Касти: ${Object.entries(castLog).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
