'use client';

import { useTranslations } from 'next-intl';
import { Dices } from 'lucide-react';

import type { WfrpDraftFormState } from './types';

import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/labeled-input';
import { Textarea } from '@/components/ui/textarea';

export function StoryStep({ form }: { form: WfrpDraftFormState }) {
    const t = useTranslations('wfrpCreation.story');

    const { answers, set, roll, rollAll, blocks } = form.story;

    return (
        <div className="space-y-4">
            <p className="text-sm text-hud-muted">{t('hint')}</p>
            <p className="text-sm text-hud-muted">{t('skip')}</p>
            <Button type="button" variant="outline" onClick={rollAll}>
                {t('rollAll')}
            </Button>
            {blocks.map((block) => (
                <HudSection key={block.id} title={t(`blocks.${block.id}`)}>
                    <div className="space-y-3">
                        {block.questions.map((id) => {
                            const label = t(`questions.${id}`);

                            return (
                                <FormField
                                    key={id}
                                    label={label}
                                    htmlFor={`wfrp-story-${id}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <Textarea
                                            id={`wfrp-story-${id}`}
                                            rows={2}
                                            maxLength={500}
                                            value={String(
                                                form.shown(
                                                    `story-${id}`,
                                                    answers[id] ?? ''
                                                )
                                            )}
                                            placeholder={t('placeholder')}
                                            onChange={(e) =>
                                                set(id, e.target.value)
                                            }
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="shrink-0"
                                            aria-label={`${t('roll')} ${label}`}
                                            onClick={() => roll(id)}
                                        >
                                            <Dices aria-hidden />
                                        </Button>
                                    </div>
                                </FormField>
                            );
                        })}
                    </div>
                </HudSection>
            ))}
        </div>
    );
}
