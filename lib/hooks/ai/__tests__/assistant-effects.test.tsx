// @vitest-environment happy-dom
import type {ReactNode} from 'react';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';

import {flushAssistantBeforeApply,registerAssistantBeforeApply,useAssistantEffects} from '../useAssistantEffects';
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
 await act(async()=>{ await expect(result.current.confirm('i1')).rejects.toThrow(/context.flushFailed/);await expect(result.current.applyLegacy('old1')).rejects.toThrow(/context.flushFailed/); });
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

it('failed invalidation can retry and dedup is independent per campaign and QueryClient', async () => {
 const first = setup(), second = setup();

 const receipt = { id: 'retry', status: 'applied' as const, effectsStatus: 'complete' as const, result: { data: null, affected: [{ domain: 'characters', id: 'h', name: 'Hero' }], warnings: [] } };

 const invalidate = vi.spyOn(first.client, 'invalidateQueries').mockRejectedValueOnce(new Error('temporary'));

 const a = renderHook(() => useAssistantEffects('c1'), { wrapper: first.wrapper });

 await act(async () => { await expect(a.result.current.consumeReceipt(receipt)).rejects.toThrow(/context.refreshFailed/); });
 await act(() => a.result.current.consumeReceipt(receipt));
 await act(() => a.result.current.consumeReceipt(receipt));
 expect(invalidate).toHaveBeenCalledTimes(2);

 const b = renderHook(() => useAssistantEffects('c2'), { wrapper: first.wrapper });

 await act(() => b.result.current.consumeReceipt(receipt));
 expect(invalidate).toHaveBeenCalledTimes(3);

 const other = vi.spyOn(second.client, 'invalidateQueries');

 const c = renderHook(() => useAssistantEffects('c1'), { wrapper: second.wrapper });

 await act(() => c.result.current.consumeReceipt(receipt));
 expect(other).toHaveBeenCalledTimes(1);
});

it('throwing editor blocks confirmation and unregister removes the mounted editor', async () => {
 const { wrapper } = setup();

 const dispose = registerAssistantBeforeApply({ campaignId: 'throwing', domain: 'scenario', id: 'p' }, async () => { throw Error('private editor error'); });

 try {
  const { result } = renderHook(() => useAssistantIntents('throwing'), { wrapper });

  await act(async () => { await expect(result.current.confirm('i1')).rejects.toThrow(/context.flushFailed/); });
  expect(api.confirmAssistantIntent).not.toHaveBeenCalled();
 } finally { dispose(); }

 await expect(flushAssistantBeforeApply('throwing')).resolves.toBeUndefined();
});

it('one receipt refetches each active campaign query once and keeps other campaigns fresh', async () => {
 const { wrapper } = setup();

 const reads = { own: vi.fn(async () => 'own'), cascade: vi.fn(async () => 'cascade'), other: vi.fn(async () => 'other') };

 const { result } = renderHook(() => {
  const own = useQuery({ queryKey: ['characters', 'count-c1'], queryFn: reads.own });

  const cascade = useQuery({ queryKey: ['unknown-domain', 'count-c1'], queryFn: reads.cascade });

  const other = useQuery({ queryKey: ['characters', 'count-c2'], queryFn: reads.other });

  return { own, cascade, other, ...useAssistantEffects('count-c1') };
 }, { wrapper });

 await waitFor(() => expect(result.current.other.isSuccess && result.current.own.isSuccess && result.current.cascade.isSuccess).toBe(true));

 const receipt = { id: 'count', status: 'applied' as const, effectsStatus: 'complete' as const, result: { data: null, affected: [{ domain: 'unknown-domain', id: 'x', name: 'Cascade' }], warnings: [] } };

 await act(() => result.current.consumeReceipt(receipt));
 await act(() => result.current.consumeReceipt(receipt));
 expect(reads.own).toHaveBeenCalledTimes(2);
 expect(reads.cascade).toHaveBeenCalledTimes(2);
 expect(reads.other).toHaveBeenCalledTimes(1);
});

it('spellsReceiptInvalidatesOnlySpellKeys',async()=>{
 const {client,wrapper}=setup();

client.setQueryData(['spells','c1'],[]);client.setQueryData(['units','c1'],[]);client.setQueryData(['scenario-pages','c1'],[]);

 const {result}=renderHook(()=>useAssistantEffects('c1'),{wrapper});

 await act(()=>result.current.consumeReceipt({id:'r-spell',status:'applied' as const,effectsStatus:'complete' as const,result:{data:null,affected:[{domain:'spells',id:'s1',name:'Спел'}],warnings:[]}}));
 expect(client.getQueryState(['spells','c1'])?.isInvalidated).toBe(true);expect(client.getQueryState(['units','c1'])?.isInvalidated).toBe(false);expect(client.getQueryState(['scenario-pages','c1'])?.isInvalidated).toBe(false);
});
it('unknownDomainFallsBackToCampaignWide',async()=>{
 const {client,wrapper}=setup();

client.setQueryData(['units','c1'],[]);

 const {result}=renderHook(()=>useAssistantEffects('c1'),{wrapper});

 await act(()=>result.current.consumeReceipt({id:'r-x',status:'applied' as const,effectsStatus:'complete' as const,result:{data:null,affected:[{domain:'content',id:'x',name:'X'}],warnings:[]}}));
 expect(client.getQueryState(['units','c1'])?.isInvalidated).toBe(true);
});
