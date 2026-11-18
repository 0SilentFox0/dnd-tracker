import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { type Ruleset } from '@/lib/utils/rules';

export const DND5E_MODULES = [
    'deathsaves',
    'inspiration',
    'lair',
    'offhand',
    'opportunity',
] as const;

export const dnd5eRules = (over: Partial<Ruleset> = {}): Ruleset => ({
    ...DEFAULT_RULES,
    ...over,
    system: { key: 'dnd5e', modules: [...DND5E_MODULES] },
});

export const bareD20Rules = (over: Partial<Ruleset> = {}): Ruleset => ({
    ...DEFAULT_RULES,
    ...over,
    system: { key: 'd20', modules: [] },
});
