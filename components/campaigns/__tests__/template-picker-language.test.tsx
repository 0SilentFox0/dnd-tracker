// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const card = (id: string, locale: string | null): TemplateCard => ({ id, name: "SRD", description: null, visibility: "official", counts: {}, locale, templateKey: "srd" });

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, onValueChange, groups, "aria-label": label }: { value: string; onValueChange: (v: string) => void; groups: { options: { value: string; label: string }[] }[]; "aria-label": string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {groups.flatMap((g) => g.options).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

let official: TemplateCard[] = [];

vi.mock("@/lib/hooks/campaigns", () => ({
  useTemplates: () => ({ data: { official, mine: [] } }),
  useBundleFilePicker: () => ({ file: null, status: { error: null, success: null, isLoading: false }, actions: { handleFileChange: vi.fn(), handleImport: vi.fn(), reset: vi.fn() } }),
}));

describe("TemplatePicker: мова шаблону", () => {
  afterEach(cleanup);

  it("одна картка на групу, перемикач мови віддає id варіанта", () => {
    official = [card("en1", null), card("uk1", "uk")];

    const onChange = vi.fn();

    render(<TemplatePicker value={{ templateId: "uk1" }} onChange={onChange} />);

    expect(screen.getAllByRole("option", { name: "SRD" })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("campaigns.templatePicker.languageLabel"), { target: { value: "en1" } });
    expect(onChange).toHaveBeenLastCalledWith({ templateId: "en1" });
  });

  it("з одним варіантом перемикача немає", () => {
    official = [card("en1", null)];

    render(<TemplatePicker value={{ templateId: "en1" }} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("campaigns.templatePicker.languageLabel")).toBeNull();
  });
});
