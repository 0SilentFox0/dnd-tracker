import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { attackBodySchema } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { spellSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import type { BattleMutationContext, PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const maze = (over: Partial<MazeConfig> = {}): MazeConfig => ({ walls: [], exit: { x: 5, y: 0 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: true, moved: true, ...over });

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({ cols: 6, rows: 6, background: null, opacity: 0.3, maze: maze(over) });

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const ctx = (map: BattleMapConfig | null, over: Partial<BattleMutationContext> = {}): BattleMutationContext => {
  const base = context({ participants: [at(hero, { x: 0, y: 2 }), at(goblin, { x: 1, y: 2 })], ...over });

  return { ...base, meta: { ...base.meta, map } };
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
  it("attack і spell з blockedInDark → 422 «Темрява — ніхто не може діяти», мутація не викликається", async () => {
    for (const [schema, body] of [[attackBodySchema, attackBody], [spellSchema, spellBody]] as const) {
      const mutate = vi.fn();

      const out = await call(ctx(mapOf()), { access: BattleAccess.MEMBER, blockedInDark: true, schema, mutate }, body);

      expect(out).toEqual({ status: 422, json: { code: "action_rejected", error: MAZE_TEXTS.dark } });
      expect(mutate).not.toHaveBeenCalled();
    }
  });

  it("при світлі, без лабіринту чи без blockedInDark — мутація працює", async () => {
    for (const [map, blockedInDark] of [[mapOf({ dark: false }), true], [{ cols: 6, rows: 6, background: null, opacity: 0.3 }, true], [mapOf(), false]] as const) {
      const loaded = ctx(map);

      const mutate = vi.fn(() => ({ participants: loaded.participants, pending: [], events: [] }));

      const out = await call(loaded, { access: BattleAccess.MEMBER, blockedInDark, mutate }, {});

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

describe("blockedInDark", () => {
  it("стоїть на всіх діях учасника, але не на русі (ДМ розставляє) і не на next-turn", () => {
    const blocked = routes(ROOT)
      .filter((file) => /blockedInDark:\s*true/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, join(file, "..")))
      .sort();

    expect(blocked).toEqual(["ability-action", "attack", "aura-zone", "bonus-action", "maze-mark", "morale-check", "spell"]);
  });
});
