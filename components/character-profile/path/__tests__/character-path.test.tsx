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

describe("CharacterPath summary", () => {
  afterEach(cleanup);

  it("anchors on the current level and counts what waits for a choice", () => {
    render(<CharacterPath progression={progression()} />);

    expect(screen.getByText(/characterProfile\.path\.summary \{"level":4,"cls":"Fighter"\}/)).toBeTruthy();
    expect(screen.getByText('characterProfile.path.summaryOpen {"count":1}')).toBeTruthy();
  });

  it("keeps an open pick from an earlier level visible, not folded into the reached group", () => {
    const late = buildClassProgression(makeClass({ id: "f", features: [{ level: 1, abilities: [], choices: [{ id: "order", label: "Order", level: 1, count: 1, kind: "option" }] }] }), { classId: "f", level: 5 });

    const { container } = render(<CharacterPath progression={late} actions={{ onPick: vi.fn() }} />);

    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByRole("button", { name: /Order/ })).toBeTruthy();
  });
});

describe("CharacterPath pending marker", () => {
  afterEach(cleanup);

  it("a reached level that still waits for a choice is not labelled as gained", () => {
    const late = buildClassProgression(makeClass({ id: "f", features: [{ level: 1, abilities: [], choices: [{ id: "order", label: "Order", level: 1, count: 1, kind: "option" }] }] }), { classId: "f", level: 5 });

    render(<CharacterPath progression={late} />);

    expect(screen.getByText("characterProfile.path.state.waiting")).toBeTruthy();
    expect(screen.queryByText("characterProfile.path.state.reached")).toBeNull();
  });
});

describe("CharacterPath chosen subclass", () => {
  afterEach(cleanup);

  it("names the subclass once it is chosen", () => {
    const sub = makeClass({ id: "f", subclassLevel: 3, subclasses: [{ id: "champ", name: "Champion", features: [] }], features: [{ level: 1, abilities: [makeAbility("a1", "Second Wind", "Heal")] }] });

    render(<CharacterPath progression={buildClassProgression(sub, { classId: "f", level: 4, subclassId: "champ" })} />);
    fireEvent.click(screen.getByText(/characterProfile\.path\.reached/));

    expect(screen.getByText('characterProfile.path.done {"label":"Champion"}')).toBeTruthy();
  });
});

describe("CharacterPath what was chosen", () => {
  afterEach(cleanup);

  it("spells the choice out with names from the sheet and translated skills", () => {
    const c = makeClass({ id: "f", features: [{ level: 1, abilities: [], choices: [{ id: "cantrips", label: "Cantrips", level: 1, count: 2, kind: "spell" }, { id: "skills", label: "Skills", level: 1, count: 1, kind: "skill" }] }] });

    const p = buildClassProgression(c, { classId: "f", level: 2, choices: { cantrips: [{ id: "sp-1" }, { id: "sp-2" }], skills: [{ id: "insight" }] } });

    render(<CharacterPath progression={p} names={{ "sp-1": "Guidance", "sp-2": "Light" }} />);
    fireEvent.click(screen.getByText(/characterProfile\.path\.reached/));

    expect(screen.getByText('characterProfile.path.doneWith {"label":"Cantrips","chosen":"Guidance, Light"}')).toBeTruthy();
    expect(screen.getByText('characterProfile.path.doneWith {"label":"Skills","chosen":"gameTerms.dndSkills.insight"}')).toBeTruthy();
  });
});
