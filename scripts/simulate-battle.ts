#!/usr/bin/env tsx
/**
 * Наскрізна симуляція бою на локальній БД: створює окрему кампанію з персонажами, юнітами,
 * скілами, артефактами й сетом, а потім проганяє бій через ті самі mutation-функції, що й API
 * (runBattleMutation + loadBattle/saveBattle). Підмінено лише авторизацію, rate-limit і Pusher.
 *
 *   pnpm simulate-battle            # лише локальна БД (localhost)
 */
import type { Prisma } from "@prisma/client";

import { abilityActionSchema, createAbilityActionMutation } from "../app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { attackBodySchema, createAttackMutation } from "../app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { bonusActionSchema, createBonusActionMutation } from "../app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { moraleCheckMutation } from "../app/api/campaigns/[id]/battles/[battleId]/morale-check/morale-check-mutation";
import { nextTurnMutation } from "../app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { patchParticipantMutation } from "../app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation";
import { patchParticipantSchema } from "../app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-schema";
import { createRollbackMutation, rollbackSchema } from "../app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { spellSchema } from "../app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "../app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { createStartMutation } from "../app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import { postBalanceResponse } from "../app/api/campaigns/[id]/battles/balance/balance-post";
import { buildLibrary } from "../data/library/build";
import { prisma } from "../lib/db";
import { moraleCheckSchema } from "../lib/schemas";
import { applyBattleDelta } from "../lib/utils/battle/client/apply-delta";
import { type PipelineDeps, runBattleMutation, type RunBattleMutationOptions } from "../lib/utils/battle/pipeline/run-battle-mutation";
import { loadBattle, loadRecentEvents, saveBattle } from "../lib/utils/battle/store";
import { needsMoraleCheck } from "../lib/utils/battle/view";
import { branchLevelNodeId, buildTreeJson, racialNodeId } from "../lib/utils/skills/progression";
import type { BattleMutationResponse, BattleScene } from "../types/api";
import type { BattleAction, BattleParticipant } from "../types/battle";
import { racePassiveData } from "./seed-library-lib";
import { artifactRows, DEMON_RACE, DEMON_UNIT, DRAGON_SET, FAIR_CAMPAIGN_NAME, FAIR_HEROES, FAIR_UNITS, FAIR_WEAPONS, MECHANICS_CAMPAIGN_NAME, MECHANICS_UNITS, RACES, RACIAL_CAMPAIGN_NAME, RACIAL_UNITS, SIM_CAMPAIGN_NAME, SIM_PLAYER, SIM_USER, SKILLS, SPELL_MODEL_CAMPAIGN_NAME, SPELL_MODEL_UNITS, UNITS } from "./simulate-battle-scenario";

import { BATTLE_LOG_RECENT_EVENTS, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { countMarks } from "@/lib/utils/abilities/engine/marks";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { PUSHER_DELTA_LIMIT_BYTES } from "@/lib/utils/battle/pipeline/limits";
import { applyResistance, hasImmunity } from "@/lib/utils/battle/resistance";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { PATCHABLE_PARTICIPANT_FIELDS } from "@/lib/utils/battle/store/participant-patch";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";
import { rollDiceList } from "@/lib/utils/common/dice";


const url = process.env.DATABASE_URL ?? "";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("❌ simulate-battle працює лише з локальною БД (DATABASE_URL на localhost).");
  process.exit(1);
}

let actingUser = SIM_USER.id;

let quiet = false;

const rolls: number[] = [];

const die = (face: number, sides: number) => (face - 0.5) / sides;

const deps: PipelineDeps = {
  getUserId: async () => actingUser,
  rateLimit: async () => ({ allowed: true, count: 0, limit: 1_000, resetInSeconds: 0 }) as never,
  loadBattle: (args) => loadBattle(prisma, args),
  saveBattle: (before, outcome) => saveBattle(prisma, before, outcome),
  loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
  publish: () => {},
  rng: () => rolls.shift() ?? 0.5,
};

// ---------- перевірки ----------

const results: Array<{ ok: boolean; name: string; detail: string }> = [];

function check(name: string, ok: boolean, detail = "") {
  results.push({ ok, name, detail });
  console.info(`   ${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------- seed ----------

async function seed() {
  await prisma.campaign.deleteMany({ where: { name: SIM_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });
  await prisma.user.upsert({ where: { id: SIM_USER.id }, update: {}, create: SIM_USER });
  await prisma.user.upsert({ where: { id: SIM_PLAYER.id }, update: {}, create: SIM_PLAYER });

  const campaign = await prisma.campaign.create({ data: { name: SIM_CAMPAIGN_NAME, inviteCode: `SIM-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_USER.id, role: CampaignRole.DM } });
  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_PLAYER.id, role: CampaignRole.PLAYER } });

  const raceIds: Record<string, string> = {};

  for (const [key, r] of Object.entries(RACES)) {
    raceIds[key] = (await prisma.race.create({ data: { campaignId, ...r } as Prisma.RaceUncheckedCreateInput })).id;
  }

  const mainSkill = await prisma.mainSkill.create({ data: { campaignId, name: "Бойове мистецтво", color: "#c00" } });

  const skills: Record<string, string> = {};

  for (const [key, s] of Object.entries(SKILLS)) {
    const row = await prisma.skill.create({
      data: { campaignId, mainSkillId: mainSkill.id, name: s.name, abilities: s.abilities as unknown as Prisma.InputJsonValue },
    });

    skills[key] = row.id;
  }

  const spell = await prisma.spell.create({
    data: { campaignId, name: "Вогняна стріла", level: 1, type: "target", damageType: "damage", dice: 1, targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }] },
  });

  const set = await prisma.artifactSet.create({ data: { campaignId, ...DRAGON_SET } });

  const art: Record<string, string> = {};

  for (const [key, a] of Object.entries(artifactRows(campaignId, set.id))) {
    art[key] = (await prisma.artifact.create({ data: a as Prisma.ArtifactUncheckedCreateInput })).id;
  }

  const treeFor = async (race: string, branch: { levels?: Partial<Record<"basic" | "advanced" | "expert", string>>; outer: string[]; middle?: string[] }, racial?: { basic: string }) => {
    const row = await prisma.skillTree.create({ data: { campaignId, race, skills: {} } });

    const json = buildTreeJson({ id: row.id, race, branches: [{ id: mainSkill.id, name: mainSkill.name, color: mainSkill.color, ...branch }], racial });

    await prisma.skillTree.update({ where: { id: row.id }, data: { skills: json as unknown as Prisma.InputJsonValue } });

    return row.id;
  };

  const dwarfTree = await treeFor("Дварф", { outer: [skills.rage, skills.undying, skills.ironSkin] });

  const elfTree = await treeFor("Ельф", { levels: { basic: skills.hunterEye }, outer: [skills.bleed, skills.secondWind] }, { basic: skills.forestStep });

  const levels = ["basic", "advanced", "expert"].map((l) => branchLevelNodeId(mainSkill.id, l as "basic"));

  const progress = (treeId: string, ids: string[]) => ({ [treeId]: { unlockedSkills: [...levels, ...ids] } });

  const base = { campaignId, type: "player", controlledBy: SIM_PLAYER.id, class: "Fighter" };

  const chars = {
    thorin: await prisma.character.create({
      data: { ...base, name: "Торін", race: "Дварф", level: 5, strength: 16, dexterity: 12, constitution: 16, armorClass: 16, initiative: 1, skillTreeProgress: progress(dwarfTree, [skills.rage, skills.undying, skills.ironSkin]) },
    }),
    lyra: await prisma.character.create({
      data: { ...base, class: "Ranger", name: "Ліра", race: "Ельф", level: 4, morale: 2, dexterity: 18, armorClass: 14, initiative: 4, skillTreeProgress: progress(elfTree, [skills.bleed, skills.secondWind, racialNodeId("basic")]) },
    }),
    myron: await prisma.character.create({
      data: { ...base, class: "Wizard", name: "Мирон", race: "Людина", level: 3, morale: -2, intelligence: 17, armorClass: 12, initiative: 2, immunities: ["контроль"], knownSpells: [spell.id], spellSlots: { "1": { max: 2, current: 2 } } },
    }),
  };

  await prisma.characterInventory.create({ data: { characterId: chars.thorin.id, equipped: { mainHand: art.sword, finger1: art.ring } } });
  await prisma.characterInventory.create({ data: { characterId: chars.lyra.id, equipped: { mainHand: art.bow, neck: art.amulet, shoulders: art.cloak } } });
  await prisma.characterInventory.create({ data: { characterId: chars.myron.id, equipped: { mainHand: art.dagger } } });

  const units: Record<string, string> = {};

  for (const [key, { raceKey, ...u }] of Object.entries(UNITS)) {
    units[key] = (await prisma.unit.create({ data: { campaignId, ...u, raceId: raceKey ? raceIds[raceKey] : null } as Prisma.UnitUncheckedCreateInput })).id;
  }

  const battle = await prisma.battleScene.create({
    data: {
      campaignId,
      name: "Засідка в ущелині",
      status: "prepared",
      participants: [
        { id: chars.thorin.id, type: ParticipantSourceType.CHARACTER, side: "ally" },
        { id: chars.lyra.id, type: ParticipantSourceType.CHARACTER, side: "ally" },
        { id: chars.myron.id, type: ParticipantSourceType.CHARACTER, side: "ally" },
        { id: units.goblin, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 2 },
        { id: units.shaman, type: ParticipantSourceType.UNIT, side: "enemy" },
        { id: units.golem, type: ParticipantSourceType.UNIT, side: "enemy" },
      ],
      currentRound: 1,
      currentTurnIndex: 0,
    },
  });

  return { campaignId, battleId: battle.id, spellId: spell.id, chars, units, art, setId: set.id };
}

// ---------- виклик мутацій ----------

type Ctx = Awaited<ReturnType<typeof seed>>;

let ctx: Ctx;

let state: BattleScene;

const log: BattleAction[] = [];

const deltas: Array<{ label: string; bytes: number; fullParticipants: number; refetch: boolean }> = [];

async function readState(): Promise<BattleScene> {
  const res = await runBattleMutation(
    new Request("http://localhost/battle"),
    {
      params: { id: ctx.campaignId, battleId: ctx.battleId },
      access: "member",
      dryRun: () => true,
      includeRecentEvents: BATTLE_LOG_RECENT_EVENTS,
      mutate: (c) => ({ participants: c.participants, pending: c.pending, events: [] }),
    },
    deps,
  );

  return (await res.json()) as BattleScene;
}

async function call<T>(label: string, options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown = {}, as?: string): Promise<{ status: number; body: Record<string, unknown> }> {
  actingUser = as ?? (state && current()?.basicInfo.side === "ally" && options.access !== "dm" ? SIM_PLAYER.id : SIM_USER.id);

  const req = new Request(`http://localhost/api/campaigns/${ctx.campaignId}/battles/${ctx.battleId}/${label}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const res = await runBattleMutation(req, { ...options, params: { id: ctx.campaignId, battleId: ctx.battleId } } as RunBattleMutationOptions<T>, deps);

  const json = (await res.json()) as Record<string, unknown>;

  if (res.status === 200 && "delta" in json) {
    const { delta } = json as unknown as BattleMutationResponse;

    const applied = state ? applyBattleDelta(state, delta) : "refetch";

    deltas.push({ label, bytes: Buffer.byteLength(JSON.stringify(delta), "utf8"), fullParticipants: delta.upserted.length, refetch: applied === "refetch" });

    state = applied === "refetch" ? await readState() : applied;

    for (const e of delta.log) {
      if (!log.some((l) => l.actionIndex === e.actionIndex)) log.push(e);

      if (!quiet) console.info(`   📜 [р${e.round}] ${e.resultText}`);
    }
  } else if (res.status === 200) {
    state = await readState();
  } else {
    if (!quiet) console.info(`   ⛔ ${label}: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  }

  return { status: res.status, body: json };
}

const by = (name: string) => {
  const p = state.initiativeOrder.find((x) => x.basicInfo.name === name);

  if (!p) throw new Error(`Учасник «${name}» не знайдений: ${state.initiativeOrder.map((x) => x.basicInfo.name).join(", ")}`);

  return p;
};

const current = () => state.initiativeOrder[state.currentTurnIndex];

const hp = (p: BattleParticipant) => p.combatStats.currentHp;

const effectNames = (p: BattleParticipant) => p.battleData.activeEffects.map((e) => e.name);

function printState(title: string) {
  console.info(`\n── ${title} (раунд ${state.currentRound}, хід: ${current()?.basicInfo.name}) ──`);
  for (const p of state.initiativeOrder) {
    const fx = effectNames(p);

    console.info(
      `   ${p.basicInfo.side === "ally" ? "🛡" : "👹"} ${p.basicInfo.name.padEnd(18)} HP ${String(hp(p)).padStart(3)}/${p.combatStats.maxHp}  AC ${p.combatStats.armorClass}  STR ${p.abilities.strength}  ${p.combatStats.status ?? ""}${fx.length ? `  [${fx.join(", ")}]` : ""}`,
    );
  }
}

// ---------- сценарій ----------

const START = { access: "dm" as const, requireStatus: "prepared" as const, mutate: createStartMutation() };

const NEXT = { access: "currentController" as const, requireStatus: "active" as const, mutate: nextTurnMutation };

const summonDeps = { loadPool: async (campaignId: string) => ({ units: await prisma.unit.findMany({ where: { campaignId } }), races: await prisma.race.findMany({ where: { campaignId } }) }) };

const ATTACK = { access: "member" as const, requireStatus: "active" as const, schema: attackBodySchema, mutate: createAttackMutation(summonDeps) };

const BONUS = { access: "member" as const, requireStatus: "active" as const, schema: bonusActionSchema, mutate: createBonusActionMutation(summonDeps) };

const ABILITY = { access: "member" as const, requireStatus: "active" as const, schema: abilityActionSchema, mutate: createAbilityActionMutation(summonDeps) };

const SPELL = { access: "member" as const, requireStatus: "active" as const, schema: spellSchema, dryRun: (b: { preview?: boolean }) => b.preview === true, mutate: createSpellMutation({ loadSpell: (id) => prisma.spell.findUnique({ where: { id } }), ...summonDeps }) };

const ROLLBACK = { access: "dm" as const, schema: rollbackSchema, mutate: createRollbackMutation() };

const MORALE = { access: "member" as const, requireStatus: "active" as const, schema: moraleCheckSchema, respond: "wrapped" as const, mutate: moraleCheckMutation };

const RACE_PASSIVES_CAMPAIGN_NAME = "SIM: расові пасивки";

async function racePassivesCheck() {
  console.info("\n🧬 Расові пасивки: учасник з персонажа кожної раси");
  await prisma.campaign.deleteMany({ where: { name: RACE_PASSIVES_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

  const campaign = await prisma.campaign.create({ data: { name: RACE_PASSIVES_CAMPAIGN_NAME, inviteCode: `SIMR-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  const build = async (name: string, data: Record<string, unknown>) => {
    await prisma.race.create({ data: { campaignId, name, ...data } as Prisma.RaceUncheckedCreateInput });

    const hero = await prisma.character.create({ data: { campaignId, type: "player", controlledBy: SIM_PLAYER.id, name, class: "Воїн", race: name, level: 5, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 12, initiative: 0 } });

    return createBattleParticipantFromCharacter({ ...hero, inventory: null }, "b1", ParticipantSide.ALLY);
  };

  const base = await build("Без раси", {});

  const armor = (p: BattleParticipant) => statWithModifiers([p], p.basicInfo.id, "armor", p.combatStats.armorClass);

  for (const race of buildLibrary().races) {
    const data = racePassiveData(race);

    const p = await build(race.name, { passiveAbility: data.passiveAbility as Prisma.InputJsonValue, abilities: data.abilities as unknown as Prisma.InputJsonValue });

    const keys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

    check(`${race.name}: бонуси характеристик у учаснику`, keys.every((k) => p.abilities[k] - base.abilities[k] === (race.passive.stats[k] ?? 0)), keys.map((k) => p.abilities[k] - base.abilities[k]).join("/"));

    if (race.key === "dwarves") check("Гноми: AC +1", armor(p) === armor(base) + 1, `${armor(base)} → ${armor(p)}`);

    if (race.key === "demons") check("Демони: опір вогню 50 %", applyResistance(p, 20, "fire").finalDamage === 10);

    if (race.key === "necromancers") check("Некроманти: мораль завжди 0, імунітет до отрути", hasImmunity(p, "poison") && effectiveMorale({ ...p, combatStats: { ...p.combatStats, morale: -2 } }, [p]).value === 0);

    if (race.key === "mages") check("Маги: опір шкоді заклять 15 %", applyResistance(p, 20, "magic", { fromSpell: true }).finalDamage === 17);

    if (race.key === "elves") check("Ельфи: +1 до влучання всіх атак", collectModifiers([p], p.basicInfo.id, { stat: "attackBonus" }).flat === 1);

    if (race.key === "humans") check("Люди: +1 мораль союзникам на 2 раунди на старті", effectiveMorale(runAbilities([p], { type: "battleStart" }, { round: 1, rng: () => 0.5 }).participants[0], [p]).value === 1);
  }
}

async function main() {
  console.info("🌱 Створюю тестову кампанію…");
  ctx = await seed();
  console.info(`   кампанія ${ctx.campaignId}, бій ${ctx.battleId}`);

  state = await readState();

  console.info("\n⚔️  Старт бою");
  await call("start", START);
  printState("Після старту");

  await scenario();

  await fairBattleRuns();

  await newMechanics();

  await racialMechanics();

  await spellModel();

  await racePassivesCheck();

  const failed = results.filter((r) => !r.ok);

  console.info(`\n${failed.length === 0 ? "✅" : "❌"} Перевірок: ${results.length}, провалено: ${failed.length}`);
  for (const f of failed) console.info(`   ❌ ${f.name} — ${f.detail}`);
  console.info(`\nБій лишився в локальній БД: /campaigns/${ctx.campaignId}/battles/${ctx.battleId}`);

  await prisma.$disconnect();
  process.exit(failed.length === 0 ? 0 : 1);
}

const lastEvent = () => log[log.length - 1];

const logSince = (from: number) => log.filter((e) => e.actionIndex > from);

const lastIndex = () => log.reduce((m, e) => Math.max(m, e.actionIndex), 0);

async function until(name: string) {
  for (let i = 0; i < 12 && current()?.basicInfo.name !== name; i++) await call("next-turn", NEXT);

  if (current()?.basicInfo.name !== name) throw new Error(`Не дійшли до ходу ${name}`);
}

async function setHp(name: string, currentHp: number) {
  const id = by(name).basicInfo.id;

  await call("participants", { access: "dm", requireStatus: "active", schema: patchParticipantSchema, mutate: (c, b) => patchParticipantMutation(c, id, b as never) }, { currentHp }, SIM_USER.id);
}

async function attack(attacker: string, target: string, d20: number, damageRolls: number[], endTurn = false) {
  const before = lastIndex();

  const r = await call("attack", ATTACK, { attackerId: by(attacker).basicInfo.id, targetId: by(target).basicInfo.id, d20Roll: d20, damageRolls, endTurn });

  const ev = logSince(before).find((e) => e.actionType === "attack");

  return { status: r.status, ev, details: ev?.actionDetails, events: logSince(before) };
}

const abilityKeysOf = (p: BattleParticipant) => (p.battleData.resolvedAbilities ?? []).map((a) => `${a.name}:${a.trigger.event}`);

async function scenario() {
  console.info("\n🔎 Побудова учасників");

  const thorin = by("Торін");

  check("Кільце сили запечене в силу Торіна (16 → 18)", thorin.abilities.strength === 18, `STR ${thorin.abilities.strength}`);
  check("Торін має скіли з нового формату", ["Лють берсерка:passive", "Невмирущий:lethalDamage", "Залізна шкіра:passive"].every((k) => abilityKeysOf(thorin).includes(k)), abilityKeysOf(thorin).join(", "));
  check(
    "Раса Дварф (опис пасивки) дає імунітет до отрути як resistance 100",
    (thorin.battleData.resolvedAbilities ?? []).some((a) => a.effects.some((e) => e.kind === "flag" && e.flag === "resistance" && /poison|отру/i.test(e.damageType) && e.percent === 100)),
    abilityKeysOf(thorin).join(", "),
  );
  check("Ліра отримала вміння повного сету", abilityKeysOf(by("Ліра")).includes("Аура дракона:passive"), abilityKeysOf(by("Ліра")).join(", "));
  check("Ельфійська стійкість (раса) у Ліри", abilityKeysOf(by("Ліра")).includes("Ельфійська стійкість:passive"));
  check(
    "Дерево Ліри: рівень гілки (levelSkillIds, назва без рівня) і расовий вузол діють у бою",
    ["Око мисливця:passive", "Лісовий крок:passive"].every((k) => abilityKeysOf(by("Ліра")).includes(k)),
    abilityKeysOf(by("Ліра")).join(", "),
  );
  check("Голем: імунітети стали прапорцями", (by("Кам'яний голем #1").battleData.resolvedAbilities ?? []).some((a) => a.effects.some((e) => e.kind === "flag" && e.flag === "conditionImmunity")));
  check("Раса юніта — з races за raceId", by("Гоблін-лучник #1").abilities.race === "Орк" && by("Кам'яний голем #1").abilities.race === "", `${by("Гоблін-лучник #1").abilities.race} / ${by("Кам'яний голем #1").abilities.race}`);
  check("Атака зброї Торіна з артефакту (1d8 slashing)", by("Торін").battleData.attacks.some((a) => a.damageDice === "1d8" && a.damageType === "slashing"), JSON.stringify(by("Торін").battleData.attacks.map((a) => [a.name, a.damageDice, a.damageType])));

  console.info("\n🎲 Раунд 1");
  await until("Ліра");

  check("ignoreMorale: Лірі з моральлю +2 перевірка не потрібна", !needsMoraleCheck(by("Ліра"), state.initiativeOrder, state.pendingMoraleCheck), `мораль ${by("Ліра").combatStats.morale}`);

  const lyraMorale = await call("morale-check", MORALE, { participantId: by("Ліра").basicInfo.id, d10Roll: 10 });

  check("ignoreMorale: d10 = 10 не дає додаткового ходу", ((lyraMorale.body.response as { moraleResult?: unknown } | undefined)?.moraleResult as { hasExtraTurn?: boolean } | undefined)?.hasExtraTurn === false, JSON.stringify(lyraMorale.body.response ?? lyraMorale.body).slice(0, 200));

  const lyraHit = await attack("Ліра", "Орк-шаман #1", 17, [5]);

  check("Ліра влучає в шамана", lyraHit.details?.isHit === true, lyraHit.ev?.resultText ?? "");
  check("Аура шамана: AC шамана 11 + 1 = 12", lyraHit.details?.targetAC === 12, `targetAC ${lyraHit.details?.targetAC}`);
  check("Кровопускання наклало DOT на шамана", effectNames(by("Орк-шаман #1")).length > 0, JSON.stringify(by("Орк-шаман #1").battleData.activeEffects.map((e) => [e.name, e.duration])));

  await until("Мирон");

  check("noNegativeMorale: Мирону з моральлю −2 перевірка не потрібна", !needsMoraleCheck(by("Мирон"), state.initiativeOrder, state.pendingMoraleCheck), `мораль ${by("Мирон").combatStats.morale}`);

  const myronMorale = await call("morale-check", MORALE, { participantId: by("Мирон").basicInfo.id, d10Roll: 10 });

  check("noNegativeMorale: d10 = 10 не дає паніки", ((myronMorale.body.response as { moraleResult?: unknown } | undefined)?.moraleResult as { shouldSkipTurn?: boolean } | undefined)?.shouldSkipTurn === false, JSON.stringify(myronMorale.body.response ?? myronMorale.body).slice(0, 200));

  const golemHpBefore = hp(by("Кам'яний голем #1"));

  const beforeSpell = lastIndex();

  const sp = await call("spell", SPELL, { casterId: by("Мирон").basicInfo.id, spellId: ctx.spellId, targetIds: [by("Кам'яний голем #1").basicInfo.id], diceRolls: [5, 6] });

  const spellEv = logSince(beforeSpell).find((e) => e.actionType === "spell");

  check("Мирон (гравець) кастує Вогняну стрілу", sp.status === 200, spellEv?.resultText ?? "");
  check("Лог закляття не показує шкоду, якої не було", !/завдавши/.test(spellEv?.resultText ?? ""), spellEv?.resultText ?? "");
  check("Голем з імунітетом до вогню не отримує шкоди", hp(by("Кам'яний голем #1")) === golemHpBefore, `HP ${golemHpBefore} → ${hp(by("Кам'яний голем #1"))}`);
  check("Слот 1 рівня витрачено (каст гравця)", by("Мирон").spellcasting.spellSlots["1"]?.current === 1, JSON.stringify(by("Мирон").spellcasting.spellSlots));

  await until("Гоблін-лучник #1");

  const foreign = await call("next-turn", NEXT, {}, SIM_PLAYER.id);

  check("Гравець не може завершити хід ворога", foreign.status !== 200, `status ${foreign.status}`);

  const g1 = await attack("Гоблін-лучник #1", "Торін", 12, [4]);

  check("AC Торіна в атаці = 16 + 2 (шкіра) + 1 (аура сету) = 19", g1.details?.targetAC === 19, `targetAC ${g1.details?.targetAC}`);
  check("Гоблін промахується по Торіну (16 < 19)", g1.details?.isHit === false, g1.ev?.resultText ?? "");

  await until("Гоблін-лучник #2");

  const lyraHp0 = hp(by("Ліра"));

  const g2 = await attack("Гоблін-лучник #2", "Ліра", 19, [6]);

  check("AC Ліри = 14 + 1 (аура сету) = 15", g2.details?.targetAC === 15, `targetAC ${g2.details?.targetAC}`);
  check("Гоблін влучає в Ліру", hp(by("Ліра")) < lyraHp0, `HP ${lyraHp0} → ${hp(by("Ліра"))}`);

  await until("Торін");

  const golemHp1 = hp(by("Кам'яний голем #1"));

  const torinHp0 = hp(by("Торін"));

  rolls.push(die(18, 20), die(18, 20), die(6, 6), die(6, 6));

  const t1 = await attack("Торін", "Кам'яний голем #1", 18, [8]);

  const golemRet = t1.events.find((e) => e.actionType === "retaliation");

  check(
    "Відсіч при влучанні: голем відповідає Торіну",
    golemRet?.actorName === "Кам'яний голем #1" && golemRet.actionDetails.isHit === true && hp(by("Торін")) < torinHp0,
    `${golemRet?.resultText ?? "немає події"} → HP ${torinHp0} → ${hp(by("Торін"))}`,
  );

  const dealt = golemHp1 - hp(by("Кам'яний голем #1"));

  check("Торін влучає в голема (AC 14 + аура шамана 1 = 15)", t1.details?.isHit === true && t1.details?.targetAC === 15, `targetAC ${t1.details?.targetAC}`);
  check("Шкода по голему: лють +20%, кам'яне тіло −50%", dealt > 0 && dealt < (t1.details?.totalDamage ?? 999) * 1.2, `${t1.details?.damageBreakdown ?? ""} → −${dealt} HP`);

  await until("Орк-шаман #1");

  const shamanTurn = logSince(0).filter((e) => e.round === 1).map((e) => e.resultText);

  check("На початку ходу шамана тікнув DOT і спрацювало зцілення", shamanTurn.some((t) => /bleed|кров/i.test(t)) && shamanTurn.some((t) => /зцілення|Шаманське/i.test(t)), shamanTurn.slice(-4).join(" | "));
  rolls.push(die(15, 20), die(15, 20));

  const shamanSwing = await attack("Орк-шаман #1", "Мирон", 2, [3]);

  const myronRet = shamanSwing.events.filter((e) => e.actionType === "retaliation");

  check("Відсіч при промаху: Мирон відповідає шаману", shamanSwing.details?.isHit === false && myronRet[0]?.actorName === "Мирон", myronRet.map((e) => e.resultText).join(" | ") || "немає події");
  check(
    "Контратака людини +50% у кроках шкоди відсічі",
    Object.values(myronRet[0]?.actionDetails.damageSteps ?? {}).flat().some((s) => s.label === "Контратака" && s.value === 1.5),
    JSON.stringify(myronRet[0]?.actionDetails.damageSteps ?? {}).slice(0, 200),
  );
  check("Без ланцюжка: на відсіч ніхто не відповідає", myronRet.length === 1, `${myronRet.length} подій відсічі`);

  await until("Кам'яний голем #1");
  await setHp("Торін", 5);
  check("DM змінює HP учасника", hp(by("Торін")) === 5, `HP ${hp(by("Торін"))}`);

  const lethal = await attack("Кам'яний голем #1", "Торін", 18, [6, 6]);

  check("Летальний удар: Невмирущий лишає Торіна з 1 HP", hp(by("Торін")) === 1, `${lethal.ev?.resultText ?? ""} → HP ${hp(by("Торін"))}`);

  console.info("\n🎲 Раунд 2");
  await until("Ліра");

  const lyraHp1 = hp(by("Ліра"));

  const key = (by("Ліра").battleData.resolvedAbilities ?? []).find((a) => a.trigger.event === "bonusAction")?.key ?? "";

  await call("bonus-action", BONUS, { participantId: by("Ліра").basicInfo.id, abilityKey: key });
  check("Друге дихання лікує Ліру на 5", hp(by("Ліра")) === Math.min(lyraHp1 + 5, by("Ліра").combatStats.maxHp), `HP ${lyraHp1} → ${hp(by("Ліра"))}`);

  const sameTurn = await call("bonus-action", BONUS, { participantId: by("Ліра").basicInfo.id, abilityKey: key });

  check("Друга бонусна дія за той самий хід заборонена", sameTurn.status === 422 && (sameTurn.body as { code?: string }).code === "action_used", `status ${sameTurn.status}`);

  const shamanFx = by("Орк-шаман #1").battleData.activeEffects.length;

  await call("next-turn", NEXT);
  await until("Гоблін-лучник #1");

  const beforeKill = lastIndex();

  await attack("Гоблін-лучник #1", "Торін", 18, [6]);
  check("Другий летальний удар убиває Торіна (Невмирущий лише раз за бій)", hp(by("Торін")) === 0, `HP ${hp(by("Торін"))}, status ${by("Торін").combatStats.status}`);

  console.info("\n⏪ Відкат останньої атаки");

  const killEvent = logSince(beforeKill).find((e) => e.actionType === "attack");

  const rb = await call("rollback", ROLLBACK, { actionIndex: killEvent?.actionIndex ?? 0 });

  check("Відкат повертає Торіна з 1 HP", rb.status === 200 && hp(by("Торін")) === 1, `status ${rb.status}, HP ${hp(by("Торін"))}`);

  console.info("\n🎲 Раунд 3: ліміт «раз за бій»");
  await until("Ліра");

  const lyraHp2 = hp(by("Ліра"));

  const secondBattleUse = await call("bonus-action", BONUS, { participantId: by("Ліра").basicInfo.id, abilityKey: key });

  check("DOT шамана: 2 тики, потім ефект знято", shamanFx >= 0 && log.filter((e) => /bleed шкоди від Кровопускання/.test(e.resultText) && /Орк-шаман/.test(e.resultText)).length === 2 && !effectNames(by("Орк-шаман #1")).includes("Кровопускання"), log.filter((e) => /Кровопускання/.test(e.resultText)).map((e) => `р${e.round}: ${e.resultText}`).join(" | "));
  check("Друге дихання вдруге за бій не лікує (perBattle 1)", secondBattleUse.status !== 200 || hp(by("Ліра")) === lyraHp2, `status ${secondBattleUse.status} ${JSON.stringify(secondBattleUse.body).slice(0, 120)}, HP ${lyraHp2} → ${hp(by("Ліра"))}`);

  console.info("\n🏁 Добиваємо ворогів");
  for (let i = 0; i < 40 && state.status === "active"; i++) {
    const actor = current();

    const foes = state.initiativeOrder.filter((p) => p.basicInfo.side === "enemy" && hp(p) > 0);

    if (actor.basicInfo.side === "ally" && hp(actor) > 0 && foes.length) {
      await setHp(foes[0].basicInfo.name, 1);
      await attack(actor.basicInfo.name, foes[0].basicInfo.name, 19, [1], true);
    }
    else await call("next-turn", NEXT);
  }

  check("Бій завершився перемогою союзників", state.status === "completed", `status ${state.status}`);
  check("Мертві вороги мають 0 HP", state.initiativeOrder.filter((p) => p.basicInfo.side === "enemy").every((p) => hp(p) === 0), state.initiativeOrder.map((p) => `${p.basicInfo.name}:${hp(p)}`).join(", "));

  const reloaded = await loadBattle(prisma, { battleId: ctx.battleId, campaignId: ctx.campaignId, userId: SIM_USER.id });

  const patchable = (p: BattleParticipant | undefined) =>
    p && stableStringify(Object.entries(PATCHABLE_PARTICIPANT_FIELDS).map(([section, fields]) => fields.map((f) => (p[section as keyof BattleParticipant] as unknown as Record<string, unknown>)[f] ?? null)));

  const drifted = (reloaded?.participants ?? []).filter((p) => patchable(p) !== patchable(state.initiativeOrder.find((x) => x.basicInfo.id === p.basicInfo.id)));

  check(
    "Кеш, зібраний із дельт і патчів, збігається з БД (HP, статус, ефекти, прапорці, слоти)",
    !!reloaded && reloaded.scene.version === state.version && drifted.length === 0,
    `version ${reloaded?.scene.version} / ${state.version}; розбіжності: ${drifted.map((p) => p.basicInfo.name).join(", ") || "—"}`,
  );

  const turnDeltas = deltas.filter((d) => d.label === "attack" || d.label === "next-turn");

  check(
    "Атаки й ходи передають учасників лише патчами, без жодного повного GET",
    turnDeltas.every((d) => d.fullParticipants === 0) && deltas.every((d) => !d.refetch),
    `повних учасників: ${turnDeltas.reduce((n, d) => n + d.fullParticipants, 0)}, refetch: ${deltas.filter((d) => d.refetch).length}`,
  );

  const oversized = deltas.filter((d) => d.label !== "start" && d.bytes > PUSHER_DELTA_LIMIT_BYTES);

  check(
    "Усі дельти після старту вміщуються в Pusher",
    oversized.length === 0,
    `макс. ${Math.max(...turnDeltas.map((d) => d.bytes))} B за хід/атаку; завеликі: ${oversized.map((d) => `${d.label} ${d.bytes} B`).join(", ") || "—"}`,
  );
  printState("Фінал");
  void lastEvent;
}

// ---------- рівні бої ----------

const FAIR_SEEDS = [11, 23, 37, 41, 58, 64, 79];

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

async function seedFair() {
  await prisma.campaign.deleteMany({ where: { name: FAIR_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

  const campaign = await prisma.campaign.create({ data: { name: FAIR_CAMPAIGN_NAME, inviteCode: `SIMF-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_USER.id, role: CampaignRole.DM } });
  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_PLAYER.id, role: CampaignRole.PLAYER } });

  const weapons: Record<string, string> = {};

  for (const [key, w] of Object.entries(FAIR_WEAPONS)) {
    weapons[key] = (await prisma.artifact.create({ data: { campaignId, abilities: [], ...w } as Prisma.ArtifactUncheckedCreateInput })).id;
  }

  const heroIds: string[] = [];

  for (const { weapon, ...h } of FAIR_HEROES) {
    const row = await prisma.character.create({ data: { campaignId, type: "player", controlledBy: SIM_PLAYER.id, race: "Людина", level: 4, initiative: 1, ...h } });

    await prisma.characterInventory.create({ data: { characterId: row.id, equipped: { mainHand: weapons[weapon] } } });
    heroIds.push(row.id);
  }

  for (const u of FAIR_UNITS) await prisma.unit.create({ data: { campaignId, ...u } as Prisma.UnitUncheckedCreateInput });

  return { campaignId, heroIds };
}

async function fairRun(seed: number, setup: Array<Record<string, unknown>>, campaignId: string) {
  const rng = mulberry32(seed);

  const battle = await prisma.battleScene.create({ data: { campaignId, name: `Рівний бій ${seed}`, status: "prepared", participants: setup as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0 } });

  ctx = { ...ctx, campaignId, battleId: battle.id };
  state = await readState();
  await call("start", START);

  const scaled = state.initiativeOrder.filter((p) => p.basicInfo.side === "enemy");

  for (let step = 0; step < 400 && state.status === "active"; step++) {
    const actor = current();

    const foes = state.initiativeOrder.filter((p) => p.basicInfo.side !== actor.basicInfo.side && p.combatStats.status === "active" && hp(p) > 0);

    const weapon = actor.battleData.attacks[0];

    if (actor.combatStats.status !== "active" || !weapon || foes.length === 0) {
      await call("next-turn", NEXT);
      continue;
    }

    const formula = heroAttackDamageParts(actor, weapon).formula;

    const d20 = 1 + Math.floor(rng() * 20);

    const res = await call("attack", ATTACK, { attackerId: actor.basicInfo.id, targetId: foes[0].basicInfo.id, d20Roll: d20, damageRolls: rollDiceList(formula, rng), endTurn: true });

    if (res.status !== 200) await call("next-turn", NEXT);
  }

  const heroesWon = state.initiativeOrder.some((p) => p.basicInfo.side === "ally" && hp(p) > 0);

  const lost = state.initiativeOrder.filter((p) => p.basicInfo.side === "ally" && hp(p) <= 0).length;

  const heroes = state.initiativeOrder.filter((p) => p.basicInfo.side === "ally");

  const hpLeft = Math.round((100 * heroes.reduce((n, p) => n + Math.max(0, hp(p)), 0)) / heroes.reduce((n, p) => n + p.combatStats.maxHp, 0));

  return { rounds: state.currentRound, completed: state.status === "completed", heroesWon, lost, hpLeft, scaled };
}

async function fairBattleRuns() {
  console.info("\n⚖️  Рівні бої: 4 героя проти підібраного складу");
  quiet = true;

  const { campaignId, heroIds } = await seedFair();

  const suggestion = await postBalanceResponse(campaignId, { allyParticipants: { characterIds: heroIds, units: [] }, suggest: true });

  const roster = suggestion.suggestedEnemies ?? [];

  console.info(`   сила героїв: DPR ${suggestion.allyStats.dpr} · HP ${suggestion.allyStats.totalHp}`);
  console.info(`   склад: ${roster.map((r) => `${r.name} ×${r.quantity} (×${r.hpMult} HP, ×${r.dmgMult} шкода)`).join(", ")}`);

  const setup = [
    ...heroIds.map((id) => ({ id, type: ParticipantSourceType.CHARACTER, side: "ally" })),
    ...roster.map((r) => ({ id: r.unitId, type: ParticipantSourceType.UNIT, side: "enemy", quantity: r.quantity })),
  ];

  const runs = [];

  for (const seed of FAIR_SEEDS) runs.push(await fairRun(seed, setup, campaignId));

  quiet = false;

  for (const [i, r] of runs.entries()) console.info(`   сід ${FAIR_SEEDS[i]}: ${r.rounds} р., ${r.completed ? (r.heroesWon ? "перемога героїв" : "поразка героїв") : "не завершено"}, полеглих героїв: ${r.lost}, HP героїв лишилось ${r.hpLeft}%`);

  const inRange = runs.filter((r) => r.completed && r.rounds >= 2 && r.rounds <= 6).length;

  const wins = runs.filter((r) => r.completed && r.heroesWon && r.hpLeft >= 40).length;

  const need = runs.length - 1;

  check("Підібраний склад: ворогам виставлено множники HP і шкоди", runs[0].scaled.length > 0 && runs[0].scaled.every((p) => (p.battleData.damageMultiplier ?? 0) > 0 && (p.battleData.hpMultiplier ?? 0) > 0), `${runs[0].scaled.length} ворогів`);
  check("Рівний бій: щонайбільше один прогін поза 2–6 раундами", inRange >= need, `${inRange}/${runs.length}, раунди: ${runs.map((r) => r.rounds).join(", ")}`);
  check("Рівний бій: герої перемагають, лишивши ≥ 40% HP (щонайбільше один виняток)", wins >= need, `${wins}/${runs.length}`);
}

// ---------- нові механіки вмінь ----------

async function newMechanics() {
  const u = (name: string) => `${name} #1`;

  console.info("\n🧪 Нові механіки: мітки, захист, світло на всіх, випереджальний удар, шанс у логу");
  quiet = true;
  log.length = 0;

  await prisma.campaign.deleteMany({ where: { name: MECHANICS_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

  const campaign = await prisma.campaign.create({ data: { name: MECHANICS_CAMPAIGN_NAME, inviteCode: `SIMM-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_USER.id, role: CampaignRole.DM } });

  const group = await prisma.spellGroup.create({ data: { campaignId, name: "Світло" } });

  const light = await prisma.spell.create({
    data: { campaignId, name: "Благословення світла", level: 1, type: "target", damageType: "damage", dice: 1, groupId: group.id, targeting: { kind: "ally" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] },
  });

  const setup: Array<Record<string, unknown>> = [];

  for (const { side, ...u } of MECHANICS_UNITS(group.id)) {
    const row = await prisma.unit.create({ data: { campaignId, ...u } as Prisma.UnitUncheckedCreateInput });

    setup.push({ id: row.id, type: ParticipantSourceType.UNIT, side });
  }

  const battle = await prisma.battleScene.create({ data: { campaignId, name: "Нові механіки", status: "prepared", participants: setup as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0 } });

  ctx = { ...ctx, campaignId, battleId: battle.id };
  state = await readState();
  await call("start", START, {}, SIM_USER.id);

  const reach = async (name: string) => {
    for (let i = 0; i < 14 && current()?.basicInfo.name !== name; i++) await call("next-turn", NEXT, {}, SIM_USER.id);

    if (current()?.basicInfo.name !== name) throw new Error(`Не дійшли до ходу ${name}`);
  };

  const hit = async (attacker: string, target: string, endTurn = false) => {
    await reach(attacker);

    const before = lastIndex();

    const targetHp = hp(by(target));

    const r = await call("attack", ATTACK, { attackerId: by(attacker).basicInfo.id, targetId: by(target).basicInfo.id, d20Roll: 18, damageRolls: [4], endTurn }, SIM_USER.id);

    return { status: r.status, dealt: targetHp - hp(by(target)), events: logSince(before) };
  };

  const hunterId = by(u("Мисливець")).basicInfo.id;

  const h1 = await hit(u("Мисливець"), u("Опудало"), true);

  const h2 = await hit(u("Мисливець"), u("Опудало"), true);

  const h3 = await hit(u("Мисливець"), u("Опудало"));

  quiet = false;
  check("Мітки складаються: три влучання — три мітки на цілі", countMarks(by(u("Опудало")), "seq", hunterId) === 3, `міток: ${countMarks(by(u("Опудало")), "seq", hunterId)}`);
  check("Шкода росте з кількістю міток", h1.dealt > 0 && h2.dealt > h1.dealt && h3.dealt > h2.dealt, `${h1.dealt} → ${h2.dealt} → ${h3.dealt}`);
  check("У лозі видно шанс спрацювання («шанс 100 %»)", log.some((e) => /Азарт.*\(шанс 100 %\)/.test(e.resultText)), log.filter((e) => /шанс/.test(e.resultText)).map((e) => e.resultText).join(" | ") || "немає");
  quiet = true;

  await reach(u("Страж"));

  const guardKey = (by(u("Страж")).battleData.resolvedAbilities ?? []).find((a) => a.trigger.event === "bonusAction")?.key ?? "";

  await call("bonus-action", BONUS, { participantId: by(u("Страж")).basicInfo.id, abilityKey: guardKey, targetParticipantId: by(u("Підопічний")).basicInfo.id }, SIM_USER.id);

  const guardianHp = hp(by(u("Страж")));

  const wardHp = hp(by(u("Підопічний")));

  const beforeGuard = lastIndex();

  await reach(u("Опудало"));
  await call("attack", ATTACK, { attackerId: by(u("Опудало")).basicInfo.id, targetId: by(u("Підопічний")).basicInfo.id, d20Roll: 18, damageRolls: [8], endTurn: true }, SIM_USER.id);

  quiet = false;
  check(
    "Захист ділить шкоду між підопічним і стражем",
    hp(by(u("Страж"))) < guardianHp && hp(by(u("Підопічний"))) < wardHp && logSince(beforeGuard).some((e) => /🛡/.test(e.resultText)),
    `страж ${guardianHp} → ${hp(by(u("Страж")))}, підопічний ${wardHp} → ${hp(by(u("Підопічний")))}`,
  );
  quiet = true;

  const allies = state.initiativeOrder.filter((p) => p.basicInfo.side === "ally");

  for (const p of allies) await setHp(p.basicInfo.name, 5);

  await reach(u("Жрець"));

  const hpBefore = new Map(allies.map((p) => [p.basicInfo.id, hp(by(p.basicInfo.name))]));

  const cast = await call("spell", SPELL, { casterId: by(u("Жрець")).basicInfo.id, spellId: light.id, targetIds: [by(u("Підопічний")).basicInfo.id], diceRolls: [3] }, SIM_USER.id);

  quiet = false;
  check(
    "Світло з режимом «на всіх» зцілює кожного союзника",
    cast.status === 200 && allies.every((p) => hp(by(p.basicInfo.name)) > (hpBefore.get(p.basicInfo.id) ?? 0)),
    `статус ${cast.status}; ${allies.map((p) => `${p.basicInfo.name} ${hpBefore.get(p.basicInfo.id)} → ${hp(by(p.basicInfo.name))}`).join(", ")}`,
  );
  quiet = true;

  const duelistHp = hp(by(u("Дуелянт")));

  const strike = await hit(u("Новачок"), u("Дуелянт"));

  quiet = false;
  check(
    "Випереджальний удар вбиває нападника і скасовує атаку",
    strike.status === 200 && by(u("Новачок")).combatStats.status !== "active" && hp(by(u("Дуелянт"))) === duelistHp && strike.events.some((e) => /Випереджальний удар/.test(e.resultText)),
    `Новачок ${by(u("Новачок")).combatStats.status}, Дуелянт HP ${duelistHp} → ${hp(by(u("Дуелянт")))}`,
  );
}

// ---------- расові механіки ----------

async function racialMechanics() {
  console.info("\n🧬 Расові механіки: ульта, прикликання, підняття, перевага, жага крові, Семгрун, рунна броня");
  quiet = true;
  log.length = 0;

  await prisma.campaign.deleteMany({ where: { name: RACIAL_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

  const campaign = await prisma.campaign.create({ data: { name: RACIAL_CAMPAIGN_NAME, inviteCode: `SIMR-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_USER.id, role: CampaignRole.DM } });

  const demons = await prisma.race.create({ data: { campaignId, ...DEMON_RACE } as Prisma.RaceUncheckedCreateInput });

  await prisma.unit.create({ data: { campaignId, ...DEMON_UNIT, raceId: demons.id } as Prisma.UnitUncheckedCreateInput });

  const setup: Array<Record<string, unknown>> = [];

  for (const { side, ...u } of RACIAL_UNITS) {
    const row = await prisma.unit.create({ data: { campaignId, ...u } as Prisma.UnitUncheckedCreateInput });

    setup.push({ id: row.id, type: ParticipantSourceType.UNIT, side, ...(u.name === "Кістяк" || u.name === "Слабак" ? { quantity: 2 } : {}) });
  }

  const battle = await prisma.battleScene.create({ data: { campaignId, name: "Расові механіки", status: "prepared", participants: setup as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0 } });

  ctx = { ...ctx, campaignId, battleId: battle.id };
  state = await readState();
  await call("start", START, {}, SIM_USER.id);

  const u = (name: string) => `${name} #1`;

  const reach = async (name: string) => {
    for (let i = 0; i < 20 && current()?.basicInfo.name !== name; i++) await call("next-turn", NEXT, {}, SIM_USER.id);

    if (current()?.basicInfo.name !== name) throw new Error(`Не дійшли до ходу ${name}`);
  };

  const again = async (name: string) => {
    await call("next-turn", NEXT, {}, SIM_USER.id);
    await reach(name);
  };

  const keyOf = (name: string, event: string, ability: string) => (by(name).battleData.resolvedAbilities ?? []).find((a) => a.trigger.event === event && a.name === ability)?.key ?? "";

  const idOf = (name: string) => by(name).basicInfo.id;

  const swing = async (attacker: string, target: string, d20: number, extra: { advantageRoll?: number; disadvantageRoll?: number } = {}, endTurn = false) => {
    const before = lastIndex();

    await call("attack", ATTACK, { attackerId: idOf(attacker), targetId: idOf(target), d20Roll: d20, damageRolls: [4], endTurn, ...extra }, SIM_USER.id);

    const ev = logSince(before).find((e) => e.actionType === "attack");

    return { details: ev?.actionDetails, text: ev?.resultText ?? "" };
  };

  for (const name of ["Кістяк #1", "Кістяк #2", "Жертва #1"]) await setHp(name, 0);

  const deadOk = ["Кістяк #1", "Кістяк #2", "Жертва #1"].every((n) => by(n).combatStats.status !== "active");

  await reach(u("Некромант"));

  await call("ability-action", ABILITY, { participantId: idOf(u("Некромант")), abilityKey: keyOf(u("Некромант"), "action", "Підняття мертвих"), targetParticipantIds: [idOf("Кістяк #1"), idOf("Кістяк #2")] }, SIM_USER.id);

  const raised = ["Кістяк #1", "Кістяк #2"].map(by);

  quiet = false;
  check(
    "Підняття мертвих: два полеглі вороги стають союзниками на 90 % HP",
    deadOk && raised.every((p) => p.basicInfo.side === "ally" && p.combatStats.status === "active" && p.combatStats.currentHp === Math.floor((p.combatStats.maxHp * 90) / 100) && p.battleData.summonedBy === idOf(u("Некромант"))),
    raised.map((p) => `${p.basicInfo.name} ${p.basicInfo.side} ${hp(p)}/${p.combatStats.maxHp}`).join(", "),
  );
  quiet = true;

  await again(u("Некромант"));

  await call("ability-action", ABILITY, { participantId: idOf(u("Некромант")), abilityKey: keyOf(u("Некромант"), "action", "Ангел Хранитель"), targetParticipantIds: [idOf("Жертва #1")] }, SIM_USER.id);

  const victim = by("Жертва #1");

  quiet = false;
  check("Ангел Хранитель воскрешає полеглого союзника на 50 % HP", victim.combatStats.status === "active" && hp(victim) === Math.floor(victim.combatStats.maxHp / 2), `HP ${hp(victim)}/${victim.combatStats.maxHp}, ${victim.combatStats.status}`);
  quiet = true;

  const before = state.initiativeOrder.length;

  await call("bonus-action", BONUS, { participantId: idOf(u("Некромант")), abilityKey: keyOf(u("Некромант"), "bonusAction", "Відкриття воріт") }, SIM_USER.id);

  const imp = state.initiativeOrder.find((p) => p.basicInfo.name.startsWith("Біс"));

  quiet = false;
  check("Відкриття воріт прикликає біса на бік некроманта з посиланням на власника", state.initiativeOrder.length === before + 1 && imp?.basicInfo.side === "ally" && imp.battleData.summonedBy === idOf(u("Некромант")), `${imp?.basicInfo.name ?? "немає"} ${imp?.basicInfo.side ?? ""}`);
  quiet = true;

  await reach(u("Мисливець"));
  await call("bonus-action", BONUS, { participantId: idOf(u("Мисливець")), abilityKey: keyOf(u("Мисливець"), "bonusAction", "Полювання"), targetParticipantIds: [idOf(u("Опудало"))] }, SIM_USER.id);

  const lucky = await swing(u("Мисливець"), u("Опудало"), 3, { advantageRoll: 19 });

  quiet = false;
  check("Полювання: атакуючі мічену ціль мають перевагу (d20 3 + перевага 19 влучає)", lucky.details?.isHit === true, lucky.text);
  quiet = true;

  await again(u("Мисливець"));
  await setHp(u("Слабак"), 1);
  await swing(u("Мисливець"), u("Слабак"), 18, {}, true);
  await reach(u("Мисливець"));
  await setHp("Слабак #2", 1);
  await swing(u("Мисливець"), "Слабак #2", 18, {}, true);
  await reach(u("Мисливець"));

  quiet = false;
  check("Жага крові: два вбивства дають 2 додаткові дії на початку наступного ходу", by(u("Мисливець")).battleData.pendingExtraActions === 2, `пул ${by(u("Мисливець")).battleData.pendingExtraActions}`);
  quiet = true;

  const firstSwing = await swing(u("Мисливець"), u("Семгрун"), 18, { disadvantageRoll: 2 });

  const secondSwing = await swing(u("Мисливець"), u("Семгрун"), 18, { disadvantageRoll: 2 });

  quiet = false;
  check("Семгрун: перша атака за раунд з недоліком (промах), друга без нього (влучання)", firstSwing.details?.isHit === false && secondSwing.details?.isHit === true, `${firstSwing.details?.isHit} → ${secondSwing.details?.isHit}`);
  quiet = true;

  await reach(u("Опудало"));

  const bash = await swing(u("Опудало"), u("Некромант"), 18);

  const steps = JSON.stringify(bash.details?.damageSteps ?? {});

  quiet = false;
  check("Рунна броня: опір до всієї шкоди видно в кроках урону", bash.details?.isHit === true && steps.includes("Рунна броня"), steps.slice(0, 160));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

// ---------- нова модель заклинань ----------

async function spellModel() {
  console.info("\n🔮 Нова модель заклинань: кубики за рівнем, рятівний кидок, раси, усі учасники, HOT, Шал, Ляльковод");
  quiet = true;
  log.length = 0;

  await prisma.campaign.deleteMany({ where: { name: SPELL_MODEL_CAMPAIGN_NAME, dmUserId: SIM_USER.id } });

  const campaign = await prisma.campaign.create({ data: { name: SPELL_MODEL_CAMPAIGN_NAME, inviteCode: `SIMS-${Date.now()}`, dmUserId: SIM_USER.id } });

  const campaignId = campaign.id;

  await prisma.campaignMember.create({ data: { campaignId, userId: SIM_USER.id, role: CampaignRole.DM } });

  const human = await prisma.race.create({ data: { campaignId, name: "Люди", abilities: [] } });

  const spell = (name: string, level: number, dice: number, targeting: object, spellEffects: object[], extra: { resolution?: object; raceModifiers?: object[] } = {}) =>
    prisma.spell.create({
      data: { campaignId, name, level, type: "target", damageType: "damage", dice, targeting, resolution: extra.resolution ?? { kind: "auto" }, spellEffects, raceModifiers: extra.raceModifiers ?? [] } as Prisma.SpellUncheckedCreateInput,
    });

  const dmg = (damageType: string, extra: object = {}) => ({ kind: "dealDamage", amount: { spellRoll: 100 }, damageType, ...extra });

  const spells = {
    fireball: await spell("Вогняна куля", 3, 2, { kind: "area", side: "enemy", maxTargets: 4 }, [dmg("fire")], { resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } }),
    wordOfLight: await spell("Слово світла", 5, 2, { kind: "allEnemies" }, [dmg("radiant")], { raceModifiers: [{ raceId: human.id, percent: -100 }] }),
    armageddon: await spell("Армагеддон", 5, 4, { kind: "everyone" }, [dmg("fire")]),
    regeneration: await spell("Регенерація", 2, 1, { kind: "ally" }, [{ kind: "hot", healPerRound: { spellRoll: 100 }, duration: { rounds: 3 } }]),
    frenzy: await spell("Шал", 4, 0, { kind: "enemy" }, [{ kind: "berserk", damageBonusPercent: 50, duration: { rounds: 1 } }]),
    puppeteer: await spell("Ляльковод", 5, 0, { kind: "enemy" }, [{ kind: "charm", duration: { rounds: 1 } }]),
  };

  const setup: Array<Record<string, unknown>> = [];

  for (const { side, ...u } of SPELL_MODEL_UNITS(human.id)) {
    const row = await prisma.unit.create({ data: { campaignId, ...u } as Prisma.UnitUncheckedCreateInput });

    setup.push({ id: row.id, type: ParticipantSourceType.UNIT, side });
  }

  const battle = await prisma.battleScene.create({ data: { campaignId, name: "Нова модель заклинань", status: "prepared", participants: setup as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0 } });

  ctx = { ...ctx, campaignId, battleId: battle.id };
  state = await readState();
  await call("start", START, {}, SIM_USER.id);

  const P = (name: string) => by(`${name} #1`);

  const cast = (caster: string, spellId: string, targets: string[], diceRolls: number[], extra: object = {}) =>
    call("spell", SPELL, { casterId: P(caster).basicInfo.id, spellId, targetIds: targets.map((t) => P(t).basicInfo.id), diceRolls, ...extra }, SIM_USER.id);

  const dice = (caster: string, id: string) => {
    const row = Object.values(spells).find((s) => s.id === id);

    return casterSpellDice(P(caster), { dice: row?.dice ?? 0, groupId: null });
  };

  const hpOf = (name: string) => hp(P(name));

  const nextTurn = () => call("next-turn", NEXT, {}, SIM_USER.id);

  const reachTurn = async (name: string) => {
    for (let i = 0; i < 30 && current()?.basicInfo.name !== `${name} #1`; i++) await nextTurn();

    if (current()?.basicInfo.name !== `${name} #1`) throw new Error(`Не дійшли до ходу ${name}`);
  };

  // кубики: формула залежить від рівня кастера (Архімаг L6: 2 + ⌊6/3⌋ = 4к6 + 6)
  const fireDice = dice("Архімаг", spells.fireball.id);

  const wrongCount = await cast("Архімаг", spells.fireball.id, ["Гоблін А"], [3, 3]);

  const wrongSides = await cast("Архімаг", spells.fireball.id, ["Гоблін А"], Array.from({ length: fireDice.count }, () => 7));

  quiet = false;
  check("Кубики заклинання: неправильна кількість відхиляється (422 invalid_dice)", wrongCount.status === 422 && wrongCount.body.code === "invalid_dice", JSON.stringify(wrongCount.body));
  check("Кубики заклинання: невірні грані відхиляються (422 invalid_dice)", wrongSides.status === 422 && wrongSides.body.code === "invalid_dice", JSON.stringify(wrongSides.body));
  check("Формула кубиків Архімага L6: 4к6", fireDice.count === 4 && fireDice.sides === 6, JSON.stringify(fireDice));
  quiet = true;

  const goblins = ["Гоблін А", "Гоблін Б", "Гоблін В"];

  const before = new Map(goblins.map((g) => [g, hpOf(g)]));

  const fire = await cast("Архімаг", spells.fireball.id, goblins, [4, 4, 4, 4], { saveRolls: [{ participantId: P("Гоблін А").basicInfo.id, roll: 1 }, { participantId: P("Гоблін Б").basicInfo.id, roll: 20 }, { participantId: P("Гоблін В").basicInfo.id, roll: 1 }] });

  const dealt = (g: string) => (before.get(g) ?? 0) - hpOf(g);

  quiet = false;
  check("Вогняна куля: два провалені збереження — повна шкода 16, успішне — половина", fire.status === 200 && dealt("Гоблін А") === 16 && dealt("Гоблін В") === 16 && dealt("Гоблін Б") === 8, `${goblins.map((g) => `${g} −${dealt(g)}`).join(", ")}`);
  quiet = true;

  const enemyHp = new Map(["Гоблін А", "Гоблін Б", "Воїн"].map((g) => [g, hpOf(g)]));

  const word = await cast("Жрець", spells.wordOfLight.id, [], [3, 3, 3]);

  quiet = false;
  check("Слово світла: людина має імунітет, гобліни отримують шкоду", word.status === 200 && hpOf("Воїн") === enemyHp.get("Воїн") && hpOf("Гоблін А") === (enemyHp.get("Гоблін А") ?? 0) - 9, `Воїн ${enemyHp.get("Воїн")} → ${hpOf("Воїн")}, Гоблін А ${enemyHp.get("Гоблін А")} → ${hpOf("Гоблін А")}`);
  check("Слово світла: у логу видно імунітет раси", log.some((e) => /імунітет раси/.test(e.resultText)), log.find((e) => e.actionType === "spell" && /Слово світла/.test(e.resultText))?.resultText ?? "");
  quiet = true;

  const sides = ["Хаотик", "Паладин", "Гоблін А"].map((n) => [n, hpOf(n)] as const);

  const armageddon = await cast("Хаотик", spells.armageddon.id, [], [3, 3, 3, 3, 3]);

  quiet = false;
  check("Армагеддон б'є всіх учасників, включно із заклинателем і його стороною", armageddon.status === 200 && sides.every(([n, h]) => hpOf(n) === h - 15), sides.map(([n, h]) => `${n} ${h} → ${hpOf(n)}`).join(", "));
  quiet = true;

  await setHp("Паладин #1", 10);

  const regen = await cast("Друїд", spells.regeneration.id, ["Паладин"], Array.from({ length: dice("Друїд", spells.regeneration.id).count }, () => 3));

  const hotEffect = P("Паладин").battleData.activeEffects.find((e) => e.hotHeal);

  await reachTurn("Паладин");

  quiet = false;
  check("Регенерація вішає HOT і лікує на початку ходу цілі", regen.status === 200 && !!hotEffect && hpOf("Паладин") === 10 + (hotEffect?.hotHeal?.healPerRound ?? 0), `HOT ${hotEffect?.hotHeal?.healPerRound}, HP ${hpOf("Паладин")}`);
  quiet = true;

  const frenzy = await cast("Чорнокнижник", spells.frenzy.id, ["Лиходій"], []);

  const frenzied = P("Лиходій").battleData.activeEffects.some((e) => e.effects.some((d) => d.type === "berserk"));

  const victims = () => state.initiativeOrder.filter((p) => p.basicInfo.id !== P("Лиходій").basicInfo.id && p.combatStats.status === "active");

  const target = "Воїн";

  const turnBefore = state.initiativeOrder[(state.initiativeOrder.findIndex((p) => p.basicInfo.name === "Лиходій #1") + state.initiativeOrder.length - 1) % state.initiativeOrder.length].basicInfo.name.replace(/ #1$/, "");

  await reachTurn(turnBefore);

  const victimIndex = victims().findIndex((p) => p.basicInfo.name === `${target} #1`);

  const targetHp = hpOf(target);

  rolls.length = 0;
  rolls.push((victimIndex + 0.5) / victims().length, 0.9);

  const beforeFrenzy = lastIndex();

  await nextTurn();

  quiet = false;
  check("Шал: ворог під шалом б'є свого союзника в свій хід", frenzy.status === 200 && frenzied && hpOf(target) < targetHp && logSince(beforeFrenzy).some((e) => /Шал/.test(e.resultText)), `${target} ${targetHp} → ${hpOf(target)}; ${logSince(beforeFrenzy).map((e) => e.resultText).join(" | ").slice(0, 160)}`);
  quiet = true;

  const puppet = await cast("Лялькар", spells.puppeteer.id, ["Маріонетка"], []);

  const charmed = P("Маріонетка").basicInfo;

  // каст посеред ходу діє з наступного ходу цілі
  await nextTurn();
  await reachTurn("Маріонетка");

  const duringTurn = P("Маріонетка").basicInfo.side;


  await nextTurn();

  const returned = P("Маріонетка");

  quiet = false;
  check("Ляльковод: ворог переходить на бік заклинателя під контроль його гравця", puppet.status === 200 && charmed.side === "ally" && charmed.controlledBy === P("Лялькар").basicInfo.controlledBy && duringTurn === "ally", `side ${charmed.side}, controlledBy ${charmed.controlledBy}, у свій хід ${duringTurn}`);
  check("Ляльковод: після 1 раунду юніт повертається на свій бік і до DM", returned.basicInfo.side === "enemy" && returned.basicInfo.controlledBy === "dm" && !returned.battleData.charmReturn && !returned.battleData.activeEffects.some((e) => e.charmOrigin), `side ${returned.basicInfo.side}, controlledBy ${returned.basicInfo.controlledBy}`);
}
