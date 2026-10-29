// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassProgressionMap } from "@/components/classes/progression";
import { makeAbility, makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import { buildClassProgression } from "@/lib/utils/characters/classes/progression";

const cls = makeClass({
  features: [
    { level: 1, abilities: [makeAbility("a1", "Second Wind", "Heal")] },
    { level: 4, abilities: [], choices: [{ id: "asi4", label: "ASI", level: 4, count: 1, kind: "feat" }] },
  ],
  subclassLevel: 3,
  subclasses: [
    { id: "champ", name: "Champion", features: [] },
    { id: "bm", name: "Battle Master", features: [] },
  ],
});

const sheet = () => buildClassProgression(cls, { classId: "f", level: 4 });

describe("ClassProgressionMap", () => {
  afterEach(cleanup);

  it("renders 20 rows plus header with state markers", () => {
    const { container } = render(<ClassProgressionMap progression={sheet()} mode="sheet" />);

    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(container.querySelector('tr[data-state="current"]')).toHaveTextContent("4");
    expect(container.querySelector('tr[data-state="next"]')).toHaveTextContent("5");
  });

  it("calls onPick for an open pick and onChooseSubclass for the subclass marker", () => {
    const onPick = vi.fn();

    const onChooseSubclass = vi.fn();

    render(<ClassProgressionMap progression={sheet()} mode="sheet" actions={{ onPick, onChooseSubclass }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /ASI/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /classes.progression.chooseSubclass/ })[0]);

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ key: "asi4" }), 4);
    expect(onChooseSubclass).toHaveBeenCalledTimes(1);
  });

  it("dm mode without actions: nothing clickable breaks", () => {
    render(<ClassProgressionMap progression={buildClassProgression(cls)} mode="dm" />);

    expect(screen.queryAllByRole("button", { name: /classes.progression.chooseSubclass/ })).toEqual([]);
    expect(screen.getAllByRole("row")).toHaveLength(21);
  });

  it("onOpenLevel fires from table cells and mobile rows, not from details clicks", () => {
    const onOpenLevel = vi.fn();

    const { container } = render(<ClassProgressionMap progression={sheet()} mode="sheet" actions={{ onOpenLevel }} />);

    fireEvent.click(screen.getByTestId("base-4"));
    expect(onOpenLevel).toHaveBeenLastCalledWith(4, "base");

    fireEvent.click(screen.getByTestId("row-4"));
    expect(onOpenLevel).toHaveBeenLastCalledWith(4, "base");
    expect(onOpenLevel).toHaveBeenCalledTimes(2);

    onOpenLevel.mockClear();
    fireEvent.click(container.querySelector("td summary") as HTMLElement);
    fireEvent.click(container.querySelector("li summary") as HTMLElement);
    expect(onOpenLevel).not.toHaveBeenCalled();
  });

  it("omits subclass columns when there are none and shows chips otherwise", () => {
    const none = buildClassProgression({ ...cls, subclasses: [], subclassLevel: null });

    const { unmount } = render(<ClassProgressionMap progression={none} mode="dm" />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.queryByRole("navigation", { name: "classes.progression.subclass" })).toBeNull();
    unmount();

    render(<ClassProgressionMap progression={sheet()} mode="sheet" />);

    expect(screen.getByRole("button", { name: "Champion" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });
});
