'use client';

import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { usePlayerDraftForm } from '@/lib/hooks/characters';
import { useTranslator } from '@/lib/i18n/use-translator';

type Draft = ReturnType<typeof usePlayerDraftForm>;

export function DraftStorySection({
    form,
    reveal,
}: {
    form: Draft['form'];
    reveal: Draft['reveal'];
}) {
    const t = useTranslations('characters.draft');

    const tAny = useTranslator();

    const { values, set } = form;

    const goals = values.goals ?? [];

    const spinning =
        reveal.rolling &&
        !reveal.settled.has('background') &&
        'background' in reveal.display;

    const settled = reveal.settled.has('background');

    return (
        <HudSection title={t('sections.story')}>
            <div
                data-settled={settled}
                className="hud-roll-fade flex flex-col gap-3"
                style={spinning ? { opacity: 0 } : undefined}
            >
                <Textarea
                    aria-label={t('biography')}
                    rows={6}
                    maxLength={4000}
                    value={values.background ?? ''}
                    onChange={(e) => set('background', e.target.value)}
                    placeholder={t('biographyPlaceholder')}
                />

                {goals.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {goals.map((g, i) => (
                            <li
                                key={`${i}-${g.text}`}
                                className="flex items-start gap-2 rounded-lg border border-hud-rule px-3 py-2 text-sm"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="text-hud-muted">
                                        {tAny(
                                            `characterProfile.goals.${g.kind}`
                                        )}
                                        :{' '}
                                    </span>
                                    {g.text}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('removeGoal')}
                                    onClick={() =>
                                        set(
                                            'goals',
                                            goals.filter((_, j) => j !== i)
                                        )
                                    }
                                >
                                    ×
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </HudSection>
    );
}
