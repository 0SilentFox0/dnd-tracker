'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { WfrpDraftFormState } from './types';

import { ImageUpload } from '@/components/common/fields/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/labeled-input';
import { SelectField } from '@/components/ui/select-field';
import { Textarea } from '@/components/ui/textarea';
import { ALIGNMENTS } from '@/lib/constants/alignment';
import { useAlignmentLabel } from '@/lib/hooks/characters';
import { RULE_SYSTEM_REGISTRY } from '@/lib/utils/rules/systems';

export function IdentityStep({ form }: { form: WfrpDraftFormState }) {
    const t = useTranslations('wfrpCreation.identity');

    const te = useTranslations('wfrpCreation.errors');

    const alignmentLabel = useAlignmentLabel();

    const alignments = RULE_SYSTEM_REGISTRY.wfrp.identity.alignments;

    const [goal, setGoal] = useState('');

    const ts = useTranslations('wfrpStory');

    const { values, set, quiz } = form.identity;

    const goals = values.goals ?? [];

    const addGoal = () => {
        const text = goal.trim();

        if (!text) return;

        set({ goals: [...goals, { text, kind: 'personal' }] });
        setGoal('');
    };

    const { preview } = form;

    return (
        <div className="space-y-4">
            <p className="text-sm text-hud-muted">
                {form.step.total === 1 ? t('reopenNote') : t('hint')}
            </p>
            {preview?.ok && (
                <p className="text-sm font-semibold">
                    {t('experience', { xp: preview.experience })}
                </p>
            )}
            {preview && !preview.ok && (
                <ul
                    role="alert"
                    className="list-disc pl-5 text-sm text-destructive"
                >
                    {preview.errors.map((code) => (
                        <li key={code}>{te(code as never)}</li>
                    ))}
                </ul>
            )}
            {form.dm?.needsPlayer && (
                <FormField label={t('player')} htmlFor="wfrp-draft-player" required>
                    <SelectField
                        id="wfrp-draft-player"
                        aria-label={t('player')}
                        value={form.dm.ownerId}
                        onValueChange={form.dm.setOwnerId}
                        placeholder={t('playerPlaceholder')}
                        options={form.dm.members.map((m) => ({
                            value: m.id,
                            label: m.email
                                ? `${m.displayName} (${m.email})`
                                : m.displayName,
                        }))}
                        required
                        triggerClassName="min-h-11 w-full"
                    />
                </FormField>
            )}
            <FormField label={t('name')} htmlFor="wfrp-draft-name" required>
                <Input
                    id="wfrp-draft-name"
                    className="min-h-11"
                    maxLength={100}
                    value={values.name}
                    placeholder={t('namePlaceholder')}
                    onChange={(e) => set({ name: e.target.value })}
                />
            </FormField>
            {alignments && (
                <FormField
                    label={t('alignment')}
                    htmlFor="wfrp-draft-alignment"
                >
                    <SelectField
                        id="wfrp-draft-alignment"
                        value={values.alignment ?? ''}
                        onValueChange={(v) => set({ alignment: v })}
                        placeholder={t('alignmentPlaceholder')}
                        options={ALIGNMENTS.map((a) => ({
                            value: a,
                            label: alignmentLabel(a),
                        }))}
                        allowNone
                        triggerClassName="min-h-11 w-full"
                    />
                </FormField>
            )}
            <FormField label={t('background')} htmlFor="wfrp-draft-background">
                <Textarea
                    id="wfrp-draft-background"
                    rows={6}
                    maxLength={4000}
                    value={values.background ?? ''}
                    placeholder={t('backgroundPlaceholder')}
                    onChange={(e) => set({ background: e.target.value })}
                />
            </FormField>
            {quiz.canReplace && (
                <Button type="button" variant="outline" onClick={quiz.replace}>
                    {ts('replace')}
                </Button>
            )}
            {quiz.truncated && (
                <p className="text-sm text-hud-muted">{ts('truncated')}</p>
            )}
            <ImageUpload
                label={t('avatar')}
                value={values.avatar ?? ''}
                onChange={(v) => set({ avatar: v })}
                fallbackText={values.name}
                maxSide={1200}
            />
            <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t('goals')}</h3>
                {goals.length > 0 && (
                    <ul className="grid gap-2">
                        {goals.map((g, i) => (
                            <li
                                key={`${i}-${g.text}`}
                                className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1 text-sm"
                            >
                                <span className="min-w-0 flex-1">{g.text}</span>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={t('removeGoal')}
                                    onClick={() =>
                                        set({
                                            goals: goals.filter(
                                                (_, j) => j !== i
                                            ),
                                        })
                                    }
                                >
                                    ×
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex gap-2">
                    <Input
                        aria-label={t('goalPlaceholder')}
                        className="min-h-11"
                        maxLength={500}
                        value={goal}
                        placeholder={t('goalPlaceholder')}
                        onChange={(e) => setGoal(e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addGoal}
                        disabled={!goal.trim()}
                    >
                        {t('addGoal')}
                    </Button>
                </div>
            </section>
        </div>
    );
}
