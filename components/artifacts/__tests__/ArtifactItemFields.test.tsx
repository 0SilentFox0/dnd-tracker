// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const library = [
  { id: "ls", name: "Longsword", slot: "weapon", modifiers: [...weaponStatsColumns({ damageDice: "1d8" }).modifiers, ...itemStatsColumns({ unique: false }).modifiers] },
  { id: "gs", name: "Greatsword", slot: "weapon", modifiers: [...weaponStatsColumns({ damageDice: "2d6" }).modifiers, ...itemStatsColumns({ unique: false }).modifiers] },
  { id: "rg", name: "Ring", slot: "ring", modifiers: [] },
];

vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [{ id: "fireball", name: "Fireball", level: 3 }] }) }));

vi.mock("@/lib/hooks/artifacts", () => ({ useArtifactsList: () => ({ data: library }) }));

import { ArtifactItemFields } from "../ArtifactItemFields";

afterEach(cleanup);

describe("ArtifactItemFields", () => {
  it("gear and property toggles", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Flame Tongue" slot="weapon" value={undefined} onChange={onChange} itemsEnabled={false} />);

    fireEvent.click(screen.getByRole("switch", { name: "artifacts.item.gear" }));
    expect(onChange).toHaveBeenLastCalledWith({ unique: false });

    fireEvent.click(screen.getByRole("switch", { name: "artifacts.item.property" }));
    expect(onChange).toHaveBeenLastCalledWith({ property: { appliesTo: { kinds: ["weapon"] } } });

    expect(screen.queryByRole("switch", { name: "artifacts.item.attunement" })).toBeNull();
  });

  it("property: base chips from the library and the name preview on the first matching base", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Flame Tongue" slot="weapon" value={{ property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }} onChange={onChange} itemsEnabled />);

    expect(screen.getByText('artifacts.item.preview {"name":"Flame Tongue Longsword"}')).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ring" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Greatsword" }));
    expect(onChange).toHaveBeenLastCalledWith({ property: { appliesTo: { kinds: ["weapon"], bases: ["Greatsword"] }, nameTemplate: "Flame Tongue {base}" } });
  });

  it("items enabled: attunement, charges with rest, consumable", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Wand" slot="item" value={{ unique: false }} onChange={onChange} itemsEnabled />);

    fireEvent.click(screen.getByRole("switch", { name: "artifacts.item.attunement" }));
    expect(onChange).toHaveBeenLastCalledWith({ unique: false, attunement: true });

    fireEvent.change(screen.getByLabelText("artifacts.item.charges"), { target: { value: "7" } });
    expect(onChange).toHaveBeenLastCalledWith({ unique: false, charges: { max: 7, rest: "long" } });

    expect(screen.queryByRole("switch", { name: "artifacts.item.property" })).toBeNull();
  });
});

it("adds an item spell and a finite parameter through authoring controls", () => {
  const onChange = vi.fn();

  render(<ArtifactItemFields campaignId="c" name="Wand" slot="item" value={{ charges: { max: 7, rest: "long" } }} onChange={onChange} itemsEnabled />);
  fireEvent.click(screen.getByRole("button", { name: "artifacts.casting.addSpell" }));
  expect(onChange).toHaveBeenLastCalledWith({ charges: { max: 7, rest: "long" }, spells: [{ spellId: "fireball", cost: 1, castLevel: 3 }] });
  fireEvent.change(screen.getByLabelText("artifacts.casting.parameterAria"), { target: { value: "damageType" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ parameter: { kind: "damageType", options: [{ key: "fire", label: "fire" }] } }));
});
