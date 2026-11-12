'use client';

import { useTranslations } from 'next-intl';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Label } from '@/components/ui/label';
import type { SectionBinding } from '@/lib/utils/characters/form/bindings';
import { value } from '@/systems/wfrp/rules/characteristics';
import {
    CHARACTERISTIC_KEYS,
    type Characteristics,
} from '@/systems/wfrp/rules/characteristics/keys';

export function CharacteristicsEditor({
    binding: { data, set },
    withExtras = true,
}: {
    binding: SectionBinding<Characteristics>;
    withExtras?: boolean;
}) {
    const t = useTranslations('characters.wfrp');

    const tg = useTranslations('gameTerms.characteristics');

    const setPer = (
        field: 'base' | 'advances',
        key: (typeof CHARACTERISTIC_KEYS)[number],
        value: number
    ) => set(field, { ...data[field], [key]: value });

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-[1fr_5rem_5rem_3rem] items-center gap-2 text-sm">
                <span />
                <span className="text-xs text-hud-muted">{t('base')}</span>
                <span className="text-xs text-hud-muted">{t('advances')}</span>
                <span className="text-xs text-hud-muted">{t('total')}</span>
                {CHARACTERISTIC_KEYS.map((key) => (
                    <div key={key} className="contents">
                        <Label htmlFor={`char-base-${key}`}>
                            {tg(`${key}.label`)}
                        </Label>
                        <BoundedNumberInput
                            id={`char-base-${key}`}
                            min={1}
                            max={100}
                            value={data.base[key]}
                            onCommit={(v) => setPer('base', key, v)}
                        />
                        <BoundedNumberInput
                            id={`char-adv-${key}`}
                            aria-label={`${tg(`${key}.label`)}: ${t('advances')}`}
                            min={0}
                            max={100}
                            value={data.advances[key]}
                            onCommit={(v) => setPer('advances', key, v)}
                        />
                        <span className="tabular-nums">{value(data, key)}</span>
                    </div>
                ))}
            </div>
            {withExtras && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                        <Label htmlFor="char-move" className="text-xs">
                            {t('move')}
                        </Label>
                        <BoundedNumberInput
                            id="char-move"
                            min={1}
                            max={12}
                            value={data.move}
                            onCommit={(v) => set('move', v)}
                        />
                    </div>
                    <div className="min-w-0">
                        <Label htmlFor="char-fate" className="text-xs">
                            {t('fate')}
                        </Label>
                        <BoundedNumberInput
                            id="char-fate"
                            min={0}
                            max={9}
                            value={data.fate}
                            onCommit={(v) => set('fate', v)}
                        />
                    </div>
                    <div className="min-w-0">
                        <Label htmlFor="char-extra-wounds" className="text-xs">
                            {t('extraWounds')}
                        </Label>
                        <BoundedNumberInput
                            id="char-extra-wounds"
                            min={0}
                            max={3}
                            value={data.extraWounds}
                            onCommit={(v) => set('extraWounds', v)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
