// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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

function Screen({ show = true, placement = "corner" }: { show?: boolean; placement?: "corner" | "strip" }) {
  return <BattleAudioProvider>{show && <BattleAudioDock placement={placement} />}</BattleAudioProvider>;
}

function dock(opts: { isDM?: boolean; audio?: BattleAudioState | null; placement?: "corner" | "strip" }) {
  const scene = fakeScene({ isDM: opts.isDM ?? false, audio: opts.audio ?? null });

  return render(<Screen placement={opts.placement} />, { wrapper: scene.wrapper });
}

function setWide(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide && query.includes("min-width"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
}

beforeEach(() => {
  setWide(true);
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

  it("YouTube: видимий плеєр 200×200 лише після увімкнення звуку; згорнута панель лишає той самий iframe (звук іде), лише ховає", () => {
    const { container, getByRole, queryByRole } = dock({ audio: ytTrack });

    expect(container.querySelector("[data-youtube-player]")).toBeNull();

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    const player = container.querySelector<HTMLElement>("[data-youtube-player]");

    expect(player?.style.width).toBe("200px");
    expect(player?.style.height).toBe("200px");

    fireEvent.click(getByRole("button", { name: "Згорнути плеєр" }));
    expect(container.querySelector("[data-youtube-player]")).toBe(player);
    expect(container.querySelector("[data-audio-panel]")?.className).toContain("sr-only");
    expect(queryByRole("region", { name: "Музика бою" })).toBeNull();

    fireEvent.click(getByRole("button", { name: /Розгорнути плеєр/ }));
    expect(container.querySelector("[data-youtube-player]")).toBe(player);
    expect(getByRole("region", { name: "Музика бою" })).toBeTruthy();
  });

  it("телефон: смуга й кут на вузькому екрані стартують згорнутими — чип із назвою треку", () => {
    setWide(false);

    for (const placement of ["strip", "corner"] as const) {
      const { getByRole, queryByRole, unmount } = dock({ audio: fileTrack, placement });

      expect(getByRole("button", { name: "Розгорнути плеєр: Бій у таверні" })).toBeTruthy();
      expect(queryByRole("region", { name: "Музика бою" })).toBeNull();
      unmount();
    }
  });

  it("телефон: у згорнутому чипі є «Увімкнути звук» — розблоковує в тому ж кліку, далі лишається чип", () => {
    setWide(false);

    const { getByRole, queryByRole, container } = dock({ audio: fileTrack, placement: "strip" });

    expect(queryByRole("region", { name: "Музика бою" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("https://s/1.mp3");
    expect(queryByRole("button", { name: "Увімкнути звук" })).toBeNull();
    expect(getByRole("button", { name: "Розгорнути плеєр: Бій у таверні" })).toBeTruthy();
  });

  it("один <audio> на сторінку: панель зникає й з'являється (Стоп, лобі → бій, 1024 px) — той самий розблокований елемент", () => {
    const { container, getByRole, rerender } = dock({ audio: fileTrack });

    const el = container.querySelector("audio");

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));
    rerender(<Screen show={false} />);
    expect(container.querySelector("audio")).toBe(el);

    rerender(<Screen placement="strip" />);
    expect(container.querySelector("audio")).toBe(el);
    expect(el?.getAttribute("src")).toBe("https://s/1.mp3");
  });

  it("play() поза жестом відхилено (NotAllowedError) — знову «Увімкнути звук»", async () => {
    const { getByRole, findByRole } = dock({ audio: fileTrack });

    const blocked = Object.assign(new Error("blocked"), { name: "NotAllowedError" });

    vi.mocked(HTMLMediaElement.prototype.play).mockResolvedValueOnce(undefined).mockRejectedValue(blocked);

    await act(async () => fireEvent.click(getByRole("button", { name: "Увімкнути звук" })));

    expect(await findByRole("button", { name: "Увімкнути звук" })).toBeTruthy();
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

  it("подвійний клік «Пауза» — одна команда", async () => {
    const { getByRole } = dock({ isDM: true, audio: fileTrack });

    const pause = getByRole("button", { name: "Пауза" });

    fireEvent.click(pause);
    fireEvent.click(pause);

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledTimes(1));
  });

  it("клік по поточному треку на паузі — resume з місця паузи, а не play з нуля", async () => {
    const { findByRole } = dock({ isDM: true, audio: { ...fileTrack, playing: false, offsetSec: 19.5 } });

    fireEvent.click(await findByRole("button", { name: /Бій у таверні/, current: true }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "resume" }));
    expect(sendBattleAudio).toHaveBeenCalledTimes(1);
  });

  it("на паузі кнопка — «Грати» → resume", async () => {
    const { getByRole } = dock({ isDM: true, audio: { ...fileTrack, playing: false } });

    fireEvent.click(getByRole("button", { name: "Грати" }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "resume" }));
  });
});
