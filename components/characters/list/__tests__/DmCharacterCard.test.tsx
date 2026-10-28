// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DmCharacterCard } from "@/components/characters/list/DmCharacterCard";
import type { CharacterListItem } from "@/types/characters";
import type { GameClassData } from "@/types/classes";

const mocks = vi.hoisted(() => ({ rules: vi.fn(), classMode: vi.fn() }));

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: mocks.rules }));
vi.mock("@/lib/hooks/classes", () => ({ useClassMode: mocks.classMode }));
vi.mock("@/components/character-profile/HeroPortrait", () => ({ HeroPortrait: () => null }));
vi.mock("@/components/common/ActionsMenu", () => ({ ActionsMenu: () => null }));

const fighter = { id: "f", name: "Воїн", hitDie: 10, subclasses: [] } as unknown as GameClassData;

const character = { id: "c", campaignId: "camp", type: "PLAYER", controlledBy: null, name: "Х", level: 3, class: "Воїн", race: "Людина", subrace: null, avatar: null, constitution: 14, archetype: null, armorClass: 10, initiative: 0 } as unknown as CharacterListItem;

const renderCard = (c: CharacterListItem) => render(<DmCharacterCard character={c} campaignId="camp" busy={false} actions={{ onDelete: vi.fn() }} />);

describe("DmCharacterCard HP", () => {
  beforeEach(() => mocks.rules.mockReturnValue({ data: undefined }));
  afterEach(cleanup);

  it("клас-режим: HP з класів, як у листі", () => {
    mocks.classMode.mockReturnValue({ enabled: true, byId: { f: fighter } });
    renderCard({ ...character, classes: [{ classId: "f", level: 3 }] });

    expect(screen.getByText("28")).toBeTruthy();
  });

  it("без записів класів HP за формулою героя", () => {
    mocks.classMode.mockReturnValue({ enabled: true, byId: { f: fighter } });
    renderCard(character);

    expect(screen.queryByText("28")).toBeNull();
  });

  it("класи вимкнені в правилах — формула героя навіть із записами", () => {
    mocks.classMode.mockReturnValue({ enabled: false, byId: {} });
    renderCard({ ...character, classes: [{ classId: "f", level: 3 }] });

    expect(screen.queryByText("28")).toBeNull();
  });
});
