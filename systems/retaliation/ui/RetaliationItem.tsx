import { useTranslations } from 'next-intl';

import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';

export function RetaliationItem({ form }: { form: RulesFormState }) {
    const t = useTranslations('rules');

    const actions = form.data.actions;

    return (
        <SwitchField
            id="rules-actions-retaliation"
            label={t('sections.actions.retaliation')}
            checked={actions.retaliation}
            onCheckedChange={(v) =>
                form.set('actions', { ...actions, retaliation: v })
            }
        />
    );
}
