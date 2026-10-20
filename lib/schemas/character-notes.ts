import { z } from "zod";

import { NOTES_MAX } from "@/lib/constants/characters";

export const putNotesSchema = z.object({ notes: z.string().trim().max(NOTES_MAX) });
