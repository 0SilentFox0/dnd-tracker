// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackList } from "../TrackList";

import type { CampaignTrack } from "@/types/audio";

afterEach(cleanup);

const track = (id: string, kind: CampaignTrack["kind"] = "file"): CampaignTrack => ({ id, title: `Трек ${id}`, kind, url: null, youtubeId: kind === "youtube" ? "dQw4w9WgXcQ" : null, durationSec: 61, sortOrder: 0, createdAt: "" });

function setup() {
  const actions = { onRename: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() };

  const view = render(<TrackList tracks={[track("a"), track("b", "youtube")]} busy={false} actions={actions} />);

  return { ...view, actions };
}

describe("TrackList", () => {
  it("назва, тип і тривалість; крайні стрілки вимкнені", () => {
    const { getByText, getByDisplayValue, getAllByRole } = setup();

    expect(getByDisplayValue("Трек a")).toBeTruthy();
    expect(getByText("MP3 · 1:01")).toBeTruthy();
    expect(getByText("YouTube")).toBeTruthy();
    expect((getAllByRole("button", { name: "Вище" })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((getAllByRole("button", { name: "Нижче" })[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it("стрілка, видалення й перейменування викликають дії", () => {
    const { getAllByRole, getAllByLabelText, actions } = setup();

    fireEvent.click(getAllByRole("button", { name: "Нижче" })[0]);
    expect(actions.onMove).toHaveBeenCalledWith(0, 1);

    fireEvent.click(getAllByRole("button", { name: "Видалити" })[1]);
    expect(actions.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));

    const input = getAllByLabelText("Назва треку")[0];

    fireEvent.change(input, { target: { value: "Таверна" } });
    fireEvent.blur(input);
    expect(actions.onRename).toHaveBeenCalledWith("a", "Таверна");
  });

  it("незмінена або порожня назва — без перейменування", () => {
    const { getAllByLabelText, actions } = setup();

    const input = getAllByLabelText("Назва треку")[0];

    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(actions.onRename).not.toHaveBeenCalled();
  });
});
