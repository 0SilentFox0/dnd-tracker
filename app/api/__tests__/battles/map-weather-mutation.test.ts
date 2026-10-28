import { beforeEach, describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { mapWeatherMutation, mapWeatherSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/map-weather/map-weather-mutation";
import { BattleStatus } from "@/lib/constants/battle";
import { CLEAR_WEATHER_LABEL, WEATHER_KINDS, WEATHER_LABELS } from "@/lib/constants/battle-weather";
import { BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleMapConfig } from "@/types/battle";

const runBattleMutation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/battle/pipeline/run-battle-mutation", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils/battle/pipeline/run-battle-mutation")>()),
  runBattleMutation,
}));

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3, terrain: { "1:1": { kind: "wall" } } };

const ctx = (m: BattleMapConfig | null = map) => {
  const base = context({ participants: [hero, goblin], isDM: true });

  return { ...base, meta: { ...base.meta, map: m } };
};

describe("weather constants", () => {
  it("кожен вид має український підпис, «Ясно» — для null", () => {
    expect(Object.keys(WEATHER_LABELS).sort()).toEqual([...WEATHER_KINDS].sort());
    expect(WEATHER_LABELS.embers).toBe("Вогонь");
    expect(WEATHER_LABELS.crypt).toBe("Гробниця");
    expect(WEATHER_KINDS.at(-1)).toBe("crypt");
    expect(CLEAR_WEATHER_LABEL).toBe("Ясно");
  });
});

describe("map-weather schema", () => {
  it("weather — вид або null; поле обовʼязкове", () => {
    expect(mapWeatherSchema.safeParse({ weather: "storm" }).success).toBe(true);
    expect(mapWeatherSchema.safeParse({ weather: null }).success).toBe(true);
    expect(mapWeatherSchema.safeParse({ weather: "crypt" }).success).toBe(true);
    expect(mapWeatherSchema.safeParse({}).success).toBe(false);
    expect(mapWeatherSchema.safeParse({ weather: "hail" }).success).toBe(false);
  });
});

describe("map-weather mutation", () => {
  it("ставить погоду в карту сцени, решту карти не чіпає, без подій і змін учасників", () => {
    const c = ctx();

    const out = mapWeatherMutation(c, { weather: "snow" });

    expect(out.scene?.map).toEqual({ ...map, weather: "snow" });
    expect(out.events).toEqual([]);
    expect(out.participants).toBe(c.participants);
    expect(out.pending).toBe(c.pending);
  });

  it("null прибирає поле з JSON карти", () => {
    const out = mapWeatherMutation(ctx({ ...map, weather: "fog" }), { weather: null });

    expect(out.scene?.map).toEqual(map);
    expect(out.scene?.map).not.toHaveProperty("weather");
  });

  it("бій без карти — відмова", () => {
    expect(() => mapWeatherMutation(ctx(null), { weather: "rain" })).toThrow(BattleRuleError);
    expect(() => mapWeatherMutation(ctx(null), { weather: "rain" })).toThrow("У цьому бою немає карти");
  });
});

describe("map-weather route", () => {
  beforeEach(() => runBattleMutation.mockReset());

  it("лише ДМ, лише активний бій, власний ліміт частоти", async () => {
    const { POST } = await import("@/app/api/campaigns/[id]/battles/[battleId]/map-weather/route");

    await POST(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "c1", battleId: "b1" }) });

    const { getBattleOperation } = await import("@/lib/server/battles/operations");

    expect(await getBattleOperation("map-weather", { id: "c1", battleId: "b1" })).toMatchObject({ access: BattleAccess.DM, requireStatus: BattleStatus.ACTIVE, rateLimitScope: "mapWeather", schema: mapWeatherSchema, mutate: mapWeatherMutation });
    expect(runBattleMutation).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ operation: "map-weather", params: { id: "c1", battleId: "b1" } }),
    );
  });
});
