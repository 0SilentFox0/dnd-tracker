import { z } from 'zod';

import { EDITION_PRESETS } from './profiles';

export const EditionRulesSchema = z.strictObject({
    preset: z.enum(EDITION_PRESETS),
    helplessKills: z.boolean().optional(),
});
