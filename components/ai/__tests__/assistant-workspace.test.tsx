// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AssistantWorkspace } from "../AssistantWorkspace";

import * as ai from "@/lib/api/ai";
import * as api from "@/lib/api/assistant";

vi.mock("@/lib/api/assistant", () => ({getAssistantIntents:vi.fn(), getAssistantIntent:vi.fn(),confirmAssistantIntent:vi.fn(),rejectAssistantIntent:vi.fn(),getAssistantReceipt:vi.fn()}));
vi.mock("@/lib/api/ai", async orig => ({...await orig<object>(),getAiCredentials:vi.fn(),getAiThreads:vi.fn(),createAiThread:vi.fn(),getAiProposals:vi.fn()}));
vi.mock("@/lib/hooks/common", async orig => ({...await orig<object>(),useMediaQuery:()=>true}));
afterEach(()=>{ cleanup();vi.clearAllMocks(); });

const item = {id:"i1",actionId:"content.update",summary:"Правка MCP",status:"pending",targets:[],expiresAt:"2099-01-01",channel:"mcp",legacyProposalId:"old1"};

function mount(keys=false, legacyRecords: unknown[] = [{id:"old1",summary:"Правка MCP",status:"pending",ops:[]}]) {
 vi.mocked(api.confirmAssistantIntent).mockResolvedValue({id:"r1",status:"applied",effectsStatus:"complete",result:{data:null,affected:[],warnings:[]}});
 vi.mocked(api.getAssistantIntent).mockResolvedValue({...item,preview:{summary:item.summary,targets:[],changes:[],warnings:[],effects:[],preconditions:null}} as never);
 vi.mocked(api.getAssistantIntents).mockResolvedValue({items:[item,item],nextCursor:null} as never);
 vi.mocked(ai.getAiCredentials).mockResolvedValue(keys?[{provider:"anthropic"}] as never:[]);
 vi.mocked(ai.getAiThreads).mockResolvedValue([]);
 vi.mocked(ai.getAiProposals).mockResolvedValue(legacyRecords as never);

 const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});

 const view = render(<QueryClientProvider client={client}><AssistantWorkspace campaignId="c1" campaignName="Кампанія" /></QueryClientProvider>);

 return {client,...view};
}

it("threadWithoutScenarioPage",async()=>{
 mount(true); await screen.findByRole("button",{name:"ai.thread.new"});
 fireEvent.click(screen.getByRole("button",{name:"ai.thread.new"}));
 await waitFor(()=>expect(ai.createAiThread).toHaveBeenCalledWith("c1",expect.objectContaining({scenarioPageId:null})));
});
it("mcpPendingVisibleOnce",async()=>{ mount();await screen.findByRole("button",{name:/Правка MCP/});expect(screen.getAllByRole("button",{name:/Правка MCP/})).toHaveLength(1);expect(api.confirmAssistantIntent).not.toHaveBeenCalled(); });
it("noKeyCanReview",async()=>{
 mount(); fireEvent.click(await screen.findByRole("button",{name:/Правка MCP/}));
 await waitFor(()=>expect(api.getAssistantIntent).toHaveBeenCalledWith("c1","i1"));
 expect(api.confirmAssistantIntent).not.toHaveBeenCalled(); expect(ai.createAiThread).not.toHaveBeenCalled();
 fireEvent.click(await screen.findByRole("button",{name:"ai.intent.confirm"}));
 await waitFor(()=>expect(api.confirmAssistantIntent).toHaveBeenCalledWith("c1","i1"));
 expect(ai.createAiThread).not.toHaveBeenCalled();
});

it("legacyLinkedOutsideQueuePageIsNotDuplicated",async()=>{
 const {client}=mount(false,[{id:"old2",summary:"Linked elsewhere",status:"pending",ops:[],assistantIntentId:"i-other"}]);

 await screen.findByRole("button",{name:/Правка MCP/});
 await waitFor(()=>expect(client.isFetching()).toBe(0));
 expect(screen.queryByRole("button",{name:/Linked elsewhere/})).toBeNull();
});

it("campaignFocusCanBeSelectedAndClearedWithoutModelCall",async()=>{
 mount();await screen.findByRole("button",{name:/Правка MCP/});
 fireEvent.change(screen.getByLabelText("ai.workspace.focusKind"),{target:{value:"character"}});
 fireEvent.change(screen.getByLabelText("ai.workspace.focusId"),{target:{value:"hero1"}});
 fireEvent.click(screen.getByRole("button",{name:"ai.workspace.pick"}));
 expect(screen.getByText(/ai\.focus\.character.*hero1/)).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"ai.workspace.clear"}));
 expect(screen.queryByText(/ai\.focus\.character.*hero1/)).toBeNull();expect(api.confirmAssistantIntent).not.toHaveBeenCalled();
});
