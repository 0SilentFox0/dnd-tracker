// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("next-intl");
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { RollStep } from "@/components/battle/wizards/attack/RollStep";
import type { AttackWizardModel } from "@/components/battle/wizards/attack/shared";
import { SlotSelect } from "@/components/battle/wizards/spellbook/SlotSelect";
import type { useSpellBook } from "@/lib/hooks/battle";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { textRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";

afterEach(cleanup);

const NAMESPACES = ["common", "validation", "battleWizards"] as const;

const wizard = {
  state: { strikes: [{ targetId: "t" }, { targetId: "u" }], index: 0, inspiration: false },
  view: { cover: new Set(["t"]), rollMode: "advantage", forcedMode: { mode: "advantage", reason: textRef("battleWizards.flow.forced.advantage", { reasons: "x" }) }, inspirationAvailable: true },
  actions: { setMode: vi.fn(), setInspiration: vi.fn(), roll: vi.fn(), back: vi.fn(), aiRoll: vi.fn() },
} as unknown as AttackWizardModel;

const book = {
  view: { slot: { options: [{ key: "1", castLevel: 1, left: 2, label: textRef("battleWizards.flow.slot.circle", { level: 1 }) }, { key: "pact", castLevel: 3, left: 1, label: textRef("battleWizards.flow.slot.pact", { level: 3 }) }], value: "1" } },
  actions: { setSlot: vi.fn() },
} as unknown as ReturnType<typeof useSpellBook>;

describe("attack and spell wizards", () => {
  it("en: roll step and slot select render English without raw keys", async () => {
    await renderWithIntl(<><RollStep wizard={wizard} target={makeParticipant({ id: "t" })} /><SlotSelect book={book} /></>, { locale: "en", namespaces: NAMESPACES });

    expect(screen.getByText("Attack roll · d20")).toBeInTheDocument();
    expect(screen.getByText("Advantage: x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disadvantage" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pact · level 3" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/battleWizards\./);
  });

  it("uk: same screens keep the Ukrainian wording", async () => {
    await renderWithIntl(<><RollStep wizard={wizard} target={makeParticipant({ id: "t" })} /><SlotSelect book={book} /></>, { locale: "uk", namespaces: NAMESPACES });

    expect(screen.getByText("Кидок атаки · d20")).toBeInTheDocument();
    expect(screen.getByText("Перевага: x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Недолік" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Пакт · коло 3" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/battleWizards\./);
  });
});
