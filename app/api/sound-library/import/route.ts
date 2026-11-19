import { importLinkHandler } from '../sound-library-handlers';

export const POST = (req: Request) => importLinkHandler(req);
