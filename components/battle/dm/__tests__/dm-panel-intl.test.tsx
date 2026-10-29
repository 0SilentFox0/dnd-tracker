// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { ConditionsDialog } from "@/components/battle/dm/ConditionsDialog";
import { mazeMap } from "@/components/battle/modes/maze/__tests__/maze-fixtures";
import { MazeToolbar } from "@/components/battle/modes/maze/MazeToolbar";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { MazeTools } from "@/lib/hooks/battle/modes/maze";
import { CAMPAIGN_NAMESPACES } from "@/lib/i18n/scopes";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { hero } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { CONDITION_5E_KEYS } from "@/lib/utils/battle/conditions";

vi.unmock("next-intl");

afterEach(cleanup);

const NAMESPACES = [...CAMPAIGN_NAMESPACES, "battleCommon", "battleDm"] as const;

const RAW_KEY = /\b(battleDm|battleCommon|gameTerms|common)\.[a-zA-Z]+/;

describe("DM panel texts in both locales", () => {
  it.each([
    ["uk", "Стани", "Накласти", "Повалений"],
    ["en", "Conditions", "Apply", "Prone"],
  ] as const)("ConditionsDialog %s", async (locale, title, apply, prone) => {
    await renderWithIntl(<ConditionsDialog participant={hero} onClose={vi.fn()} onSubmit={vi.fn()} />, { locale, namespaces: NAMESPACES });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByRole("button", { name: apply })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(CONDITION_5E_KEYS.length);
    expect(screen.getByRole("radio", { name: new RegExp(prone) })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(RAW_KEY);
  });

  it.each([
    ["uk", "Згенерувати", "Темрява", "Очима гравця"],
    ["en", "Generate", "Darkness", "Through a player's eyes"],
  ] as const)("MazeToolbar %s", async (locale, generate, dark, asHero) => {
    const scene = fakeScene({ isDM: true, map: mazeMap({}), locale });

    const Wrapper = scene.wrapper;

    const tools = { state: { canGenerate: true, tool: "none", dark: false, heroes: [], awaitingExit: false }, actions: {}, editing: null, asHero: { id: null, set: vi.fn() } } as unknown as MazeTools;

    render(<MazeToolbar tools={tools} tall={false} />, { wrapper: Wrapper });

    expect(screen.getByRole("button", { name: generate })).toBeTruthy();
    expect(screen.getByRole("button", { name: dark })).toBeTruthy();
    expect(screen.getByText(asHero)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(RAW_KEY);
  });
});
