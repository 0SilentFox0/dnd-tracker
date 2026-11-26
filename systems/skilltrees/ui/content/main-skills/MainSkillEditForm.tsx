'use client';

import { useTranslations } from 'next-intl';

import { MainSkillFormFields } from './MainSkillFormFields';

import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudFormMenu } from '@/components/hud';
import { HudForm, HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { useHasSourceNotes } from '@/lib/hooks/compendium-import';
import { useMainSkillForm } from '@/systems/skilltrees/hooks';
import type { MainSkill } from '@/types/main-skills';

const FORM_ID = 'main-skill-form';

interface MainSkillEditFormProps {
    campaignId: string;
    mainSkill: MainSkill;
}

export function MainSkillEditForm({
    campaignId,
    mainSkill,
}: MainSkillEditFormProps) {
    const t = useTranslations();

    const { form, spellGroups, status, actions } = useMainSkillForm(
        campaignId,
        mainSkill
    );

    const hasNotes = useHasSourceNotes(campaignId, 'main-skills', mainSkill.id);

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('skills.mainSkills.edit.title'),
                aside: t('skills.mainSkills.edit.aside'),
                back: {
                    href: `/campaigns/${campaignId}/dm/main-skills`,
                    label: t('skills.mainSkills.page.title'),
                },
                menu: (
                    <HudFormMenu
                        items={[
                            {
                                label: t('common.actions.delete'),
                                tone: 'danger',
                                disabled:
                                    status.isSaving || status.isDeleting,
                                confirm: {
                                    title: t(
                                        'skills.mainSkills.list.deleteConfirm'
                                    ),
                                    confirmLabel: t('common.actions.delete'),
                                    destructive: true,
                                },
                                onSelect: () => void actions.remove(),
                            },
                        ]}
                    />
                ),
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={actions.cancel}
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={status.isSaving}
                    >
                        {status.isSaving
                            ? t('common.actions.saving')
                            : t('skills.mainSkills.edit.submit')}
                    </Button>
                </>
            }
            side={
                hasNotes ? (
                    <SourceNotes
                        campaignId={campaignId}
                        kind="main-skills"
                        targetId={mainSkill.id}
                    />
                ) : undefined
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={actions.submit}
                error={status.error}
            >
                <MainSkillFormFields
                    form={form.data}
                    onChange={form.set}
                    spellGroups={spellGroups}
                />
            </HudForm>
        </HudFormPage>
    );
}
