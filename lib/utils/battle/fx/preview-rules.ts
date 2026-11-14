import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { FALLBACK_SYSTEM_KEY } from '@/lib/utils/rules/systems/catalog';

// the registry stays out of this client graph; preview-rules.test guards that the key is a d20 base
export const PREVIEW_SYSTEM_KEY: string = FALLBACK_SYSTEM_KEY;

export const PREVIEW_RULES = defaultRulesFor({ key: PREVIEW_SYSTEM_KEY });
