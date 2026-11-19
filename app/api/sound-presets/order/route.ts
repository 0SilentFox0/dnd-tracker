import { reorderPresetsHandler } from '../sound-preset-handlers';

export const PUT = (req: Request) => reorderPresetsHandler(req);
