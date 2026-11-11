import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { DowntimePeriodInput, DowntimePeriodUndoInput, DowntimeSetInput } from "@/lib/schemas/downtime";
import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadStashState, purseColumns } from "@/lib/server/characters/core/stash-state";
import { characteristicsJson } from "@/lib/server/characters/core/system-fields";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import { writeInventoryLog } from "@/lib/server/inventory/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { toCareerData } from "@/lib/utils/careers/row";
import { characterBaseHp } from "@/lib/utils/characters/hero-hp";
import { applyStashAction, type StashResult } from "@/lib/utils/inventory/stash-actions";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import { MAX_DAYS } from "@/systems/wfrp/rules/downtime/constants";
import { validateEndeavour } from "@/systems/wfrp/rules/downtime/endeavours";
import type { PeriodHero } from "@/systems/wfrp/rules/downtime/plan-period";
import { planPeriod } from "@/systems/wfrp/rules/downtime/plan-period";
import type { Ailment, DowntimeState } from "@/systems/wfrp/rules/downtime/types";
import type { CharacterResources } from "@/types/characters";
import type { DowntimePeriodResult, DowntimeSetResult } from "@/types/downtime";
import type { Purse, StashState } from "@/types/inventory";

type Tx = Prisma.TransactionClient;

type Hero = { id: string; resources: CharacterResources; characteristics: ReturnType<typeof readCharacteristics> };

type Income = { id: string; state: StashState; log: Extract<StashResult, { ok: true }>["log"] };

function downtimeOf(access: CampaignAccessResult) {
  const downtime = ruleSystemOf(access.campaign.rules).downtime;

  if (!downtime) throw new ContentError(API_ERRORS.DOWNTIME_UNSUPPORTED, 409);

  return { planPeriod, validateEndeavour, maxDays: MAX_DAYS };
}

async function loadActiveHeroes(access: CampaignAccessResult, characterIds: string[]) {
  const campaignId = access.campaign.id;

  const ids = [...new Set(characterIds)];

  const rows = await prisma.character.findMany({
    where: { id: { in: ids }, campaignId, status: CharacterStatus.ACTIVE },
    select: { id: true, level: true, constitution: true, archetype: true, characteristics: true },
  });

  if (rows.length !== ids.length) throw new ContentError(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  await assertNotInActiveBattle(campaignId, ids, API_ERRORS.DOWNTIME_IN_BATTLE);

  return { ids, rows };
}

const withoutHp = ({ hp: _hp, ...rest }: CharacterResources): CharacterResources => rest;

const purseOf = (incomes: Income[], id: string): { purse?: Purse } => {
  const income = incomes.find((i) => i.id === id);

  return income ? { purse: income.state.purse } : {};
};

async function saveIncomes(tx: Tx, campaignId: string, actorUserId: string, incomes: Income[]) {
  for (const { id, state } of incomes) await tx.characterInventory.update({ where: { characterId: id }, data: purseColumns(state.purse) });

  await writeInventoryLog(tx, incomes.map(({ id, log }) => ({ campaignId, characterId: id, actorUserId, kind: log.kind, delta: log.delta, note: log.note })));
}

export async function setDowntime(gate: CharacterGate, input: DowntimeSetInput): Promise<DowntimeSetResult> {
  const { access, character } = gate;

  const downtime = downtimeOf(access);

  const campaignId = access.campaign.id;

  if (character.status !== CharacterStatus.ACTIVE) throw new ContentError(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  if (input.ailments && !access.isDM) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  await assertNotInActiveBattle(campaignId, [character.id], API_ERRORS.DOWNTIME_IN_BATTLE);

  const { endeavour } = input;

  if (endeavour?.kind === "tend" && (await prisma.character.count({ where: { id: endeavour.params.patientId, campaignId, status: CharacterStatus.ACTIVE } })) !== 1) throw new ContentError(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const characteristics = readCharacteristics(locked);

    if (endeavour && downtime.validateEndeavour(endeavour, characteristics)) throw new ContentError(API_ERRORS.SKILL_UNTRAINED, 409);

    const prev: DowntimeState = characteristics.downtime ?? { ailments: [] };

    const { endeavour: _old, ...rest } = prev;

    const ailments: Ailment[] = input.ailments ? input.ailments.map((a) => ({ ...a, id: a.id ?? randomUUID() })) : prev.ailments;

    const next: DowntimeState = { ...rest, ...(endeavour ? { endeavour } : {}), ailments };

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson({ ...characteristics, downtime: next }) } });

    return { downtime: next };
  });
}

export async function passPeriod(access: CampaignAccessResult, input: DowntimePeriodInput): Promise<DowntimePeriodResult> {
  const system = downtimeOf(access);

  const { campaign } = access;

  if (!campaign.rules.outOfCombat.persistResources) throw new ContentError(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  if (input.days < 1 || input.days > system.maxDays) throw new ContentError(API_ERRORS.DOWNTIME_DAYS_INVALID, 400);

  const { ids, rows } = await loadActiveHeroes(access, input.characterIds);

  const careerIds = [...new Set(rows.flatMap((c) => readCharacteristics(c).career?.careerId ?? []))];

  const careers = careerIds.length ? await prisma.career.findMany({ where: { id: { in: careerIds }, campaignId: campaign.id } }) : [];

  const careerById = new Map(careers.map((row) => [row.id, row]));

  const statusOf = (c: Hero) => {
    const state = c.characteristics.career;

    const row = state && careerById.get(state.careerId);

    return row ? toCareerData(row).tiers[state.tier - 1]?.status : undefined;
  };

  const periodId = randomUUID();

  return prisma.$transaction(async (tx) => {
    const locked = await lockCharacters(tx, ids);

    const heroes: PeriodHero[] = rows.map((row) => {
      const fresh = locked.get(row.id);

      const hero: Hero = { id: row.id, resources: fresh?.resources ?? {}, characteristics: readCharacteristics(fresh ?? row) };

      return { ...hero, maxHp: characterBaseHp(row, { rules: campaign.rules, characteristics: hero.characteristics }).total, status: statusOf(hero) };
    });

    const planned = system.planPeriod({ heroes, days: input.days, rules: campaign.rules, rng: Math.random, periodId, now: new Date().toISOString() });

    const incomes: Income[] = [];

    if (planned.some((p) => p.coins)) {
      await lockCampaignArtifacts(tx, campaign.id);

      for (const p of planned) {
        if (!p.coins) continue;

        const result = applyStashAction(await loadStashState(tx, p.id), { action: "gain", amount: p.coins.amount, coin: p.coins.coin }, { newItemId: randomUUID() });

        if (!result.ok) throw new ContentError(API_ERRORS.MONEY_OVERFLOW, 409);

        incomes.push({ id: p.id, state: result.state, log: result.log });
      }
    }

    if (incomes.length) await saveIncomes(tx, campaign.id, access.userId, incomes);

    for (const p of planned) await tx.character.update({ where: { id: p.id }, data: { resources: p.resources as Prisma.InputJsonValue, characteristics: characteristicsJson(p.characteristics) } });

    await writeCharacterLog(tx, planned.map((p) => ({ campaignId: campaign.id, characterId: p.id, actorUserId: access.userId, kind: CharacterLogKind.DOWNTIME, data: { periodId, days: input.days, summary: p.summary } })));

    return { periodId, characters: planned.map((p) => ({ id: p.id, resources: p.resources, downtime: p.characteristics.downtime as DowntimeState, ...purseOf(incomes, p.id) })) };
  });
}

export async function undoPeriod(access: CampaignAccessResult, input: DowntimePeriodUndoInput): Promise<DowntimePeriodResult> {
  downtimeOf(access);

  const { campaign } = access;

  const { periodId } = input;

  const { ids } = await loadActiveHeroes(access, input.characterIds);

  const stale = () => new ContentError(API_ERRORS.DOWNTIME_STALE, 409);

  return prisma.$transaction(async (tx) => {
    const locked = await lockCharacters(tx, ids);

    const coinValue = ruleSystemOf(campaign.rules).currency?.value;

    const checked = ids.map((id) => {
      const hero = locked.get(id);

      const d = hero && readCharacteristics(hero).downtime;

      const snapshot = d?.lastPeriod;

      if (!hero || !d || !snapshot || snapshot.id !== periodId) throw stale();

      const sameIds = JSON.stringify([...d.ailments.map((a) => a.id)].sort()) === JSON.stringify([...snapshot.after.ailmentIds].sort());

      if (hero.resources.hp !== snapshot.after.hp || !sameIds || JSON.stringify(d.training) !== JSON.stringify(snapshot.after.training)) throw stale();

      return { id, hero, d, snapshot };
    });

    const incomes: Income[] = [];

    if (checked.some((c) => c.snapshot.coins)) {
      await lockCampaignArtifacts(tx, campaign.id);

      for (const { id, snapshot } of checked) {
        if (!snapshot.coins) continue;

        const result = applyStashAction(await loadStashState(tx, id), { action: "spend", amount: snapshot.coins.amount, coin: snapshot.coins.coin, note: "" }, { newItemId: randomUUID(), coinValue });

        if (!result.ok) throw stale();

        incomes.push({ id, state: result.state, log: result.log });
      }
    }

    if (incomes.length) await saveIncomes(tx, campaign.id, access.userId, incomes);

    const restored = checked.map(({ id, hero, d, snapshot }) => {
      const { before } = snapshot;

      const resources = before.hp === undefined ? withoutHp(hero.resources) : { ...hero.resources, hp: before.hp };

      const downtime: DowntimeState = { ...(d.endeavour ? { endeavour: d.endeavour } : {}), ailments: before.ailments, ...(before.training ? { training: before.training } : {}) };

      return { id, resources, downtime, characteristics: { ...readCharacteristics(hero), downtime } };
    });

    for (const r of restored) await tx.character.update({ where: { id: r.id }, data: { resources: r.resources as Prisma.InputJsonValue, characteristics: characteristicsJson(r.characteristics) } });

    await writeCharacterLog(tx, restored.map((r) => ({ campaignId: campaign.id, characterId: r.id, actorUserId: access.userId, kind: CharacterLogKind.DOWNTIME, data: { periodId, undo: true } })));

    return { periodId, characters: restored.map(({ id, resources, downtime }) => ({ id, resources, downtime, ...purseOf(incomes, id) })) };
  });
}
