// @vitest-environment happy-dom
import type {ReactNode} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';

import {registerAssistantBeforeApply,useAssistantEffects} from '../useAssistantEffects';
import {useAssistantIntents} from '../useAssistantIntents';

import * as ai from '@/lib/api/ai';
import * as api from '@/lib/api/assistant';
import * as scenarioApi from '@/lib/api/scenario';
import {battleKeys} from '@/lib/hooks/battles/keys';
import {scenarioKeys} from '@/lib/hooks/scenario/keys';
import {useScenarioDraft} from '@/lib/hooks/scenario/useScenarioDraft';
import {showKeys} from '@/lib/hooks/show/keys';
vi.mock('@/lib/api/assistant',()=>({getAssistantIntents:vi.fn(async()=>({items:[],nextCursor:null})),getAssistantIntent:vi.fn(async()=>({id:'i1',status:'pending',targets:[{domain:'scenario',id:'p1',name:'Сцена'}]})),confirmAssistantIntent:vi.fn(),getAssistantReceipt:vi.fn(),rejectAssistantIntent:vi.fn()}));
vi.mock('@/lib/api/ai',()=>({getAiProposals:vi.fn(async()=>[{id:'old1',pageId:'p1',status:'pending',ops:[]}]),applyAiProposal:vi.fn(),rejectAiProposal:vi.fn()}));
vi.mock('@/lib/api/scenario',()=>({saveScenarioContent:vi.fn(),getScenarioPage:vi.fn()}));
afterEach(()=>{ cleanup();vi.clearAllMocks(); });

function setup(){ const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});

const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;

return {client,wrapper}; }

it('failedFlushBlocksApply',async()=>{
 const {wrapper}=setup();

const dispose=registerAssistantBeforeApply({campaignId:'c1',domain:'scenario',id:'p1'},async()=>false);

 try { const {result}=renderHook(()=>useAssistantIntents('c1'),{wrapper});

await waitFor(()=>expect(result.current.legacy.data).toHaveLength(1));
 await act(async()=>{ await expect(result.current.confirm('i1')).rejects.toThrow(/зберегти/i);await expect(result.current.applyLegacy('old1')).rejects.toThrow(/зберегти/i); });
 expect(api.confirmAssistantIntent).not.toHaveBeenCalled();expect(ai.applyAiProposal).not.toHaveBeenCalled();
 }finally{ dispose(); }
});
it('showAndBattleRefreshOnReceipt',async()=>{
 const {client,wrapper}=setup();

client.setQueryData(showKeys.state('c1'),{seq:1});client.setQueryData(battleKeys.scene('c1','b1'),{version:1});client.setQueryData(battleKeys.active(),[]);

 const invalidation=vi.spyOn(client,'invalidateQueries');

const {result,unmount}=renderHook(()=>useAssistantEffects('c1'),{wrapper});

 const receipt={id:'r1',status:'applied' as const,effectsStatus:'complete' as const,result:{data:null,affected:[{domain:'show',id:'c1',name:'Показ'},{domain:'battles',id:'b1',name:'Бій'}],warnings:[]}};

 await act(()=>result.current.consumeReceipt(receipt));expect(client.getQueryState(showKeys.state('c1'))?.isInvalidated).toBe(true);expect(client.getQueryState(battleKeys.scene('c1','b1'))?.isInvalidated).toBe(true);expect(client.getQueryState(battleKeys.active())?.isInvalidated).toBe(true);

 const count=invalidation.mock.calls.length;

await act(()=>result.current.consumeReceipt(receipt));unmount();

 const second=renderHook(()=>useAssistantEffects('c1'),{wrapper});

await act(()=>second.result.current.consumeReceipt(receipt));expect(invalidation.mock.calls.length).toBe(count);
});
it('remoteEditKeepsUnsavedDraft',async()=>{
 const {client,wrapper}=setup();

const page={id:'p1',version:1,content:{legend:[],sections:[]}} as never;

 const {result}=renderHook(()=>useScenarioDraft('c1',page),{wrapper});

 act(()=>result.current.setContent(c=>({...c,legend:[{kind:'read',label:'Локальна чернетка'}]})));
 act(()=>client.setQueryData(scenarioKeys.page('c1','p1'),{id:'p1',version:2,content:{legend:[{kind:'read',label:'Віддалена версія'}],sections:[]}}));
 expect(result.current.state).toBe('conflict');expect(result.current.content.legend[0].label).toBe('Локальна чернетка');

 let flushed=true;

await act(async()=>{ flushed=await result.current.flush(); });expect(flushed).toBe(false);expect(scenarioApi.saveScenarioContent).not.toHaveBeenCalled();
});
it('noCampaignTextInLocalStorage',async()=>{
 const storage=vi.spyOn(Storage.prototype,'setItem');

const {wrapper}=setup();

const {result}=renderHook(()=>useAssistantEffects('c1'),{wrapper});

 await act(()=>result.current.consumeReceipt({id:'r2',status:'applied',effectsStatus:'complete',result:{data:{text:'PRIVATE CAMPAIGN TEXT'},affected:[{domain:'scenario',id:'p1',name:'PRIVATE NOTE'}],warnings:[]}}));
 expect(storage).not.toHaveBeenCalled();storage.mockRestore();
});

it('malformedAffectedRefsCannotTriggerCacheEffects',async()=>{
 const {client,wrapper}=setup();

const invalidate=vi.spyOn(client,'invalidateQueries');

const {result}=renderHook(()=>useAssistantEffects('c1'),{wrapper});

 await act(async()=>{ await expect(result.current.consumeReceipt({id:'bad',status:'applied',effectsStatus:'complete',result:{data:null,affected:[null] as never,warnings:[]}})).resolves.toBeUndefined(); });
 expect(invalidate).not.toHaveBeenCalled();
});

it('confirmationKeepsReceiptWhenCampaignDetailBecomesUnavailable',async()=>{
 const {wrapper}=setup();

const receipt={id:'delete-receipt',status:'applied' as const,effectsStatus:'complete' as const,result:{data:{deleted:true},affected:[{domain:'campaign',id:'c1',name:'Кампанія'}],warnings:[]}};

 vi.mocked(api.getAssistantIntent).mockResolvedValueOnce({id:'i1',status:'pending',targets:[]} as never);
 vi.mocked(api.confirmAssistantIntent).mockImplementationOnce(async()=>{ vi.mocked(api.getAssistantIntent).mockRejectedValue(new Error('Недоступно'));

return receipt; });
 vi.mocked(api.getAssistantReceipt).mockResolvedValue({id:'delete-receipt',status:'applied',deleted:true} as never);

 const {result}=renderHook(()=>useAssistantIntents('c1',{intentId:'i1'}),{wrapper});

await waitFor(()=>expect(result.current.detail.data?.status).toBe('pending'));
 await act(()=>result.current.confirm('i1'));
 await waitFor(()=>expect(result.current.receipt.data).toMatchObject({id:'delete-receipt',status:'applied'}));
});
