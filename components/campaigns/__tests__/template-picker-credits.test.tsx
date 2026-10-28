// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import type { TemplateCard } from "@/types/campaigns";

const srd: TemplateCard = { id: "s1", name: "5e SRD 5.2", description: null, visibility: "official", counts: { races: 9, units: 331, spells: 339 }, credits: "This work includes material from the System Reference Document 5.2" };

const heroes: TemplateCard = { id: "h1", name: "Heroes", description: null, visibility: "official", counts: { races: 7, units: 152, spells: 90 } };

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

  it("показує атрибуцію на картці шаблону, де вона є", () => {
    render(<TemplatePicker value={{ templateId: null }} onChange={vi.fn()} />);

    const note = screen.getByText(/System Reference Document 5\.2/);

    expect(note.closest("button")?.textContent).toContain("5e SRD 5.2");
    expect(screen.getByText("Heroes").closest("button")?.textContent).not.toContain("System Reference");
  });
});
