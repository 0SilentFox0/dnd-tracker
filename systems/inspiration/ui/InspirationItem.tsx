import { useTranslations } from 'next-intl';

import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';

export function InspirationItem({ form }: { form: RulesFormState }) {
    const t = useTranslations('rulesInspiration');

    const section = form.data.outOfCombat;

    return (
        <SwitchField
            id="rules-ooc-inspiration"
            label={t('label')}
            checked={section.inspiration}
            onCheckedChange={(inspiration) =>
                form.set('outOfCombat', { ...section, inspiration })
            }
        />
    );
}
