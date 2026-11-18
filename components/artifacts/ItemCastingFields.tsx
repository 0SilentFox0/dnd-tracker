'use client';

import { useTranslations } from 'next-intl';

import { HUD_SELECT_TRIGGER_CLASS } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { ITEM_LIMITS } from '@/lib/constants/artifacts';
import { MONSTER_CREATURE_TYPES } from '@/lib/constants/monster';
import { MAX_SPELL_LEVEL } from '@/lib/constants/spells';
import { useSpells } from '@/lib/hooks/spells';
import type { ItemStats } from '@/lib/utils/items/item-stats';

const PARAM_OPTIONS = {
    damageType: [
        'acid',
        'cold',
        'fire',
        'force',
        'lightning',
        'necrotic',
        'poison',
        'psychic',
        'radiant',
        'thunder',
        'bludgeoning',
        'piercing',
        'slashing',
    ],
    creatureType: [...MONSTER_CREATURE_TYPES],
};

type ItemSpell = NonNullable<ItemStats['spells']>[number];

const SPELL_NUMBER_FIELDS = ['cost', 'castLevel', 'dc', 'attackBonus'] as const;

export function ItemCastingFields({
    campaignId,
    value,
    onChange,
}: {
    campaignId: string;
    value: ItemStats;
    onChange: (patch: Partial<ItemStats>) => void;
}) {
    const t = useTranslations('artifacts.casting');

    const { data: library = [] } = useSpells(campaignId);

    const spells = value.spells ?? [];

    const setSpell = (index: number, patch: Partial<ItemSpell>) =>
        onChange({
            spells: spells.map((s, i) =>
                i === index ? { ...s, ...patch } : s
            ),
        });

    return (
        <div className="space-y-3">
            <label className="block text-xs">
                {t('parameter')}
                <SelectField
                    aria-label={t('parameterAria')}
                    triggerClassName={HUD_SELECT_TRIGGER_CLASS}
                    value={value.parameter?.kind ?? ''}
                    onValueChange={(v) => {
                        const kind = v as 'damageType' | 'creatureType' | '';

                        const key = kind === 'damageType' ? 'fire' : 'dragon';

                        onChange({
                            parameter: kind
                                ? { kind, options: [{ key, label: key }] }
                                : undefined,
                        });
                    }}
                    allowNone
                    noneLabel={t('noParameter')}
                    options={[
                        { value: 'damageType', label: t('damageType') },
                        { value: 'creatureType', label: t('creatureType') },
                    ]}
                />
            </label>
            {value.parameter && (
                <div className="flex flex-wrap gap-1">
                    {PARAM_OPTIONS[value.parameter.kind].map((key) => (
                        <Button
                            key={key}
                            type="button"
                            variant={
                                value.parameter?.options.some(
                                    (o) => o.key === key
                                )
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => {
                                const parameter = value.parameter;

                                if (!parameter) return;

                                const options = parameter.options.some(
                                    (o) => o.key === key
                                )
                                    ? parameter.options.filter(
                                          (o) => o.key !== key
                                      )
                                    : [
                                          ...parameter.options,
                                          { key, label: key },
                                      ];

                                if (options.length)
                                    onChange({
                                        parameter: { ...parameter, options },
                                    });
                            }}
                        >
                            {key}
                        </Button>
                    ))}
                </div>
            )}
            {spells.map((spell, index) => (
                <fieldset
                    key={spell.spellId}
                    className="space-y-2 rounded border border-hud-line p-2"
                >
                    <SelectField
                        aria-label={t('spellAria')}
                        triggerClassName={HUD_SELECT_TRIGGER_CLASS}
                        value={spell.spellId}
                        onValueChange={(id) => setSpell(index, { spellId: id })}
                        options={[
                            ...(library.some((s) => s.id === spell.spellId)
                                ? []
                                : [
                                      {
                                          value: spell.spellId,
                                          label: t('spellMissing'),
                                      },
                                  ]),
                            ...library.map((s) => ({
                                value: s.id,
                                label: `${s.name} (${s.level})`,
                            })),
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SPELL_NUMBER_FIELDS.map((key) => {
                            const [min, max] = ITEM_LIMITS[key];

                            const label = t(key);

                            return (
                                <label key={key} className="text-xs">
                                    {label}
                                    <Input
                                        aria-label={t('numberAria', { label })}
                                        type="number"
                                        min={min}
                                        max={max}
                                        value={spell[key] ?? ''}
                                        onChange={(e) =>
                                            setSpell(index, {
                                                [key]:
                                                    e.target.value === ''
                                                        ? undefined
                                                        : Number(
                                                              e.target.value
                                                          ),
                                            })
                                        }
                                    />
                                </label>
                            );
                        })}
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                            checked={!!spell.upcast}
                            onCheckedChange={(v) =>
                                setSpell(index, {
                                    upcast:
                                        v === true
                                            ? {
                                                  maxLevel: Math.min(
                                                      MAX_SPELL_LEVEL,
                                                      (spell.castLevel ?? 0) + 1
                                                  ),
                                                  extraCost: 1,
                                              }
                                            : undefined,
                                })
                            }
                        />
                        {t('upcast')}
                    </label>
                    {spell.upcast && (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs">
                                {t('maxLevel')}
                                <Input
                                    aria-label={t('maxLevelAria')}
                                    type="number"
                                    min={ITEM_LIMITS.upcastMaxLevel[0]}
                                    max={ITEM_LIMITS.upcastMaxLevel[1]}
                                    value={spell.upcast.maxLevel}
                                    onChange={(e) =>
                                        setSpell(index, {
                                            upcast: {
                                                maxLevel: Number(
                                                    e.target.value
                                                ),
                                                extraCost:
                                                    spell.upcast?.extraCost ??
                                                    1,
                                            },
                                        })
                                    }
                                />
                            </label>
                            <label className="text-xs">
                                {t('extraCost')}
                                <Input
                                    aria-label={t('extraCost')}
                                    type="number"
                                    min={ITEM_LIMITS.upcastExtraCost[0]}
                                    max={ITEM_LIMITS.upcastExtraCost[1]}
                                    value={spell.upcast.extraCost}
                                    onChange={(e) =>
                                        setSpell(index, {
                                            upcast: {
                                                maxLevel:
                                                    spell.upcast?.maxLevel ??
                                                    MAX_SPELL_LEVEL,
                                                extraCost: Number(
                                                    e.target.value
                                                ),
                                            },
                                        })
                                    }
                                />
                            </label>
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            onChange({
                                spells: spells.filter((_, i) => i !== index),
                            })
                        }
                    >
                        {t('removeSpell')}
                    </Button>
                </fieldset>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={library.every((s) =>
                    spells.some((g) => g.spellId === s.id)
                )}
                onClick={() => {
                    const next = library.find(
                        (s) => !spells.some((g) => g.spellId === s.id)
                    );

                    if (next)
                        onChange({
                            spells: [
                                ...spells,
                                {
                                    spellId: next.id,
                                    cost:
                                        value.charges || value.consumable
                                            ? 1
                                            : 0,
                                    castLevel: next.level,
                                },
                            ],
                        });
                }}
            >
                {t('addSpell')}
            </Button>
            {value.consumable && spells.length > 0 && (
                <p className="text-xs text-hud-muted">{t('scrollNote')}</p>
            )}
        </div>
    );
}
