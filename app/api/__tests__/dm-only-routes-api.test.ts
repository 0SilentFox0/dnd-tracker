import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.hoisted(() => vi.fn());

const findCampaign = vi.hoisted(() => vi.fn());

const touchedModels = vi.hoisted(() => [] as string[]);

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims } }) }));
vi.mock("@/lib/db", () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, model: string) =>
        model === "campaign"
          ? { findUnique: findCampaign }
          : new Proxy(
              {},
              {
                get: () => () => {
                  touchedModels.push(model);

                  throw new Error(`DB touched: ${model}`);
                },
              },
            ),
    },
  ),
}));

import * as artifactSetOne from "@/app/api/campaigns/[id]/artifact-sets/[setId]/route";
import * as artifactSets from "@/app/api/campaigns/[id]/artifact-sets/route";
import * as artifacts from "@/app/api/campaigns/[id]/artifacts/route";
import * as inventory from "@/app/api/campaigns/[id]/characters/[characterId]/inventory/route";
import * as levelUp from "@/app/api/campaigns/[id]/characters/[characterId]/level-up/route";
import * as characters from "@/app/api/campaigns/[id]/characters/route";
import * as mainSkillOne from "@/app/api/campaigns/[id]/main-skills/[mainSkillId]/route";
import * as mainSkills from "@/app/api/campaigns/[id]/main-skills/route";
import * as member from "@/app/api/campaigns/[id]/members/[memberId]/route";
import * as races from "@/app/api/campaigns/[id]/races/route";
import * as duplicateSkill from "@/app/api/campaigns/[id]/skills/[skillId]/duplicate/route";
import * as spellOne from "@/app/api/campaigns/[id]/spells/[spellId]/route";
import * as importSpells from "@/app/api/campaigns/[id]/spells/import/route";
import * as spells from "@/app/api/campaigns/[id]/spells/route";
import * as units from "@/app/api/campaigns/[id]/units/route";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";

type Handler = (req: Request, ctx: never) => Promise<Response>;

const ids = { id: "c1", memberId: "m1", mainSkillId: "ms1", spellId: "sp1", setId: "as1", characterId: "ch1", skillId: "sk1" };

const cases: Array<[string, Handler]> = [
  ["DELETE members/:memberId", member.DELETE],
  ["POST main-skills", mainSkills.POST],
  ["PATCH main-skills/:mainSkillId", mainSkillOne.PATCH],
  ["DELETE main-skills/:mainSkillId", mainSkillOne.DELETE],
  ["POST spells", spells.POST],
  ["PATCH spells/:spellId", spellOne.PATCH],
  ["DELETE spells/:spellId", spellOne.DELETE],
  ["POST spells/import", importSpells.POST],
  ["POST artifact-sets", artifactSets.POST],
  ["PATCH artifact-sets/:setId", artifactSetOne.PATCH],
  ["DELETE artifact-sets/:setId", artifactSetOne.DELETE],
  ["POST artifacts", artifacts.POST],
  ["PATCH characters/:characterId/inventory", inventory.PATCH],
  ["POST characters/:characterId/level-up", levelUp.POST],
  ["POST characters", characters.POST],
  ["POST skills/:skillId/duplicate", duplicateSkill.POST],
  ["POST races", races.POST],
  ["POST units", units.POST],
];

const asRole = (role: string | null) => {
  findCampaign.mockResolvedValue({
    id: "c1",
    maxLevel: 20,
    xpMultiplier: 1,
    members: role ? [{ userId: "u1", role }] : [],
  });
};

describe("DM-операції: гравець і сторонній отримують 403 до будь-якого звернення до БД", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    touchedModels.length = 0;
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
  });

  it.each(cases)("%s — гравцю 403", async (_name, handler) => {
    asRole(CampaignRole.PLAYER);

    const res = await handler(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve(ids) } as never);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: API_ERRORS.FORBIDDEN });
    expect(touchedModels).toEqual([]);
  });

  it.each(cases)("%s — не учаснику 403", async (_name, handler) => {
    asRole(null);

    const res = await handler(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve(ids) } as never);

    expect(res.status).toBe(403);
  });

  it("DM з кривим JSON — 400 { error }, а не 500", async () => {
    asRole(CampaignRole.DM);

    const res = await races.POST(new Request("http://x", { method: "POST", body: "{oops" }), { params: Promise.resolve({ id: "c1" }) } as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: API_ERRORS.INVALID_JSON });
  });

  it("DM з невалідним тілом — 400 з error і issues", async () => {
    asRole(CampaignRole.DM);

    const res = await races.POST(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "c1" }) } as never);

    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(API_ERRORS.INVALID_BODY);
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it.each(cases)("%s — без сесії 401", async (_name, handler) => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const res = await handler(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve(ids) } as never);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: API_ERRORS.UNAUTHORIZED });
  });
});
