import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => NextResponse.json({ error: "stop" }, { status: 418 })) }));

import { resolveActor } from "@/lib/utils/api/actor";

const W = { access: "dm", scope: "content:write" };

const CASES: Array<[string, () => Promise<Record<string, unknown>>, string, Record<string, string>, unknown]> = [
  ["units/import", () => import("@/app/api/campaigns/[id]/units/import/route"), "POST", {}, W],
  ["spells/delete-by-level", () => import("@/app/api/campaigns/[id]/spells/delete-by-level/route"), "DELETE", {}, { ...W, sessionOnly: true }],
  ["remove-from-group", () => import("@/app/api/campaigns/[id]/spells/[spellId]/remove-from-group/route"), "POST", { spellId: "s" }, W],
  ["remove-all-spells", () => import("@/app/api/campaigns/[id]/spells/groups/[groupId]/remove-all-spells/route"), "POST", { groupId: "g" }, W],
  ["skills duplicate", () => import("@/app/api/campaigns/[id]/skills/[skillId]/duplicate/route"), "POST", { skillId: "k" }, W],
  ["skill-trees GET", () => import("@/app/api/campaigns/[id]/skill-trees/route"), "GET", {}, { access: "member", scope: "content:read" }],
  ["skill-trees PATCH", () => import("@/app/api/campaigns/[id]/skill-trees/[treeId]/route"), "PATCH", { treeId: "t" }, W],
  ["tracks/order", () => import("@/app/api/campaigns/[id]/tracks/order/route"), "PUT", {}, W],
  ["rules GET", () => import("@/app/api/campaigns/[id]/rules/route"), "GET", {}, { access: "member", scope: "content:read" }],
  ["rules PATCH", () => import("@/app/api/campaigns/[id]/rules/route"), "PATCH", {}, W],
  ["export", () => import("@/app/api/campaigns/[id]/export/route"), "GET", {}, { access: "dm", scope: "content:read" }],
];

describe("нестандартні роути контенту кличуть resolveActor з правильними правами", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(CASES)("%s", async (_name, load, method, extra, need) => {
    const handler = (await load())[method] as (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

    const res = await handler(new Request("http://x", { method, ...(method !== "GET" && { body: "{}" }) }), { params: Promise.resolve({ id: "c1", ...extra }) });

    expect(res.status).toBe(418);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", need);
  });
});
