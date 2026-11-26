'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { withAbilityErrors } from '@/components/abilities';
import { LoadingState, QueryState } from '@/components/common/states';
import { HudForm, HudFormMenu, HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { UNIT_FORM_ID } from '@/components/units/form/unit-form-tabs';
import { unitFormTabs } from '@/components/units/form/UnitFormFields';
import { useUnitEditForm } from '@/lib/hooks/units';
import { useTranslator } from '@/lib/i18n/use-translator';

export function UnitEditForm({
    campaignId: id,
    unitId,
    side,
}: {
    campaignId: string;
    unitId: string;
    side?: ReactNode;
}) {
    const ta = useTranslator('abilities');

    const t = useTranslations('units.form');

    const tc = useTranslations('common.actions');

    const tm = useTranslations('common.dmSections');

    const tf = useTranslations('common.form');

    const tr = useTranslator();

    const editor = useUnitEditForm(id, unitId);

    return (
        <HudFormPage
            width="wide"
            title={
                <>
                    <Link
                        href={editor.listHref}
                        className="hover:text-hud-accent-fg"
                    >
                        {tm('units')}
                    </Link>
                    {' › '}
                    {t('editTitle', { name: editor.form.data.name ?? '' })}
                </>
            }
            aside={t('editAside')}
            side={side}
            actions={
                <>
                    <HudFormMenu
                        label={tf('more')}
                        items={[
                            {
                                label: tc('delete'),
                                tone: 'danger',
                                onSelect: editor.actions.remove,
                            },
                        ]}
                    />
                    <Button type="button" variant="outline" asChild>
                        <Link href={editor.listHref}>{tc('cancel')}</Link>
                    </Button>
                    <Button
                        type="submit"
                        form={UNIT_FORM_ID}
                        disabled={
                            editor.status.isSaving || !editor.abilities.valid
                        }
                    >
                        {editor.status.isSaving
                            ? tc('saving')
                            : withAbilityErrors(
                                  t('submitSave'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
        >
            <QueryState
                query={editor.query}
                loading={<LoadingState rows={8} label={t('loading')} />}
            >
                {(unit) => (
                    <HudForm
                        key={unitId}
                        id={UNIT_FORM_ID}
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
