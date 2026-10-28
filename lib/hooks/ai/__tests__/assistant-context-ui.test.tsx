// @vitest-environment happy-dom
import {act,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';

import {useAssistantContext} from '../useAssistantContext';

import * as api from '@/lib/api/assistant';
import {chatRequestSchema} from '@/lib/schemas/ai';
vi.mock('@/lib/api/assistant',()=>({previewAssistantContext:vi.fn(async()=>({provider:'anthropic',model:'actual-model',labels:['Система','Кампанія (дані)'],characters:1200,truncated:false,focusAvailable:true,sourceNoteCount:0,historyLimit:30})),getAssistantSourceNotes:vi.fn(async()=>({items:[{canonicalKey:'chosen',title:'Вибране джерело'}],nextOffset:null}))}));
afterEach(()=>vi.clearAllMocks());
it('selectionStartsEmptyAndDisclosurePrecedesProviderSend',async()=>{
 const {result,unmount}=renderHook(()=>useAssistantContext('c1','t1',undefined));

 expect(result.current.getSessionContext()).toEqual({sourceNoteKeys:[]});
 await act(()=>result.current.requestSend('PRIVATE PROMPT'));
 expect(result.current.pendingText).toBe('PRIVATE PROMPT');expect(result.current.disclosure?.model).toBe('actual-model');
 expect(api.previewAssistantContext).toHaveBeenCalledWith('c1','t1',{focus:undefined,sessionContext:{sourceNoteKeys:[]}});
 act(()=>result.current.selectNotes(['chosen']));expect(result.current.disclosure).toBeNull();
 await act(()=>result.current.requestSend('Next'));
 expect(api.previewAssistantContext).toHaveBeenLastCalledWith('c1','t1',{focus:undefined,sessionContext:{sourceNoteKeys:['chosen']}});
 unmount();

const fresh=renderHook(()=>useAssistantContext('c1','t1',undefined));

expect(fresh.result.current.getSessionContext().sourceNoteKeys).toEqual([]);
});
it('sessionSelectionSeparateFromModelFocusAndBounded',()=>{
 const base={requestId:'r1',text:'Запит'};

 expect(chatRequestSchema.safeParse({...base,sessionContext:{sourceNoteKeys:['own']}}).success).toBe(true);
 expect(chatRequestSchema.safeParse({...base,sessionContext:{sourceNoteKeys:['a','b','c','d','e','f']}}).success).toBe(false);
 expect(chatRequestSchema.safeParse({...base,sessionContext:{sourceNoteKeys:['a','a']}}).success).toBe(false);
 expect(chatRequestSchema.safeParse({...base,focus:{kind:'campaign',selectedKeys:['own']}}).success).toBe(false);
 expect(chatRequestSchema.safeParse({...base,selectedKeys:['own'],selected:true}).success).toBe(false);
});

it('modelOrFocusChangeRequiresFreshDisclosure',async()=>{
 const {result,rerender}=renderHook(({configuration})=>useAssistantContext('c1','t1',undefined,configuration),{initialProps:{configuration:'model-a'}});

 await act(()=>result.current.requestSend('Привіт'));expect(result.current.canSend).toBe(true);
 rerender({configuration:'model-b'});expect(result.current.canSend).toBe(false);

 const send=vi.fn();

await act(()=>result.current.approve(send));expect(send).not.toHaveBeenCalled();
});

it('failedFlushAlsoBlocksAutoProviderSendAfterDisclosure',async()=>{
 const {registerAssistantBeforeApply}=await import('../useAssistantEffects');

 const dispose=registerAssistantBeforeApply({campaignId:'c1',domain:'scenario',id:'p1'},async()=>false);

 try { const {result}=renderHook(()=>useAssistantContext('c1','t1',undefined));

await act(()=>result.current.requestSend('Запит'));

 const send=vi.fn();

await act(()=>result.current.approve(send));expect(send).not.toHaveBeenCalled();expect(result.current.error).toMatch(/зберегти/);
 }finally{ dispose(); }
});

it('cancelDuringFlushCannotSendAfterConsentIsWithdrawn',async()=>{
 const {registerAssistantBeforeApply}=await import('../useAssistantEffects');

 let finish!:(value:boolean)=>void;

 const dispose=registerAssistantBeforeApply({campaignId:'c1',domain:'scenario',id:'p1'},()=>new Promise(resolve=>{ finish=resolve; }));

 try { const {result}=renderHook(()=>useAssistantContext('c1','t1',undefined));

await act(()=>result.current.requestSend('Запит'));

const send=vi.fn();

let approval!:Promise<void>;

 act(()=>{ approval=result.current.approve(send); });act(()=>result.current.cancel());await act(async()=>{ finish(true);await approval; });expect(send).not.toHaveBeenCalled();
 }finally{ dispose(); }
});
