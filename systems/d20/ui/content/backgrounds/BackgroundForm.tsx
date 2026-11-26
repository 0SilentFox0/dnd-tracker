'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ChoiceListEditor } from '@/components/choices/editor/ChoiceListEditor';
import { ImageUpload } from '@/components/common/fields/ImageUpload';
import {
    HUD_SELECT_TRIGGER_CLASS,
    HudForm,
    HudFormPage,
    HudSection,
    type HudTab,
} from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/labeled-input';
import { SelectField } from '@/components/ui/select-field';
import { Textarea } from '@/components/ui/textarea';
import { DND_SKILLS } from '@/lib/constants/skills';
import { useBackgroundForm } from '@/lib/hooks/backgrounds';
import { useFeats } from '@/lib/hooks/feats';
import { toggleItem } from '@/lib/utils/common/collections';
import type { BackgroundData } from '@/types/backgrounds';

const FORM_ID = 'background-form';

export function BackgroundForm({
    campaignId,
    background,
}: {
    campaignId: string;
    background: BackgroundData;
}) {
    const t = useTranslations('backgrounds');

    const tc = useTranslations('common');

    const tg = useTranslations('gameTerms');

    const {
        form: { data, patch },
        validation: { invalid, setInvalid },
        status: { isSaving },
        actions,
    } = useBackgroundForm(campaignId, background);

    const { data: feats = [] } = useFeats(campaignId);

    const tabs: HudTab<'basics' | 'choices'>[] = [
        {
            id: 'basics',
            label: tc('tabs.basic'),
            content: (
                <HudSection panel>
                    <div className="ds-fields">
                        <FormField
                            label={t('form.name')}
                            htmlFor="background-name"
                        >
                            <Input
                                id="background-name"
                                required
                                value={data.name}
                                onChange={(e) =>
                                    patch({ name: e.target.value })
                                }
                            />
                        </FormField>
                        <ImageUpload
                            value={data.icon ?? ''}
                            onChange={(icon) => patch({ icon: icon || null })}
                            label={t('form.icon')}
                            fallbackText={data.name}
                            allowFile={false}
                        />
                        <FormField
                            label={t('form.description')}
                            htmlFor="background-description"
                            className="ds-span"
                        >
                            <Textarea
                                id="background-description"
                                value={data.description ?? ''}
                                onChange={(e) =>
                                    patch({
                                        description: e.target.value || null,
                                    })
                                }
                            />
                        </FormField>
                        <fieldset className="ds-span space-y-2">
                            <legend>{t('form.skills')}</legend>
                            <div className="flex flex-wrap gap-3">
                                {DND_SKILLS.map((skill) => (
                                    <label
                                        key={skill}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={data.skillProficiencies.includes(
                                                skill
                                            )}
                                            onCheckedChange={() =>
                                                patch({
                                                    skillProficiencies:
                                                        toggleItem(
                                                            data.skillProficiencies,
                                                            skill
                                                        ),
                                                })
                                            }
                                        />
                                        {tg(`dndSkills.${skill}`)}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <FormField
                            label={t('form.tools')}
                            htmlFor="background-tools"
                        >
                            <Textarea
                                id="background-tools"
                                value={data.toolProficiencies.join('\n')}
                                onChange={(e) =>
                                    patch({
                                        toolProficiencies:
                                            e.target.value.split('\n'),
                                    })
                                }
                                onBlur={() =>
                                    patch({
                                        toolProficiencies:
                                            data.toolProficiencies
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                    })
                                }
                            />
                        </FormField>
                        <FormField
                            label={t('form.origin')}
                            htmlFor="background-origin"
                        >
                            <SelectField
                                id="background-origin"
                                triggerClassName={`${HUD_SELECT_TRIGGER_CLASS} w-auto`}
                                value={data.originFeatId ?? ''}
                                onValueChange={(originFeatId) =>
                                    patch({
                                        originFeatId: originFeatId || null,
                                    })
                                }
                                allowNone
                                noneLabel={t('form.noOrigin')}
                                options={feats
                                    .filter((f) => f.type === 'origin')
                                    .map((f) => ({
                                        value: f.id,
                                        label: f.name,
                                    }))}
                            />
                        </FormField>
                        <FormField
                            label={t('form.equipment')}
                            htmlFor="background-equipment"
                            description={t('form.equipmentNote')}
                        >
                            <Textarea
                                id="background-equipment"
                                value={data.equipmentText ?? ''}
                                onChange={(e) =>
                                    patch({
                                        equipmentText: e.target.value || null,
                                    })
                                }
                            />
                        </FormField>
                    </div>
                </HudSection>
            ),
        },
        {
            id: 'choices',
            label: tc('tabs.choices'),
            invalid,
            content: (
                <ChoiceListEditor
                    campaignId={campaignId}
                    owner="background"
                    value={data.choices}
                    onChange={(choices) => patch({ choices })}
                    onValidityChange={(valid) => setInvalid(!valid)}
                />
            ),
        },
    ];

    return (
        <HudFormPage
            width="wide"
            title={
                <>
                    <Link
                        href={`/campaigns/${campaignId}/dm/backgrounds`}
                        className="text-hud-muted hover:text-hud-accent-fg"
                    >
                        {tc('dmSections.backgrounds')}
                    </Link>
                    <span aria-hidden className="text-hud-muted">
                        {' › '}
                    </span>
                    {t('form.editTitle')}
                </>
            }
            aside={t('form.editAside')}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={actions.cancel}
                    >
                        {tc('actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={invalid || isSaving}
                    >
                        {isSaving ? tc('actions.saving') : tc('actions.save')}
                    </Button>
                </>
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={actions.submit}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
            />
        </HudFormPage>
    );
}
