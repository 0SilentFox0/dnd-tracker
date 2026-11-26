'use client';

import { useTranslations } from 'next-intl';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import {
    marginLimit,
    type Margins,
    MAX_MARGIN,
    MIN_PLAYABLE,
} from '@/lib/utils/battle/grid';
import { clamp } from '@/lib/utils/common/clamp';

const MARGIN_KEYS: (keyof Margins)[] = ['top', 'right', 'bottom', 'left'];

export function MarginsSection({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { map, margins } = editor.state;

    const { actions } = editor;

    const setEqual = () => {
        const cap = Math.min(
            MAX_MARGIN,
            Math.floor((map.rows - MIN_PLAYABLE) / 2),
            Math.floor((map.cols - MIN_PLAYABLE) / 2)
        );

        const n = clamp(margins.top, 0, cap);

        actions.setMargins({ top: n, right: n, bottom: n, left: n });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <Label>{t('margins.title')}</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setEqual}
                >
                    {t('margins.equal')}
                </Button>
            </div>
            <div className="ds-fields ds-fields--num grid grid-cols-2 gap-3">
                {MARGIN_KEYS.map((key) => (
                    <div key={key}>
                        <Label
                            htmlFor={`map-margin-${key}`}
                            className="text-xs"
                        >
                            {t(`margins.${key}`)}
                        </Label>
                        <BoundedNumberInput
                            id={`map-margin-${key}`}
                            value={margins[key]}
                            min={0}
                            max={marginLimit(map, margins, key)}
                            onCommit={(v) =>
                                actions.setMargins({ ...margins, [key]: v })
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
