// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackgroundSection } from "@/components/character-profile/path";
import type { SheetBackground } from "@/types/choices";

const bg: SheetBackground = { id: "b", name: "Sage", equipmentText: "Quill", picks: [], description: "Scholar", skills: ["arcana"], tools: ["Ink"], originFeat: { id: "f", name: "Magic Initiate" }, open: 0, openKey: null };

describe("BackgroundSection", () => {
  afterEach(cleanup);

  it("renders nothing without a background for a viewer who cannot edit", () => {
    const { container } = render(<BackgroundSection canEdit={false} onOpen={() => {}} />);

    expect(container.innerHTML).toBe("");
  });

  it("shows picks, equipment and the manual-equipment note", () => {
    render(<BackgroundSection background={{ ...bg, picks: [{ message: "characterProfile.sheet.abilityPick", params: { n: 2, ability: "intelligence" } }] }} canEdit={false} onOpen={() => {}} />);

    expect(screen.getByText(/characterProfile\.sheet\.abilityPick/)).toBeTruthy();
    expect(screen.getByText(/Quill/)).toBeTruthy();
    expect(screen.getByText(/equipmentNote/)).toBeTruthy();
  });

  it("empty + canEdit offers to choose", () => {
    const onOpen = vi.fn();

    render(<BackgroundSection canEdit onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.path.background.pick" }));

    expect(onOpen).toHaveBeenCalledWith("background");
  });

  it("chosen: shows data without buttons for a non-editor", () => {
    render(<BackgroundSection background={bg} canEdit={false} onOpen={() => {}} />);

    expect(screen.getByText(/Magic Initiate/)).toBeTruthy();
    expect(screen.getByText(/Ink/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("chosen + canEdit: Change opens the background step", () => {
    const onOpen = vi.fn();

    render(<BackgroundSection background={bg} canEdit onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.path.background.change" }));

    expect(onOpen).toHaveBeenCalledWith("background");
    expect(screen.queryByText(/path.background.open/)).toBeNull();
  });

  it("open picks: badge plus a button to the first open pick", () => {
    const onOpen = vi.fn();

    render(<BackgroundSection background={{ ...bg, open: 2, openKey: "backgroundChoices.x" }} canEdit onOpen={onOpen} />);

    expect(screen.getByText(/path.background.open/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "characterProfile.path.background.pick" }));

    expect(onOpen).toHaveBeenCalledWith("backgroundChoices.x");
  });
});
