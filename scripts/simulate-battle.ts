#!/usr/bin/env tsx
/**
 * Наскрізна симуляція бою на локальній БД: створює окрему кампанію з персонажами, юнітами,
 * скілами, артефактами й сетом, а потім проганяє бій через ті самі mutation-функції, що й API
 * (runBattleMutation + loadBattle/saveBattle). Підмінено лише авторизацію, rate-limit і Pusher.
 *
 *   pnpm simulate-battle            # лише локальна БД (localhost)
 */
import type { Prisma } from "@prisma/client";

import { attackBodySchema, attackMutation } from "../app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { bonusActionMutation, bonusActionSchema } from "../app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { moraleCheckMutation } from "../app/api/campaigns/[id]/battles/[battleId]/morale-check/morale-check-mutation";
import { nextTurnMutation } from "../app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { patchParticipantMutation } from "../app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation";
import { patchParticipantSchema } from "../app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-schema";
import { createRollbackMutation, rollbackSchema } from "../app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { spellSchema } from "../app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "../app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { createStartMutation } from "../app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import { prisma } from "../lib/db";
import { moraleCheckSchema } from "../lib/schemas";
import { applyBattleDelta } from "../lib/utils/battle/client/apply-delta";
import { type PipelineDeps, runBattleMutation, type RunBattleMutationOptions } from "../lib/utils/battle/pipeline/run-battle-mutation";
import { loadBattle, loadRecentEvents, saveBattle } from "../lib/utils/battle/store";
import { needsMoraleCheck } from "../lib/utils/battle/view";
import { branchLevelNodeId, buildTreeJson, racialNodeId } from "../lib/utils/skills/progression";
import type { BattleMutationResponse, BattleScene } from "../types/api";
import type { BattleAction, BattleParticipant } from "../types/battle";
import { artifactRows, DRAGON_SET, RACES, SIM_CAMPAIGN_NAME, SIM_PLAYER, SIM_USER, SKILLS, UNITS } from "./simulate-battle-scenario";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";


const url = process.env.DATABASE_URL ?? "";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("❌ simulate-battle працює лише з локальною БД (DATABASE_URL на localhost).");
  process.exit(1);
}

let actingUser = SIM_USER.id;

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
      data: { campaignId, mainSkillId: mainSkill.id, name: s.name, ...("abilities" in s ? { abilities: s.abilities as unknown as Prisma.InputJsonValue } : {}), ...("combatStats" in s ? { combatStats: s.combatStats, skillTriggers: s.skillTriggers } : {}) } as Prisma.SkillUncheckedCreateInput,
    });

    skills[key] = row.id;
  }

  const spell = await prisma.spell.create({
    data: { campaignId, name: "Вогняна стріла", level: 1, type: "target", target: "enemies", damageType: "damage", damageElement: "fire", diceCount: 2, diceType: "d6" },
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

  const dwarfTree = await treeFor("Дварф", { outer: [skills.rage, skills.undying, skills.ironSkin], middle: [skills.legacyGuard] });

  const elfTree = await treeFor("Ельф", { levels: { basic: skills.hunterEye }, outer: [skills.bleed, skills.secondWind] }, { basic: skills.forestStep });

  const levels = ["basic", "advanced", "expert"].map((l) => branchLevelNodeId(mainSkill.id, l as "basic"));

  const progress = (treeId: string, ids: string[]) => ({ [treeId]: { unlockedSkills: [...levels, ...ids] } });

  const base = { campaignId, type: "player", controlledBy: SIM_PLAYER.id, class: "Fighter", proficiencyBonus: 2 };

  const chars = {
    thorin: await prisma.character.create({
      data: { ...base, name: "Торін", race: "Дварф", level: 5, strength: 16, dexterity: 12, constitution: 16, armorClass: 16, maxHp: 40, currentHp: 40, initiative: 1, skillTreeProgress: progress(dwarfTree, [skills.rage, skills.undying, skills.ironSkin, skills.legacyGuard]) },
    }),
    lyra: await prisma.character.create({
      data: { ...base, class: "Ranger", name: "Ліра", race: "Ельф", level: 4, morale: 2, dexterity: 18, armorClass: 14, maxHp: 28, currentHp: 28, initiative: 4, skillTreeProgress: progress(elfTree, [skills.bleed, skills.secondWind, racialNodeId("basic")]) },
    }),
    myron: await prisma.character.create({
      data: { ...base, class: "Wizard", name: "Мирон", race: "Людина", level: 3, morale: -2, intelligence: 17, armorClass: 12, maxHp: 18, currentHp: 18, initiative: 2, immunities: ["контроль"], knownSpells: [spell.id], spellSlots: { "1": { max: 2, current: 2 } } },
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
      initiativeOrder: [],
      battleLog: [],
    },
  });

  return { campaignId, battleId: battle.id, spellId: spell.id, chars, units, art, setId: set.id };
}

// ---------- виклик мутацій ----------

type Ctx = Awaited<ReturnType<typeof seed>>;

let ctx: Ctx;

let state: BattleScene;

const log: BattleAction[] = [];

async function readState(): Promise<BattleScene> {
  const res = await runBattleMutation(
    new Request("http://localhost/battle"),
    {
      params: { id: ctx.campaignId, battleId: ctx.battleId },
      access: "member",
      dryRun: () => true,
      includeRecentEvents: 100,
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

    state = applied === "refetch" ? await readState() : applied;

    for (const e of delta.log) {
      if (!log.some((l) => l.actionIndex === e.actionIndex)) log.push(e);

      console.info(`   📜 [р${e.round}] ${e.resultText}`);
    }
  } else if (res.status === 200) {
    state = await readState();
  } else {
    console.info(`   ⛔ ${label}: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
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

const ATTACK = { access: "member" as const, requireStatus: "active" as const, schema: attackBodySchema, mutate: attackMutation };

const NEXT = { access: "currentController" as const, requireStatus: "active" as const, mutate: nextTurnMutation };

const BONUS = { access: "member" as const, requireStatus: "active" as const, schema: bonusActionSchema, mutate: bonusActionMutation };

const SPELL = { access: "member" as const, requireStatus: "active" as const, schema: spellSchema, dryRun: (b: { preview?: boolean }) => b.preview === true, mutate: createSpellMutation() };

const ROLLBACK = { access: "dm" as const, schema: rollbackSchema, mutate: createRollbackMutation() };

const MORALE = { access: "member" as const, requireStatus: "active" as const, schema: moraleCheckSchema, respond: "wrapped" as const, mutate: moraleCheckMutation };

async function main() {
  console.info("🌱 Створюю тестову кампанію…");
  ctx = await seed();
  console.info(`   кампанія ${ctx.campaignId}, бій ${ctx.battleId}`);

  state = await readState();

  console.info("\n⚔️  Старт бою");
  await call("start", START);
  printState("Після старту");

  await scenario();

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
    "Legacy-скіл Торіна (abilities = NULL) сконвертовано в бою",
    (thorin.battleData.resolvedAbilities ?? []).some((a) => a.effects.some((e) => e.kind === "modifyStat" && e.stat === "armor" && e.flat === 1)),
  );
  check(
    "Раса Дварф (legacy опис) дає імунітет до отрути як resistance 100",
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

  const sp = await call("spell", SPELL, { casterId: by("Мирон").basicInfo.id, spellId: ctx.spellId, targetIds: [by("Кам'яний голем #1").basicInfo.id], damageRolls: [5, 6] });

  const spellEv = logSince(beforeSpell).find((e) => e.actionType === "spell");

  check("Мирон (гравець) кастує Вогняну стрілу", sp.status === 200, spellEv?.resultText ?? "");
  check("Лог закляття не показує шкоду, якої не було", /завдавши 0 урону/.test(spellEv?.resultText ?? ""), spellEv?.resultText ?? "");
  check("Голем з імунітетом до вогню не отримує шкоди", hp(by("Кам'яний голем #1")) === golemHpBefore, `HP ${golemHpBefore} → ${hp(by("Кам'яний голем #1"))}`);
  check("Слот 1 рівня витрачено (каст гравця)", by("Мирон").spellcasting.spellSlots["1"]?.current === 1, JSON.stringify(by("Мирон").spellcasting.spellSlots));

  await until("Гоблін-лучник #1");

  const foreign = await call("next-turn", NEXT, {}, SIM_PLAYER.id);

  check("Гравець не може завершити хід ворога", foreign.status !== 200, `status ${foreign.status}`);

  const g1 = await attack("Гоблін-лучник #1", "Торін", 12, [4]);

  check("AC Торіна в атаці = 16 + 2 (шкіра) + 1 (legacy) + 1 (аура сету) = 20", g1.details?.targetAC === 20, `targetAC ${g1.details?.targetAC}`);
  check("Гоблін промахується по Торіну (16 < 20)", g1.details?.isHit === false, g1.ev?.resultText ?? "");

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

  check("DOT шамана: 2 тики, потім ефект знято", shamanFx >= 0 && log.filter((e) => /bleed урону від Кровопускання/.test(e.resultText) && /Орк-шаман/.test(e.resultText)).length === 2 && !effectNames(by("Орк-шаман #1")).includes("Кровопускання"), log.filter((e) => /Кровопускання/.test(e.resultText)).map((e) => `р${e.round}: ${e.resultText}`).join(" | "));
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

  check(
    "Стан у БД збігається з відповіддю API",
    !!reloaded && reloaded.participants.every((p) => hp(p) === hp(state.initiativeOrder.find((x) => x.basicInfo.id === p.basicInfo.id) as BattleParticipant)),
    `version ${reloaded?.scene.version} / ${state.version}`,
  );
  printState("Фінал");
  void lastEvent;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
