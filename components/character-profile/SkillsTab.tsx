'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

import { ChargesList } from './rest/ChargesList';
import { ClassLevelUpDialog } from './ClassLevelUpDialog';
import { FeatsBlock } from './FeatsBlock';
import type { ClassLevelUpProps } from './LevelUpAction';
import {
    BackgroundSection,
    CharacterPath,
    ClassesHeader,
    ClassSection,
    SpellPicksNudge,
} from './path';
import { useProfile } from './ProfileContext';
import { RacePassive } from './RacePassive';

import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { classSectionOpen } from '@/lib/utils/characters/classes/path';

const ChoicesDialog = dynamic(() => import('./ChoicesDialog'), { ssr: false });

export function SkillsTab({
    manage = false,
    classLevelUp,
}: {
    manage?: boolean;
    classLevelUp?: ClassLevelUpProps;
}) {
    const { campaignId, characterId, sheet } = useProfile();

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const ui = systemUiOf(system.key, system.modules);

    const [choices, setChoices] = useState<{ startAt?: string } | null>(null);

    const [addingClass, setAddingClass] = useState(false);

    const names = Object.fromEntries([
        ...sheet.spells.map((sp) => [sp.id, sp.name]),
        ...(sheet.choices?.feats ?? []).map((f) => [f.id, f.name]),
    ]);

    const openChoices = (pickKey?: string) => setChoices({ startAt: pickKey });

    const actions = sheet.choices?.canEdit
        ? { onPick: openChoices }
        : undefined;

    return (
        <>
            <SpellPicksNudge onPick={actions && (() => openChoices())} />
            {sheet.classProgression && sheet.classProgression.length > 0 ? (
                <BackgroundSection
                    background={sheet.choices?.background}
                    canEdit={!!sheet.choices?.canEdit}
                    onOpen={openChoices}
                />
            ) : null}
            {sheet.classProgression && sheet.classProgression.length > 0 ? (
                <ClassesHeader
                    progressions={sheet.classProgression}
                    maxLevel={sheet.maxLevel}
                    onAddClass={
                        classLevelUp ? () => setAddingClass(true) : undefined
                    }
                />
            ) : null}
            {sheet.classProgression?.map((progression) => (
                <ClassSection
                    key={progression.classId}
                    progression={progression}
                    defaultOpen={classSectionOpen(
                        sheet.classProgression ?? [],
                        progression
                    )}
                >
                    <CharacterPath
                        progression={progression}
                        actions={actions}
                        names={names}
                    />
                </ClassSection>
            ))}
            {classLevelUp && addingClass ? (
                <ClassLevelUpDialog
                    open
                    onOpenChange={setAddingClass}
                    startNew
                    {...classLevelUp}
                />
            ) : null}
            {choices ? (
                <ChoicesDialog
                    open
                    onOpenChange={(o) => !o && setChoices(null)}
                    campaignId={campaignId}
                    characterId={characterId}
                    startAt={choices.startAt}
                />
            ) : null}
            <FeatsBlock />
            <RacePassive />
            <ChargesList />
            {ui.sheet?.pathPanels?.map((Panel, i) => (
                <Panel key={i} manage={manage} />
            ))}
        </>
    );
}
