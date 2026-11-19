import { discardSoundHandler } from '../sound-library-handlers';

export const POST = (req: Request) => discardSoundHandler(req);
