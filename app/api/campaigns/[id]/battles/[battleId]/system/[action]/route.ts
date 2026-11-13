import { runSystemBattleRoute } from '@/lib/server/battles/run-mutation';

export async function POST(
    req: Request,
    {
        params,
    }: { params: Promise<{ id: string; battleId: string; action: string }> }
) {
    const { action, ...rest } = await params;

    return runSystemBattleRoute(req, rest, action);
}
