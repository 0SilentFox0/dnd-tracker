import { z } from "zod";

import { TOKEN_COLORS, TOKEN_LABEL_MAX } from "@/lib/constants/characters";

export const createTokenSchema = z.object({ color: z.enum(TOKEN_COLORS), label: z.string().trim().min(1).max(TOKEN_LABEL_MAX) });

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
