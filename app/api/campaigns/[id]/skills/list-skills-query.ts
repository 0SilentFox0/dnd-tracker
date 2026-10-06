import { z } from "zod";

export const listSkillsQuerySchema = z.object({ mainSkillId: z.string().min(1).optional() });
