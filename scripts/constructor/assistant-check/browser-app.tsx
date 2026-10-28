import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

import { ConstructorUiCheck } from './constructor-ui';

import {AssistantHandoff} from '@/components/ai/AssistantHandoff';
import {AssistantWorkspace} from '@/components/ai/AssistantWorkspace';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { AiThread } from '@/types/ai';

const chatMode = new URLSearchParams(location.search).get('flow') === 'chat';

const chatThread: AiThread = { id: 'synthetic-thread', title: 'Synthetic chat controls', mode: 'scenario', scenarioPageId: null, provider: 'anthropic', model: 'synthetic', updatedAt: '2026-10-27T00:00:00Z', usage: { inputTokens: null, outputTokens: null }, executionMode: 'review' };

let stopped = false;

const actions=[
  ['content-rule','content.units.create','Контент і правило','units'],
  ['scene-battle-slide','scenario.update','Сцена, бій і слайд','scenario'],
  ['hero-choice-resource-inventory','characters.choices','Вибір, ресурси й інвентар героя','characters'],
  ['battle-action-show','battles.attack','Бойова дія та показ','battles'],
  ['ordinary-write-review','campaign.settings','Звичайний запис у режимі перегляду','campaign'],
  ['dangerous-human-confirm','campaign.delete','Небезпечна дія потребує підтвердження','campaign'],
  ['stale-preview','characters.resources','Застарілий preview','characters'],
  ['retry-recovery','characters.inventory','Відновлення квитанції','characters'],
  ['compendium-handoff','compendium.preview','Передача до довідника','compendium'],
] as const;

type SyntheticTarget = { domain: string; id: string; name: string };
type SyntheticIntent = { id: string; actionId: string; channel: "mcp"; summary: string; targets: SyntheticTarget[]; status: "pending" | "applied"; expiresAt: string; preview: { summary: string; targets: SyntheticTarget[]; warnings: string[]; effects: { kind: string; targets: SyntheticTarget[]; description: string }[]; preconditions: null; changes: { target: SyntheticTarget; path: string; before: string; after: string }[] } };
type SyntheticRequest = { url: string; method: string; status: number; actionId: string; intentId: string; body: unknown };

const cases: Record<string, SyntheticIntent> = {};

for(const [id,actionId,title,domain] of actions){
 const target={domain,id:`${id}-target`,name:title};

 cases[id]={id,actionId,channel:'mcp',summary:title,targets:[target],status:'pending',expiresAt:'2099-01-01T00:00:00Z',preview:{summary:title,targets:[target],warnings:[],effects:[{kind:actionId==='campaign.delete'?'delete':'update',targets:[target],description:title}],preconditions:null,changes:[{target,path:'result',before:'Було',after:'Стане'}]}};
}

const requests: SyntheticRequest[]=[];

Object.assign(window, { assistantRequests: requests });
window.fetch=async(input: RequestInfo | URL,init: RequestInit={})=>{
 const url=String(input),method=init.method??'GET',body=typeof init.body==='string'?JSON.parse(init.body):undefined;

 const intentId=url.match(/assistant\/intents\/([^/?]+)/)?.[1]??new URL(url,location.href).searchParams.get('intent')??'content-rule';

 const intent=cases[intentId]??cases['content-rule'];

let status=200,data:unknown=[];

 if(chatMode && url.includes('/ai/credentials'))data=[{provider:'anthropic',last4:'test',defaultModel:'synthetic',updatedAt:chatThread.updatedAt}];
 else if(chatMode && url.includes('/assistant/policy')){ chatThread.executionMode='auto';data=body; }
 else if(chatMode && url.includes('/context-preview'))data={provider:'anthropic',model:'synthetic',labels:['Synthetic context'],characters:12,truncated:false,focusAvailable:false,sourceNoteCount:0,historyLimit:30};
 else if(chatMode && url.endsWith('/messages'))data={thread:chatThread,messages:[]};
 else if(chatMode && url.includes('/chat')){
   if(method==='DELETE')stopped=true;

   data={runs:[],messages:[],intents:[],receipts:stopped?[{id:'synthetic-chat-receipt',status:'applied',effectsStatus:'complete',result:{data:null,affected:[{domain:'characters',id:'synthetic-hero',name:'Synthetic hero'}],warnings:[]}}]:[]};
 }
 else if(chatMode && /\/ai\/threads(?:\?|$)/.test(url))data=[chatThread];
 else if(url.endsWith('/rules'))data=DEFAULT_RULES;
 else if(method==='PATCH' && /\/(backgrounds|classes)\//.test(url))data=body;
 else if(url.includes('/assistant/intents/')&&url.includes('/confirm')){
   if(intentId==='stale-preview'){ status=409;data={error:'Пропозиція застаріла'}; }
   else { intent.status='applied';data={id:`receipt-${intentId}`,status:'applied',effectsStatus:'complete',result:{data:{actionId:intent.actionId,domainResult:'applied-once'},affected:intent.targets,warnings:[]}}; }
 }else if(url.includes('/assistant/intents/')&&url.endsWith('/receipt'))data={id:`receipt-${intentId}`,status:intent.status==='applied'?'applied':'pending',effectsStatus:'complete',result:{data:{actionId:intent.actionId,domainResult:'applied-once'},affected:intent.targets,warnings:[]}};
 else if(url.includes('/assistant/intents?'))data={items:[intent],nextCursor:null};
 else if(url.includes('/assistant/intents/'))data=intent;

 requests.push({url,method,status,actionId:intent.actionId,intentId,body});

 if(chatMode && url.includes('/chat') && method==='POST')return new Promise<Response>((_resolve,reject)=>{
   const signal=init.signal ?? (input instanceof Request ? input.signal : undefined);

   if(signal?.aborted)reject(new DOMException('Aborted','AbortError'));
   else signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
 });

 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
};

function App(){
 const intentId = new URLSearchParams(location.search).get('intent');

 return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}>{intentId==='compendium-handoff'?<AssistantHandoff handoff={{href:'/campaigns/synthetic/dm/compendium',reason:'Довідник потребує перевірки в застосунку'}}/>:<AssistantWorkspace campaignId="synthetic" campaignName="Synthetic UI" initialIntentId={intentId??undefined}/>}</QueryClientProvider>;
}

const root = document.getElementById('root');

if (!root) throw new Error('Synthetic browser root missing');

const flow = new URLSearchParams(location.search).get('flow');

createRoot(root).render(flow && !chatMode ? <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><ConstructorUiCheck flow={flow}/></QueryClientProvider> : <App/>);
