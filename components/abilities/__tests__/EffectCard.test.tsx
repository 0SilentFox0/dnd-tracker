// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { EffectCard } from "@/components/abilities/EffectCard";
import type { Effect } from "@/lib/utils/abilities/schema";

function renderCard(effect: Effect, onChange = vi.fn(), errorsByPath: Record<string, string[]> = {}) {
  render(
    <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath }}>
      <EffectCard effect={effect} trigger={{ event: "hit", role: "attacker" }} path="0.effects.0" actions={{ onChange, onRemove: vi.fn() }} />
    </AbilityEditorProvider>,
  );

  return onChange;
}

describe("EffectCard", () => {
  afterEach(cleanup);

  it("показує поля з реєстру і підсумок", () => {
    renderCard({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" });

    expect(screen.getByLabelText("Шкода/раунд (число, кубики, формула)")).toHaveValue("1d4");
    expect(screen.getByText("bleed 1d4/раунд × 2 р.")).toBeInTheDocument();
  });

  it("зміна поля → onChange з оновленим ефектом", () => {
    const onChange = renderCard({ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } });

    fireEvent.change(screen.getByLabelText("Число / формула"), { target: { value: "3" } });

    expect(onChange).toHaveBeenCalledWith({ kind: "modifyStat", stat: "armor", flat: 3, duration: { rounds: 1 } });
  });

  it("поле, приховане visibleWhen, не показується", () => {
    renderCard({ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } });

    expect(screen.queryByLabelText("Рівні слотів")).toBeNull();
  });

  it("помилка біля поля", () => {
    renderCard({ kind: "dot", damagePerRound: "1d4", damageType: "", duration: { rounds: 2 } } as Effect, vi.fn(), { "0.effects.0.damageType": ["Too small"] });

    expect(screen.getByText("Too small")).toBeInTheDocument();
  });

  it("невідомий вид — картка лише для читання", () => {
    renderCard({ kind: "teleport", range: 5 } as unknown as Effect);

    expect(screen.getByText("Невідомий ефект")).toBeInTheDocument();
  });

  it("випадковий ефект з 2 варіантами: ✕ варіанта неактивний і пояснює чому", () => {
    renderCard({ kind: "randomOf", options: [{ kind: "heal", amount: 1 }, { kind: "heal", amount: 2 }] } as Effect);

    const removes = screen.getAllByRole("button", { name: "Видалити ефект" }).slice(1);

    expect(removes).toHaveLength(2);
    for (const b of removes) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Потрібно щонайменше 2 варіанти");
    }
  });
});
