import { z } from "zod";

import { FLAG_KEY_RE, HIDE_ALL_HINTS_KEY } from "@/lib/onboarding/flag-keys";
import { HINTS } from "@/lib/onboarding/hints";

const HINT_PREFIX = "hint:";

// лише відомі підказки: довільні hint:* ключі плодили б рядки в таблиці
const isKnownHintKey = (key: string) => !key.startsWith(HINT_PREFIX) || key === HIDE_ALL_HINTS_KEY || key.slice(HINT_PREFIX.length) in HINTS;

export const setOnboardingFlagSchema = z.object({ key: z.string().max(100).regex(FLAG_KEY_RE).refine(isKnownHintKey), value: z.string().max(100).nullish() });

export const resetOnboardingSchema = z.object({ scope: z.enum(["hints", "checklists"]) });
