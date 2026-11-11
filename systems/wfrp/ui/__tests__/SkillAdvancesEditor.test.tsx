// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillAdvancesEditor } from "../SkillAdvancesEditor";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, options, onValueChange, "aria-label": label }: { value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void; "aria-label"?: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const t = (key: string) => `characters.wfrp.${key}`;

describe("SkillAdvancesEditor", () => {
  afterEach(cleanup);

  it("adds a fixed specialisation as key:spec with one advance", () => {
    const set = vi.fn();

    render(<SkillAdvancesEditor binding={{ data: DEFAULT_CHARACTERISTICS, set }} />);
    fireEvent.change(screen.getByLabelText(t("skill")), { target: { value: "melee" } });
    fireEvent.change(screen.getByLabelText(t("spec")), { target: { value: "flail" } });
    fireEvent.click(screen.getByRole("button", { name: t("addSkill") }));

    expect(set).toHaveBeenCalledWith("skillAdvances", { "melee:flail": 1 });
  });

  it("adds an open specialisation typed by the DM", () => {
    const set = vi.fn();

    render(<SkillAdvancesEditor binding={{ data: DEFAULT_CHARACTERISTICS, set }} />);
    fireEvent.change(screen.getByLabelText(t("skill")), { target: { value: "lore" } });
    fireEvent.change(screen.getByLabelText(t("spec")), { target: { value: "old-world" } });
    fireEvent.click(screen.getByRole("button", { name: t("addSkill") }));

    expect(set).toHaveBeenCalledWith("skillAdvances", { "lore:old-world": 1 });
  });

  it("does not add a skill that needs a specialisation without one", () => {
    render(<SkillAdvancesEditor binding={{ data: DEFAULT_CHARACTERISTICS, set: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText(t("skill")), { target: { value: "melee" } });

    expect((screen.getByRole("button", { name: t("addSkill") }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("removes an existing row", () => {
    const set = vi.fn();

    render(<SkillAdvancesEditor binding={{ data: { ...DEFAULT_CHARACTERISTICS, skillAdvances: { channelling: 2, heal: 1 } }, set }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /characters\.wfrp\.removeSkill/ })[0]);

    expect(set).toHaveBeenCalledWith("skillAdvances", { heal: 1 });
  });
});
