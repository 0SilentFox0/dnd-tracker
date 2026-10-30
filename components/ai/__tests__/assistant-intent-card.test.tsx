// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AiToolChip } from "../AiToolChip";
import { AssistantIntentCard } from "../AssistantIntentCard";

import type { IntentDetail } from "@/types/assistant";

afterEach(cleanup);
export const intent: IntentDetail = { id: "i1", actionId: "scenario.update", channel: "mcp", summary: "Оновити сцену", status: "pending", expiresAt: "2099-01-01T00:00:00Z", targets: [{ domain: "scenario", id: "p1", name: "Сцена" }], preview: { summary: "Оновити сцену", targets: [], warnings: [], preconditions: null, effects: [], changes: Array.from({ length: 25 }, (_, i) => ({ target: { domain: "scenario", id: "p1", name: "Сцена" }, path: `row${i}`, before: `Було${i}`, after: `Стало${i}` })) } };
it("previewAllChangesBeforeConfirm", () => {
 const confirm = vi.fn();

 render(<AssistantIntentCard campaignId="c1" intent={intent} onConfirm={confirm} onReject={vi.fn()} onRefine={vi.fn()} />);
 expect(confirm).not.toHaveBeenCalled();
 expect(screen.getByText('"Стало0"')).toBeTruthy();
 fireEvent.click(screen.getByRole("button", {name: "ai.intent.nextChanges"}));
 expect(screen.getByText('"Стало24"')).toBeTruthy();
 fireEvent.click(screen.getByRole("button", {name: "ai.intent.prevChanges"}));
 expect(screen.getByText('"Було0"')).toBeTruthy();
});
it("staleCannotApply", () => {
 render(<AssistantIntentCard campaignId="c1" intent={{...intent, status:"stale"}} onConfirm={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />);
 expect(screen.queryByRole("button", {name:"ai.intent.confirm"})).toBeNull();
 expect(screen.getByText(/ai\.intentStatus\.stale/)).toBeTruthy();
});
it("mobileKeyboardAndFocusAccessible", () => {
 const refine = vi.fn();

 render(<AssistantIntentCard campaignId="c1" intent={intent} onConfirm={vi.fn()} onReject={vi.fn()} onRefine={refine} />);

 const button = screen.getByRole("button", {name:"ai.intent.refine"});

 button.focus();
 expect(document.activeElement).toBe(button); fireEvent.click(button); expect(refine).toHaveBeenCalledOnce();
 expect(screen.getByRole("region", {name:/Оновити сцену/})).toBeTruthy();
});
it("toolFailureNotSuccessChip", () => {
 render(<AiToolChip part={{type:"tool-assistant_action",state:"output-available",output:{version:2,kind:"error",error:{code:"FAILED"}}}} />);
 expect(screen.getByText(/ai\.toolStatus\.error/)).toBeTruthy();
});

it("pendingAndHandoffAreNotExecution",()=>{
 render(<AiToolChip part={{type:"tool-assistant_action",state:"output-available",output:{version:2,kind:"result",data:{kind:"pending",intent:{id:"i1"},reviewUrl:"/campaigns/c1/dm/assistant?intent=i1"}}}} />);
 expect(screen.getByText(/ai\.toolStatus\.pending/)).toBeTruthy();
});

it("expiryWhileOpenDisablesConfirm",()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
 try { render(<AssistantIntentCard campaignId="c1" intent={{...intent,expiresAt:"2026-10-26T00:00:01Z"}} onConfirm={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />);
 expect(screen.getByRole("button",{name:"ai.intent.confirm"})).toBeTruthy();
 act(()=>vi.advanceTimersByTime(1500));
 expect(screen.queryByRole("button",{name:"ai.intent.confirm"})).toBeNull();
 } finally { vi.useRealTimers(); }
});

const rdoc = (...nodes: unknown[]) => ({ type: "doc", content: [{ type: "paragraph", content: nodes }] });

const chipRow = (rowId: string) => ({ op: "replaceRow", sectionId: "s1", rowId, story: rdoc({ type: "mention", attrs: { id: "a1", label: "Бі", type: "acquaintance" } }), before: { story: rdoc({ type: "text", text: "Бі" }), notes: rdoc() } });

it("scenarioOpsRenderAsList", () => {
 const ops = [{ op: "createAcquaintance", ref: "b", name: "Бі", description: "" }, chipRow("r1"), chipRow("r2")];

 const change = { target: { domain: "scenario", id: "p1", name: "Сцена" }, path: "ops", before: null, after: ops };

 const { container } = render(<AssistantIntentCard campaignId="c1" intent={{ ...intent, actionId: "scenario.propose-edit", preview: { ...intent.preview, changes: [change] } } as never} onConfirm={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()} />);

 expect(screen.getByText(/ai\.proposal\.newAcquaintance/)).toBeTruthy();
 expect(screen.getByText(/ai\.proposal\.changedRows/)).toBeTruthy();
 expect(screen.getAllByText(/ai\.proposal\.chipsAdded/)).toHaveLength(2);
 expect(container.querySelector("pre")).toBeNull();
 expect(container.textContent).not.toContain('"op":');
 expect(screen.getByRole("button", { name: "ai.intent.confirm" })).toBeTruthy();
 expect(screen.getByRole("button", { name: "ai.intent.reject" })).toBeTruthy();
});
