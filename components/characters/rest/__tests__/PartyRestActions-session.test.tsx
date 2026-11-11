// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartyRestActions } from "../PartyRestActions";

import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ system: "wfrp", rest: { mutateOk: vi.fn(async () => true), isPending: false } }));

vi.mock("@/lib/hooks/campaigns", async (orig) => ({ ...(await orig<object>()), useCampaignRules: () => ({ data: { outOfCombat: { persistResources: true, xp: false }, system: { key: h.system } } }) }));
vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useRest: () => h.rest }));
vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useConfirm: () => (o: { onConfirm: () => Promise<void> }) => o.onConfirm() }));

const hero = (id: string) => ({ id, name: id, campaignId: "c", type: "player", controlledBy: "u", level: 1, class: "x", race: "y" }) as CharacterListItem;

describe("PartyRestActions new session", () => {
  afterEach(() => {
    cleanup();
    h.rest.mutateOk.mockClear();
  });

  it("wfrp: shows the session button and sends kind session for everyone", async () => {
    h.system = "wfrp";
    render(<PartyRestActions campaignId="c" characters={[hero("a"), hero("b")]} />);
    fireEvent.click(screen.getByRole("button", { name: "rest.party.session" }));

    await waitFor(() => expect(h.rest.mutateOk).toHaveBeenCalledWith({ kind: "session", characterIds: ["a", "b"] }));
    expect(RULE_SYSTEM_REGISTRY.wfrp.rest.onSession).toBeTypeOf("function");
  });

  it("wfrp: no short/long rest or close-rest buttons", () => {
    h.system = "wfrp";
    render(<PartyRestActions campaignId="c" characters={[{ ...hero("a"), resources: { shortRestOpen: true } } as CharacterListItem]} />);

    expect(screen.queryByRole("button", { name: "rest.party.rest" })).toBeNull();
    expect(screen.queryByRole("button", { name: "rest.party.closeRest" })).toBeNull();
    expect(screen.getByRole("button", { name: "rest.party.session" })).toBeTruthy();
  });

  it("d20: close-rest button shows while a short rest is open", () => {
    h.system = "homm";
    render(<PartyRestActions campaignId="c" characters={[{ ...hero("a"), resources: { shortRestOpen: true } } as CharacterListItem]} />);

    expect(screen.getByRole("button", { name: "rest.party.closeRest" })).toBeTruthy();
  });

  it("d20: no session button", () => {
    h.system = "homm";
    render(<PartyRestActions campaignId="c" characters={[hero("a")]} />);

    expect(screen.queryByRole("button", { name: "rest.party.session" })).toBeNull();
    expect(screen.getByRole("button", { name: "rest.party.rest" })).toBeTruthy();
  });
});
