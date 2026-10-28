// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("../../TransferArtifactDialog", () => ({ TransferArtifactDialog: () => null }));
vi.mock("../GrantArtifactDialog", () => ({ GrantArtifactDialog: () => null }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: true } } }) }));
vi.mock("@/lib/hooks/characters", () => ({ useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => vi.fn(), useNotify: () => vi.fn() }));

import { StashArtifactsPanel } from "../StashArtifactsPanel";

import type { StashArtifact, StashView } from "@/types/inventory";

const art = (id: string, over: Partial<StashArtifact> = {}): StashArtifact => ({ id, name: id, icon: null, rarity: null, slot: "ring", description: null, ...over });

const view = (artifacts: StashArtifact[], attunement?: StashView["attunement"]): StashView => ({ purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts, ...(attunement && { attunement }) });

afterEach(cleanup);

describe("StashArtifactsPanel: attunement and charges", () => {
  it("counter, badges and the attune action", async () => {
    render(<StashArtifactsPanel view={view([art("ring", { attunement: "required", carried: true, charges: { max: 3, left: 2, rest: null } }), art("ls+ft", { name: "Flame Tongue Longsword", slot: "weapon", attunement: "attuned" })], { used: 1, limit: 3 })} canAct isDM={false} />);

    expect(screen.getByText("Налаштування 1/3")).toBeTruthy();
    expect(screen.getByText("Носиться")).toBeTruthy();
    expect(screen.getByText("Не діє без налаштування")).toBeTruthy();
    expect(screen.getByText("Заряди 2/3")).toBeTruthy();
    expect(screen.getByText("Налаштовано")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ring" }));

    fireEvent.click(screen.getByRole("button", { name: "Зняти налаштування" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "unattune", ref: "ls+ft" }));
  });

  it("HOMM view without attunement data shows none of it", () => {
    render(<StashArtifactsPanel view={view([art("helm", { slot: "helmet" })])} canAct isDM={false} />);

    expect(screen.queryByText(/Налаштування/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Налаштувати" })).toBeNull();
  });
});
