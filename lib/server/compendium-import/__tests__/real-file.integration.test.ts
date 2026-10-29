/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON battle responses */
// Local only: COMPENDIUM_REAL_FILE=<5etools json> DATABASE_URL/DIRECT_URL=<local db with the SRD template> pnpm exec vitest run --config vitest.integration.config.mts <this file>
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { attackBodySchema, castSpellSchema,moveSchema } from "@/lib/schemas/battles";

vi.mock("next/cache", async (original) => ({ ...(await original<object>()), unstable_cache: <T,>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock("@/lib/cache/tags", async (original) => ({ ...(await original<object>()), invalidateReference: vi.fn() }));

import { previewPresentation } from "../presentation";
import { prismaImportRepository } from "../repository";
import { confirmImport, previewImport } from "../service";

import { BATTLE_LOG_RECENT_EVENTS, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { moraleCheckSchema } from "@/lib/schemas";
import { createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { moraleCheckMutation } from "@/lib/server/battles/mutations/morale-check/morale-check-mutation";
import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
import { nextTurnMutation } from "@/lib/server/battles/mutations/next-turn/next-turn-mutation";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { createStartMutation } from "@/lib/server/battles/mutations/start/start-mutation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { cellDistance, parseCellKey } from "@/lib/utils/battle/grid/geometry";
import { baseMovement, reachable, remainingMovement } from "@/lib/utils/battle/grid/path";
import { awaitsMoraleCheck } from "@/lib/utils/battle/morale/awaits-check";
import { loadSpellsFromDb } from "@/lib/utils/battle/spell/load-spells-db";
import { loadBattle, loadRecentEvents, saveBattle } from "@/lib/utils/battle/store";
import { rollDiceList } from "@/lib/utils/common/dice";
import { categoryInventory, projectInput } from "@/lib/utils/compendium-import/flow";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";

const FILE = process.env.COMPENDIUM_REAL_FILE;

const secret = "synthetic-real-file-local-check-secret-0123456789";

const userId = randomUUID();

let campaignId = "";

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

describe.skipIf(!FILE)("real file import", () => {
  beforeAll(async () => {
    if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) throw new Error("local DB only");

    await prisma.user.create({ data: { id: userId, email: `${userId}@real-file.example.test`, displayName: "Real file check DM" } });
    campaignId = (await createCampaignFromBundle({ userId, name: `Real file check ${userId}`, bundle: null })).campaign.id;
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: campaignId, dmUserId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("imports", async () => {
    const root = JSON.parse(readFileSync(FILE as string, "utf8"));

    const base = projectInput(root, categoryInventory(root).filter((c) => c.selected).map((c) => c.kind), { rulesPatch: { classes: { enabled: true } }, allowMixedEdition: true });

    const bare = await previewImport(actor(), base, secret, prismaImportRepository);

    const unresolved = bare.report.rows.flatMap((r) => r.issues.filter((i) => i.code === "UNRESOLVED_REF"));

    console.info("auto-bind: unresolved refs", unresolved.length, "in rows", bare.report.rows.filter((r) => r.issues.some((i) => i.code === "UNRESOLVED_REF")).length, [...new Set(unresolved.map((i) => i.params?.name))].join(", "));

    const { graph } = previewPresentation(base);

    const own = new Set(graph.map((r) => r.key));

    const bindings: NonNullable<typeof base.bindings> = {};

    for (const ref of graph.flatMap((r) => r.refs).filter((r) => r.kind === "spell" && !own.has(r.key) && unresolved.some((i) => i.params?.name === r.name))) {
      bindings[ref.key] = bindings[ref.key] ?? { kind: "spells" as const, id: (await prisma.spell.create({ data: { campaignId, name: ref.name, executionMode: "manual", type: "damage", damageType: "none" } })).id };
    }

    const input = { ...base, bindings };

    const p = await previewImport(actor(), input, secret, prismaImportRepository);

    console.info(JSON.stringify({ ready: p.report.readyToImport, counts: p.report.counts, next: p.report.nextActions.filter((a) => !/^MANUAL_/.test(a.code)).slice(0, 15).map((a) => `${a.code}: ${JSON.stringify(a.params ?? {})}`) }, null, 1));

    const issueCodes = p.report.rows.flatMap((r) => r.issues.map((i) => i.code));

    expect(issueCodes.filter((c) => c.startsWith("MANUAL_SPELL_"))).toEqual([]);

    console.info("optionalfeature: without owner", issueCodes.filter((c) => c === "OPTIONAL_FEATURE_WITHOUT_OWNER").length, "bound progressions", issueCodes.filter((c) => c === "MANUAL_OPTIONAL_FEATURE").length, "manual progressions", issueCodes.filter((c) => c === "MANUAL_OPTIONAL_PROGRESSION").length, "item effects manual", issueCodes.filter((c) => c === "MANUAL_ITEM_EFFECT").length);

    const errs = p.report.rows.flatMap((r) => r.issues.filter((i) => i.severity === "error").map((i) => `${r.kind} ${i.code} ${JSON.stringify(i).slice(0, 260)}`));

    console.info([...new Set(errs)].slice(0, 12).join("\n"));
    expect(p.report.counts.errors).toBe(0);

    const report = await confirmImport(actor(), input, p.token, "real-file", secret, prismaImportRepository);

    console.info(JSON.stringify(report.counts), "units:", await prisma.unit.count({ where: { campaignId } }));

    const artifacts = await prisma.artifact.findMany({ where: { campaignId } });

    const stats = artifacts.map((a) => itemStatsFromRow(a));

    console.info(JSON.stringify({ artifacts: artifacts.length, consumable: stats.filter((i) => i?.consumable).length, nonUnique: stats.filter((i) => i?.unique === false).length, withAbilities: artifacts.filter((a) => Array.isArray(a.abilities) && a.abilities.length > 0).length, weaponBonus: artifacts.filter((a) => JSON.stringify(a.modifiers).includes("damageBonus")).length }));
  }, 300_000);

  it("every monster becomes a participant and fights through the real battle mutations", async () => {
    const units = await prisma.unit.findMany({ where: { campaignId } });

    const hero = await prisma.character.create({ data: { campaignId, type: "player", controlledBy: userId, name: "Check Hero", class: "Fighter", race: "Human", level: 10, strength: 18, constitution: 18, armorClass: 18 } });

    const summonDeps = { loadPool: async (id: string) => ({ units: await prisma.unit.findMany({ where: { campaignId: id } }), races: await prisma.race.findMany({ where: { campaignId: id } }) }) };

    let battleId = "";

    let state: any;

    const issues: string[] = [];

    const stats = new Map<string, { attacks: number; baseCells: number; moved: number; attacked: number; turns: number; flying: boolean; name: string }>();

    const rng = (() => { let a = 7;

 return () => { a = (a + 0x6d2b79f5) | 0;

 let t = Math.imul(a ^ (a >>> 15), 1 | a);

 t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

 return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

    const user = userId;

    const deps: any = { getUserId: async () => user, rateLimit: async () => ({ allowed: true, count: 0, limit: 1e6, resetInSeconds: 0 }), loadBattle: (a: any) => loadBattle(prisma, a), saveBattle: (b: any, o: any) => saveBattle(prisma, b, o), loadRecentEvents: (id: string, l: number) => loadRecentEvents(prisma, id, l), publish: () => {}, rng };

    const call = async (label: string, options: any, body: any = {}) => {
      const req = new Request(`http://localhost/${label}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

      const res = await runBattleMutation(req, { ...options, params: { id: campaignId, battleId } }, deps);

      const json = await res.json();

      return { status: res.status, body: json };
    };

    const read = async () => (await (await runBattleMutation(new Request("http://localhost/b"), { params: { id: campaignId, battleId }, access: "member", dryRun: () => true, includeRecentEvents: BATTLE_LOG_RECENT_EVENTS, mutate: (c: any) => ({ participants: c.participants, pending: c.pending, events: [] }) } as any, deps)).json());

    const START = { access: "dm", requireStatus: "prepared", mutate: createStartMutation() };

    const NEXT = { access: "currentController", requireStatus: "active", mutate: nextTurnMutation };

    const ATTACK = { access: "member", requireStatus: "active", blockedByMode: true, schema: attackBodySchema, mutate: createAttackMutation({ ...summonDeps, loadSpells: loadSpellsFromDb }) };

    const MOVE = { access: "member", requireStatus: "active", respond: "wrapped", schema: moveSchema, mutate: moveMutation };

    const MORALE = { access: "member", requireStatus: "active", blockedByMode: true, schema: moraleCheckSchema, respond: "wrapped", mutate: moraleCheckMutation };

    const alive = (p: any) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

    const P = () => state.initiativeOrder as any[];

    let created = 0;

    const rejections = new Map<string, number>();

    for (let i = 0; i < units.length; i += 6) {
      const chunk = units.slice(i, i + 6);

      const setup = [{ id: hero.id, type: ParticipantSourceType.CHARACTER, side: "ally" }, ...chunk.map((u, k) => ({ id: u.id, type: ParticipantSourceType.UNIT, side: k % 2 ? "ally" : "enemy", quantity: 1 }))];

      battleId = (await prisma.battleScene.create({ data: { campaignId, name: `ТЕСТ real-file ${i}`, status: "prepared", participants: setup as any, map: { cols: 20, rows: 14, background: null, opacity: 0.5 }, currentRound: 1, currentTurnIndex: 0 } })).id;
      state = await read();

      const start = await call("start", START);

      if (start.status !== 200) { issues.push(`start ${chunk.map((u) => u.name).join(",")}: ${start.status} ${JSON.stringify(start.body).slice(0, 200)}`); continue; }

      state = await read();
      created += P().filter((p) => p.basicInfo.sourceType === "unit").length;

      for (const p of P().filter((x) => x.basicInfo.sourceType === "unit")) {
        const flying = JSON.stringify(units.find((u) => u.id === p.basicInfo.sourceId)?.statblock ?? {}).includes('"fly"');

        stats.set(p.basicInfo.id, { attacks: p.battleData.attacks?.length ?? 0, baseCells: baseMovement(p), moved: 0, attacked: 0, turns: 0, flying, name: p.basicInfo.name });
      }

      for (let step = 0; step < 200 && state.status === "active" && state.currentRound <= 4; step++) {
        const actor = P()[state.currentTurnIndex];

        const id = actor.basicInfo.id;

        const st = stats.get(id);

        if (alive(actor)) {
          if (st) st.turns++;

          if (awaitsMoraleCheck({ participants: P(), scene: { turnIndex: state.currentTurnIndex, pendingMoraleCheck: state.pendingMoraleCheck } }, id)) await call("morale-check", MORALE, { participantId: id, d10Roll: 1 + Math.floor(rng() * 10) });

          state = await read();

          const me = () => P().find((p) => p.basicInfo.id === id);

          if (st && me() && alive(me())) {
            const foes = P().filter((x) => x.basicInfo.side !== me().basicInfo.side && alive(x));

            const pos = (p: any) => p.battleData.position;

            const dist = (a: any, b: any) => cellDistance(pos(a), pos(b));

            const foe = foes.sort((a, b) => dist(me(), a) - dist(me(), b))[0];

            const attacks: any[] = me().battleData.attacks ?? [];

            if (foe && attacks.length) {
              const reach = Math.max(1, ...attacks.map((a) => Math.ceil((parseInt(String(a.range ?? "5"), 10) || 5) / 5)));

              if (dist(me(), foe) > reach && remainingMovement(me()) > 0) {
                const cells = reachable(state.map ?? { cols: 20, rows: 14 }, P(), me(), remainingMovement(me()));

                const best = [...cells.keys()].map(parseCellKey).sort((a, b) => cellDistance(a, pos(foe)) - cellDistance(b, pos(foe)))[0];

                const from = pos(me());

                if (best && cellDistance(best, pos(foe)) < dist(me(), foe)) {
                  const mv = await call("move", MOVE, { participantId: id, to: best });

                  if (mv.status === 200) { st.moved++; state = await read(); } else issues.push(`move ${st.name}: ${mv.status} ${JSON.stringify(mv.body).slice(0, 160)} from ${JSON.stringify(from)}`);
                }
              }

              for (const weapon of [...attacks].sort(() => rng() - 0.5)) {
                const target = P().filter((x) => x.basicInfo.side !== me().basicInfo.side && alive(x)).sort((a, b) => dist(me(), a) - dist(me(), b))[0];

                if (!target) break;

                const r = await call("attack", ATTACK, { attackerId: id, targetId: target.basicInfo.id, attackId: weapon.id, d20Roll: 6 + Math.floor(rng() * 15), damageRolls: rollDiceList(weapon.damageDice ?? "", rng), endTurn: false });

                if (r.status === 200) { st.attacked++; break; }

                rejections.set(`${r.status} ${String(r.body?.error ?? "").slice(0, 90)}`, (rejections.get(`${r.status} ${String(r.body?.error ?? "").slice(0, 90)}`) ?? 0) + 1);

                if (!/не поруч|reach|дістає|далеко|range|дальн/i.test(JSON.stringify(r.body))) { issues.push(`attack ${st.name}/${weapon.name}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`); break; }
              }
            }
          }
        }

        state = await read();

        if (state.status === "active" && P()[state.currentTurnIndex]?.basicInfo.id === id) {
          const n = await call("next-turn", NEXT);

          if (n.status !== 200) { issues.push(`next-turn: ${n.status} ${JSON.stringify(n.body).slice(0, 200)}`); break; }

          state = await read();
        }
      }
    }

    await prisma.battleScene.deleteMany({ where: { campaignId } });

    const all = [...stats.values()];

    const byName = new Map(all.map((s) => [s.name, s]));

    const flyers = [...byName.values()].filter((s) => s.flying);

    console.info(JSON.stringify({ units: units.length, participantsCreated: created, withAttacks: [...byName.values()].filter((s) => s.attacks > 0).length, speedPositive: [...byName.values()].filter((s) => s.baseCells > 0).length, flyers: flyers.length, flyersWithSpeed: flyers.filter((s) => s.baseCells > 0).length, flyersMoved: flyers.filter((s) => s.moved > 0).length, attacked: [...byName.values()].filter((s) => s.attacked > 0).length, errors: issues.length, noAttacks: [...byName.values()].filter((s) => s.attacks === 0).map((s) => s.name), zeroSpeed: [...byName.values()].filter((s) => s.baseCells === 0).map((s) => s.name), neverAttacked: [...byName.values()].filter((s) => s.attacks > 0 && s.attacked === 0 && s.turns > 0).map((s) => s.name), neverActed: [...byName.values()].filter((s) => s.turns === 0).map((s) => s.name), rejections: [...rejections], issues: issues.slice(0, 20) }, null, 1));
    expect(issues).toEqual([]);
    expect(created).toBe(units.length);
  }, 600_000);
  it("every native imported spell casts in a battle", async () => {
    const spells = await prisma.spell.findMany({ where: { campaignId, executionMode: "native" } });

    const units = await prisma.unit.findMany({ where: { campaignId }, take: 2 });

    const hero = await prisma.character.create({ data: { campaignId, type: "player", controlledBy: userId, name: "Caster Hero", class: "Wizard", race: "Human", level: 10, intelligence: 18, constitution: 14, armorClass: 14 } });

    const summonDeps = { loadPool: async (id: string) => ({ units: await prisma.unit.findMany({ where: { campaignId: id } }), races: await prisma.race.findMany({ where: { campaignId: id } }) }) };

    const rng = (() => { let a = 11;

 return () => { a = (a + 0x6d2b79f5) | 0;

 let t = Math.imul(a ^ (a >>> 15), 1 | a);

 t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

 return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

    const deps: any = { getUserId: async () => userId, rateLimit: async () => ({ allowed: true, count: 0, limit: 1e6, resetInSeconds: 0 }), loadBattle: (a: any) => loadBattle(prisma, a), saveBattle: (b: any, o: any) => saveBattle(prisma, b, o), loadRecentEvents: (id: string, l: number) => loadRecentEvents(prisma, id, l), publish: () => {}, rng };

    const run = async (battleId: string, options: any, body: any = {}) => {
      const res = await runBattleMutation(new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { ...options, params: { id: campaignId, battleId } }, deps);

      return { status: res.status, body: await res.json() };
    };

    const CAST = { access: "member", requireStatus: "active", blockedByMode: true, schema: castSpellSchema, mutate: createSpellMutation({ ...summonDeps, loadSpell: (id) => prisma.spell.findUnique({ where: { id } }) }, { serverRolls: true }) };

    const mechanic = (s: (typeof spells)[number]) => {
      const r = (s.resolution as any)?.kind ?? "auto";

      const kinds = [...new Set(((s.spellEffects as any[]) ?? []).map((e) => e.kind))].sort().join("+") || "none";

      return `${(s.targeting as any)?.kind ?? "?"}/${r}/${kinds}${s.cost === "reaction" ? "/reaction" : ""}`;
    };

    const byMechanic = new Map<string, { cast: number; errors: number }>();

    const issues: string[] = [];

    let cast = 0;

    for (const spell of spells) {
      const key = mechanic(spell);

      const tally = byMechanic.get(key) ?? { cast: 0, errors: 0 };

      byMechanic.set(key, tally);

      const battleId = (await prisma.battleScene.create({ data: { campaignId, name: `ТЕСТ spell ${spell.name}`.slice(0, 80), status: "prepared", participants: [{ id: hero.id, type: ParticipantSourceType.CHARACTER, side: "ally" }, { id: units[0].id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }, { id: units[1].id, type: ParticipantSourceType.UNIT, side: "ally", quantity: 1 }] as any, map: { cols: 20, rows: 14, background: null, opacity: 0.5 }, currentRound: 1, currentTurnIndex: 0 } })).id;

      const start = await run(battleId, { access: "dm", requireStatus: "prepared", mutate: createStartMutation() });

      if (start.status !== 200) { issues.push(`start ${spell.name}: ${start.status} ${JSON.stringify(start.body).slice(0, 160)}`); tally.errors++; continue; }

      const state: any = await (await runBattleMutation(new Request("http://localhost/b"), { params: { id: campaignId, battleId }, access: "member", dryRun: () => true, includeRecentEvents: BATTLE_LOG_RECENT_EVENTS, mutate: (c: any) => ({ participants: c.participants, pending: c.pending, events: [] }) } as any, deps)).json();

      const order = state.initiativeOrder as any[];

      const me = order.find((p) => p.basicInfo.sourceType === "character");

      const foe = order.find((p) => p.basicInfo.side === "enemy");

      const friend = order.find((p) => p.basicInfo.side === "ally" && p.basicInfo.id !== me.basicInfo.id);

      const at = me.battleData.position;

      const close = (p: any, dx: number) => ({ ...p, battleData: { ...p.battleData, position: { x: at.x + dx, y: at.y } } });

      await run(battleId, { access: "dm", requireStatus: "active", mutate: (c: any) => ({ participants: c.participants.map((p: any) => (p.basicInfo.id === foe.basicInfo.id ? close(p, 1) : p.basicInfo.id === friend.basicInfo.id ? close(p, -1) : p)), pending: c.pending, events: [] }) });
      foe.battleData.position = { x: at.x + 1, y: at.y };

      const kind = (spell.targeting as any)?.kind;

      const ally = kind === "ally" || (spell.targeting as any)?.side === "ally";

      const body = { casterId: me.basicInfo.id, spellId: spell.id, free: true, targetIds: kind === "self" || kind === "template" ? [] : ally ? [friend.basicInfo.id] : [foe.basicInfo.id], ...(kind === "template" && { targetCell: foe.battleData.position }), diceRolls: [] };

      const r = await run(battleId, CAST, body);

      if (r.status === 200) { cast++; tally.cast++; } else { tally.errors++; issues.push(`${spell.name} [${key}]: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`); }
    }

    await prisma.battleScene.deleteMany({ where: { campaignId } });
    console.info(JSON.stringify({ native: spells.length, cast, errors: issues.length, byMechanic: Object.fromEntries(byMechanic), issues: issues.slice(0, 30) }, null, 1));
    expect(issues).toEqual([]);
  }, 600_000);
});
