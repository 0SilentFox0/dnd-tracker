// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NestedEffectsEditor } from "../NestedEffectsEditor";

afterEach(cleanup);

type Props = Partial<React.ComponentProps<typeof NestedEffectsEditor<string>>>;

function setup(props: Props = {}) {
  const onChange = vi.fn();

  const utils = render(
    <NestedEffectsEditor
      effects={["a", "b"]}
      path="p"
      limits={{ min: 0 }}
      labels={{ add: "Add" }}
      create={() => "new"}
      onChange={onChange}
      renderCard={({ effect, path, actions }) => (
        <div data-testid={path}>
          {effect}
          <button onClick={() => actions.onChange(`${effect}!`)}>edit-{effect}</button>
          {actions.onRemove && <button onClick={actions.onRemove}>remove-{effect}</button>}
        </div>
      )}
      {...props}
    />,
  );

  return { onChange, ...utils };
}

describe("NestedEffectsEditor", () => {
  it("adds, edits and removes items", () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "new"]);
    fireEvent.click(screen.getByText("edit-b"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b!"]);
    fireEvent.click(screen.getByText("remove-a"));
    expect(onChange).toHaveBeenLastCalledWith(["b"]);
  });

  it("blocks removal at limits.min", () => {
    setup({ effects: ["a"], limits: { min: 1 } });

    expect(screen.queryByText("remove-a")).toBeNull();
  });

  it("disables add at limits.max", () => {
    setup({ limits: { min: 0, max: 2 } });

    expect(screen.getByText("Add").hasAttribute("disabled")).toBe(true);
  });

  it("applies className", () => {
    const { container, rerender } = setup();

    expect(container.firstElementChild?.className).toContain("col-span-6");
    rerender(<NestedEffectsEditor effects={[]} path="p" limits={{ min: 0 }} labels={{ add: "Add" }} create={() => "n"} onChange={vi.fn()} renderCard={() => null} className="" />);
    expect(container.firstElementChild?.className).not.toContain("col-span-6");
  });

  it("replaces the add button via renderAdd and passes canAdd", () => {
    const renderAdd = vi.fn((add: (n: string[]) => void, { canAdd }: { canAdd: boolean }) => (
      <button disabled={!canAdd} onClick={() => add(["x"])}>
        custom
      </button>
    ));

    const { onChange } = setup({ renderAdd, limits: { min: 0, max: 5 } });

    expect(screen.queryByText("Add")).toBeNull();
    expect(renderAdd).toHaveBeenCalledWith(expect.any(Function), { canAdd: true });
    fireEvent.click(screen.getByText("custom"));
    expect(onChange).toHaveBeenCalledWith(["x"]);
  });
});
