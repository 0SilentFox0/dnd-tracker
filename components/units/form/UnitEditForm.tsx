'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { withAbilityErrors } from '@/components/abilities';
import { LoadingState, QueryState } from '@/components/common/states';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudFormMenu } from '@/components/hud';
import { HudForm, HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { unitFormTabs } from '@/components/units/form/UnitFormFields';
import { useHasSourceNotes } from '@/lib/hooks/compendium-import';
import { useUnitEditForm } from '@/lib/hooks/units';
import { useTranslator } from '@/lib/i18n/use-translator';

const FORM_ID = 'unit-form';

export function UnitEditForm({
    campaignId: id,
    unitId,
}: {
    campaignId: string;
    unitId: string;
}) {
    const ta = useTranslator('abilities');

    const t = useTranslations('units.form');

    const tc = useTranslations('common');

    const tr = useTranslator();

    const editor = useUnitEditForm(id, unitId);

    const hasNotes = useHasSourceNotes(id, 'units', unitId);

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('editTitle', { name: editor.form.data.name ?? '' }),
                aside: t('editAside'),
                back: {
                    href: editor.listHref,
                    label: tc('dmSections.units'),
                },
                menu: (
                    <HudFormMenu
                        items={[
                            {
                                label: tc('actions.delete'),
                                tone: 'danger',
                                disabled: editor.status.isDeleting,
                                onSelect: () => void editor.actions.remove(),
                            },
                        ]}
                    />
                ),
            }}
            actions={
                <>
                    <Button type="button" variant="outline" asChild>
                        <Link href={editor.listHref}>
                            {tc('actions.cancel')}
                        </Link>
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
                                  t('submitSave'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                hasNotes ? (
                    <SourceNotes
                        campaignId={id}
                        kind="units"
                        targetId={unitId}
                    />
                ) : undefined
            }
        >
            <QueryState
                query={editor.query}
                loading={<LoadingState rows={8} label={t('loading')} />}
            >
                {(unit) => (
                    <HudForm
                        key={unitId}
                        id={FORM_ID}
                        onSubmit={editor.actions.submit}
                        tabs={unitFormTabs({
                            campaignId: id,
                            editor,
                            abilityIssues: unit.abilityIssues,
                            t: tr,
                        })}
                        tabStyles={{ variant: 'rail' }}
                        error={
                            editor.status.error
                                ? editor.status.error.message || t('error')
                                : null
                        }
                    />
                )}
            </QueryState>
        </HudFormPage>
    );
}
