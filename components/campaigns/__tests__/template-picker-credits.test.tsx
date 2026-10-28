// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const srd: TemplateCard = { id: "s1", name: "5e SRD 5.2", description: null, visibility: "official", counts: { races: 9, units: 331, spells: 339 }, credits: "This work includes material from the System Reference Document 5.2" };

const heroes: TemplateCard = { id: "h1", name: "Heroes", description: null, visibility: "official", counts: { races: 7, units: 152, spells: 90 } };

vi.mock("@/components/ui/select-field", () => ({ SelectField: () => null }));

vi.mock("@/lib/hooks/campaigns", () => ({
  useTemplates: () => ({ data: { official: [srd, heroes], mine: [] } }),
  useBundleFilePicker: () => ({
    file: new File(["{}"], "c.json"),
    status: { error: null, success: null, isLoading: false },
    actions: { handleFileChange: () => undefined, handleImport: async () => undefined, reset: () => undefined },
  }),
}));

describe("TemplatePicker: credits", () => {
  afterEach(cleanup);

  it("показує атрибуцію лише для обраного шаблону, де вона є", () => {
    const { rerender } = render(<TemplatePicker value={{ templateId: "s1" }} onChange={vi.fn()} />);

    expect(screen.getByText(/System Reference Document 5\.2/)).toBeTruthy();

    rerender(<TemplatePicker value={{ templateId: "h1" }} onChange={vi.fn()} />);
    expect(screen.queryByText(/System Reference/)).toBeNull();
  });
});
