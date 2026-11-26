'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { AlignmentGrid } from '@/components/characters/basic/AlignmentGrid';
import { BasicPanel } from '@/components/characters/basic/BasicPanel';
import { CharacterClassesField } from '@/components/characters/basic/CharacterClassesField';
import { HudSegmented } from '@/components/hud';
import { Label } from '@/components/ui/label';
import { LabeledInput } from '@/components/ui/labeled-input';
import { SelectField } from '@/components/ui/select-field';
import {
    CharacterType,
    type CharacterTypeValue,
} from '@/lib/constants/characters';
import {
    useArchetypeOptions,
    useClassEntriesField,
} from '@/lib/hooks/characters';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';
import { CampaignMember } from '@/types/campaigns';
import type { GameClassData } from '@/types/classes';
import type { Race } from '@/types/races';

interface CharacterBasicInfoProps {
    basicInfo: CharacterFormBindings['basicInfo'];
    campaignMembers?: CampaignMember[];
    races?: Race[];
    isPlayerView?: boolean;
    hide?: {
        progression?: boolean;
        lineage?: boolean;
        class?: boolean;
        alignment?: boolean;
        archetype?: boolean;
    };
    classMode?: {
        classes: GameClassData[];
        byId: Record<string, GameClassData>;
    };
    classSlots?: { action?: ReactNode; aside?: ReactNode };
}

export function CharacterBasicInfo({
    basicInfo,
    campaignMembers = [],
    races = [],
    isPlayerView = false,
    hide = {},
    classMode,
    classSlots,
}: CharacterBasicInfoProps) {
    const {
        progression: hideProgression = false,
        lineage: hideLineage = false,
        class: hideClass = false,
        alignment: hideAlignment = false,
        archetype: hideArchetype = false,
    } = hide;

    const t = useTranslations('characters.form.basic');

    const ts = useTranslations('characterProfile.basic.sections');

    const to = useTranslations('characterProfile.sheet.from');

    const { options: archetypeOptions, universalLabel } = useArchetypeOptions();

    const { data, set } = basicInfo;

    const setClasses = useClassEntriesField(basicInfo, classMode?.byId);

    const {
        name,
        type,
        controlledBy,
        level,
        class: className,
        subclass,
        archetype,
        race,
        subrace,
        alignment,
    } = data;

    const showLevel = !classMode && !hideProgression;

    const showArchetype =
        !isPlayerView && !classMode && !hideProgression && !hideArchetype;

    const showClasses = showLevel || !hideClass || showArchetype;

    return (
        <div className="@container flex w-full flex-col gap-4">
            <div className="grid gap-4 @[56rem]:grid-cols-2">
                <BasicPanel title={ts('identity')}>
                    <div className="grid gap-4">
                        <LabeledInput
                            id="name"
                            label={t('name')}
                            value={name}
                            onChange={(e) => set('name', e.target.value)}
                            required
                            placeholder={t('namePlaceholder')}
                            containerClassName="w-full min-w-0"
                            className="hud-title w-full text-xl"
                        />
                        <div className="ds-fields">
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <Label htmlFor={`type-${type}`}>
                                    {t('type')}
                                </Label>
                                <HudSegmented
                                    id="type"
                                    label={t('type')}
                                    value={type}
                                    onValueChange={(value) =>
                                        set('type', value as CharacterTypeValue)
                                    }
                                    options={[
                                        {
                                            value: CharacterType.PLAYER,
                                            label: t('typePlayer'),
                                        },
                                        {
                                            value: CharacterType.NPC_HERO,
                                            label: t('typeNpcHero'),
                                        },
                                    ]}
                                />
                            </div>
                            {type === CharacterType.PLAYER && (
                                <div className="w-full min-w-0">
                                    <Label htmlFor="controlledBy">
                                        {t('controlledBy')}
                                    </Label>
                                    <SelectField
                                        id="controlledBy"
                                        value={controlledBy}
                                        onValueChange={(value) =>
                                            set('controlledBy', value)
                                        }
                                        placeholder={t(
                                            'controlledByPlaceholder'
                                        )}
                                        options={campaignMembers.map(
                                            (member) => ({
                                                value: member.id,
                                                label: member.email
                                                    ? `${member.displayName} (${member.email})`
                                                    : member.displayName,
                                            })
                                        )}
                                        required
                                        triggerClassName="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </BasicPanel>
                {!hideLineage && (
                    <BasicPanel title={to('origin')}>
                        <div className="ds-fields">
                            <div className="w-full min-w-0">
                                <Label htmlFor="race">{t('race')}</Label>
                                <SelectField
                                    id="race"
                                    value={race}
                                    onValueChange={(value) =>
                                        set('race', value)
                                    }
                                    placeholder={t('racePlaceholder')}
                                    options={races.map((r) => ({
                                        value: r.name,
                                        label: r.name,
                                    }))}
                                    required
                                    triggerClassName="w-full"
                                />
                                {races.length === 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t('noRaces')}
                                    </p>
                                )}
                            </div>
                            <LabeledInput
                                id="subrace"
                                label={t('subrace')}
                                value={subrace || ''}
                                onChange={(e) => set('subrace', e.target.value)}
                                placeholder={t('subracePlaceholder')}
                                containerClassName="w-full min-w-0"
                                className="w-full"
                            />
                            {!hideAlignment && (
                                <div className="ds-span flex flex-col gap-1.5">
                                    <Label>{t('alignment')}</Label>
                                    <AlignmentGrid
                                        id="alignment"
                                        value={alignment || null}
                                        onChange={(value) =>
                                            set('alignment', value ?? '')
                                        }
                                        allowNone
                                    />
                                </div>
                            )}
                        </div>
                    </BasicPanel>
                )}
            </div>
            {(showClasses || classSlots?.aside) && (
                <div className="grid gap-4 @[56rem]:grid-cols-[minmax(0,1fr)_auto] @[56rem]:items-start">
                    {showClasses && (
                        <BasicPanel
                            title={ts('classes')}
                            action={classSlots?.action}
                        >
                            {classMode && !hideClass && (
                                <CharacterClassesField
                                    value={data.classes ?? []}
                                    classes={classMode.classes}
                                    onChange={setClasses}
                                />
                            )}
                            {!classMode && (
                                <div className="ds-fields ds-fields--num">
                                    {showLevel && (
                                        <LabeledInput
                                            id="level"
                                            label={t('level')}
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={level}
                                            onChange={(e) =>
                                                set(
                                                    'level',
                                                    parseInt(e.target.value) ||
                                                        1
                                                )
                                            }
                                            containerClassName="w-full min-w-0"
                                            className="w-full"
                                        />
                                    )}
                                    {!hideClass && (
                                        <>
                                            <LabeledInput
                                                id="class"
                                                label={t('class')}
                                                value={className}
                                                onChange={(e) =>
                                                    set('class', e.target.value)
                                                }
                                                required
                                                placeholder={t(
                                                    'classPlaceholder'
                                                )}
                                                containerClassName="w-full min-w-0"
                                                className="w-full"
                                            />
                                            <LabeledInput
                                                id="subclass"
                                                label={t('subclass')}
                                                value={subclass || ''}
                                                onChange={(e) =>
                                                    set(
                                                        'subclass',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={t(
                                                    'subclassPlaceholder'
                                                )}
                                                containerClassName="w-full min-w-0"
                                                className="w-full"
                                            />
                                        </>
                                    )}
                                    {showArchetype && (
                                        <div className="w-full min-w-0">
                                            <Label htmlFor="archetype">
                                                {t('archetype')}
                                            </Label>
                                            <SelectField
                                                id="archetype"
                                                value={archetype || ''}
                                                onValueChange={(value) =>
                                                    set('archetype', value)
                                                }
                                                options={archetypeOptions}
                                                allowNone
                                                noneLabel={universalLabel}
                                                triggerClassName="w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </BasicPanel>
                    )}
                    {classSlots?.aside}
                </div>
            )}
        </div>
    );
}
