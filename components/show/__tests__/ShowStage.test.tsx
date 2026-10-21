// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShowStage } from "../stage/ShowStage";

vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }));

afterEach(cleanup);

const show = (over = {}) => ({ deckId: "d1", deckTitle: "Таверна", slide: { id: "slide-0001", imageUrl: "https://x.supabase.co/a.webp", title: "Корчма «Гриф»", caption: "Минуло три дні" }, nextImageUrl: "https://x.supabase.co/b.webp", audio: null, seq: 1, ...over });

describe("ShowStage", () => {
  it("картинка, титр і попереднє завантаження наступної", () => {
    const { container } = render(<ShowStage show={show()} />);

    expect(screen.getByText("Корчма «Гриф»")).toBeTruthy();
    expect(screen.getByText("Минуло три дні")).toBeTruthy();
    expect(container.querySelector("[data-slide-preload] img")?.getAttribute("src")).toBe("https://x.supabase.co/b.webp");
  });

  it("показ не йде — очікування", () => {
    render(<ShowStage show={show({ deckId: null, slide: null, nextImageUrl: null })} />);

    expect(screen.getByText("ДМ ще не почав показ")).toBeTruthy();
  });

  it("заглушка ввімкнена — картинка заглушки замість слайда, наступна все одно вантажиться", () => {
    const cover = { deckId: "d2", slide: { id: "slide-0009", imageUrl: "https://x.supabase.co/cover.webp", title: "Перерва" } };

    const { container } = render(<ShowStage show={show({ curtain: true, cover })} />);

    expect(screen.getByText("Перерва")).toBeTruthy();
    expect(screen.queryByText("Корчма «Гриф»")).toBeNull();
    expect(container.querySelector("[data-slide-preload] img")).toBeTruthy();
  });

  it("показ не йде, але заглушку задано — її картинка", () => {
    render(<ShowStage show={show({ deckId: null, slide: null, nextImageUrl: null, cover: { deckId: "d2", slide: { id: "slide-0009", imageUrl: "https://x.supabase.co/cover.webp", title: "Скоро" } } })} />);

    expect(screen.getByText("Скоро")).toBeTruthy();
    expect(screen.queryByText("ДМ ще не почав показ")).toBeNull();
  });

  it("заглушка без картинки — стандартний екран перерви", () => {
    render(<ShowStage show={show({ curtain: true })} />);

    expect(screen.getByText("Перерва — скоро продовжимо")).toBeTruthy();
  });
});
