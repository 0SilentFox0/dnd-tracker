import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { attackBodySchema } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
import { nextTurnMutation } from "@/lib/server/battles/mutations/next-turn/next-turn-mutation";
import { spellSchema } from "@/lib/server/battles/mutations/spell/cast-spell-schema";
import { getBattleOperation } from "@/lib/server/battles/operations";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { at, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleMapConfig, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => mazeMap({ exit: { x: 5, y: 0 }, dark: true, moved: true, ...over }, 6);

const ctx = (map: BattleMapConfig | null, over: Partial<BattleMutationContext> = {}): BattleMutationContext => {
  const base = context({ participants: [at(hero, { x: 0, y: 2 }), at(goblin, { x: 1, y: 2 })], ...over });

  return withMap(base, map);
};

function deps(loaded: BattleMutationContext): PipelineDeps {
  return {
    getUserId: async () => loaded.userId,
    rateLimit: vi.fn(),
    loadBattle: async () => ({ scene: loaded.scene, meta: loaded.meta, participants: loaded.participants, pending: [], isDM: loaded.isDM, isMember: true }),
    saveBattle: async () => ({ version: loaded.scene.version + 1, events: [], upserted: [], fullIds: [] }) as never,
    publish: vi.fn(),
    loadRecentEvents: async () => [],
  };
}

async function call<T>(loaded: BattleMutationContext, options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown) {
  const res = await runBattleMutation(new Request("http://x/api", { method: "POST", body: JSON.stringify(body) }), { ...options, params: { id: "c1", battleId: "b1" } } as RunBattleMutationOptions<T>, deps(loaded));

  return { status: res.status, json: (await res.json()) as { error?: string } };
}

const attackBody = { attackerId: "hero", targetId: "gob", d20Roll: 10 };

const spellBody = { casterId: "hero", spellId: "s1", targetIds: ["gob"] };

describe("темрява в лабіринті", () => {
  it("attack і spell з blockedByMode → 422 «Темрява — ніхто не може діяти», мутація не викликається", async () => {
    for (const [schema, body] of [[attackBodySchema, attackBody], [spellSchema, spellBody]] as const) {
      const mutate = vi.fn();

      const out = await call(ctx(mapOf()), { access: BattleAccess.MEMBER, blockedByMode: true, schema, mutate }, body);

      expect(out).toEqual({ status: 422, json: { code: "action_rejected", error: MAZE_TEXTS.dark } });
      expect(mutate).not.toHaveBeenCalled();
    }
  });

  it("при світлі, без лабіринту чи без blockedByMode — мутація працює", async () => {
    for (const [map, blockedByMode] of [[mapOf({ dark: false }), true], [{ cols: 6, rows: 6, background: null, opacity: 0.3 }, true], [mapOf(), false]] as const) {
      const loaded = ctx(map);

      const mutate = vi.fn(() => ({ participants: loaded.participants, pending: [], events: [] }));

      const out = await call(loaded, { access: BattleAccess.MEMBER, blockedByMode, mutate }, {});

      expect(out.status).toBe(200);
      expect(mutate).toHaveBeenCalledOnce();
    }
  });

  it("власний крок гравця в темряві — відмова; розстановка ДМ — дозволена", () => {
    expect(() => moveMutation(ctx(mapOf()), { participantId: "hero", to: { x: 0, y: 1 } })).toThrow(expect.objectContaining({ code: "action_rejected", message: MAZE_TEXTS.dark }));

    const dm = ctx(mapOf(), { userId: "dm", isDM: true, scene: { ...context().scene, turnIndex: 1 } });

    const out = moveMutation(dm, { participantId: "hero", to: { x: 0, y: 4 } });

    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.position).toEqual({ x: 0, y: 4 });
  });

  it("next-turn у темряві пише «Темрява — хід пропущено» для того, чий хід завершився", () => {
    const out = nextTurnMutation(ctx(mapOf()));

    const skip = out.events.find((e) => e.resultText === MAZE_TEXTS.darkSkip);

    expect(skip).toMatchObject({ actorId: "hero" });
    expect(out.events[0]).toBe(skip);

    expect(nextTurnMutation(ctx(mapOf({ dark: false }))).events.some((e) => e.resultText === MAZE_TEXTS.darkSkip)).toBe(false);
  });
});

const ROOT = join(process.cwd(), "app/api/campaigns/[id]/battles/[battleId]");

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return routes(path);

    return name === "route.ts" ? [path] : [];
  });
}

describe("blockedByMode", () => {
  it("стоїть на всіх діях учасника, але не на русі (ДМ розставляє) і не на next-turn", async () => {
    const definitions = await Promise.all(routes(ROOT).map(async file => {
      const operation = /operation: "([^"]+)"/.exec(readFileSync(file, "utf8"))?.[1];

      if (!operation) return null;

      const definition = await getBattleOperation(operation, { id: "campaign", battleId: "battle", participantId: "participant" });

      return definition.blockedByMode ? relative(ROOT, join(file, "..")) : null;
    }));

    const blocked = definitions.filter((name): name is string => name !== null).sort();

    expect(blocked).toEqual(["ability-action", "attack", "aura-zone", "bonus-action", "core-action", "maze-mark", "morale-check", "spell"]);
  });
});
