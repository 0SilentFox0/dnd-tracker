// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleAudioDock } from "../BattleAudioDock";
import { BattleAudioProvider } from "../BattleAudioProvider";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { getTracks } from "@/lib/api/tracks";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn(() => new Promise(() => undefined)), sendBattleAudio: vi.fn(async () => ({ audio: null, clockOffsetMs: 0 })) }));
vi.mock("@/lib/api/tracks", () => ({ getTracks: vi.fn() }));
vi.mock("@/lib/utils/audio/youtube-iframe-api", () => ({ YT_STATE: { PLAYING: 1, PAUSED: 2 }, loadYoutubeIframeApi: vi.fn(() => new Promise(() => undefined)) }));

const fileTrack: BattleAudioState = { trackId: "t1", track: { title: "Бій у таверні", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 0, seq: 1 };

const ytTrack: BattleAudioState = { ...fileTrack, trackId: "t2", track: { title: "Епік", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null } };

function dock(opts: { isDM?: boolean; audio?: BattleAudioState | null }) {
  const scene = fakeScene({ isDM: opts.isDM ?? false, audio: opts.audio ?? null });

  const Wrapper = scene.wrapper;

  return render(
    <Wrapper>
      <BattleAudioProvider>
        <BattleAudioDock placement="corner" />
      </BattleAudioProvider>
    </Wrapper>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  vi.mocked(getTracks).mockResolvedValue([
    { id: "t1", title: "Бій у таверні", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100, sortOrder: 0, createdAt: "" },
    { id: "t2", title: "Епік", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null, sortOrder: 1, createdAt: "" },
  ]);
});

afterEach(cleanup);

describe("BattleAudioDock — гравець", () => {
  it("без треку — нічого", () => {
    const { container } = dock({ audio: null });

    expect(container.querySelector("[data-battle-audio]")).toBeNull();
  });

  it("назва й «Увімкнути звук»; без керування треком", () => {
    const { getByText, getByRole, queryByRole } = dock({ audio: fileTrack });

    expect(getByText("Бій у таверні")).toBeTruthy();
    expect(getByRole("button", { name: "Увімкнути звук" })).toBeTruthy();
    expect(queryByRole("button", { name: "Пауза" })).toBeNull();
    expect(queryByRole("list", { name: "Бібліотека музики" })).toBeNull();
  });

  it("клік «Увімкнути звук» — play у жесті, далі гучність і вимкнення звуку (запамʼятовується)", () => {
    const { getByRole, queryByRole } = dock({ audio: fileTrack });

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(queryByRole("button", { name: "Увімкнути звук" })).toBeNull();

    fireEvent.change(getByRole("slider", { name: "Гучність" }), { target: { value: "0.3" } });
    expect(localStorage.getItem("battle-music-volume")).toBe("0.3");

    fireEvent.click(getByRole("button", { name: "Вимкнути звук у мене" }));
    expect(localStorage.getItem("battle-music-muted")).toBe("on");
  });

  it("YouTube: видимий плеєр 200×200 лише після увімкнення звуку; згортання прибирає iframe", () => {
    const { container, getByRole } = dock({ audio: ytTrack });

    expect(container.querySelector("[data-youtube-player]")).toBeNull();

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    const player = container.querySelector<HTMLElement>("[data-youtube-player]");

    expect(player?.style.width).toBe("200px");
    expect(player?.style.height).toBe("200px");

    fireEvent.click(getByRole("button", { name: "Згорнути плеєр" }));
    expect(container.querySelector("[data-youtube-player]")).toBeNull();
    expect(getByRole("button", { name: /Розгорнути плеєр/ })).toBeTruthy();
  });
});

describe("BattleAudioDock — ДМ", () => {
  it("без треку бачить бібліотеку; клік по треку — play", async () => {
    const { findByRole } = dock({ isDM: true, audio: null });

    fireEvent.click(await findByRole("button", { name: /Епік/ }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "play", trackId: "t2" }));
  });

  it("грає — пауза, наступний, попередній, стоп (кнопки вимкнені, поки команда в дорозі)", async () => {
    const { getByRole } = dock({ isDM: true, audio: fileTrack });

    const steps: Array<[string, string]> = [["Пауза", "pause"], ["Наступний трек", "next"], ["Попередній трек", "prev"], ["Стоп", "stop"]];

    for (const [name, action] of steps) {
      await waitFor(() => expect((getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false));
      fireEvent.click(getByRole("button", { name }));
      await waitFor(() => expect(sendBattleAudio).toHaveBeenLastCalledWith("c1", "b1", { action }));
    }
  });

  it("на паузі кнопка — «Грати» → resume", async () => {
    const { getByRole } = dock({ isDM: true, audio: { ...fileTrack, playing: false } });

    fireEvent.click(getByRole("button", { name: "Грати" }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "resume" }));
  });
});
