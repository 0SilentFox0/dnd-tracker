import { issueUploadTicketHandler } from '../sound-library-handlers';

export const POST = (req: Request) => issueUploadTicketHandler(req);
