import type { Ruleset } from '@/lib/utils/rules/section-shapes';

type RetaliationRules = Pick<Ruleset['actions'], 'retaliation'>;

export const retaliationRules = ({ actions }: Ruleset): RetaliationRules => ({
    retaliation: actions.retaliation,
});
