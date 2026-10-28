// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const card = (id: string, name: string): TemplateCard => ({ id, name, description: null, visibility: "official", counts: { races: 2, units: 5, spells: 1 } });

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, onValueChange, groups }: { value: string; onValueChange: (v: string) => void; groups: { label: string; options: { value: string; label: string }[] }[] }) => (
    <select aria-label="Шаблон" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {groups.flatMap((g) => g.options).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

vi.mock("@/lib/hooks/campaigns", () => ({
  useTemplates: () => ({ data: { official: [card("o1", "Heroes"), card("o2", "HoMM")], mine: [card("m1", "Мій шаблон")] } }),
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

  it("пояснює, що таке шаблон, і показує лічильники обраного", () => {
    render(<TemplatePicker value={{ templateId: "o1" }} onChange={vi.fn()} />);

    expect(screen.getByText(/Шаблон — готова основа кампанії/)).toBeTruthy();
    expect(screen.getByText("2 раси · 5 юнітів · 1 заклинання")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Мій шаблон" })).toBeTruthy();
  });

  it("вибір віддає templateId, «Без шаблону» — null", () => {
    const onChange = vi.fn();

    render(<TemplatePicker value={{ templateId: "o1" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Шаблон"), { target: { value: "o2" } });
    expect(onChange).toHaveBeenLastCalledWith({ templateId: "o2" });
    fireEvent.change(screen.getByLabelText("Шаблон"), { target: { value: "__none" } });
    expect(onChange).toHaveBeenLastCalledWith({ templateId: null });
  });

  it("«Імпорт з файлу» віддає file після вибору", async () => {
    const onChange = vi.fn();

    render(<TemplatePicker value={{ templateId: "o1" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Шаблон"), { target: { value: "__file" } });
    fireEvent.click(await screen.findByRole("button", { name: "common.import.submit" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ file: { name: "c.json", bundle: {}, entities: 3 } }));
  });
});
