import { issueSoundUploadTicketHandler } from '../sound-handlers';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return issueSoundUploadTicketHandler(req, (await params).id);
}
