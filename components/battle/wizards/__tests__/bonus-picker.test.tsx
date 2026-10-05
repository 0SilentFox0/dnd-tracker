// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { BonusActionPicker } from "@/components/battle/wizards/BonusActionPicker";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { ResolvedAbility } from "@/types/abilities";

const heal = { key: "heal", name: "Лікувальний дотик", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d8", target: "eventTarget" }], source: { type: "skill", id: "s", name: "S" } } as ResolvedAbility;

const wind = { key: "wind", name: "Друге дихання", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d10" }], source: { type: "skill", id: "s2", name: "S2" } } as ResolvedAbility;

describe("BonusActionPicker", () => {
  it("уміння без цілі — одразу відправка", async () => {
    const { wrapper, me, bonusAction } = fakeScene({ abilities: [wind] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Друге дихання/ }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "wind" }));
  });

  it("лікування на ціль — список союзників, потім відправка з targetParticipantId", async () => {
    const { wrapper, me, ally, bonusAction } = fakeScene({ abilities: [heal] });

    render(<BonusActionPicker participant={me} open onOpenChange={() => {}} onDone={() => {}} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Лікувальний дотик/ }));
    expect(screen.queryByRole("button", { name: /Гоблін/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(ally.basicInfo.name) }));

    await waitFor(() => expect(bonusAction).toHaveBeenCalledWith({ participantId: me.basicInfo.id, abilityKey: "heal", targetParticipantId: ally.basicInfo.id }));
  });
});
