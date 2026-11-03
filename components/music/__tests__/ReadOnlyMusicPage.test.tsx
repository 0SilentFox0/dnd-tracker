// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ toggle: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/hooks/music", () => ({ useTrackPreview: () => ({ playingId: null, failedId: null, progress: null, toggle: mocks.toggle, stop: vi.fn() }) }));

import { ReadOnlyMusicPage } from "@/components/music/ReadOnlyMusicPage";
import type { CampaignTrack } from "@/types/audio";

afterEach(() => { cleanup(); mocks.toggle.mockClear(); });

const tracks: CampaignTrack[] = [
  { id: "file1", title: "Rain", kind: "file", url: "https://cdn.test/rain.mp3", youtubeId: null, durationSec: 12, sortOrder: 0, createdAt: "" },
  { id: "yt1", title: "Tavern", kind: "youtube", url: null, youtubeId: "video123", durationSec: 15, sortOrder: 1, createdAt: "" },
];

describe("ReadOnlyMusicPage", () => {
  it("uses the shared preview hook instead of mounting an audio or iframe player for every track", () => {
    const { container } = render(<ReadOnlyMusicPage tracks={tracks} />);
    const buttons = screen.getAllByRole("button", { name: "music.list.play" });

    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(mocks.toggle).toHaveBeenCalledWith(tracks[0]);
    expect(container.querySelector("audio, iframe")).toBeNull();
  });
});
