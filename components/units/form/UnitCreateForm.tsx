'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { withAbilityErrors } from '@/components/abilities';
import { HudForm, HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { UNIT_FORM_ID } from '@/components/units/form/unit-form-tabs';
import { unitFormTabs } from '@/components/units/form/UnitFormFields';
import { useUnitCreateForm } from '@/lib/hooks/units';
import { useTranslator } from '@/lib/i18n/use-translator';

export function UnitCreateForm({ campaignId: id }: { campaignId: string }) {
    const ta = useTranslator('abilities');

    const t = useTranslations('units.form');

    const tc = useTranslations('common.actions');

    const tm = useTranslations('common.dmSections');

    const tr = useTranslator();

    const editor = useUnitCreateForm(id);

    return (
        <HudFormPage
            width="wide"
            title={
                <>
                    <Link href={editor.listHref} className="hud-link">
                        {tm('units')}
                    </Link>
                    {' › '}
                    {t('newTitle')}
                </>
            }
            aside={t('newAside')}
            actions={
                <>
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
                            ? tc('creating')
                            : withAbilityErrors(
                                  t('submitCreate'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
        >
            <HudForm
                id={UNIT_FORM_ID}
                onSubmit={editor.actions.submit}
                tabs={unitFormTabs({ campaignId: id, editor, t: tr })}
                tabStyles={{ variant: 'rail' }}
                error={
                    editor.status.error
                        ? editor.status.error.message || t('error')
                        : null
                }
            />
        </HudFormPage>
    );
}
