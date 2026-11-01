import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import CampaignsPage from "../page";

import { TemplateTiles } from "@/components/campaigns/templates/TemplateTiles";
import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";

const findMany = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser: async () => ({ id: "owner" }) }));
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: (...args: unknown[]) => findMany(...args) } } }));

function tileProps(node: ReactNode): Record<string, unknown> | null {
  if (!isValidElement(node)) return null;

  const element = node as ReactElement<{ children?: ReactNode }>;

  if (element.type === TemplateTiles) return element.props as Record<string, unknown>;

  for (const child of ([] as ReactNode[]).concat(element.props.children ?? [])) {
    const found = tileProps(child);

    if (found) return found;
  }

  return null;
}

describe("campaign owner template tiles", () => {
  it("omits legacy official uk even for its owner while preserving private same-name templates", async () => {
    const srd = { kind: "template", visibility: "official", name: SRD_TEMPLATE_NAME, templateKey: SRD_TEMPLATE_NAME, description: null };

    findMany.mockResolvedValueOnce([{ ...srd, id: "canonical", locale: null }, { ...srd, id: "legacy", locale: "uk" }, { ...srd, id: "private", visibility: "private", locale: "uk" }]).mockResolvedValueOnce([]);

    expect(tileProps(await CampaignsPage())?.templates).toEqual([expect.objectContaining({ id: "canonical" }), expect.objectContaining({ id: "private" })]);
    expect(findMany.mock.calls[0][0].select).toMatchObject({ kind: true, visibility: true });
  });
});
