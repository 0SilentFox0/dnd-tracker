// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantHandoff } from "@/components/ai/AssistantHandoff";

afterEach(cleanup);

describe("protected workflow handoff", () => {
  it("renders a safe navigation step without claiming a completed mutation", () => {
    render(<AssistantHandoff handoff={{ href: "/campaigns/c/dm/compendium", reason: "Виберіть файл і підтвердіть права у застосунку." }} />);
    expect(screen.getByRole("link", { name: "ai.handoff.open" }).getAttribute("href")).toBe("/campaigns/c/dm/compendium");
    expect(screen.queryByText("Виконано")).toBeNull();
  });
  it.each(["/campaigns/c/dm/battles", "/campaigns/c/dm/battles/battle-1"])("renders the battle map editor handoff %s", href => {
    render(<AssistantHandoff handoff={{ href, reason: "Додайте зображення у редакторі карти." }} />);
    expect(screen.getByRole("link", { name: "ai.handoff.open" }).getAttribute("href")).toBe(href);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("rejects external, query-bearing and protocol-relative links", () => {
    const { rerender } = render(<AssistantHandoff handoff={{ href: "https://evil.test", reason: "Open" }} />);

    expect(screen.queryByRole("link")).toBeNull();
    for (const href of ["//evil.test", "/campaigns/c/dm/ai?token=SECRET", "/api/campaigns/c/compendium/confirm", "/campaigns/c/../../settings", "/campaigns/c/dm/battles/b?token=SECRET", "/campaigns/c/dm/battles/b#confirm", "/campaigns/c/dm/battles/../ai", "/campaigns/c/dm/battles/%2e%2e%2fai", "/campaigns/c/dm/battles/b/confirm", "/campaigns/c/dm/battles//evil.test"]) {
      rerender(<AssistantHandoff handoff={{ href, reason: "Open" }} />);
      expect(screen.queryByRole("link")).toBeNull();
    }
  });
  it("source notes start unselected; only a deliberate selection reaches the caller", () => {
    const selected = vi.fn();

    const { rerender } = render(<AssistantHandoff handoff={{ href: "/campaigns/c/dm/compendium", reason: "Виберіть примітки" }} notes={[{ canonicalKey: "one", title: "Обране джерело" }, { canonicalKey: "two", title: "Інше джерело" }]} onSelectNotes={selected} />);

    const submit = screen.getByRole("button", { name: "ai.handoff.useNotes" }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true); expect(selected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Обране джерело" }));
    expect(selected).not.toHaveBeenCalled();
    fireEvent.click(submit);
    expect(selected).toHaveBeenCalledExactlyOnceWith(["one"]);
    rerender(<AssistantHandoff handoff={{ href: "/campaigns/other/dm/compendium", reason: "Нова кампанія" }} notes={[{ canonicalKey: "one", title: "Обране джерело" }]} onSelectNotes={selected} />);
    expect((screen.getByRole("checkbox", { name: "Обране джерело" }) as HTMLInputElement).checked).toBe(false);
  });
});
