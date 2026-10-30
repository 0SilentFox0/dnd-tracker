// @vitest-environment happy-dom
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';

import {AssistantIntentCard} from '../AssistantIntentCard';
import {AssistantPolicyControl} from '../AssistantPolicyControl';

import * as api from '@/lib/api/assistant';
vi.mock('@/lib/api/assistant',()=>({setAssistantPolicy:vi.fn(),confirmAssistantIntent:vi.fn()}));
afterEach(()=>{ cleanup();vi.clearAllMocks(); });

const mount=(target:'thread'|'token',executionMode?:'review'|'auto')=>render(<QueryClientProvider client={new QueryClient()}><AssistantPolicyControl campaignId="c1" target={target} id={target+'1'} executionMode={executionMode}/></QueryClientProvider>);

it('newThreadAndTokenDefaultReview',()=>{
 const a=mount('thread');

expect(screen.getByText(/ai\.policy\.modes\.review/)).toBeTruthy();a.unmount();
 mount('token');expect(screen.getByText(/ai\.policy\.modes\.review/)).toBeTruthy();expect(api.setAssistantPolicy).not.toHaveBeenCalled();
});
it('autoSwitchDoesNotApplyOldPending',async()=>{
 vi.mocked(api.setAssistantPolicy).mockResolvedValue({id:'thread1',executionMode:'auto'});
 mount('thread');fireEvent.click(screen.getByRole('button',{name:'ai.policy.enableAuto'}));
 expect(api.setAssistantPolicy).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'ai.policy.dialog.confirm'}));
 await waitFor(()=>expect(api.setAssistantPolicy).toHaveBeenCalledWith('c1',{target:'thread',id:'thread1',executionMode:'auto'}));
 expect(api.confirmAssistantIntent).not.toHaveBeenCalled();
 expect(screen.getByText(/ai\.policy\.note/)).toBeTruthy();
});
it('dangerousAutoStillShowsConfirm',()=>{
 render(<AssistantIntentCard campaignId="c1" intent={{id:'i1',actionId:'campaign.delete',status:'pending',channel:'mcp',summary:'Видалення',expiresAt:'2099-01-01',targets:[{domain:'campaign',id:'c1',name:'Моя кампанія'}],preview:{summary:'Видалення',targets:[],changes:[],warnings:['Усі залежні записи буде видалено'],preconditions:null,effects:[{kind:'delete',targets:[{domain:'characters',id:'hero1',name:'Герой'}],description:'Каскадне видалення героя'}]}}} onConfirm={vi.fn()} onReject={vi.fn()} onRefine={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'ai.intent.confirm'})).toBeTruthy();expect(screen.getByText(/Каскадне видалення героя/)).toBeTruthy();expect(screen.getByText(/hero1/)).toBeTruthy();
});

it('latestServerPolicyReadOverridesAnEarlierAutoResponse',async()=>{
 vi.mocked(api.setAssistantPolicy).mockResolvedValue({id:'thread1',executionMode:'auto'});

 const client=new QueryClient();

 const view=render(<QueryClientProvider client={client}><AssistantPolicyControl campaignId="c1" target="thread" id="thread1" executionMode="review"/></QueryClientProvider>);

 fireEvent.click(screen.getByRole('button',{name:'ai.policy.enableAuto'}));fireEvent.click(screen.getByRole('button',{name:'ai.policy.dialog.confirm'}));
 await waitFor(()=>expect(api.setAssistantPolicy).toHaveBeenCalledOnce());
 view.rerender(<QueryClientProvider client={client}><AssistantPolicyControl campaignId="c1" target="thread" id="thread1" executionMode="auto"/></QueryClientProvider>);
 view.rerender(<QueryClientProvider client={client}><AssistantPolicyControl campaignId="c1" target="thread" id="thread1" executionMode="review"/></QueryClientProvider>);
 expect(screen.getByText(/ai\.policy\.modes\.review/)).toBeTruthy();
});
