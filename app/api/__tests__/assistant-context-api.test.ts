import {NextResponse} from 'next/server';
import {beforeEach,expect,it,vi} from 'vitest';

import {buildInstructions} from '@/lib/ai/context/prompt';
import {assistantContextRoute} from '@/lib/ai/context-http';
import {loadThread} from '@/lib/ai/threads';
import {requireDM} from '@/lib/utils/api/api-auth';
vi.mock('@/lib/utils/api/rate-limit',()=>({checkRateLimit:vi.fn(async()=>({allowed:true})),rateLimitResponse:vi.fn()}));
vi.mock('@/lib/ai/context/prompt',()=>({buildInstructions:vi.fn(async(args)=>{ args.onDisclosure?.({blocks:['system'],characters:100,truncated:false,focusAvailable:true,sourceNoteCount:args.sourceNoteSelection?.selectedKeys.length??0});

return 'PRIVATE PROMPT'; })}));
vi.mock('@/lib/ai/threads',()=>({loadThread:vi.fn(async()=>({id:'t1',mode:'scenario',scenarioPageId:null,provider:'anthropic',model:'actual-model'}))}));
vi.mock('@/lib/utils/api/api-auth',()=>({requireDM:vi.fn(async()=>({userId:'dm'}))}));
vi.mock('@/lib/server/assistant/actions/handoffs',()=>({readCompendiumSummary:vi.fn(async()=>({data:{items:[],nextOffset:null}}))}));

const context={params:Promise.resolve({id:'c1',threadId:'t1'})};

const req=(body:unknown,authorization?:string)=>new Request('http://localhost/api/context',{method:'POST',headers:{origin:'http://localhost',...(authorization?{authorization}:{})},body:JSON.stringify(body)});

beforeEach(()=>vi.clearAllMocks());
it('validatedSessionUiSelectionReachesT16WithoutRawContextOrProviderCall',async()=>{
 const response=await assistantContextRoute('preview')(req({sessionContext:{sourceNoteKeys:['own']}}),context);

 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(await response.json()).toMatchObject({provider:'anthropic',model:'actual-model',sourceNoteCount:1});
 expect(buildInstructions).toHaveBeenCalledWith(expect.objectContaining({sourceNoteSelection:{source:'session-ui',selectedKeys:['own']},caller:expect.objectContaining({tokenId:null,actor:expect.objectContaining({userId:'dm',via:'session'})})}));
 expect(loadThread).toHaveBeenCalledWith('c1','dm','t1');
});
it('tokenCannotImpersonateSessionAndForgedSelectionIsRejected',async()=>{
 expect((await assistantContextRoute('preview')(req({sessionContext:{sourceNoteKeys:['own']}},'Bearer TOKEN'),context)).status).toBe(403);
 expect(buildInstructions).not.toHaveBeenCalled();
 expect((await assistantContextRoute('preview')(req({selected:true,selectedKeys:['own']}),context)).status).toBe(400);
 expect(buildInstructions).not.toHaveBeenCalled();
});
it('foreignThreadAndPlayerCannotPreviewPrivateContext',async()=>{
 vi.mocked(loadThread).mockResolvedValueOnce(null);
 expect((await assistantContextRoute('preview')(req({}),context)).status).toBe(404);
 vi.mocked(requireDM).mockResolvedValueOnce(NextResponse.json({error:'Немає доступу'},{status:403}) as never);
 expect((await assistantContextRoute('preview')(req({}),context)).status).toBe(403);expect(buildInstructions).not.toHaveBeenCalled();
});
