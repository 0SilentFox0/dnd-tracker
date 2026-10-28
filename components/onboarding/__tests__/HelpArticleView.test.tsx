// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpArticleView } from "@/components/onboarding/HelpArticleView";

afterEach(cleanup);

describe("HelpArticleView", () => {
  it("рендерить розділи, абзаци, списки й посилання", () => {
    render(
      <HelpArticleView
        article={{ slug: "s", audience: "dm", title: "Т", summary: "С", sections: [{ heading: "Розділ", blocks: [{ kind: "p", text: "Абзац" }, { kind: "list", items: ["Один", "Два"] }, { kind: "link", text: "Туди", href: "/help" }] }] }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Розділ" })).toBeTruthy();
    expect(screen.getByText("Абзац")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Туди" }).getAttribute("href")).toBe("/help");
  });
});
