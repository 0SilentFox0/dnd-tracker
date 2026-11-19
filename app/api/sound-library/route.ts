import {
    createLibrarySoundHandler,
    getLibraryHandler,
} from './sound-library-handlers';

export const GET = (req: Request) => getLibraryHandler(req);

export const POST = (req: Request) => createLibrarySoundHandler(req);
