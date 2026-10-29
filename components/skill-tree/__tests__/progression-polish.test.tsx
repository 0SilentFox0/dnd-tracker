// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderSkillTree } from "./render-intl";

import { SlotButton } from "@/components/skill-tree/progression/SlotButton";

vi.unmock("next-intl");

describe("SlotButton", () => {
  it("має розширену зону дотику (≥44 px через псевдоелемент)", async () => {
    await renderSkillTree(<SlotButton state={{ state: "available", nodeId: "n" } as never} label="Удар" icon={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Вивчити: Удар" }).className).toMatch(/after:-inset-1/);
  });
});

describe("RacialRow", () => {
  it("голова рядка показує іконку раси, без неї — літеру", async () => {
    const { RacialRow } = await import("@/components/skill-tree/progression/RacialRow");

    const base = { race: "Ельф", raceIcon: null } as never;

    const first = await renderSkillTree(<RacialRow states={[]} tree={{ nodes: new Map() } as never} dto={base} onSelect={vi.fn()} />);

    expect(first.container.querySelector(".branch-frame")?.textContent).toBe("Е");
    first.unmount();

    const second = await renderSkillTree(<RacialRow states={[]} tree={{ nodes: new Map() } as never} dto={{ race: "Ельф", raceIcon: "https://x/elf.png" } as never} onSelect={vi.fn()} />);

    expect(second.container.querySelector(".branch-frame img")).not.toBeNull();
  });
});
