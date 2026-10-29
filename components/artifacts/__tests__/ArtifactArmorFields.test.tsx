// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactArmorFields } from "@/components/artifacts/ArtifactArmorFields";

describe("ArtifactArmorFields", () => {
  afterEach(cleanup);

  it("no model yet: a button creates light armor 11", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "artifacts.armor.add" }));

    expect(onChange).toHaveBeenCalledWith({ category: "light", base: 11 });
  });

  it("edits category, base, strength and stealth; dex cap placeholder follows the category", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "medium", base: 14 }} onChange={onChange} />);

    expect((screen.getByLabelText("artifacts.armor.dexCap") as HTMLInputElement).placeholder).toBe("2");

    fireEvent.change(screen.getByLabelText("artifacts.armor.category"), { target: { value: "heavy" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "heavy", base: 14 });

    fireEvent.change(screen.getByLabelText("artifacts.armor.base"), { target: { value: "16" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 16 });

    fireEvent.change(screen.getByLabelText("artifacts.armor.strength"), { target: { value: "13" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, strength: 13 });

    fireEvent.click(screen.getByRole("checkbox", { name: "artifacts.armor.stealth" }));
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, stealthDisadvantage: true });
  });

  it("removing the model", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "light", base: 11 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "artifacts.armor.remove" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
