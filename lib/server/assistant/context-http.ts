import { NextResponse } from "next/server";

import { readCompendiumSummary } from "./actions/handoffs";

import { buildInstructions } from "@/lib/ai/context/prompt";
import { loadThread } from "@/lib/ai/threads";
import { AI_LIMITS } from "@/lib/constants/ai";
import { assistantContextPreviewSchema } from "@/lib/schemas/ai";
import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { parseBody } from "@/lib/utils/api/parse-body";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { isSameOriginRequest } from "@/lib/utils/api/same-origin";
import type { AssistantContextDisclosure } from "@/types/ai";

const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:PRIVATE_NO_STORE_HEADERS});

export function assistantContextRoute(mode:"preview"|"notes") {
 return async(req:Request,context:{params:Promise<{id:string;threadId?:string}>})=>{
  try {
   if(req.headers.has("authorization") || (mode==="preview"&&!isSameOriginRequest(req))) return json({error:"Потрібна захищена сесія ДМ"},403);

   const {id:campaignId,threadId}=await context.params;

   const access=await requireDM(campaignId);

   if(access instanceof NextResponse){ access.headers.set("cache-control","private, no-store");

return access; }

   const rate=await checkRateLimit({userId:access.userId,scope:`assistant-context-${mode}`,battleId:campaignId,limit:mode==="preview"?20:120,windowSeconds:60,memoryFallback:true});

   if(!rate.allowed){ const response=rateLimitResponse(rate);

response.headers.set("cache-control","private, no-store");

return response; }

   const actor={campaignId,userId:access.userId,isDM:true,via:"session" as const,scopes:null};

   if(mode==="notes") {
    const offset=Number(new URL(req.url).searchParams.get("offset")??0);

    const result=await readCompendiumSummary(actor,"note-options",{offset,limit:20});

    return json(result.data);
   }

   const body=await parseBody(assistantContextPreviewSchema,req);

   if(body instanceof NextResponse)return body;

   const thread=threadId?await loadThread(campaignId,access.userId,threadId):null;

   if(!thread)return json({error:"Тред недоступний"},404);

   let disclosure:AssistantContextDisclosure|undefined;

   await buildInstructions({campaignId,mode:thread.mode,pageId:thread.scenarioPageId,focus:body.focus,caller:{actor,channel:"chat",tokenId:null,threadId:thread.id},...(body.sessionContext?.sourceNoteKeys.length&&{sourceNoteSelection:{source:"session-ui" as const,selectedKeys:body.sessionContext.sourceNoteKeys}}),onDisclosure:value=>{ disclosure=value; }});

   return json({...disclosure,provider:thread.provider,model:thread.model,historyLimit:AI_LIMITS.historyMessages});
  }catch(error){ if(error instanceof ContentError)return json({error:error.message},error.status);

return json({error:"Не вдалося підготувати перегляд контексту"},500); }
 };
}
