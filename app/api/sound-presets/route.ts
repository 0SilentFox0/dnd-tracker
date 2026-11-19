import { createPresetHandler } from './sound-preset-handlers';

export const POST = (req: Request) => createPresetHandler(req);
