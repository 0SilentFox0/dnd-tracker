// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tiptap/react", () => ({
  ReactRenderer: class {
    element = document.createElement("div");

    ref = null;

    updateProps = vi.fn();

    destroy = vi.fn();
  },
}));
vi.mock("@/components/scenario/editor/MentionList", () => ({ MentionList: () => null }));

import { mentionSuggestion } from "@/components/scenario/editor/mention-suggestion";

const lifecycle = () => {
  const render = mentionSuggestion(async () => [])?.render?.();

  if (!render) throw new Error("no render");

  return render;
};

const props = (rect: { left: number; top: number; bottom: number } | null, coords = { left: 5, top: 5, bottom: 20 }) =>
  ({ clientRect: rect && (() => rect), editor: { view: { coordsAtPos: () => coords } }, range: { from: 0, to: 1 } }) as never;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("mentionSuggestion render", () => {
  it("кладе список під каретку з position: fixed", () => {
    const r = lifecycle();

    r.onStart?.(props({ left: 100, top: 200, bottom: 220 }));

    const el = document.body.firstElementChild as HTMLElement;

    expect(el.style.position).toBe("fixed");
    expect(el.style.left).toBe("100px");
    expect(el.style.top).toBe("226px");

    r.onUpdate?.(props({ left: 120, top: 300, bottom: 320 }));
    expect(el.style.left).toBe("120px");
    expect(el.style.top).toBe("326px");
  });

  it("без clientRect бере координати каретки з редактора", () => {
    const r = lifecycle();

    r.onStart?.(props(null));

    const el = document.body.firstElementChild as HTMLElement;

    expect(el.style.position).toBe("fixed");
    expect(el.style.left).toBe("5px");
    expect(el.style.top).toBe("26px");
  });

  it("біля нижнього краю відкривається над кареткою, а правий край затискається", () => {
    const r = lifecycle();

    r.onStart?.(props({ left: window.innerWidth - 10, top: window.innerHeight - 30, bottom: window.innerHeight - 10 }));

    const el = document.body.firstElementChild as HTMLElement;

    expect(Number.parseFloat(el.style.top)).toBe(window.innerHeight - 30 - 6 - 288);
    expect(Number.parseFloat(el.style.left)).toBe(window.innerWidth - 288 - 6);
  });
});
