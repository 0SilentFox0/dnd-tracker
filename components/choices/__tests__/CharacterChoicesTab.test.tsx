// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterChoicesTab } from "@/components/choices/CharacterChoicesTab";
import { featsById, refs, sorcerer,spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import type { CharacterFormData } from "@/types/characters";

vi.mock("@/lib/hooks/characters", () => ({ useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }) }));

function Harness() {
  const [data, set] = useState<CharacterFormData>({ ...defaultCharacterFormData, basicInfo: { ...defaultCharacterFormData.basicInfo, race: "Elf", classes: [{ classId: sorcerer.id, level: 1 }] } });

  return (
    <>
      <CharacterChoicesTab campaignId="c1" form={{ data, set }} classesEnabled />
      <output data-testid="json">{JSON.stringify({ choices: data.choices, classes: data.basicInfo.classes })}</output>
    </>
  );
}

describe("CharacterChoicesTab", () => {
  afterEach(cleanup);

  it("writes race picks and the origin feat into formData.choices, class picks into basicInfo.classes", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Wood Elf/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Alert/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Fire Bolt/ }));

    const out = JSON.parse(screen.getByTestId("json").textContent ?? "{}");

    expect(out.choices).toEqual({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, feats: [{ id: "f-alert", source: "origin" }] });
    expect(out.classes).toEqual([{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }]);
  });
});
