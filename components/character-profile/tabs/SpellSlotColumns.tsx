import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';

import { spellLevelRoman } from '@/lib/constants/spells';
import { cn } from '@/lib/utils';

export function SpellSlotColumns() {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.magic');

    const persist = !!sheet.rest?.persist;

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(56px,1fr))] gap-px overflow-hidden rounded-[4px] border border-hud-line bg-hud-rule shadow-sm">
            {sheet.slots.map((s) => {
                const left = persist ? s.current : s.count;

                return (
                    <div
                        key={s.level}
                        role="group"
                        aria-label={
                            persist
                                ? t('slotsLeft', {
                                      level: spellLevelRoman(s.level),
                                      current: s.current,
                                      count: s.count,
                                  })
                                : t('slotsTotal', {
                                      level: spellLevelRoman(s.level),
                                      count: s.count,
                                  })
                        }
                        className="grid min-h-20 content-start justify-items-center gap-3 bg-hud-panel px-1 py-3"
                    >
                        <b className="hud-title text-xl text-hud-muted">
                            {spellLevelRoman(s.level)}
                        </b>
                        <span
                            aria-hidden
                            className="grid justify-items-center gap-2"
                        >
                            {Array.from({ length: s.count }, (_, i) => (
                                <i
                                    key={i}
                                    className={cn(
                                        'size-3.5 rotate-45 rounded-[2px]',
                                        i < left
                                            ? 'bg-hud-ink'
                                            : 'border-[1.5px] border-hud-muted'
                                    )}
                                />
                            ))}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
