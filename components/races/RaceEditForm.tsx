'use client';

import { type ReactNode, useDeferredValue } from 'react';
import { useTranslations } from 'next-intl';

import { RaceFormFields } from './RaceFormFields';

import { withAbilityErrors } from '@/components/abilities';
import { PlayerPreview } from '@/components/common/entity/PlayerPreview';
import { HudForm, HudFormPage } from '@/components/hud/form';
import { RaceCard } from '@/components/races/RaceCard';
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
    side?: ReactNode;
}

export function RaceEditForm({ campaignId, race, side }: RaceEditFormProps) {
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

    const deferred = useDeferredValue(editor.form.data);

    return (
        <HudFormPage
            width="wide"
            title={t('edit.title')}
            aside={t('edit.aside')}
            side={
                <PlayerPreview notes={side}>
                    <RaceCard
                        race={{ ...race, ...deferred }}
                        campaignId={campaignId}
                        canEdit={false}
                    />
                </PlayerPreview>
            }
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
        >
            <HudForm
                id={FORM_ID}
                onSubmit={editor.actions.submit}
                error={
                    editor.status.error != null
                        ? errorMessage(editor.status.error, t('edit.error'))
                        : null
                }
            >
                <div className="space-y-6">
                    <RaceFormFields
                        campaignId={campaignId}
                        form={editor.form}
                        abilityIssues={race.abilityIssues}
                        onAbilitiesValidityChange={
                            editor.abilities.onValidityChange
                        }
                    />
                    {ProfileEditor && (
                        <ProfileEditor
                            campaignId={campaignId}
                            raceId={race.id}
                        />
                    )}
                </div>
            </HudForm>
        </HudFormPage>
    );
}
