/**
 * @vitest-environment happy-dom
 */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackGroups } from "../TrackGroups";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { CampaignTrack } from "@/types/audio";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/music", () => ({
  useTrackPreview: () => ({ playingId: null, failedId: null, progress: null, toggle: vi.fn(), stop: vi.fn() }),
}));

const track = (id: string, title: string): CampaignTrack => ({ id, title, kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: 61, sortOrder: 0, createdAt: "" });

describe("TrackGroups en", () => {
  afterEach(cleanup);

  it("renders English labels and group markers without raw keys", async () => {
    const actions = { onRename: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() };

    await renderWithIntl(<TrackGroups tracks={[track("1", "Люди - Місто"), track("2", "Люди - Битва 1"), track("3", "Соло")]} busy={false} actions={actions} />, { locale: "en", namespaces: ["common", "validation", "music"] });

    expect(screen.getByRole("region", { name: "Battle" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Other" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Listen" })).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/music\./);
  });
});
