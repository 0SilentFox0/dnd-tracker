'use client';

import { useTranslations } from 'next-intl';

import { SpellComponentsFields } from '../fields/SpellComponentsFields';
import { SpellFormBasicFields } from '../fields/SpellFormBasicFields';
import { SpellFormPowerFields } from '../fields/SpellFormPowerFields';
import type { SpellFormData } from '../spell-form-defaults';
import { SPELL_FORM_TAB, type SpellFormTabId } from '../spell-form-tabs';
import { SpellFormEffects } from './SpellFormEffects';

import { HudForm, type HudTab } from '@/components/hud/form';
import { systemUiOf } from '@/components/systems';
import { Checkbox } from '@/components/ui/checkbox';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useRuleSystem } from '@/lib/hooks/systems';
import type { IdName } from '@/types/common';

export interface SpellFormBodyProps {
    campaignId: string;
    form: { data: SpellFormData; set: (data: SpellFormData) => void };
    spellGroups: IdName[];
    submit: {
        id: string;
        onSubmit: (e: React.FormEvent) => void;
        error?: string | null;
    };
}

export function SpellFormBody({
    campaignId,
    form,
    spellGroups,
    submit,
}: SpellFormBodyProps) {
    const t = useTranslations();

    const { data: formData, set: setFormData } = form;

    const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

    const { key, system } = useRuleSystem({ campaignId });

    const Fields = key && systemUiOf(key).SpellMagicFields;

    const magic =
        system?.magic.tested && Fields
            ? { conditions: system.conditions?.catalog ?? [], Fields }
            : undefined;

    const tabs: HudTab<SpellFormTabId>[] = [
        {
            id: SPELL_FORM_TAB.basic,
            label: t('spellEditor.tabs.basic'),
            content: (
                <>
                    <SpellFormBasicFields
                        formData={formData}
                        setFormData={setFormData}
                        spellGroups={spellGroups}
                        magic={!!magic}
                    />
                    <SpellComponentsFields
                        formData={formData}
                        setFormData={setFormData}
                    />
                </>
            ),
        },
        {
            id: SPELL_FORM_TAB.roll,
            label: t('spellEditor.tabs.power'),
            content: (
                <SpellFormPowerFields
                    formData={formData}
                    setFormData={setFormData}
                    classesEnabled={classesEnabled}
                    magic={magic}
                />
            ),
        },
        {
            id: SPELL_FORM_TAB.effects,
            label: t('spellEditor.tabs.effects'),
            content: (
                <div className="space-y-4">
                    <SpellFormEffects
                        campaignId={campaignId}
                        formData={formData}
                        setFormData={setFormData}
                    />
                </div>
            ),
        },
    ];

    return (
        <>
            {formData.executionMode === 'manual' && (
                <p role="status">{t('spellEditor.body.manualNotice')}</p>
            )}
            <label className="mx-4 my-3 flex items-center gap-2">
                <Checkbox
                    checked={formData.executionMode !== 'manual'}
                    onCheckedChange={(v) =>
                        setFormData({
                            ...formData,
                            executionMode: v === true ? 'native' : 'manual',
                        })
                    }
                />{' '}
                {t('spellEditor.body.verified')}
            </label>
            <HudForm
                id={submit.id}
                onSubmit={submit.onSubmit}
                tabs={tabs}
                error={submit.error}
                tabStyles={{ variant: 'rail' }}
            />
        </>
    );
}
