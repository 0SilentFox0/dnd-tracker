// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantHandoff } from "@/components/ai/AssistantHandoff";

afterEach(cleanup);

describe("protected workflow handoff", () => {
  it("renders a safe navigation step without claiming a completed mutation", () => {
    render(<AssistantHandoff handoff={{ href: "/campaigns/c/dm/compendium", reason: "Виберіть файл і підтвердіть права у застосунку." }} />);
    expect(screen.getByRole("link", { name: "Відкрити у застосунку" }).getAttribute("href")).toBe("/campaigns/c/dm/compendium");
    expect(screen.queryByText("Виконано")).toBeNull();
  });
  it("rejects external, query-bearing and protocol-relative links", () => {
    const { rerender } = render(<AssistantHandoff handoff={{ href: "https://evil.test", reason: "Open" }} />);

    expect(screen.queryByRole("link")).toBeNull();
    for (const href of ["//evil.test", "/campaigns/c/dm/ai?token=SECRET", "/api/campaigns/c/compendium/confirm", "/campaigns/c/../../settings"]) {
      rerender(<AssistantHandoff handoff={{ href, reason: "Open" }} />);
      expect(screen.queryByRole("link")).toBeNull();
    }
  });
  it("source notes start unselected; only a deliberate selection reaches the caller", () => {
    const selected = vi.fn();

    const { rerender } = render(<AssistantHandoff handoff={{ href: "/campaigns/c/dm/compendium", reason: "Виберіть примітки" }} notes={[{ canonicalKey: "one", title: "Обране джерело" }, { canonicalKey: "two", title: "Інше джерело" }]} onSelectNotes={selected} />);

    const submit = screen.getByRole("button", { name: "Використати вибрані примітки для AI" }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true); expect(selected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Обране джерело" }));
    expect(selected).not.toHaveBeenCalled();
    fireEvent.click(submit);
    expect(selected).toHaveBeenCalledExactlyOnceWith(["one"]);
    rerender(<AssistantHandoff handoff={{ href: "/campaigns/other/dm/compendium", reason: "Нова кампанія" }} notes={[{ canonicalKey: "one", title: "Обране джерело" }]} onSelectNotes={selected} />);
    expect((screen.getByRole("checkbox", { name: "Обране джерело" }) as HTMLInputElement).checked).toBe(false);
  });
});
