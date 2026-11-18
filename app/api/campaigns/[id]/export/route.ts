import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { bundleErrorResponse } from '@/lib/server/templates/bundle-error';
import { exportCampaignDownload } from '@/lib/server/templates/export-download';
import { attachmentHeaders } from '@/lib/utils/api/api-response';

export const GET = operationRoute(
    CONTENT_OPERATIONS['campaign.export'],
    async ({ actor }) => {
        try {
            const { bundle, fileName } = await exportCampaignDownload(
                actor.campaignId
            );

            return NextResponse.json(bundle, {
                headers: attachmentHeaders(fileName),
            });
        } catch (error) {
            const response = bundleErrorResponse(error);

            if (response) return response;

            throw error;
        }
    }
);
