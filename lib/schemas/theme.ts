import { z } from 'zod';

import { PALETTE_IDS } from '@/lib/theme/palettes';

export const paletteSchema = z.object({ palette: z.enum(PALETTE_IDS) });
