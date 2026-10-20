// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioPages: () => ({ data: [{ id: "sc1", kind: "scene", title: "Монастир" }, { id: "sc2", kind: "scene", title: "Ліс" }] }),
  useScenarioPage: (_c: string, id: string | null) => ({ data: id ? { content: { sections: [{ id: "s1", title: "Собор" }, { id: "s2", title: "Дзвіниця" }] } } : undefined }),
}));
vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, onValueChange, options, "aria-label": ariaLabel }: { value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; "aria-label"?: string }) => (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { RevealSettings } from "@/components/scenario/editor/RevealSettings";

afterEach(cleanup);

const setup = (rule?: Parameters<typeof RevealSettings>[0]["rule"]) => {
  const onChange = vi.fn();

  render(<RevealSettings campaignId="c" rule={rule} revealed={false} onChange={onChange} onToggleRevealed={vi.fn()} />);

  return onChange;
};

describe("RevealSettings", () => {
  it("режим → сцена → розділ: onChange лише з обраним розділом", () => {
    const onChange = setup();

    fireEvent.change(screen.getByLabelText("Коли відкрити гравцеві"), { target: { value: "afterSection" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Сцена")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Сцена"), { target: { value: "sc2" } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: "manual" });

    fireEvent.change(screen.getByLabelText("Розділ сцени"), { target: { value: "s2" } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: "afterSection", pageId: "sc2", sectionId: "s2" });
  });

  it("повернення до «Вручну» скидає правило", () => {
    const onChange = setup({ mode: "afterSection", pageId: "sc1", sectionId: "s1" });

    fireEvent.change(screen.getByLabelText("Коли відкрити гравцеві"), { target: { value: "manual" } });
    expect(onChange).toHaveBeenCalledWith({ mode: "manual" });
  });

  it("наявне правило показує сцену й розділ", () => {
    setup({ mode: "afterSection", pageId: "sc1", sectionId: "s2" });

    expect((screen.getByLabelText("Сцена") as HTMLSelectElement).value).toBe("sc1");
    expect((screen.getByLabelText("Розділ сцени") as HTMLSelectElement).value).toBe("s2");
  });
});
