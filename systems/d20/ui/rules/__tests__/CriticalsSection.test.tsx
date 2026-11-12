// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CriticalsSection } from "../CriticalsSection";

import "@/components/ui/__tests__/match-media";

vi.unmock("next-intl");

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const form = { data: DEFAULT_RULES, set: vi.fn() } as unknown as Parameters<typeof CriticalsSection>[0]["form"];

describe("CriticalsSection", () => {
  afterEach(cleanup);

  it.each([
    ["en", "Double damage"],
    ["uk", "Подвійний урон"],
  ] as const)("shows effect names from battleTerms (%s)", async (locale, name) => {
    await renderWithIntl(<CriticalsSection form={form} />, { locale, namespaces: ["common", "rules", "battleTerms"] });

    expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(1);
    expect(document.body.textContent).not.toMatch(/battleTerms\.|rules\./);
  });
});
