// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiProposalBadge, AiProposalCard } from "@/components/ai";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const base = { id: "ap1", pageId: "p1", threadId: "t1", summary: "Похмуріший вхід", appliedVersion: null, createdAt: "", ops: [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: doc("Дзвони мовчать"), before: { story: doc("Дзвони б'ють"), notes: doc("") } }] } as const;

afterEach(cleanup);

const actions = () => ({ onApply: vi.fn(), onReject: vi.fn(), onRedo: vi.fn() });

describe("AiProposalCard", () => {
  it("pending: було → стало, застосувати/відхилити", () => {
    const a = actions();

    render(<AiProposalCard proposal={{ ...base, status: "pending" } as never} actions={a} busy={false} campaignId="c1" />);
    expect(screen.getByText("Похмуріший вхід")).toBeTruthy();
    expect(screen.getByText("Дзвони б'ють")).toBeTruthy();
    expect(screen.getByText("Дзвони мовчать")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));
    expect(a.onApply).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Відхилити" }));
    expect(a.onReject).toHaveBeenCalled();
  });

  it("replaceRow, що втрачає виноски, — попередження", () => {
    const callout = { type: "callout", attrs: { kind: "check", tag: "" }, content: [doc("x").content[0]] };

    const op = { ...base.ops[0], before: { story: { type: "doc", content: [callout, callout, callout] }, notes: doc("") } };

    render(<AiProposalCard proposal={{ ...base, ops: [op], status: "pending" } as never} actions={actions()} busy={false} campaignId="c1" />);
    expect(screen.getByText("Увага: правка видаляє 3 виноски")).toBeTruthy();
  });

  it("addSlide: прев'ю, ціль і «Додати слайд»", () => {
    const a = actions();

    const ops = [{ op: "addSlide", deckId: "d1", deckTitle: "Собор", slide: { id: "s", imageUrl: "https://x/i.webp", title: "Вхід" } }];

    render(<AiProposalCard proposal={{ ...base, ops, status: "pending" } as never} actions={a} busy={false} campaignId="c1" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://x/i.webp");
    expect(screen.getByText("У набір «Собор»")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Додати слайд" }));
    expect(a.onApply).toHaveBeenCalled();
  });

  it("addSlide без набору: новий набір для сцени", () => {
    const ops = [{ op: "addSlide", deckId: null, slide: { id: "s", imageUrl: "https://x/i.webp" } }];

    render(<AiProposalCard proposal={{ ...base, ops, status: "pending" } as never} actions={actions()} busy={false} campaignId="c1" />);
    expect(screen.getByText("Новий набір для сцени")).toBeTruthy();
  });

  it("stale: пояснення і «Переробити»", () => {
    const a = actions();

    render(<AiProposalCard proposal={{ ...base, status: "stale" } as never} actions={a} busy={false} campaignId="c1" />);
    expect(screen.getByText("Фрагмент змінився після пропозиції")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Переробити" }));
    expect(a.onRedo).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Застосувати" })).toBeNull();
  });

  it("applied: лише статус", () => {
    render(<AiProposalCard proposal={{ ...base, status: "applied", appliedVersion: 4 } as never} actions={actions()} busy={false} campaignId="c1" />);
    expect(screen.getByText("Застосовано")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("AiProposalBadge", () => {
  it("count 0 — нічого; інакше число", () => {
    const onClick = vi.fn();

    const { container, rerender } = render(<AiProposalBadge count={0} onClick={onClick} />);

    expect(container.firstChild).toBeNull();
    rerender(<AiProposalBadge count={2} onClick={onClick} />);
    fireEvent.click(screen.getByText("2"));
    expect(onClick).toHaveBeenCalled();
  });
});
