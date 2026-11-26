'use client';

import { useTranslations } from 'next-intl';

import { RACE_FORM_TAB } from './race-form-tabs';
import { useRaceFormTabs } from './useRaceFormTabs';

import { withAbilityErrors } from '@/components/abilities';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudForm, HudFormPage } from '@/components/hud/form';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { useRaceForm } from '@/lib/hooks/races';
import { useRuleSystem } from '@/lib/hooks/systems';
import { useTranslator } from '@/lib/i18n/use-translator';
import { errorMessage } from '@/lib/utils/common/error-message';
import { getInitialRaceFormData } from '@/lib/utils/races/race-form';
import type { Race } from '@/types/races';

const FORM_ID = 'race-form';

interface RaceEditFormProps {
    campaignId: string;
    race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
    const t = useTranslations('races');

    const ta = useTranslator('abilities');

    const tc = useTranslations('common');

    const { key } = useRuleSystem({ campaignId });

    const ProfileEditor = key && systemUiOf(key).RaceProfileEditor;

    const editor = useRaceForm(
        campaignId,
        race.id,
        getInitialRaceFormData(race)
    );

    const tabs = useRaceFormTabs({
        campaignId,
        form: editor.form,
        abilityIssues: race.abilityIssues,
        onAbilitiesValidityChange: editor.abilities.onValidityChange,
    }).map((tab) =>
        tab.id === RACE_FORM_TAB.basic && ProfileEditor
            ? {
                  ...tab,
                  content: (
                      <div className="space-y-6">
                          {tab.content}
                          <ProfileEditor
                              campaignId={campaignId}
                              raceId={race.id}
                          />
                      </div>
                  ),
              }
            : tab
    );

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('edit.title'),
                aside: t('edit.aside'),
                back: {
                    href: `/campaigns/${campaignId}/dm/races`,
                    label: tc('dmSections.races'),
                },
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={editor.actions.cancel}
                    >
                        {tc('actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={
                            editor.status.isSaving || !editor.abilities.valid
                        }
                    >
                        {editor.status.isSaving
                            ? tc('actions.saving')
                            : withAbilityErrors(
                                  tc('actions.save'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                <SourceNotes
                    campaignId={campaignId}
                    kind="races"
                    targetId={race.id}
                />
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={editor.actions.submit}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
                error={
                    editor.status.error != null
                        ? errorMessage(editor.status.error, t('edit.error'))
                        : null
                }
            />
        </HudFormPage>
    );
}
