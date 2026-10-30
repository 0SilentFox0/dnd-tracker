// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterPath } from "@/components/character-profile/path";
import { makeAbility, makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import { buildClassProgression } from "@/lib/utils/characters/classes/progression";

const cls = makeClass({
  id: "f",
  features: [
    { level: 1, abilities: [makeAbility("a1", "Second Wind", "Heal yourself.\n\nLong rules text.")] },
    { level: 4, abilities: [], choices: [{ id: "asi4", label: "ASI", level: 4, count: 1, kind: "feat" }] },
    { level: 5, abilities: [makeAbility("a5", "Extra Attack", "Hit twice.")] },
    { level: 9, abilities: [makeAbility("a9", "Indomitable", "Reroll a save.")] },
  ],
});

const progression = () => buildClassProgression(cls, { classId: "f", level: 4 });

describe("CharacterPath", () => {
  afterEach(cleanup);

  it("shows current and next levels expanded, reached and future inside collapsed groups", () => {
    const { container } = render(<CharacterPath progression={progression()} />);

    expect(container.querySelector('section[data-state="current"]')).toBeTruthy();
    expect(container.querySelector('section[data-state="next"]')).toHaveTextContent("Extra Attack");
    expect(container.querySelector('details section[data-state="reached"]')).toHaveTextContent("Second Wind");
    expect(container.querySelector('details section[data-state="future"]')).toHaveTextContent("Indomitable");
  });

  it("tells where each feature came from", () => {
    render(<CharacterPath progression={progression()} />);

    expect(screen.getByText('characterProfile.path.from {"cls":"Fighter","level":5}')).toBeTruthy();
  });

  it("open pick is a button only when actions are given", () => {
    const onPick = vi.fn();

    const { rerender } = render(<CharacterPath progression={progression()} actions={{ onPick }} />);

    fireEvent.click(screen.getByRole("button", { name: /ASI/ }));
    expect(onPick).toHaveBeenCalledTimes(1);

    rerender(<CharacterPath progression={progression()} />);
    expect(screen.queryByRole("button", { name: /ASI/ })).toBeNull();
    expect(screen.getByText(/ASI/)).toBeTruthy();
  });

  it("locked future pick says when it opens", () => {
    const locked = buildClassProgression(makeClass({ id: "f", features: [{ level: 8, abilities: [], choices: [{ id: "asi8", label: "ASI", level: 8, count: 1, kind: "feat" }] }] }), { classId: "f", level: 4 });

    render(<CharacterPath progression={locked} />);

    expect(screen.getByText('characterProfile.path.unlocksAt {"label":"ASI","level":8}')).toBeTruthy();
  });

  it("full text opens on demand and the card never truncates", () => {
    const { container } = render(<CharacterPath progression={progression()} />);

    expect(screen.queryByText(/Long rules text/)).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Second Wind/ })[0]);

    expect(screen.getByText(/Long rules text/)).toBeTruthy();
    expect(container.innerHTML).not.toContain("truncate");
  });
});
