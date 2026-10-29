// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpArticleView } from "@/components/onboarding/HelpArticleView";
import type { Translator } from "@/lib/i18n/translator";

afterEach(cleanup);

const t = Object.assign((key: string) => `T:${key}`, { has: () => true, raw: () => undefined }) as Translator;

describe("HelpArticleView", () => {
  it("рендерить розділи, абзаци, списки й посилання за ключами", () => {
    render(
      <HelpArticleView
        article={{ slug: "s", audience: "dm", sections: [{ blocks: [{ kind: "p" }, { kind: "list", count: 2 }, { kind: "link", href: "/help" }] }] }}
        t={t}
      />,
    );

    expect(screen.getByRole("heading", { name: "T:s.sections.s0.heading" })).toBeTruthy();
    expect(screen.getByText("T:s.sections.s0.b0")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["T:s.sections.s0.b1.i0", "T:s.sections.s0.b1.i1"]);
    expect(screen.getByRole("link", { name: "T:s.sections.s0.b2" }).getAttribute("href")).toBe("/help");
  });
});
