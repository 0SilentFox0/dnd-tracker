import { useTranslations } from 'next-intl';

import { useHasRule } from '../RulesPaths';
import { RulesSection } from '../RulesSection';

import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';
import type { Ruleset } from '@/lib/utils/rules';

export function EncountersSection({ form }: { form: RulesFormState }) {
    const t = useTranslations('rules');

    const has = useHasRule();

    const section = form.data.encounters;

    const set = (patch: Partial<Ruleset['encounters']>) =>
        form.set('encounters', { ...section, ...patch });

    const toggles = [
        {
            path: 'balance',
            id: 'rules-enc-balance',
            label: t('sections.encounters.balance'),
            checked: section.balance === 'xp',
            patch: (v: boolean) => ({ balance: v ? 'xp' : 'fair' }) as const,
        },
        {
            path: 'edition',
            id: 'rules-enc-edition',
            label: t('sections.encounters.edition'),
            checked: section.edition === '2024',
            patch: (v: boolean) => ({ edition: v ? '2024' : '2014' }) as const,
        },
        {
            path: 'autoXp',
            id: 'rules-enc-autoxp',
            label: t('sections.encounters.autoXp'),
            checked: section.autoXp,
            patch: (v: boolean) => ({ autoXp: v }),
        },
    ].filter(({ path }) => has(`encounters.${path}`));

    return (
        <RulesSection mechanic="encounters">
            <div className="space-y-3">
                {toggles.map(({ id, label, checked, patch }) => (
                    <SwitchField
                        key={id}
                        id={id}
                        label={label}
                        checked={checked}
                        onCheckedChange={(v) => set(patch(v))}
                    />
                ))}
                {has('encounters.autoXp') &&
                    section.autoXp &&
                    !form.data.outOfCombat.xp && (
                        <p className="text-xs text-hud-muted">
                            {t('sections.encounters.autoXpHint')}
                        </p>
                    )}
            </div>
        </RulesSection>
    );
}
