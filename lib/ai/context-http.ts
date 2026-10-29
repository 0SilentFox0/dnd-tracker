import { NextResponse } from "next/server";

import { buildInstructions } from "@/lib/ai/context/prompt";
import { loadThread } from "@/lib/ai/threads";
import { AI_BODY_LIMITS, AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { assistantContextPreviewSchema } from "@/lib/schemas/ai";
import { readCompendiumSummary } from "@/lib/server/assistant/actions/handoffs";
import { ContentError } from "@/lib/server/content/errors";
import { requireDM } from "@/lib/utils/api/api-auth";
import { privateJson } from "@/lib/utils/api/api-response";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { parseBody } from "@/lib/utils/api/parse-body";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { isSameOriginRequest } from "@/lib/utils/api/same-origin";
import { apiErrorJson } from "@/lib/utils/api/translate-error";
import type { AssistantContextDisclosure } from "@/types/ai";


const errorJson=(body:{error:string;params?:ErrorParams},status:number)=>apiErrorJson(body,{status,headers:PRIVATE_NO_STORE_HEADERS});

export function assistantContextRoute(mode:"preview"|"notes") {
 return async(req:Request,context:{params:Promise<{id:string;threadId?:string}>})=>{
  try {
   if(req.headers.has("authorization") || (mode==="preview"&&!isSameOriginRequest(req))) return errorJson({error:API_ERRORS.ASSISTANT_PROTECTED_DM_SESSION},403);

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

    return privateJson(result.data);
   }

   const body=await parseBody(assistantContextPreviewSchema,req,undefined,{maxBytes:AI_BODY_LIMITS.contextPreview});

   if(body instanceof NextResponse)return body;

   const thread=threadId?await loadThread(campaignId,access.userId,threadId):null;

   if(!thread)return errorJson({error:API_ERRORS.ASSISTANT_THREAD_UNAVAILABLE},404);

   let disclosure:AssistantContextDisclosure|undefined;

   await buildInstructions({campaignId,mode:thread.mode,pageId:thread.scenarioPageId,focus:body.focus,caller:{actor,channel:"chat",tokenId:null,threadId:thread.id,locale:await getRequestLocale()},...(body.sessionContext?.sourceNoteKeys.length&&{sourceNoteSelection:{source:"session-ui" as const,selectedKeys:body.sessionContext.sourceNoteKeys}}),onDisclosure:value=>{ disclosure=value; }});

   return privateJson({...disclosure,provider:thread.provider,model:thread.model,historyLimit:AI_LIMITS.historyMessages});
  }catch(error){ if(error instanceof ContentError)return errorJson({error:error.message,params:error.params},error.status);

return errorJson({error:API_ERRORS.ASSISTANT_CONTEXT_PREVIEW_FAILED},500); }
 };
}
