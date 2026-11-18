import { useTranslations } from 'next-intl';

import { SelectField } from '@/components/ui/select-field';
import { BATTLE_SELECT_TRIGGER_CLASS } from '@/lib/constants/battle';
import type { useSpellBook } from '@/lib/hooks/battle';
import { useText } from '@/lib/i18n/use-text';

type Book = ReturnType<typeof useSpellBook>;

export function SlotSelect({ book }: { book: Book }) {
    const tw = useTranslations('battleWizards.spell');

    const text = useText();

    const { options, value } = book.view.slot;

    if (options.length === 0) return null;

    return (
        <label className="mb-3 flex items-center justify-between gap-3 text-sm">
            {tw('slot')}
            <SelectField
                aria-label={tw('slot')}
                value={value ?? options[0].key}
                onValueChange={book.actions.setSlot}
                triggerClassName={`${BATTLE_SELECT_TRIGGER_CLASS} w-auto`}
                options={options.map((o) => ({
                    value: o.key,
                    label: text(o.label),
                }))}
            />
        </label>
    );
}
