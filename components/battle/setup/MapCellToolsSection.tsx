'use client';

import { useTranslations } from 'next-intl';

import { ToolButtons } from './MapToolButtons';

import { MAP_MODE_UI } from '@/components/battle/modes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { HAZARD_DICE_PATTERN } from '@/lib/constants/battle';
import { DAMAGE_ELEMENT_OPTIONS } from '@/lib/constants/damage';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import type { SetupTool } from '@/lib/utils/battle/grid';

const TOOLS: SetupTool[] = ['blocked', 'wall', 'hazard', 'erase'];

export function MapCellToolsSection({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const tDamage = useTranslations('gameTerms.damageTypes');

    const { mode, tool } = editor.state;

    const { brush, actions } = editor;

    const damageOptions = DAMAGE_ELEMENT_OPTIONS.map(({ value }) => ({
        value,
        label: tDamage(value),
    }));

    return (
        <div
            className="space-y-2"
            hidden={!!mode && !!MAP_MODE_UI[mode].hidesTerrain}
        >
            <Label>{t('drawing')}</Label>
            <ToolButtons tools={TOOLS} tool={tool} onPick={actions.setTool} />
            {tool === 'hazard' && (
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem]">
                    <Input
                        aria-label={t('hazardLabel')}
                        className="self-end"
                        maxLength={60}
                        value={brush.label}
                        onChange={(e) =>
                            actions.setBrush({
                                label: e.target.value,
                            })
                        }
                    />
                    <div className="space-y-1">
                        <Label htmlFor="map-hazard-dice" className="text-xs">
                            {t('hazardDice')}
                        </Label>
                        <Input
                            id="map-hazard-dice"
                            aria-invalid={
                                brush.dice.trim() !== '' &&
                                !HAZARD_DICE_PATTERN.test(brush.dice.trim())
                            }
                            maxLength={12}
                            placeholder={t('hazardDicePlaceholder')}
                            value={brush.dice}
                            onChange={(e) =>
                                actions.setBrush({
                                    dice: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="map-hazard-type" className="text-xs">
                            {t('hazardType')}
                        </Label>
                        <SelectField
                            id="map-hazard-type"
                            value={brush.damageType}
                            onValueChange={(damageType) =>
                                actions.setBrush({ damageType })
                            }
                            placeholder={t('hazardType')}
                            options={damageOptions}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
