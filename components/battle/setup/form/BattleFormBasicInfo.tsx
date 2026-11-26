'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SwitchField } from '@/components/ui/switch-field';
import { Textarea } from '@/components/ui/textarea';
import {
    clampTurnTimer,
    DEFAULT_TURN_TIMER_SECONDS,
    TURN_TIMER_RANGE,
} from '@/lib/constants/battle';

export interface BattleDetails {
    name: string;
    description: string;
    turnTimerSeconds: number | null;
}

export interface SetupDetails {
    data: BattleDetails;
    set: Dispatch<SetStateAction<BattleDetails>>;
}

export function BattleFormBasicInfo({ details }: { details: SetupDetails }) {
    const t = useTranslations('battleSetup.basic');

    const { data, set } = details;

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) =>
                        set((prev) => ({
                            ...prev,
                            description: e.target.value,
                        }))
                    }
                    placeholder={t('descriptionPlaceholder')}
                    rows={3}
                />
            </div>
            <SwitchField
                id="turn-timer-enabled"
                label={t('turnTimer')}
                description={t('turnTimerHint')}
                checked={data.turnTimerSeconds !== null}
                onCheckedChange={(on) =>
                    set((prev) => ({
                        ...prev,
                        turnTimerSeconds: on
                            ? DEFAULT_TURN_TIMER_SECONDS
                            : null,
                    }))
                }
            />
            {data.turnTimerSeconds !== null && (
                <div>
                    <Label htmlFor="turn-timer-seconds">
                        {t('turnTimerSeconds')}
                    </Label>
                    <Input
                        id="turn-timer-seconds"
                        type="number"
                        min={TURN_TIMER_RANGE[0]}
                        max={TURN_TIMER_RANGE[1]}
                        value={data.turnTimerSeconds}
                        onChange={(e) =>
                            set((prev) => ({
                                ...prev,
                                turnTimerSeconds:
                                    Math.trunc(Number(e.target.value)) || 0,
                            }))
                        }
                        onBlur={() =>
                            set((prev) => ({
                                ...prev,
                                turnTimerSeconds: clampTurnTimer(
                                    prev.turnTimerSeconds
                                ),
                            }))
                        }
                    />
                </div>
            )}
        </div>
    );
}
