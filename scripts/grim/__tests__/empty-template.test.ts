import { describe, expect, it, vi } from "vitest";

import { EMPTY_GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const h = vi.hoisted(() => ({ ensure: vi.fn(async () => ({ id: "t1", created: true })), makeStore: vi.fn(() => "store") }));

vi.mock("../../seed/seed-library-lib", () => ({ assertSeedTarget: vi.fn() }));
vi.mock("../../srd/lib/load-template", () => ({ ensureSrdTemplate: h.ensure }));
vi.mock("../../srd/lib/template-store", () => ({ makeTemplateStore: h.makeStore }));
vi.mock("@/lib/db", () => ({ prisma: { $disconnect: vi.fn() } }));

describe("grim empty template script", () => {
  it("seeds the official template with the wfrp ruleset under the fixed name", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await import("../empty-template");
    await vi.waitFor(() => expect(h.ensure).toHaveBeenCalled());

    expect(h.makeStore).toHaveBeenCalledWith("Grim d100 (empty)");
    expect(EMPTY_GRIM_TEMPLATE_NAME).toBe("Grim d100 (empty)");
    expect(h.ensure).toHaveBeenCalledWith("store", expect.objectContaining({ rules: WFRP_RULES, credits: "" }));
  });
});
