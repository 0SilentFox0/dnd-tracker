import { NextResponse } from 'next/server';

import { listScenarioMentionNames } from '@/lib/server/scenario/mentions';
import { requireDM } from '@/lib/utils/api/api-auth';
import { handleApiError } from '@/lib/utils/api/error-handler';

export async function mentionNamesHandler(campaignId: string) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        return NextResponse.json(await listScenarioMentionNames(campaignId));
    } catch (error) {
        return handleApiError(error, { action: 'list scenario mention names' });
    }
}
