// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactArmorFields } from "@/components/artifacts/ArtifactArmorFields";

describe("ArtifactArmorFields", () => {
  afterEach(cleanup);

  it("no model yet: a button creates light armor 11", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Додати модель броні" }));

    expect(onChange).toHaveBeenCalledWith({ category: "light", base: 11 });
  });

  it("edits category, base, strength and stealth; dex cap placeholder follows the category", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "medium", base: 14 }} onChange={onChange} />);

    expect((screen.getByLabelText("Межа Спритності") as HTMLInputElement).placeholder).toBe("2");

    fireEvent.change(screen.getByLabelText("Категорія броні"), { target: { value: "heavy" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "heavy", base: 14 });

    fireEvent.change(screen.getByLabelText("База КЗ"), { target: { value: "16" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 16 });

    fireEvent.change(screen.getByLabelText("Вимога Сили"), { target: { value: "13" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, strength: 13 });

    fireEvent.click(screen.getByRole("checkbox", { name: "Перешкода на Скритність" }));
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, stealthDisadvantage: true });
  });

  it("removing the model", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "light", base: 11 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Прибрати модель броні" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
