// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const card = (id: string, name: string): TemplateCard => ({ id, name, description: null, visibility: "official", counts: { races: 2, units: 5, spells: 1 } });

vi.mock("@/lib/hooks/campaigns", () => ({
  useTemplates: () => ({ data: { official: [card("o1", "Порожня"), card("o2", "HoMM")], mine: [card("m1", "Мій шаблон")] } }),
  useBundleFilePicker: (onPick: (file: unknown) => void) => ({
    file: new File(["{}"], "c.json"),
    status: { error: null, success: null, isLoading: false },
    actions: {
      handleFileChange: () => undefined,
      handleImport: async () => onPick({ name: "c.json", bundle: {}, entities: 3 }),
      reset: () => undefined,
    },
  }),
}));

describe("TemplatePicker", () => {
  afterEach(cleanup);

  it("показує офіційні й мої шаблони з лічильниками", () => {
    render(<TemplatePicker value={{ templateId: "o1" }} onChange={vi.fn()} />);

    expect(screen.getByText("Порожня")).toBeTruthy();
    expect(screen.getByText("HoMM")).toBeTruthy();
    expect(screen.getByText("Мій шаблон")).toBeTruthy();
    expect(screen.getAllByText("2 раси · 5 юнітів · 1 заклинання").length).toBe(3);
    expect(screen.getByText("Порожня").closest("button")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("вибір плитки віддає templateId, «Без шаблону» — null", () => {
    const onChange = vi.fn();

    render(<TemplatePicker value={{ templateId: "o1" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("HoMM"));
    expect(onChange).toHaveBeenLastCalledWith({ templateId: "o2" });
    fireEvent.click(screen.getByText("Без шаблону"));
    expect(onChange).toHaveBeenLastCalledWith({ templateId: null });
  });

  it("«Імпорт з файлу» віддає file після вибору", async () => {
    const onChange = vi.fn();

    render(<TemplatePicker value={{ templateId: "o1" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("Імпорт з файлу"));
    fireEvent.click(await screen.findByRole("button", { name: "Імпортувати" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ file: { name: "c.json", bundle: {}, entities: 3 } }));
  });
});
