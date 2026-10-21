// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiMessageList } from "@/components/ai/AiMessageList";

describe("AiMessageList", () => {
  it("текст, чип інструменту з параметром, помилка", () => {
    render(
      <AiMessageList
        messages={[
          { id: "1", role: "user", parts: [{ type: "text", text: "Хто такий Фенікс?" }] },
          { id: "2", role: "assistant", parts: [{ type: "tool-search_reference", toolCallId: "c1", state: "output-available", input: { kind: "unit", query: "Фенікс" }, output: "[]" }, { type: "text", text: "Птах вогню." }] },
        ] as never}
        error="Ліміт провайдера, спробуйте за хвилину"
        onRedo={() => {}}
      />,
    );

    expect(screen.getByText("Хто такий Фенікс?")).toBeTruthy();
    expect(screen.getByText("Шукаю в довіднику: Фенікс")).toBeTruthy();
    expect(screen.getByText("Птах вогню.")).toBeTruthy();
    expect(screen.getByText("Ліміт провайдера, спробуйте за хвилину")).toBeTruthy();
  });

  it("proposalId зі string-виводу інструмента віддає renderProposal", () => {
    render(
      <AiMessageList
        messages={[{ id: "2", role: "assistant", parts: [{ type: "tool-propose_scenario_edit", toolCallId: "c2", state: "output-available", input: {}, output: JSON.stringify({ proposalId: "ap1" }) }] }] as never}
        renderProposal={(id) => <div>card {id}</div>}
      />,
    );

    expect(screen.getByText("card ap1")).toBeTruthy();
  });
});
