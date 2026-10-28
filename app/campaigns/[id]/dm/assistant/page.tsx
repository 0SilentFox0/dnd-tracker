import { AssistantPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
export default async function AssistantPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{intent?:string}>}) {
 const {id}=await params;

 const {campaign}=await requireCampaignDM(id);

 const {intent}=await searchParams;

 return <AssistantPageClient key={`${id}:${intent??""}`} campaignId={id} campaignName={campaign.name} initialIntentId={typeof intent==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(intent)?intent:undefined} />;
}
