import { useTranslations } from 'next-intl';

import { SelectField } from '@/components/ui/select-field';
import { BATTLE_SELECT_TRIGGER_CLASS } from '@/lib/constants/battle';
import type { useSpellBook } from '@/lib/hooks/battle';
import { useText } from '@/lib/i18n/use-text';

type Book = ReturnType<typeof useSpellBook>;

export function CastSourceSelect({ book }: { book: Book }) {
    const tw = useTranslations('battleWizards.spell.source');

    const text = useText();

    const { options, value } = {
        options: book.view.sourceOptions,
        value: book.view.sourceValue,
    };

    if (options.length === 0) return null;

    return (
        <div className="mb-3 space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3">
                {tw('label')}
                <SelectField
                    aria-label={tw('label')}
                    value={value}
                    onValueChange={book.actions.setSource}
                    placeholder={tw('pick')}
                    triggerClassName={`${BATTLE_SELECT_TRIGGER_CLASS} w-auto`}
                    options={options.map((option) => ({
                        value: option.value,
                        label: text(option.label),
                        disabled: option.disabled,
                    }))}
                />
            </label>
            {book.view.castLevelOptions.length > 0 && (
                <label className="flex items-center justify-between gap-3">
                    {tw('level')}
                    <SelectField
                        aria-label={tw('level')}
                        value={String(book.view.castLevelValue ?? '')}
                        onValueChange={(v) =>
                            book.actions.setCastLevel(Number(v))
                        }
                        triggerClassName={`${BATTLE_SELECT_TRIGGER_CLASS} w-auto`}
                        options={book.view.castLevelOptions.map((option) => ({
                            value: String(option.value),
                            label: text(option.label),
                            disabled: option.disabled,
                        }))}
                    />
                </label>
            )}
        </div>
    );
}
