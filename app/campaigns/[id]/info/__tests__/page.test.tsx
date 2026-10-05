import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const findMany = vi.fn<(args?: unknown) => Promise<unknown[]>>(async () => [
  {
    id: "s1", name: "Лють", description: null, basicInfo: {}, combatStats: {}, bonuses: {}, skillTriggers: [], mainSkill: null, grantedSpell: null, icon: null, image: null,
    abilities: [{ id: "a", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }],
  },
]);

vi.mock("@/lib/campaigns/access", () => ({ requireCampaignMember: vi.fn(async () => ({ isDM: false })) }));
vi.mock("@/lib/db", () => ({ prisma: { skill: { findMany: (a: unknown) => findMany(a) }, spell: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/components/campaigns/info/InfoReferenceClient", () => ({ InfoReferenceClient: () => null }));

import CampaignInfoPage from "@/app/campaigns/[id]/info/page";
import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";

function findProps(node: ReactNode): Record<string, unknown> | null {
  if (!isValidElement(node)) return null;

  const el = node as ReactElement<{ children?: ReactNode }>;

  if (el.type === InfoReferenceClient) return el.props as Record<string, unknown>;

  const kids = ([] as ReactNode[]).concat(el.props.children ?? []);

  for (const k of kids) {
    const found = findProps(k);

    if (found) return found;
  }

  return null;
}

describe("сторінка info", () => {
  it("віддає гравцям опис умінь замість старих полів", async () => {
    const tree = await CampaignInfoPage({ params: Promise.resolve({ id: "c1" }) });

    const [skill] = (findProps(tree)?.skills ?? []) as Record<string, unknown>[];

    expect(skill.name).toBe("Лють");
    expect(skill).not.toHaveProperty("combatStats");
    expect(skill).not.toHaveProperty("bonuses");
    expect(skill).not.toHaveProperty("skillTriggers");
    expect(skill).not.toHaveProperty("abilities");
    expect(skill.abilitySummary).toEqual([expect.stringMatching(/шкода \(ближня\) \+10%/)]);
  });
});
