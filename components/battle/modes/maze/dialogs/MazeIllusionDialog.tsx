'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SelectField } from '@/components/ui/select-field';
import { useUnitPicker } from '@/lib/hooks/units';
import type { IllusionDisguise, IllusionGroup } from '@/types/battle-grid';

interface Hero {
    id: string;
    name: string;
}

interface Member {
    id: string;
    disguise: IllusionDisguise | null;
}

interface GroupRow {
    heroes: Member[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignId: string;
    heroes: Hero[];
    groups: IllusionGroup[];
    onApply: (groups: IllusionGroup[]) => void;
    onClear: () => void;
}

const EMPTY_GROUP: GroupRow = { heroes: [{ id: '', disguise: null }] };

function MaskPicker({
    campaignId,
    label,
    value,
    onChange,
}: {
    campaignId: string;
    label: string;
    value: IllusionDisguise | null;
    onChange: (d: IllusionDisguise) => void;
}) {
    const tPick = useTranslations('battleDm.addParticipant');

    const picker = useUnitPicker(campaignId, true);

    const units = picker.tiers.flatMap((tier) => tier.units);

    const options = units.map((u) => ({ value: u.id, label: u.name }));

    if (value?.unitId && !units.some((u) => u.id === value.unitId))
        options.push({ value: value.unitId, label: value.name });

    const pickUnit = (id: string) => {
        const unit = units.find((u) => u.id === id);

        if (unit)
            onChange({
                name: unit.name,
                unitId: unit.id,
                ...(unit.avatar ? { avatar: unit.avatar } : {}),
            });
    };

    return (
        <div className="space-y-1">
            <div className="text-xs text-hud-muted">{label}</div>
            <div className="flex gap-2">
                <SelectField
                    aria-label={tPick('race')}
                    value={picker.raceKey}
                    onValueChange={picker.selectRace}
                    placeholder={tPick('pickRace')}
                    options={picker.raceOptions.map((r) => ({
                        value: r.key,
                        label: `${r.label} (${r.count})`,
                    }))}
                />
                <SelectField
                    aria-label={label}
                    value={value?.unitId ?? ''}
                    onValueChange={pickUnit}
                    placeholder={tPick('pickUnit')}
                    options={options}
                    disabled={!picker.raceKey && !value}
                />
            </div>
        </div>
    );
}

const toRows = (groups: IllusionGroup[]): GroupRow[] =>
    groups.map((group) => ({
        heroes: group.heroes.map((hero) => ({ ...hero })),
    }));

const isComplete = (row: GroupRow): boolean =>
    row.heroes.length >= 2 &&
    row.heroes.every((hero) => !!hero.id && !!hero.disguise) &&
    new Set(row.heroes.map((hero) => hero.id)).size === row.heroes.length;

export function MazeIllusionDialog({
    open,
    onOpenChange,
    campaignId,
    heroes,
    groups,
    onApply,
    onClear,
}: Props) {
    const t = useTranslations('battleDm.maze.illusion');

    const tPick = useTranslations('battleDm.addParticipant');

    const tMaze = useTranslations('battleDm.maze');

    const tActions = useTranslations('common.actions');

    const [rows, setRows] = useState<GroupRow[]>(() => toRows(groups));

    const patchMember = (
        groupIndex: number,
        memberIndex: number,
        patch: Partial<Member>
    ) =>
        setRows((current) =>
            current.map((group, i) =>
                i === groupIndex
                    ? {
                          ...group,
                          heroes: group.heroes.map((hero, j) =>
                              j === memberIndex ? { ...hero, ...patch } : hero
                          ),
                      }
                    : group
            )
        );

    const heroOptions = (groupIndex: number, memberIndex: number) => {
        const selectedInGroup = new Set(
            rows[groupIndex]?.heroes.flatMap((hero, i) =>
                i === memberIndex ? [] : [hero.id]
            ) ?? []
        );

        return heroes.map((hero) => ({
            value: hero.id,
            label: hero.name,
            disabled: selectedInGroup.has(hero.id),
        }));
    };

    const ready = rows.length > 0 && rows.every(isComplete);

    const submit = (action: () => void) => () => {
        action();
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            hud
            title={tMaze('toolbar.illusion')}
            footer={
                <>
                    <Button variant="outline" onClick={submit(onClear)}>
                        {t('restore')}
                    </Button>
                    <Button
                        disabled={!ready}
                        onClick={submit(() =>
                            onApply(
                                rows.map((row) => ({
                                    heroes: row.heroes.map((hero) => ({
                                        id: hero.id,
                                        disguise: hero.disguise!,
                                    })),
                                }))
                            )
                        )}
                    >
                        {t('apply')}
                    </Button>
                </>
            }
        >
            <div className="space-y-4 py-2">
                {rows.map((row, groupIndex) => (
                    <section
                        key={groupIndex}
                        className="space-y-3 rounded-md border border-hud-rule p-3"
                    >
                        <header className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">
                                #{groupIndex + 1}
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setRows((current) =>
                                        current.filter(
                                            (_, i) => i !== groupIndex
                                        )
                                    )
                                }
                            >
                                {tActions('remove')}
                            </Button>
                        </header>
                        {row.heroes.map((member, memberIndex) => (
                            <div
                                key={memberIndex}
                                className="space-y-2 rounded border border-hud-rule/60 p-2"
                            >
                                <div className="flex gap-2">
                                    <SelectField
                                        aria-label={`${tPick('hero')} ${groupIndex + 1}.${memberIndex + 1}`}
                                        value={member.id}
                                        onValueChange={(id) =>
                                            patchMember(
                                                groupIndex,
                                                memberIndex,
                                                { id }
                                            )
                                        }
                                        placeholder={tPick('pickHero')}
                                        options={heroOptions(
                                            groupIndex,
                                            memberIndex
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={row.heroes.length <= 2}
                                        onClick={() =>
                                            setRows((current) =>
                                                current.map((group, i) =>
                                                    i === groupIndex
                                                        ? {
                                                              ...group,
                                                              heroes: group.heroes.filter(
                                                                  (_, j) =>
                                                                      j !==
                                                                      memberIndex
                                                              ),
                                                          }
                                                        : group
                                                )
                                            )
                                        }
                                    >
                                        {tActions('remove')}
                                    </Button>
                                </div>
                                <MaskPicker
                                    campaignId={campaignId}
                                    label={t('heroAppearsAs', {
                                        group: groupIndex + 1,
                                        name:
                                            heroes.find(
                                                (hero) => hero.id === member.id
                                            )?.name ?? tPick('hero'),
                                    })}
                                    value={member.disguise}
                                    onChange={(disguise) =>
                                        patchMember(groupIndex, memberIndex, {
                                            disguise,
                                        })
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            aria-label={`${tActions('add')} (${groupIndex + 1})`}
                            variant="outline"
                            disabled={row.heroes.length >= 20}
                            onClick={() =>
                                setRows((current) =>
                                    current.map((group, i) =>
                                        i === groupIndex
                                            ? {
                                                  ...group,
                                                  heroes: [
                                                      ...group.heroes,
                                                      {
                                                          id: '',
                                                          disguise: null,
                                                      },
                                                  ],
                                              }
                                            : group
                                    )
                                )
                            }
                        >
                            {tActions('add')}
                        </Button>
                    </section>
                ))}
                <Button
                    type="button"
                    aria-label={`${tActions('add')} ${rows.length + 1}`}
                    variant="outline"
                    disabled={rows.length >= 8}
                    onClick={() =>
                        setRows((current) => [...current, EMPTY_GROUP])
                    }
                >
                    {tActions('add')}
                </Button>
            </div>
        </ResponsiveDialog>
    );
}
