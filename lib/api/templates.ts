import { campaignPost, request } from '@/lib/api/client';
import type {
    Campaign,
    CampaignBundle,
    CampaignWithWarnings,
    TemplateList,
    TemplatePublishResult,
} from '@/types/campaigns';

export async function getTemplates(): Promise<TemplateList> {
    return request<TemplateList>('/api/templates');
}

export async function importCampaign(data: {
    name: string;
    bundle: CampaignBundle;
}): Promise<CampaignWithWarnings> {
    return request<CampaignWithWarnings>('/api/campaigns/import', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function saveAsTemplate(
    campaignId: string,
    data: { name: string; description?: string }
): Promise<Campaign> {
    return campaignPost<Campaign>(campaignId, '/save-as-template', data);
}

export const publishTemplate = (campaignId: string) =>
    campaignPost<TemplatePublishResult>(campaignId, '/template/publish', {});

export const campaignExportUrl = (campaignId: string) =>
    `/api/campaigns/${campaignId}/export`;
