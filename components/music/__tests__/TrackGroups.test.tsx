// @vitest-environment happy-dom
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackGroups } from "../TrackGroups";

import type { CampaignTrack } from "@/types/audio";

afterEach(cleanup);

const track = (id: string, title: string): CampaignTrack => ({ id, title, kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null, sortOrder: 0, createdAt: "" });

const tracks = [track("1", "Люди - Місто"), track("2", "Люди - Битва 1"), track("3", "Ельфи - Битва"), track("4", "Ельфи - Місто")];

function setup() {
  const actions = { onRename: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() };

  return { ...render(<TrackGroups tracks={tracks} busy={false} actions={actions} />), actions };
}

describe("TrackGroups", () => {
  it("групи за расами, усі битви — в окремій групі «Битва»", () => {
    const { getByRole } = setup();

    const battle = within(getByRole("region", { name: "Битва" }));

    expect(battle.getAllByRole("listitem")).toHaveLength(2);
    expect(battle.getByDisplayValue("Люди - Битва 1")).toBeTruthy();
    expect(battle.getByDisplayValue("Ельфи - Битва")).toBeTruthy();
    expect(within(getByRole("region", { name: "Люди" })).getAllByRole("listitem")).toHaveLength(1);
    expect(within(getByRole("region", { name: "Ельфи" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("групу можна згорнути", () => {
    const { getByRole, queryByDisplayValue } = setup();

    fireEvent.click(within(getByRole("region", { name: "Битва" })).getByRole("button", { expanded: true }));
    expect(queryByDisplayValue("Ельфи - Битва")).toBeNull();
  });

  it("пошук звужує список", () => {
    const { getByLabelText, queryByRole } = setup();

    fireEvent.change(getByLabelText("Пошук треку"), { target: { value: "місто" } });
    expect(queryByRole("region", { name: "Битва" })).toBeNull();
  });
});
