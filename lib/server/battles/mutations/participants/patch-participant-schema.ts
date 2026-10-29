import type { z } from "zod";

import { patchParticipantSchema } from "@/lib/schemas/battles";

export { patchParticipantSchema };

export type PatchParticipantData = z.infer<typeof patchParticipantSchema>;
