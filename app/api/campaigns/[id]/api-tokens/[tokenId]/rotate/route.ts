import { rotateApiTokenHandler } from '../../token-handlers';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string; tokenId: string }> }
) {
    const { id, tokenId } = await params;

    return rotateApiTokenHandler(id, tokenId);
}
