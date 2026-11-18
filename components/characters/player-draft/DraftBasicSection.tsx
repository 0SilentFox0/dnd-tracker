'use client';

import { useTranslations } from 'next-intl';

import { RollingField } from './RollingField';

import { EntityIcon } from '@/components/common/EntityIcon';
import { ImageUpload } from '@/components/common/ImageUpload';
import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { ALIGNMENTS } from '@/lib/constants/alignment';
import type { RollKey, usePlayerDraftForm } from '@/lib/hooks/characters';
import type { DraftInput } from '@/types/characters';

type Draft = ReturnType<typeof usePlayerDraftForm>;

export function DraftBasicSection({
    draft,
    options,
}: {
    draft: Pick<Draft, 'form' | 'reveal' | 'generate' | 'ai'>;
    options: {
        races: { name: string }[];
        archetypes: { value: string; label: string }[];
        hasArchetype: boolean;
    };
}) {
    const t = useTranslations('characters.draft');

    const { form, reveal, generate, ai } = draft;

    const { races, archetypes, hasArchetype } = options;

    const { values, set, setArchetype } = form;

    const busy = reveal.rolling;

    const spinning = (key: RollKey) =>
        reveal.rolling && !reveal.settled.has(key) && key in reveal.display;

    const settled = (key: RollKey) => reveal.settled.has(key);

    const shown = (key: RollKey) => reveal.display[key];

    const archetypeLabel = (v: string | number | undefined) => String(v ?? '');

    return (
        <HudSection title={t('sections.basic')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RollingField
                    id="draft-name"
                    label={t('name')}
                    spinning={spinning('name')}
                    settled={settled('name')}
                    display={shown('name')}
                    className="sm:col-span-2"
                >
                    <Input
                        id="draft-name"
                        value={values.name}
                        onChange={(e) => set('name', e.target.value)}
                        required
                        maxLength={100}
                        placeholder={t('namePlaceholder')}
                    />
                </RollingField>

                <RollingField
                    id="draft-race"
                    label={t('race')}
                    spinning={spinning('race')}
                    settled={settled('race')}
                    display={shown('race')}
                >
                    <SelectField
                        id="draft-race"
                        value={values.race}
                        onValueChange={(v) => set('race', v)}
                        placeholder={t('racePlaceholder')}
                        options={races.map((r) => ({
                            value: r.name,
                            label: r.name,
                        }))}
                        required
                        triggerClassName="w-full"
                    />
                    {races.length === 0 && (
                        <p className="mt-1 text-xs text-hud-muted">
                            {t('noRaces')}
                        </p>
                    )}
                </RollingField>

                {form.classes ? (
                    <RollingField
                        id="draft-class"
                        label={t('class')}
                        spinning={spinning('class')}
                        settled={settled('class')}
                        display={shown('class')}
                    >
                        <SelectField
                            id="draft-class"
                            value={values.classId ?? ''}
                            onValueChange={form.classes.set}
                            placeholder={t('classPlaceholder')}
                            options={form.classes.list.map((c) => ({
                                value: c.id,
                                label: c.name,
                            }))}
                            required
                            triggerClassName="w-full"
                        />
                    </RollingField>
                ) : (
                    <>
                        {hasArchetype && (
                            <RollingField
                                id="draft-archetype"
                                label={t('archetype')}
                                spinning={spinning('archetype')}
                                settled={settled('archetype')}
                                display={archetypeLabel(shown('archetype'))}
                            >
                                <SelectField
                                    id="draft-archetype"
                                    value={values.archetype}
                                    onValueChange={(v) =>
                                        setArchetype(
                                            v as DraftInput['archetype']
                                        )
                                    }
                                    options={archetypes}
                                    triggerClassName="w-full"
                                />
                            </RollingField>
                        )}

                        <RollingField
                            id="draft-class"
                            label={t('class')}
                            spinning={spinning('class')}
                            settled={settled('class')}
                            display={shown('class')}
                        >
                            <Input
                                id="draft-class"
                                value={values.class}
                                onChange={(e) => set('class', e.target.value)}
                                required
                                maxLength={100}
                                placeholder={t('classExample')}
                            />
                        </RollingField>
                    </>
                )}

                <RollingField
                    id="draft-alignment"
                    label={t('alignment')}
                    spinning={spinning('alignment')}
                    settled={settled('alignment')}
                    display={shown('alignment')}
                >
                    <SelectField
                        id="draft-alignment"
                        value={values.alignment ?? ''}
                        onValueChange={(v) => set('alignment', v)}
                        placeholder={t('alignmentPlaceholder')}
                        options={ALIGNMENTS.map((a) => ({
                            value: a,
                            label: a,
                        }))}
                        allowNone
                        triggerClassName="w-full"
                    />
                </RollingField>

                <div className="sm:col-span-2">
                    {spinning('avatar') ? (
                        <div
                            aria-hidden
                            data-rolling
                            className="hud-roll-field"
                        >
                            <EntityIcon
                                src={String(shown('avatar'))}
                                name={values.name}
                                size={64}
                                className="size-16 rounded-lg border text-xl"
                            />
                        </div>
                    ) : (
                        <ImageUpload
                            label={t('avatar')}
                            value={values.avatar ?? ''}
                            onChange={(v) => set('avatar', v)}
                            fallbackText={values.name}
                            maxSide={1200}
                        />
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy || !generate.canPortrait}
                            onClick={generate.portrait}
                        >
                            {t('otherPortrait')}
                        </Button>
                        {ai.avatar.available && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                    busy ||
                                    ai.avatar.isPending ||
                                    !values.name ||
                                    !values.race
                                }
                                onClick={ai.avatar.run}
                            >
                                {ai.avatar.isPending
                                    ? t('aiAvatarPending')
                                    : t('aiAvatar')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </HudSection>
    );
}
