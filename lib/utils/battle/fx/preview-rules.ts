import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';

// the registry stays out of this client graph; the key comes from meta, not from registry order
export const PREVIEW_SYSTEM_KEY: string = SYSTEM_META.find(
    (m) => 'previewSandbox' in m
)!.keys[0];

export const PREVIEW_RULES = defaultRulesFor({ key: PREVIEW_SYSTEM_KEY });
