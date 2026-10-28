// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { empty, featsById, refs, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoicesState } from "@/types/choices";

const view = { ...refs, ready: true, feats: Object.values(featsById), spells };

function Harness({ initial, classMode, level = 1 }: { initial: ChoicesState; classMode: boolean; level?: number }) {
  const [data, set] = useState<ChoicesState>(initial);

  return (
    <>
      <ChoicesEditor state={{ data, set }} refs={view} hero={{ level, scores, skills: {}, classMode }} issues={[{ path: "raceChoices.keen-senses", code: "SKILL_NOT_ALLOWED", message: API_ERRORS.SKILL_NOT_ALLOWED }]} />
      <output data-testid="json">{JSON.stringify(data)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "{}") as ChoicesState;

describe("ChoicesEditor", () => {
  afterEach(cleanup);

  it("race section without class mode; server issue under its choice", () => {
    render(<Harness initial={empty} classMode={false} />);

    expect(screen.getByRole("heading", { name: "Раса: Elf" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Риса походження" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wood Elf/ }));

    expect(json().raceChoices).toEqual({ "elven-lineage": [{ id: "wood-elf" }] });
    expect(screen.getByText(API_ERRORS.SKILL_NOT_ALLOWED)).toBeTruthy();
  });

  it("class mode: origin feat and class sections", () => {
    render(<Harness initial={{ ...empty, classes: [{ classId: sorcerer.id, level: 1 }] }} classMode />);

    fireEvent.click(screen.getByRole("radio", { name: /Alert/ }));

    expect(json().feats).toEqual([{ id: "f-alert", source: "origin" }]);
    expect(screen.getByRole("heading", { name: "Sorcerer 1" })).toBeTruthy();
  });
});
