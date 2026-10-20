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
});
