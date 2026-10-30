// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityPanel } from "../AbilityPanel";
import { AbilityEditorProvider } from "../editor-context";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { Ability } from "@/lib/utils/abilities/schema";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: vi.fn() });

const base: Ability = { id: "a1", name: "Rage", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

function Harness({ initial, withIcon, onChange, errors = {} }: { initial: Ability; withIcon?: boolean; onChange: (a: Ability) => void; errors?: Record<string, { message: string }[]> }) {
  const [ability, setAbility] = useState(initial);

  return (
    <AbilityEditorProvider value={{ errorsByPath: errors } as never}>
      <AbilityPanel
        ability={ability}
        path="0"
        withIcon={withIcon}
        actions={{
          onChange: (a) => {
            setAbility(a);
            onChange(a);
          },
          onRemove: () => {},
        }}
      />
    </AbilityEditorProvider>
  );
}

describe("AbilityPanel icon field", () => {
  afterEach(cleanup);

  it("renders no icon input without withIcon", () => {
    renderWithConfirm(<Harness initial={base} onChange={() => {}} />);

    expect(screen.queryByLabelText("abilities.panel.icon")).toBeNull();
  });

  it("sets and clears the icon", () => {
    const onChange = vi.fn();

    renderWithConfirm(<Harness initial={base} withIcon onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("abilities.panel.icon"), { target: { value: "https://x/r.webp" } });

    expect(onChange).toHaveBeenLastCalledWith({ ...base, icon: "https://x/r.webp" });

    fireEvent.change(screen.getByLabelText("abilities.panel.icon"), { target: { value: "" } });

    const last = onChange.mock.lastCall?.[0] as Ability;

    expect(last).toEqual(base);
    expect("icon" in last).toBe(false);
  });

  it("keeps an existing icon when another field changes", () => {
    const onChange = vi.fn();

    renderWithConfirm(<Harness initial={{ ...base, icon: "https://x/r.webp" }} withIcon onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("abilities.panel.name"), { target: { value: "Fury" } });

    expect(onChange).toHaveBeenLastCalledWith({ ...base, name: "Fury", icon: "https://x/r.webp" });
  });

  it("shows the field error for a data: icon", () => {
    renderWithConfirm(<Harness initial={{ ...base, icon: "data:image/png;base64,AAA" }} withIcon onChange={() => {}} errors={{ "0.icon": [{ message: "abilities.validation.iconLink" }] }} />);

    expect(screen.getByTestId("field-errors-0.icon")).toBeTruthy();
  });
});
