'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
    ARTIFACT_SET_FORM_TAB,
    type ArtifactSetFormTabId,
} from './artifact-set-form-tabs';
import { ArtifactSetMembersPicker } from './ArtifactSetMembersPicker';

import { AbilityListEditor, withAbilityErrors } from '@/components/abilities';
import { ImageUpload } from '@/components/common/fields/ImageUpload';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudFormMenu } from '@/components/hud';
import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHasSourceNotes } from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { ConversionIssue } from '@/lib/utils/abilities/schema';
import {
    type ArtifactSetFormInitial,
    useArtifactSetForm,
} from '@/systems/artifactsets/hooks';

const FORM_ID = 'artifact-set-form';

export interface ArtifactSetFormProps {
    campaignId: string;
    setId?: string;
    initial?: ArtifactSetFormInitial & { abilityIssues?: ConversionIssue[] };
}

export function ArtifactSetForm({
    campaignId,
    setId,
    initial = {},
}: ArtifactSetFormProps) {
    const t = useTranslations('artifacts.sets.form');

    const ts = useTranslations('artifacts.sets');

    const listHref = `/campaigns/${campaignId}/dm/system/artifact-sets`;

    const ta = useTranslator('abilities');

    const tCommon = useTranslations('common');

    const editor = useArtifactSetForm({ campaignId, setId, initial });

    const abilityIssues = initial.abilityIssues ?? [];

    const { data, set } = editor.form;

    const tabs: HudTab<ArtifactSetFormTabId>[] = [
        {
            id: ARTIFACT_SET_FORM_TAB.basic,
            label: tCommon('tabs.basic'),
            content: (
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="set-name">{t('name')}</Label>
                        <Input
                            id="set-name"
                            value={data.name}
                            onChange={(e) => set('name', e.target.value)}
                            required
                            maxLength={120}
                            placeholder={t('namePlaceholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="set-desc">{t('description')}</Label>
                        <Textarea
                            id="set-desc"
                            value={data.description}
                            onChange={(e) => set('description', e.target.value)}
                            rows={2}
                            placeholder={t('descriptionPlaceholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <ImageUpload
                            value={data.icon}
                            onChange={(v) => set('icon', v)}
                            label={t('icon')}
                            fallbackText={data.name}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('iconHint')}
                        </p>
                    </div>

                    <div className="ds-fields">
                        <div className="space-y-2">
                            <Label htmlFor="set-bonus-name">
                                {t('bonusName')}
                            </Label>
                            <Input
                                id="set-bonus-name"
                                value={data.bonusName}
                                onChange={(e) =>
                                    set('bonusName', e.target.value)
                                }
                                placeholder={t('bonusNamePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="set-bonus-desc">
                                {t('bonusDescription')}
                            </Label>
                            <Textarea
                                id="set-bonus-desc"
                                value={data.bonusDescription}
                                onChange={(e) =>
                                    set('bonusDescription', e.target.value)
                                }
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: ARTIFACT_SET_FORM_TAB.members,
            label: t('tabs.members'),
            content: (
                <ArtifactSetMembersPicker
                    artifacts={editor.members.selectable}
                    selectedIds={editor.members.selectedIds}
                    onToggle={editor.members.toggle}
                />
            ),
        },
        {
            id: ARTIFACT_SET_FORM_TAB.abilities,
            label: tCommon('tabs.abilities'),
            invalid: editor.abilities.errors > 0 || abilityIssues.length > 0,
            content: (
                <AbilityListEditor
                    campaignId={campaignId}
                    value={data.abilities}
                    onChange={(a) => set('abilities', a)}
                    issues={abilityIssues}
                    onValidityChange={editor.abilities.onValidityChange}
                />
            ),
        },
    ];

    const hasNotes = useHasSourceNotes(campaignId, 'artifact-sets', setId);

    return (
        <HudFormPage
            width="wide"
            header={{
                title: setId ? ts('edit.title') : ts('new.title'),
                aside: setId ? initial.name : ts('new.aside'),
                back: {
                    href: listHref,
                    label: tCommon('dmSections.artifact-sets'),
                },
                menu: setId ? (
                    <HudFormMenu
                        items={[
                            {
                                label: t('delete'),
                                tone: 'danger',
                                disabled: editor.status.isBusy,
                                onSelect: () => void editor.actions.remove(),
                            },
                        ]}
                    />
                ) : undefined,
            }}
            actions={
                <>
                    <Button type="button" variant="outline" asChild>
                        <Link href={listHref}>{tCommon('actions.cancel')}</Link>
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={
                            editor.status.isBusy || !editor.abilities.valid
                        }
                    >
                        {editor.status.isBusy
                            ? t('saving')
                            : withAbilityErrors(
                                  setId ? t('saveChanges') : t('create'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                setId && hasNotes ? (
                    <SourceNotes
                        campaignId={campaignId}
                        kind="artifact-sets"
                        targetId={setId}
                    />
                ) : undefined
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={editor.actions.submit}
                error={editor.status.error}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
            />
        </HudFormPage>
    );
}
