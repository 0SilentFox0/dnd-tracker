'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AbilityScoresPicker } from './AbilityScoresPicker';
import { DraftBasicSection } from './DraftBasicSection';
import { DraftRegenerateBar } from './DraftRegenerateBar';
import { DraftStorySection } from './DraftStorySection';

import { ChoicesEditor } from '@/components/choices/editor/ChoicesEditor';
import { HudForm, HudFormPage, HudSection } from '@/components/hud/form';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import {
    useArchetypeOptions,
    useChoiceRefs,
    usePlayerDraftForm,
} from '@/lib/hooks/characters';
import { useRaces } from '@/lib/hooks/races';
import { useRuleSystem } from '@/lib/hooks/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';
import type { DraftInput } from '@/types/characters';

interface PlayerDraftFormProps {
    campaignId: string;
    characterId?: string;
    initial?: 'generate' | DraftInput;
}

export function PlayerDraftForm({
    campaignId,
    characterId,
    initial,
}: PlayerDraftFormProps) {
    const t = useTranslations('characters.draft');

    const tc = useTranslations('common');

    const { options: archetypes } = useArchetypeOptions();

    const { system: def } = useRuleSystem({ campaignId });

    const hasArchetype = !!def && statColumnsOf(def).has('archetype');

    const { data: races = [] } = useRaces(campaignId);

    const { form, choices, generate, ai, submit, scoreStatus, reveal } =
        usePlayerDraftForm({ campaignId, characterId, initial });

    const { values } = form;

    const refs = useChoiceRefs(campaignId, values.race);

    const busy = reveal.rolling;

    const { skip } = reveal;

    useEffect(() => {
        if (!busy) return;

        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip();

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [busy, skip]);

    const disabledReason = busy
        ? t('waitAnimation')
        : !scoreStatus.valid
          ? t('fixScores')
          : null;

    return (
        <HudFormPage
            title={characterId ? t('titleEdit') : t('titleNew')}
            aside={t('aside')}
        >
            <OnboardingHint id="player.draft" className="mb-3" />
            <HudForm
                id="player-draft"
                error={submit.error ?? disabledReason}
                onSubmit={(e) => {
                    e.preventDefault();
                    submit.run(refs.ready ? refs : undefined);
                }}
                actions={
                    <>
                        <Button
                            type="submit"
                            form="player-draft"
                            disabled={
                                !scoreStatus.valid ||
                                (!!form.classes && !values.classId) ||
                                submit.isPending ||
                                busy
                            }
                        >
                            {submit.isPending ? t('submitting') : t('submit')}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href={`/campaigns/${campaignId}/character`}>
                                {tc('actions.cancel')}
                            </Link>
                        </Button>
                    </>
                }
            >
                <div className="relative">
                    {busy && (
                        <div
                            aria-hidden
                            className="absolute inset-0 z-20 cursor-pointer"
                            onClick={reveal.skip}
                        />
                    )}

                    <fieldset disabled={busy} className="min-w-0 border-0 p-0">
                        <DraftRegenerateBar
                            form={form}
                            generate={generate}
                            ai={ai}
                            busy={busy}
                        />

                        <DraftBasicSection
                            draft={{ form, reveal, generate, ai }}
                            options={{ races, archetypes, hasArchetype }}
                        />

                        <HudSection title={t('sections.scores')}>
                            <AbilityScoresPicker
                                form={form}
                                scoreStatus={scoreStatus}
                                reveal={reveal}
                            />
                        </HudSection>

                        {(refs.race || choices.enabled) && refs.ready && (
                            <HudSection title={t('sections.choices')}>
                                <ChoicesEditor
                                    state={choices}
                                    refs={refs}
                                    issues={submit.choiceIssues}
                                    hero={{
                                        level: 1,
                                        scores: {
                                            strength: values.strength,
                                            dexterity: values.dexterity,
                                            constitution: values.constitution,
                                            intelligence: values.intelligence,
                                            wisdom: values.wisdom,
                                            charisma: values.charisma,
                                        },
                                        skills: {},
                                        classMode:
                                            choices.enabled && !!values.classId,
                                    }}
                                />
                            </HudSection>
                        )}

                        <DraftStorySection form={form} reveal={reveal} />
                    </fieldset>
                </div>
            </HudForm>
        </HudFormPage>
    );
}
