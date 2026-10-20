// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ScenarioRichText } from "@/components/scenario";
import type { RichDoc } from "@/types/scenario";

afterEach(cleanup);

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Прорив" }] },
    { type: "readAloud", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони обриваються" }] }] },
    { type: "say", content: [{ type: "text", text: "«Я повернуся»" }] },
    { type: "callout", attrs: { kind: "choice", tag: "Вибір Годрика", onclick: "alert(1)" }, content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "green" } }, { type: "text", text: "Іде", marks: [{ type: "bold" }] }, { type: "text", text: " таємно", marks: [{ type: "secret" }] }] }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } }, { type: "text", text: "<script>x</script>" }] },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1.0" }] }] }] }] },
  ],
};

describe("ScenarioRichText", () => {
  it("класи як в артефакті", () => {
    const { container } = render(<ScenarioRichText doc={doc} campaignId="c" linkMentions />);

    expect(container.querySelector("h3")?.textContent).toBe("Прорив");
    expect(container.querySelector(".read p")?.textContent).toBe("Дзвони обриваються");
    expect(container.querySelector("p.say")?.textContent).toBe("«Я повернуся»");
    expect(container.querySelector(".mark.choice .tag")?.textContent).toBe("Вибір Годрика");
    expect(container.querySelector(".mark.choice .g")).not.toBeNull();
    expect(container.querySelector(".mark.choice strong")?.textContent).toBe("Іде");
    expect(container.querySelector(".secret")?.textContent).toBe(" таємно");
    expect(container.querySelector("table td")?.textContent).toBe("1.0");
  });

  it("згадка — посилання на сутність; текст екрановано; сторонні attrs ігноруються", () => {
    const { container } = render(<ScenarioRichText doc={doc} campaignId="c" linkMentions />);

    expect(screen.getByRole("link", { name: /Біс/ }).getAttribute("href")).toBe("/campaigns/c/dm/units/u1");
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onclick");
  });

  it("без linkMentions згадка — простий текст", () => {
    render(<ScenarioRichText doc={doc} campaignId="c" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Біс")).toBeTruthy();
  });
});
