// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompendiumDependencies } from "../CompendiumDependencies";

import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
afterEach(cleanup);

const wizard = (refs: Array<Record<string, unknown>>, status = "create", extra: Array<Record<string, unknown>> = []) => ({
  state: { preview: { report: { readyToImport: true, rows: [{ canonicalKey: "k", status }] }, graph: [{ key: "k", name: "Fog", kind: "spells", refs }, ...extra] }, options: {}, targets: { local: [], templates: [] }, busy: false },
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

  it("hides unchanged rows without unresolved refs and never prints the no-dependencies notice", async () => {
    const { container } = await renderWithIntl(<CompendiumDependencies wizard={wizard([], "unchanged")} />, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

    expect(container.textContent).not.toContain("Механічних залежностей немає");
    expect(container.textContent).not.toContain("Fog");
    expect(container.textContent).toContain("1 без змін і залежностей — показати");
  });

  it("keeps unchanged rows with an unresolved ref and offers overwrite/exclude inside details", async () => {
    const { container } = await renderWithIntl(<CompendiumDependencies wizard={wizard([{ key: "b", kind: "spell", name: "Mist", source: "SRD", edition: "one", unresolved: true }], "unchanged")} />, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

    expect(container.textContent).toContain("Fog");
    expect(container.querySelector("details details input[type=checkbox]")).not.toBeNull();
    expect(container.querySelector("[aria-label='Зіставлення Mist']")).not.toBeNull();
  });
});
