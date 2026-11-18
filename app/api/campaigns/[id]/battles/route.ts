import { NextResponse } from 'next/server';

import { battleRecordHttp } from '@/lib/server/battles/http';
import {
    listBattleBriefs,
    listCampaignBattles,
} from '@/lib/server/battles/list-battles';
import { requireCampaignAccess } from '@/lib/utils/api/api-auth';
import { handleApiError } from '@/lib/utils/api/error-handler';

type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) {
    return battleRecordHttp(req, (await params).id, 'create');
}
export async function DELETE(req: Request, { params }: Params) {
    return battleRecordHttp(req, (await params).id, 'clear-history');
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const accessResult = await requireCampaignAccess(id, false, {
            allowDemo: true,
        });

        if (accessResult instanceof NextResponse) {
            return accessResult;
        }

        if (new URL(request.url).searchParams.get('brief') === '1') {
            return NextResponse.json(await listBattleBriefs(id));
        }

        return NextResponse.json(
            await listCampaignBattles(id, accessResult.isDM)
        );
    } catch (error) {
        return handleApiError(error, { action: 'list battles' });
    }
}
