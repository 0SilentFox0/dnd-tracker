// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactStatsEditor } from "../ArtifactStatsEditor";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ id, value, options, onValueChange }: { id: string; value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void }) => (
    <select id={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

afterEach(cleanup);

function mount(slot: string, initial: unknown = null) {
  const onChange = vi.fn();

  const onValidityChange = vi.fn();

  function Host() {
    const [value, setValue] = useState<unknown>(initial);

    return (
      <ArtifactStatsEditor
        value={value}
        slot={slot}
        onChange={(v) => {
          onChange(v);
          setValue(v);
        }}
        onValidityChange={onValidityChange}
      />
    );
  }

  render(<Host />);

  return { onChange, onValidityChange };
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

describe("ArtifactStatsEditor", () => {
  it("shows armour fields for an armour slot: four AP inputs, kind select, quality list", () => {
    mount("armor");

    for (const l of ["head", "arm", "body", "leg"]) expect(input(`wfrp-ap-${l}`)).toBeTruthy();

    expect(input("wfrp-armour-kind")).toBeTruthy();
    expect(input("wfrp-armour-q-pick")).toBeTruthy();
    expect(input("wfrp-weapon-group")).toBeNull();
  });

  it("shows weapon fields for a weapon slot", () => {
    mount("weapon");

    expect(input("wfrp-weapon-group")).toBeTruthy();
    expect(input("wfrp-weapon-reach")).toBeTruthy();
    expect(input("wfrp-ap-head")).toBeNull();
  });

  it("shows only generic fields for a shield slot", () => {
    mount("shield");

    expect(input("wfrp-gear-q-pick")).toBeTruthy();
    expect(input("wfrp-ap-head")).toBeNull();
    expect(input("wfrp-weapon-group")).toBeNull();
  });

  it("emits parsed armour stats", () => {
    const { onChange } = mount("armor");

    fireEvent.change(input("wfrp-ap-body"), { target: { value: "3" } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: "armour", locations: { head: 0, arm: 0, body: 3, leg: 0 } }));
  });

  it("blocks invalid AP and reports validity", () => {
    const { onChange, onValidityChange } = mount("armor");

    fireEvent.change(input("wfrp-ap-head"), { target: { value: "9" } });

    expect(onChange).not.toHaveBeenCalled();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.change(input("wfrp-ap-head"), { target: { value: "2" } });

    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("adds and removes qualities; the value input appears only for qualities with a value", () => {
    const { onChange } = mount("armor");

    fireEvent.change(input("wfrp-armour-q-pick"), { target: { value: "flexible" } });
    fireEvent.click(screen.getByRole("button", { name: "wfrpEquipmentEditor.editor.addQuality" }));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ qualities: [{ key: "flexible" }] }));
    expect(input("wfrp-armour-q-flexible")).toBeNull();

    fireEvent.change(input("wfrp-armour-q-pick"), { target: { value: "shield" } });
    fireEvent.click(screen.getByRole("button", { name: "wfrpEquipmentEditor.editor.addQuality" }));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ qualities: [{ key: "flexible" }, { key: "shield", value: 1 }] }));
    expect(input("wfrp-armour-q-shield")).toBeTruthy();

    fireEvent.change(input("wfrp-armour-q-shield"), { target: { value: "2" } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ qualities: [{ key: "flexible" }, { key: "shield", value: 2 }] }));

    fireEvent.click(screen.getByRole("button", { name: /removeQuality.*wfrpEquipment.qualities.shield/ }));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ qualities: [{ key: "flexible" }] }));
    expect(input("wfrp-armour-q-shield")).toBeNull();
  });

  it("emits weapon stats with reach xor range", () => {
    const { onChange } = mount("range_weapon");

    fireEvent.change(input("wfrp-weapon-kind"), { target: { value: "ranged" } });

    expect(input("wfrp-weapon-range")).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: "weapon", range: 30 }));
    expect(onChange.mock.lastCall?.[0]).not.toHaveProperty("reach");

    fireEvent.change(input("wfrp-weapon-ammo"), { target: { value: "5" } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ ammoCapacity: 5 }));
  });

  it("clears stats when the slot no longer matches the stored kind", () => {
    const { onChange } = mount("weapon", { type: "armour", locations: { head: 1, arm: 0, body: 0, leg: 0 }, kind: "soft", qualities: [], weight: 0, price: 0 });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
