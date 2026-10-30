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

const template = () => buildClassProgression(cls);

describe("ClassProgressionMap", () => {
  afterEach(cleanup);

  it("renders 20 template rows plus the header", () => {
    const { container } = render(<ClassProgressionMap progression={template()} />);

    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(container.querySelectorAll('tr[data-state="template"]')).toHaveLength(20);
  });

  it("lists picks as plain text, never as buttons", () => {
    render(<ClassProgressionMap progression={template()} />);

    expect(screen.getAllByText(/ASI/).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /ASI|classes.progression.subclass/ })).toEqual([]);
  });

  it("onOpenLevel fires from table cells and mobile rows, not from details clicks", () => {
    const onOpenLevel = vi.fn();

    const { container } = render(<ClassProgressionMap progression={template()} actions={{ onOpenLevel }} />);

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

    const { unmount } = render(<ClassProgressionMap progression={none} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.queryByRole("navigation", { name: "classes.progression.subclass" })).toBeNull();
    unmount();

    render(<ClassProgressionMap progression={template()} />);

    expect(screen.getByRole("button", { name: "Champion" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });
});
