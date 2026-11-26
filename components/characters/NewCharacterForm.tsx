'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { PortraitDialog } from '@/components/character-profile/sheet/PortraitDialog';
import { SheetBanner } from '@/components/character-profile/sheet/SheetBanner';
import { CharacterAbilitiesSection } from '@/components/characters/abilities/CharacterAbilitiesSection';
import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import {
    CHARACTER_FORM_TAB,
    type CharacterFormTabId,
} from '@/components/characters/character-form-tabs';
import { CharacterSkillsSection } from '@/components/characters/skills/CharacterSkillsSection';
import { SystemFormFields } from '@/components/characters/stats/SystemFormFields';
import { CharacterChoicesTab } from '@/components/choices/character/CharacterChoicesTab';
import {
    HudForm,
    HudFormPage,
    HudSection,
    type HudTab,
} from '@/components/hud/form';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import type { CharacterTypeValue } from '@/lib/constants/characters';
import { useCampaignMembers } from '@/lib/hooks/campaigns';
import type { ChoiceRefsView } from '@/lib/hooks/characters';
import {
    useCharacterForm,
    useChoiceRefs,
    useCreateCharacter,
} from '@/lib/hooks/characters';
import { useClassMode } from '@/lib/hooks/classes';
import { useRaces } from '@/lib/hooks/races';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { pruneFormChoices } from '@/lib/utils/characters/choices/prune';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const FORM_ID = 'character-form';

type NewCharacterFormProps = {
    campaignId: string;
    characterType: CharacterTypeValue;
    systemKey: string;
};

export function NewCharacterForm({
    campaignId: id,
    characterType,
    systemKey,
}: NewCharacterFormProps) {
    const router = useRouter();

    const t = useTranslations('characters');

    const tc = useTranslations('common');

    const create = useCreateCharacter(id);

    const { members, isLoading: membersLoading } = useCampaignMembers(id);

    const { data: races = [] } = useRaces(id);

    const classMode = useClassMode(id);

    const { def: system, system: current } = useCampaignSystem(id, systemKey);

    const Ui = systemUiOf(current.key, current.modules);

    const hasClasses = statColumnsOf(system).has('classes');

    const [portraitOpen, setPortraitOpen] = useState(false);

    const refsRef = useRef<ChoiceRefsView | null>(null);

    const {
        status: { isLoading, error },
        formData,
        basicInfo,
        skills,
        abilities,
        actions: { handleSubmit, setFormData },
        ...bindings
    } = useCharacterForm({
        type: characterType,
        requireRace: system.lineage,
        requireClass: hasClasses,
        seedCharacteristics: system.characteristics.defaults,
        recommendScores: classMode.byId,
        onSubmit: async (data) => {
            await create.mutateAsync(
                refsRef.current?.ready
                    ? pruneFormChoices(data, refsRef.current)
                    : data
            );
            router.push(
                `/campaigns/${id}/dm/characters?type=${data.basicInfo.type}`
            );
        },
    });

    const refs = useChoiceRefs(id, basicInfo.data.race);

    useEffect(() => {
        refsRef.current = refs;
    }, [refs]);

    const raceHasChoices =
        (races.find((r) => r.name === basicInfo.data.race)?.choices?.length ??
            0) > 0;

    const heroClassMode =
        classMode.enabled &&
        (basicInfo.data.classes ?? []).some((e) => e.classId);

    const tabs: HudTab<CharacterFormTabId>[] = [
        {
            id: CHARACTER_FORM_TAB.basic,
            label: tc('tabs.basic'),
            content: (
                <CharacterBasicInfo
                    basicInfo={basicInfo}
                    campaignMembers={members}
                    races={races}
                    hide={{
                        progression: !!Ui?.hideProgression,
                        lineage: !system.lineage,
                        class: !hasClasses,
                        alignment: !system.identity.alignments,
                        archetype: !statColumnsOf(system).has('archetype'),
                    }}
                    classMode={
                        classMode.enabled && Ui && !Ui.hideProgression
                            ? classMode
                            : undefined
                    }
                />
            ),
        },
        {
            id: CHARACTER_FORM_TAB.combat,
            label: t('form.tabs.combat'),
            content: Ui && (
                <Ui.StatsFields
                    bindings={{ basicInfo, skills, abilities, ...bindings }}
                    campaignId={id}
                    mode="create"
                    extraFields={
                        <SystemFormFields
                            campaignId={id}
                            combatStats={bindings.combatStats}
                        />
                    }
                    classArmor={
                        classMode.enabled &&
                        (basicInfo.data.classes ?? []).length > 0
                            ? null
                            : undefined
                    }
                />
            ),
        },
        {
            id: CHARACTER_FORM_TAB.skills,
            label: tc('tabs.abilities'),
            content: (
                <>
                    {Ui && !Ui.hideProgression && (
                        <CharacterSkillsSection skills={skills} />
                    )}
                    <HudSection title={t('form.sections.personalAbility')}>
                        <CharacterAbilitiesSection
                            campaignId={id}
                            abilities={abilities}
                        />
                    </HudSection>
                </>
            ),
        },
        ...(raceHasChoices || heroClassMode
            ? [
                  {
                      id: CHARACTER_FORM_TAB.choices,
                      label: tc('tabs.choices'),
                      content: (
                          <CharacterChoicesTab
                              campaignId={id}
                              form={{ data: formData, set: setFormData }}
                              classesEnabled={classMode.enabled}
                          />
                      ),
                  },
              ]
            : []),
    ];

    const heroRace = races.find((r) => r.name === basicInfo.data.race);

    return (
        <HudFormPage
            width="wide"
            header={{ title: t('form.title'), aside: t('form.aside') }}
            actions={
                <>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={isLoading || membersLoading}
                    >
                        {isLoading ? tc('actions.creating') : t('form.submit')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={`/campaigns/${id}/dm/characters`}>
                            {tc('actions.cancel')}
                        </Link>
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
                <SheetBanner
                    hero={{
                        name: basicInfo.data.name,
                        avatar: basicInfo.data.avatar || null,
                        raceColor: heroRace?.color ?? null,
                        raceIcon: heroRace?.icon ?? null,
                        race: basicInfo.data.race,
                    }}
                    onPortrait={() => setPortraitOpen(true)}
                />
                <HudForm
                    id={FORM_ID}
                    onSubmit={handleSubmit}
                    error={error}
                    tabs={tabs}
                />
            </div>
            <PortraitDialog
                open={portraitOpen}
                onOpenChange={setPortraitOpen}
                value={basicInfo.data.avatar || ''}
                onChange={(value) => basicInfo.set('avatar', value)}
                name={basicInfo.data.name}
            />
        </HudFormPage>
    );
}
