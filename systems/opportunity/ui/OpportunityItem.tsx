import { useTranslations } from 'next-intl';

import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';

export function OpportunityItem({ form }: { form: RulesFormState }) {
    const t = useTranslations('rules');

    const actions = form.data.actions;

    return (
        <SwitchField
            id="rules-actions-oa"
            label={t('sections.actions.opportunityAttacks')}
            checked={actions.opportunityAttacks}
            onCheckedChange={(v) =>
                form.set('actions', { ...actions, opportunityAttacks: v })
            }
        />
    );
}
