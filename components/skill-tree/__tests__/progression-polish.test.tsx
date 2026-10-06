// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlotButton } from "@/components/skill-tree/progression/SlotButton";

describe("SlotButton", () => {
  it("має розширену зону дотику (≥44 px через псевдоелемент)", () => {
    render(<SlotButton state={{ state: "available", nodeId: "n" } as never} label="Удар" icon={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Вивчити: Удар" }).className).toMatch(/after:-inset-1/);
  });
});

describe("RacialRow", () => {
  it("голова рядка показує іконку раси, без неї — літеру", async () => {
    const { RacialRow } = await import("@/components/skill-tree/progression/RacialRow");

    const base = { race: "Ельф", raceIcon: null } as never;

    const { container, rerender } = render(<RacialRow states={[]} tree={{ nodes: new Map() } as never} dto={base} onSelect={vi.fn()} />);

    expect(container.querySelector(".branch-frame")?.textContent).toBe("Е");

    rerender(<RacialRow states={[]} tree={{ nodes: new Map() } as never} dto={{ race: "Ельф", raceIcon: "https://x/elf.png" } as never} onSelect={vi.fn()} />);
    expect(container.querySelector(".branch-frame img")).not.toBeNull();
  });
});
