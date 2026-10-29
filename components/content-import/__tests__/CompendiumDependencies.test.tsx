// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompendiumDependencies } from "../CompendiumDependencies";

import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
afterEach(cleanup);

const wizard = (refs: Array<Record<string, unknown>>) => ({
  state: { preview: { report: { readyToImport: true }, graph: [{ key: "k", name: "Fog", kind: "spells", refs }] }, options: {}, targets: { local: [], templates: [] }, busy: false },
  actions: { applyOptions: vi.fn(), excludeRow: vi.fn(), excludeBlockedRows: vi.fn() },
}) as unknown as CompendiumImportController;

describe("CompendiumDependencies", () => {
  it("skips an empty source segment and prompts only for unresolved refs", async () => {
    const { container } = await renderWithIntl(<CompendiumDependencies wizard={wizard([{ key: "a", kind: "spell", name: "Fog Cloud", source: "", edition: "classic", unresolved: false }, { key: "b", kind: "spell", name: "Mist", source: "SRD", edition: "one", unresolved: true }])} />, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

    const text = container.textContent ?? "";

    expect(text).toContain("«Fog Cloud» · класична 5e — зіставлено");
    expect(text).not.toContain("· ·");
    expect(text).toContain("Змінити зіставлення…");
    expect(text).toContain("Оберіть запис кампанії або залежність SRD…");
    expect(text.match(/Оберіть запис кампанії/g)).toHaveLength(1);
  });
});
