import { describe, expect, it } from "vitest";

import { pendingFromStored } from "../pending";
import { runWithCritChoice } from "../run-with-crit-choice";
import type { CritTriggerInfo } from "../types";

import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";
import { publicPending } from "@/lib/utils/battle/pipeline/public-pending";
import type { MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const info: CritTriggerInfo = { source: "attack", kind: "success", actorId: "hero", targetId: "gob" };

const ctx = context();

const done = (over: Partial<MutationResult> = {}): MutationResult => ({ participants: ctx.participants, pending: ctx.pending, events: [{ type: "attack", round: 1, resultText: "ok" }], ...over });

const opts = (over: Partial<Parameters<typeof runWithCritChoice>[1]> = {}) => ({
  action: "attack" as const,
  actorId: "hero",
  request: { attackerId: "hero" },
  enabled: true,
  run: ({ crit }: { crit: (i: CritTriggerInfo) => unknown }) => {
    crit(info);

    return done();
  },
  ...over,
});

describe("runWithCritChoice", () => {
  it("прапор off: результат дії без змін, pending немає", async () => {
    const out = await runWithCritChoice(ctx, opts({ enabled: false }));

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingChoice).toBeUndefined();
  });

  it("прапор on і тригер: нічого не застосовано, pending зі seed і request", async () => {
    const out = await runWithCritChoice(ctx, opts());

    expect(out.participants).toBe(ctx.participants);
    expect(out.events).toEqual([]);
    expect(out.response).toEqual({ pendingChoice: true });
    expect(out.scene?.pendingChoice).toMatchObject({
      shown: { action: "attack", actorId: "hero", triggers: [{ ...info, key: "attack:hero:gob:0" }] },
      hidden: { request: { attackerId: "hero" }, seed: expect.any(Number), userId: "user-1", isDM: false },
    });
  });

  it("прапор on без тригерів: звичайний результат", async () => {
    const out = await runWithCritChoice(ctx, opts({ run: () => done() }));

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingChoice).toBeUndefined();
  });

  it("resume: застосовує вибір, очищає pending і детермінований за seed", async () => {
    const picked: unknown[] = [];

    const run = ({ rng, crit }: { rng: () => number; crit: (i: CritTriggerInfo) => unknown }) => {
      picked.push([rng(), crit(info)]);

      return done();
    };

    const resume = { seed: 7, choices: {} };

    const a = await runWithCritChoice(ctx, opts({ resume, run }));

    await runWithCritChoice(ctx, opts({ resume, run }));

    expect(a.scene?.pendingChoice).toBeNull();
    expect(a.events).toHaveLength(1);
    expect(picked[0]).toEqual(picked[1]);
  });

  it("resume: обраний id ефекту потрапляє в picker", async () => {
    let chosen: unknown;

    await runWithCritChoice(ctx, opts({ resume: { seed: 1, choices: { "attack:hero:gob:0": 3 } }, run: ({ crit }) => { chosen = crit(info);

 return done(); } }));

    expect(chosen).toMatchObject({ id: 3 });
  });

  it("скриптовий ctx.rng діє напряму, а повтор за seed від нього не залежить", async () => {
    const seen: number[] = [];

    const run = ({ rng }: { rng: () => number }) => {
      seen.push(rng());

      return done();
    };

    await runWithCritChoice({ ...ctx, rng: () => 0.123 }, opts({ run }));
    await runWithCritChoice({ ...ctx, rng: () => 0.123 }, opts({ resume: { seed: 5, choices: {} }, run }));
    await runWithCritChoice(ctx, opts({ resume: { seed: 5, choices: {} }, run }));

    expect(seen[0]).toBe(0.123);
    expect(seen[1]).toBe(seen[2]);
    expect(seen[1]).not.toBe(0.123);
  });

  it("rules.criticals.disabled* діють у picker", async () => {
    const all = critEffectsFor("attack", "success");

    const rules = { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, disabledSuccess: all.slice(1).map((e) => String(e.id)) } };

    let chosen: unknown;

    await runWithCritChoice({ ...ctx, meta: { ...ctx.meta, rules } }, opts({ run: ({ crit }) => { chosen = crit(info);

 return done(); } }));

    expect(chosen).toBe(all[0]);
  });

  it("publicPending shows only the shown part", () => {
    expect(publicPending({ shown: { action: "spell", actorId: "hero", triggers: [] }, hidden: { request: { secret: 1 }, seed: 5 } })).toEqual({ action: "spell", actorId: "hero", triggers: [] });
    expect(publicPending(null)).toBeNull();
  });

  it("a row stored before the shown/hidden split is wrapped", () => {
    const flat = { action: "spell", actorId: "hero", triggers: [], request: { secret: 1 }, seed: 5, userId: "u", isDM: false };

    expect(pendingFromStored(flat)).toEqual({ shown: { action: "spell", actorId: "hero", triggers: [] }, hidden: flat });
    expect(pendingFromStored(null)).toBeNull();
  });
});
