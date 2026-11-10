import { describe, expect, it, vi } from "vitest";

import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const h = vi.hoisted(() => ({ ensure: vi.fn(async () => ({ id: "t1", created: true })), makeStore: vi.fn(() => "store") }));

vi.mock("../../seed/seed-library-lib", () => ({ assertSeedTarget: vi.fn() }));
vi.mock("../../templates/lib/store", () => ({ ensureTemplate: h.ensure, makeTemplateStore: h.makeStore }));
vi.mock("@/lib/db", () => ({ prisma: { $disconnect: vi.fn() } }));

describe("grim empty template script", () => {
  it("seeds the official template with the wfrp ruleset under the fixed name", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await import("../empty-template");
    await vi.waitFor(() => expect(h.ensure).toHaveBeenCalled());

    expect(h.makeStore).toHaveBeenCalledWith(expect.objectContaining({ key: "grim-d100-empty", names: expect.objectContaining({ en: "Grim d100 (empty)" }) }));
    expect(h.ensure).toHaveBeenCalledWith("store", expect.objectContaining({ rules: WFRP_RULES, credits: "" }));
  });
});
