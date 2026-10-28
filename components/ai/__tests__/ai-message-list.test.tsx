// @vitest-environment happy-dom
import { API_ERRORS } from "@/lib/constants/api-errors";
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
        error=API_ERRORS.AI_RATE_LIMIT
        onRedo={() => {}}
      />,
    );

    expect(screen.getByText("Хто такий Фенікс?")).toBeTruthy();
    expect(screen.getByText("Шукаю в довіднику: Фенікс")).toBeTruthy();
    expect(screen.getByText("Птах вогню.")).toBeTruthy();
    expect(screen.getByText(API_ERRORS.AI_RATE_LIMIT)).toBeTruthy();
  });

  it("markdown асистента рендериться, а текст користувача лишається простим", () => {
    const { container } = render(
      <AiMessageList
        messages={[
          { id: "1", role: "user", parts: [{ type: "text", text: "**не жирний**" }] },
          { id: "2", role: "assistant", parts: [{ type: "text", text: "Це **Ізабель**" }] },
        ] as never}
      />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("Ізабель");
    expect(screen.getByText("**не жирний**")).toBeTruthy();
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

it("canonical pending has an exact local review link and is not a completed action", () => {
 render(<AiMessageList campaignId="c1" messages={[{id:"m",role:"assistant",parts:[{type:"tool-assistant_action",state:"output-available",output:{version:2,kind:"result",data:{kind:"pending",intent:{id:"intent1"},reviewUrl:"https://evil.invalid"}}}]}] as never} />);
 expect(screen.getByRole("link",{name:"Переглянути дію"}).getAttribute("href")).toBe("/campaigns/c1/dm/assistant?intent=intent1");
 expect(screen.getByText("Очікує перегляду")).toBeTruthy();
});

it("showsActualMessageModelAndPartialUnknownUsage",()=>{
 render(<AiMessageList messages={[{id:"actual",role:"assistant",parts:[{type:"text",text:"Відповідь"}],metadata:{model:"actual-model",usage:{inputTokens:null,outputTokens:12,partial:true}}}]}/>);
 expect(screen.getByText(/actual-model/)).toBeTruthy();expect(screen.getByText(/↑невідомо.*↓12/)).toBeTruthy();expect(screen.getByText(/неповні/)).toBeTruthy();
});
