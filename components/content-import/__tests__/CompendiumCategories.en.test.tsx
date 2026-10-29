// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { CompendiumCategories } from "../CompendiumCategories";

import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
afterEach(cleanup);

const wizard = {
  state: { root: { _meta: { edition: "classic", sources: [{ json: "s", full: "Synthetic" }] }, spell: [{ name: "Light", source: "s" }], foundry: [{}] }, categories: ["spell"], excludedChapters: [], options: {}, busy: false },
  actions: { toggleCategory: vi.fn(), toggleChapter: vi.fn(), changeOptions: vi.fn(), runPreview: vi.fn() },
} as unknown as CompendiumImportController;

it("renders English text without raw keys", async () => {
  const { container } = await renderWithIntl(<CompendiumCategories wizard={wizard} />, { locale: "en", namespaces: ["common", "validation", "compendium"] });

  expect(screen.getByLabelText("Spells (1)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Check JSON" })).toBeInTheDocument();
  expect(screen.getByText("Edition: classic 5e")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/\bcompendium\./);
});
