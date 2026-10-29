// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "../editor-context";
import { EffectCard } from "../EffectCard";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { Effect } from "@/lib/utils/abilities/schema";

vi.unmock("next-intl");

afterEach(cleanup);

async function renderEn(effect: Effect) {
  return renderWithIntl(
    <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {} }}>
      <EffectCard effect={effect} trigger={{ event: "hit", role: "attacker" }} path="0.effects.0" actions={{ onChange: vi.fn(), onRemove: vi.fn() }} />
    </AbilityEditorProvider>,
    { locale: "en", namespaces: ["common", "validation", "abilities", "abilityRegistry"] },
  );
}

describe("EffectCard (en)", () => {
  it("modifyStat shows English labels without raw keys", async () => {
    const { container } = await renderEn({ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } });

    expect(screen.getByText("Number / formula")).toBeInTheDocument();
    expect(screen.getAllByText("Modify stat").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/abilityRegistry\.|abilities\./);
  });

  it("flag shows its own fields with the per-flag label", async () => {
    const { container } = await renderEn({ kind: "flag", flag: "resistance", damageType: "physical", percent: 25 });

    expect(screen.getAllByText("Damage resistance / immunity").length).toBeGreaterThan(0);
    expect(screen.getByText("%, 100 = immunity, negative = vulnerability")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/abilityRegistry\.|abilities\./);
  });
});
