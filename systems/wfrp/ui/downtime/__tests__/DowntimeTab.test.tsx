// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DowntimeTab } from "../DowntimeTab";

import { sheetFixture } from "@/components/character-profile/__tests__/sheet-fixture";
import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { render } from "@/lib/i18n/test/render-uk";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import type { CharacterSheet } from "@/types/characters";

vi.unmock("next-intl");

const mocks = vi.hoisted(() => ({ character: { data: undefined as unknown }, save: vi.fn(async () => true) }));

vi.mock("@/lib/hooks/characters", () => ({
  useCharacter: () => mocks.character,
  useCharacters: () => ({ data: [{ id: "ch", name: "Я" }, { id: "p2", name: "Друг" }] }),
}));
vi.mock("@/systems/wfrp/hooks", async (orig) => ({
  ...(await orig<object>()),
  useDowntime: () => ({ mutateOk: mocks.save, isPending: false }),
}));

const ailment = { id: "a1", kind: "disease", daysLeft: 5, label: "Лихоманка" };

const mount = ({ isDM = false, downtime }: { isDM?: boolean; downtime?: Record<string, unknown> } = {}) => {
  mocks.character.data = { characteristics: { base: {}, advances: {}, skillAdvances: {}, talents: {}, ledger: [], ...(downtime ? { downtime } : {}) } };

  const sheet = { ...sheetFixture, system: "wfrp", viewer: { isDM, isOwner: !isDM }, wfrp: { characteristics: [], skills: [{ key: "athletics", characteristic: "ag", target: 30, advances: 1, trained: true, kind: "basic" }] } } as unknown as CharacterSheet;

  return render(
    <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
      <DowntimeTab />
    </ProfileProvider>,
  );
};

describe("DowntimeTab", () => {
  beforeEach(() => {
    mocks.save.mockClear();
  });

  afterEach(cleanup);

  it("owner sees the endeavour picker and ailments without edit controls", () => {
    mount({ downtime: { ailments: [ailment] } });

    expect(screen.getByText(/Лихоманка/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Додати недугу" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Заняття" })).toBeTruthy();
  });

  it("DM can add an ailment", () => {
    mount({ isDM: true });

    expect(screen.getByRole("button", { name: "Додати недугу" })).toBeTruthy();
  });

  it("owner saves the endeavour without ailments", () => {
    mount({ downtime: { endeavour: { kind: "rest", params: {} }, ailments: [] } });
    fireEvent.click(screen.getAllByRole("button", { name: "Зберегти" })[0]);

    expect(mocks.save).toHaveBeenCalledWith({ endeavour: { kind: "rest", params: {} } });
  });

  it("DM save omits ailments that were not edited", () => {
    mount({ isDM: true, downtime: { endeavour: { kind: "rest", params: {} }, ailments: [ailment] } });
    fireEvent.click(screen.getAllByRole("button", { name: "Зберегти" })[0]);

    expect(mocks.save).toHaveBeenCalledWith({ endeavour: { kind: "rest", params: {} } });
  });

  it("training endeavour shows the target fields; credit row shows the discount", () => {
    mount({ downtime: { endeavour: { kind: "train", params: { kind: "characteristic", key: "ws" } }, ailments: [], training: { kind: "characteristic", key: "ws", discount: 10 } } });

    expect(screen.getByRole("combobox", { name: "Що вивчати" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Ціль" })).toBeTruthy();
    expect(screen.getByText(/Знижка на навчання \(ws\): -10/)).toBeTruthy();
  });

  it("last period summary translates the event text and skipped state", () => {
    const summary = { healed: 3, ailments: [], event: { roll: 2, index: 1, text: dynamicTextRef("wfrpDowntime.events.2"), conditions: [] } };

    mount({ downtime: { ailments: [], lastPeriod: { id: "p", at: "2026-11-08T10:00:00Z", days: 7, before: { ailments: [] }, after: { ailmentIds: [] }, summary } } });

    expect(screen.getByText(/Сварка в таверні/)).toBeTruthy();
    expect(screen.getByText("Вилікувано Ран: 3")).toBeTruthy();
  });

  it("dead skip is shown", () => {
    mount({ downtime: { ailments: [], lastPeriod: { id: "p", at: "2026-11-08T10:00:00Z", days: 7, before: { ailments: [] }, after: { ailmentIds: [] }, summary: { skipped: "dead", healed: 0, ailments: [] } } } });

    expect(screen.getByText("Мертвий: період пропущено")).toBeTruthy();
  });
});
