'use client';

import { useTranslations } from 'next-intl';

import { SKILL_FORM_TAB, type SkillFormTabId } from './skill-form-tabs';

import { AbilityListEditor, withAbilityErrors } from '@/components/abilities';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { useHasSourceNotes } from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { useSkillForm } from '@/systems/skilltrees/hooks';
import { SkillBasicInfo } from '@/systems/skilltrees/ui/content/skills/form/basic';
import { SkillMainSkillSection } from '@/systems/skilltrees/ui/content/skills/form/main-skill';
import { SkillSpellSection } from '@/systems/skilltrees/ui/content/skills/form/spell';
import type { IdName } from '@/types/common';
import type { MainSkill } from '@/types/main-skills';
import type { Skill } from '@/types/skills';

const FORM_ID = 'skill-form';

interface SkillCreateFormProps {
    campaignId: string;
    spells: IdName[];
    initialMainSkills?: MainSkill[];
    initialData?: Skill;
}

export function SkillCreateForm({
    campaignId,
    spells,
    initialMainSkills,
    initialData,
}: SkillCreateFormProps) {
    const t = useTranslations();

    const ta = useTranslator('abilities');

    const { form, mainSkills, abilities, status, actions } = useSkillForm(
        campaignId,
        { initialData, initialMainSkills }
    );

    const { isSaving, error, isEdit } = status;

    const tabs: HudTab<SkillFormTabId>[] = [
        {
            id: SKILL_FORM_TAB.basic,
            label: t('common.tabs.basic'),
            content: (
                <div className="space-y-5">
                    <SkillBasicInfo form={form} />
                    <SkillMainSkillSection
                        form={form}
                        mainSkills={mainSkills}
                    />
                </div>
            ),
        },
        {
            id: SKILL_FORM_TAB.spell,
            label: t('skills.form.tabs.spell'),
            content: <SkillSpellSection form={form} spells={spells} />,
        },
        {
            id: SKILL_FORM_TAB.abilities,
            label: t('common.tabs.abilities'),
            invalid: !abilities.valid,
            content: (
                <AbilityListEditor
                    campaignId={campaignId}
                    value={form.data.abilities}
                    onChange={(next) => form.set('abilities', next)}
                    issues={abilities.issues}
                    onValidityChange={abilities.onValidityChange}
                />
            ),
        },
    ];

    const hasNotes = useHasSourceNotes(campaignId, 'skills', initialData?.id);

    return (
        <HudFormPage
            width="wide"
            header={{
                title: isEdit
                    ? t('skills.form.editTitle')
                    : t('skills.form.createTitle'),
                aside: isEdit
                    ? t('skills.form.editAside')
                    : t('skills.form.createAside'),
                back: {
                    href: `/campaigns/${campaignId}/dm/skills`,
                    label: t('common.dmSections.skills'),
                },
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={actions.cancel}
                        disabled={isSaving}
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={isSaving || !abilities.valid}
                    >
                        {isSaving
                            ? isEdit
                                ? t('common.actions.saving')
                                : t('common.actions.creating')
                            : withAbilityErrors(
                                  isEdit
                                      ? t('skills.form.submitEdit')
                                      : t('skills.form.submitCreate'),
                                  abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                initialData && hasNotes ? (
                    <SourceNotes
                        campaignId={campaignId}
                        kind="skills"
                        targetId={initialData.id}
                    />
                ) : undefined
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={actions.submit}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
                error={error}
            />
        </HudFormPage>
    );
}
