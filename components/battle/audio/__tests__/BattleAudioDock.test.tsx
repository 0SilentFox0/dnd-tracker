// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleAudioDock } from "../BattleAudioDock";
import { BattleAudioProvider } from "../BattleAudioProvider";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { getTracks, updateTrack } from "@/lib/api/tracks";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { audioState, campaignTrack, fileTrack, stubMediaElement, youtubeTrack } from "@/lib/utils/audio/__tests__/fixtures";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn(() => new Promise(() => undefined)), sendBattleAudio: vi.fn(async () => ({ audio: null, clockOffsetMs: 0 })) }));
vi.mock("@/lib/api/tracks", () => ({ getTracks: vi.fn(), updateTrack: vi.fn(async () => ({})) }));

const yt = vi.hoisted(() => ({ needsTap: false }));

vi.mock("@/lib/hooks/battle/useYoutubeSync", () => ({ useYoutubeSync: () => ({ ref: () => undefined, needsTap: yt.needsTap, failed: false }) }));

const fileState = audioState({ track: { ...fileTrack, title: "Бій у таверні" } });

const ytState = audioState({ trackId: "t2", track: youtubeTrack });

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
  yt.needsTap = false;
  stubMediaElement();
  vi.mocked(getTracks).mockResolvedValue([
    campaignTrack({ title: "Бій у таверні" }),
    campaignTrack({ id: "t2", ...youtubeTrack, sortOrder: 1 }),
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
    const { getByText, getByRole, queryByRole } = dock({ audio: fileState });

    expect(getByText("Бій у таверні")).toBeTruthy();
    expect(getByRole("button", { name: "Увімкнути звук" })).toBeTruthy();
    expect(queryByRole("button", { name: "Пауза" })).toBeNull();
    expect(queryByRole("list", { name: "Бібліотека музики" })).toBeNull();
  });

  it("клік «Увімкнути звук» — play у жесті, далі гучність і вимкнення звуку (запамʼятовується)", () => {
    const { getByRole, queryByRole } = dock({ audio: fileState });

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(queryByRole("button", { name: "Увімкнути звук" })).toBeNull();

    fireEvent.change(getByRole("slider", { name: "Гучність" }), { target: { value: "0.3" } });
    expect(localStorage.getItem("battle-music-volume")).toBe("0.3");

    fireEvent.click(getByRole("button", { name: "Вимкнути звук у мене" }));
    expect(localStorage.getItem("battle-music-muted")).toBe("on");
  });

  it("YouTube: видимий плеєр 200×200 лише після увімкнення звуку; згорнута панель лишає той самий iframe (звук іде), лише ховає", () => {
    const { container, getByRole, queryByRole } = dock({ audio: ytState });

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
      const { getByRole, queryByRole, unmount } = dock({ audio: fileState, placement });

      expect(getByRole("button", { name: "Розгорнути плеєр: Бій у таверні" })).toBeTruthy();
      expect(queryByRole("region", { name: "Музика бою" })).toBeNull();
      unmount();
    }
  });

  it("телефон: у згорнутому чипі є «Увімкнути звук» — розблоковує в тому ж кліку, далі лишається чип", () => {
    setWide(false);

    const { getByRole, queryByRole, container } = dock({ audio: fileState, placement: "strip" });

    expect(queryByRole("region", { name: "Музика бою" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("https://s/1.mp3");
    expect(queryByRole("button", { name: "Увімкнути звук" })).toBeNull();
    expect(getByRole("button", { name: "Розгорнути плеєр: Бій у таверні" })).toBeTruthy();
  });

  it("один <audio> на сторінку: панель зникає й з'являється (Стоп, лобі → бій, 1024 px) — той самий розблокований елемент", () => {
    const { container, getByRole, rerender } = dock({ audio: fileState });

    const el = container.querySelector("audio");

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));
    rerender(<Screen show={false} />);
    expect(container.querySelector("audio")).toBe(el);

    rerender(<Screen placement="strip" />);
    expect(container.querySelector("audio")).toBe(el);
    expect(el?.getAttribute("src")).toBe("https://s/1.mp3");
  });

  it("play() поза жестом відхилено (NotAllowedError) — знову «Увімкнути звук»", async () => {
    const { getByRole, findByRole } = dock({ audio: fileState });

    const blocked = Object.assign(new Error("blocked"), { name: "NotAllowedError" });

    vi.mocked(HTMLMediaElement.prototype.play).mockResolvedValueOnce(undefined).mockRejectedValue(blocked);

    await act(async () => fireEvent.click(getByRole("button", { name: "Увімкнути звук" })));

    expect(await findByRole("button", { name: "Увімкнути звук" })).toBeTruthy();
  });
});

describe("BattleAudioDock — ДМ", () => {
  it("без треку бачить бібліотеку; клік по треку — play", async () => {
    const { findByRole } = dock({ isDM: true, audio: null });

    fireEvent.click(await findByRole("button", { name: "▶ Епік" }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "play", trackId: "t2" }));
  });

  it("грає — пауза, наступний, попередній, стоп (кнопки вимкнені, поки команда в дорозі)", async () => {
    const { getByRole } = dock({ isDM: true, audio: fileState });

    const steps: Array<[string, string]> = [["Пауза", "pause"], ["Наступний трек", "next"], ["Попередній трек", "prev"], ["Стоп", "stop"]];

    for (const [name, action] of steps) {
      await waitFor(() => expect((getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false));
      fireEvent.click(getByRole("button", { name }));
      await waitFor(() => expect(sendBattleAudio).toHaveBeenLastCalledWith("c1", "b1", { action }));
    }
  });

  it("подвійний клік «Пауза» — одна команда", async () => {
    const { getByRole } = dock({ isDM: true, audio: fileState });

    const pause = getByRole("button", { name: "Пауза" });

    fireEvent.click(pause);
    fireEvent.click(pause);

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledTimes(1));
  });

  it("клік по поточному треку на паузі — play саме цього треку з початку, одна команда", async () => {
    const { findByRole } = dock({ isDM: true, audio: { ...fileState, playing: false, offsetSec: 19.5 } });

    fireEvent.click(await findByRole("button", { name: "♪ Бій у таверні", current: true }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "play", trackId: "t1" }));
    expect(sendBattleAudio).toHaveBeenCalledTimes(1);
  });

  it("на паузі кнопка — «Грати» → resume", async () => {
    const { getByRole } = dock({ isDM: true, audio: { ...fileState, playing: false } });

    fireEvent.click(getByRole("button", { name: "Грати" }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "resume" }));
  });

  it("подвійний клік по треку плейлиста — одна команда play з цим trackId", async () => {
    const { findByRole } = dock({ isDM: true, audio: fileState });

    const row = await findByRole("button", { name: "▶ Епік" });

    fireEvent.click(row);
    fireEvent.click(row);

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "play", trackId: "t2" }));
    expect(sendBattleAudio).toHaveBeenCalledTimes(1);
  });

  it("плейлист: усі треки бібліотеки в її порядку, поточний виділений", async () => {
    const { findByRole } = dock({ isDM: true, audio: fileState });

    const list = await findByRole("list", { name: "Плейлист" });

    await waitFor(() => expect(list.querySelectorAll("li")).toHaveLength(2));
    expect([...list.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["♪ Бій у таверні", "▶ Епік"]);
    expect(list.querySelector("[aria-current=true]")?.textContent).toContain("Бій у таверні");
  });

  it("плейлист згортається, і це запамʼятовується на пристрої", async () => {
    const first = dock({ isDM: true, audio: fileState });

    await first.findByRole("list", { name: "Плейлист" });

    fireEvent.click(first.getByRole("button", { name: "Плейлист", expanded: true }));
    expect(first.queryByRole("list", { name: "Плейлист" })).toBeNull();
    expect(localStorage.getItem("battle-music-playlist")).toBe("off");
    first.unmount();

    const second = dock({ isDM: true, audio: fileState });

    expect(second.getByRole("button", { name: "Плейлист", expanded: false })).toBeTruthy();
    expect(second.queryByRole("list", { name: "Плейлист" })).toBeNull();
  });

  it("перейменування: олівець → поле, Enter зберігає назву бібліотеки; команд музики немає", async () => {
    const { findByRole, getByRole, queryByRole } = dock({ isDM: true, audio: fileState });

    fireEvent.click(await findByRole("button", { name: "Перейменувати: Епік" }));

    const input = getByRole("textbox", { name: "Нова назва треку" });

    fireEvent.change(input, { target: { value: "  Фінальна битва " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(updateTrack).toHaveBeenCalledWith("c1", "t2", { title: "Фінальна битва" }));
    expect(updateTrack).toHaveBeenCalledTimes(1);
    expect(queryByRole("textbox", { name: "Нова назва треку" })).toBeNull();
    expect(sendBattleAudio).not.toHaveBeenCalled();
  });

  it("перейменування: Esc скасовує, порожня назва не зберігається, blur зберігає", async () => {
    const { findByRole, getByRole } = dock({ isDM: true, audio: fileState });

    fireEvent.click(await findByRole("button", { name: "Перейменувати: Епік" }));
    fireEvent.change(getByRole("textbox", { name: "Нова назва треку" }), { target: { value: "Інша" } });
    fireEvent.keyDown(getByRole("textbox", { name: "Нова назва треку" }), { key: "Escape" });

    fireEvent.click(getByRole("button", { name: "Перейменувати: Епік" }));
    fireEvent.change(getByRole("textbox", { name: "Нова назва треку" }), { target: { value: "   " } });
    fireEvent.keyDown(getByRole("textbox", { name: "Нова назва треку" }), { key: "Enter" });
    expect(updateTrack).not.toHaveBeenCalled();

    fireEvent.click(getByRole("button", { name: "Перейменувати: Епік" }));
    fireEvent.change(getByRole("textbox", { name: "Нова назва треку" }), { target: { value: "Буря" } });
    fireEvent.blur(getByRole("textbox", { name: "Нова назва треку" }));

    await waitFor(() => expect(updateTrack).toHaveBeenCalledWith("c1", "t2", { title: "Буря" }));
    expect(updateTrack).toHaveBeenCalledTimes(1);
  });
});

describe("BattleAudioDock — плейлист лише для ДМ", () => {
  it("гравець не бачить плейлиста й олівців", () => {
    const { queryByRole } = dock({ audio: fileState });

    expect(queryByRole("button", { name: "Плейлист" })).toBeNull();
    expect(queryByRole("list", { name: "Плейлист" })).toBeNull();
    expect(queryByRole("button", { name: /Перейменувати/ })).toBeNull();
    expect(getTracks).not.toHaveBeenCalled();
  });
});

describe("BattleAudioDock — перемикач «Відео»", () => {
  it("лише для YouTube-треку", () => {
    const { queryByRole } = dock({ audio: fileState });

    expect(queryByRole("button", { name: "Відео" })).toBeNull();
  });

  it("ховає лише відео: iframe той самий, панель і звук лишаються; запамʼятовується", () => {
    const { container, getByRole } = dock({ audio: ytState });

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    const player = container.querySelector<HTMLElement>("[data-youtube-player]");

    const toggle = getByRole("button", { name: "Відео", pressed: true });

    fireEvent.click(toggle);

    expect(container.querySelector("[data-youtube-player]")).toBe(player);
    expect(container.querySelector("[data-youtube-video]")?.className).toContain("sr-only");
    expect(getByRole("region", { name: "Музика бою" })).toBeTruthy();
    expect(getByRole("slider", { name: "Гучність" })).toBeTruthy();
    expect(getByRole("button", { name: "Відео", pressed: false })).toBeTruthy();
    expect(localStorage.getItem("battle-music-video")).toBe("off");
    expect(sendBattleAudio).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();

    fireEvent.click(getByRole("button", { name: "Відео", pressed: false }));
    expect(container.querySelector("[data-youtube-video]")?.className).not.toContain("sr-only");
    expect(player?.style.width).toBe("200px");
  });

  it("iOS просить дотик до ▶ — відео показується, а згорнута панель на телефоні розгортається", () => {
    setWide(false);
    localStorage.setItem("battle-music-video", "off");

    const { container, getByRole, rerender } = dock({ audio: ytState, placement: "strip" });

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));
    expect(container.querySelector("[data-audio-panel]")?.getAttribute("data-audio-panel")).toBe("collapsed");

    yt.needsTap = true;
    rerender(<Screen placement="strip" />);

    expect(container.querySelector("[data-audio-panel]")?.getAttribute("data-audio-panel")).toBe("open");
    expect(container.querySelector("[data-youtube-video]")?.getAttribute("data-youtube-video")).toBe("shown");
  });
});

describe("BattleAudioDock — розташування", () => {
  it("телефон: згорнутий чип зліва над смугою ходу", () => {
    setWide(false);

    const { container } = dock({ audio: fileState, placement: "strip" });

    const inner = container.querySelector("[data-battle-audio=strip]")?.firstElementChild;

    expect(inner?.className).toContain("left-2");
    expect(inner?.className).not.toContain("right-2");
  });

  it("кут: сам не fixed — позицію дає CornerStack", () => {
    const { container } = dock({ audio: fileState });

    expect(container.querySelector("[data-battle-audio=corner]")?.className).not.toContain("fixed");
  });
});
