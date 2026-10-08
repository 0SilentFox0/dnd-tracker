// @vitest-environment happy-dom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { ProfileSpellBook } from "@/components/character-profile/ProfileSpellBook";
import type { BookSpell } from "@/types/spells";

const spells: BookSpell[] = [
  { id: "m", name: "Мітка мисливця", level: 1, dice: 1, targeting: { kind: "enemy" } },
  { id: "c", name: "Туманна хмара", level: 1, dice: 0, targeting: { kind: "allEnemies" } },
];

function Harness() {
  const [open, setOpen] = useState(true);

  return <ProfileSpellBook spells={spells} slots={[{ level: 1, count: 4 }]} open={open} onOpenChange={setOpen} />;
}

describe("ProfileSpellBook", () => {
  it("відкривається на першому колі зі слотами, показує деталь без дій бою", () => {
    mockMatchMedia(true);
    render(<Harness />);

    expect(screen.getByRole("button", { name: /I коло, слотів 4/ })).toBeTruthy();
    fireEvent.click(screen.getByText("Мітка мисливця"));
    expect(screen.getByText("Вартість")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Обрати цілі/ })).toBeNull();
  });

  it("пергамент сам задає темне чорнило, не покладаючись на колір шторки", () => {
    mockMatchMedia(true);
    render(<Harness />);

    expect(document.querySelector(".hud-book")?.className).toContain("text-[#2a2018]");
  });
});
