'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { FeatBasicsTab } from './FeatBasicsTab';
import { FeatCard } from './FeatCard';

import { AbilityListEditor, withAbilityErrors } from '@/components/abilities';
import { ChoiceListEditor } from '@/components/choices/editor/ChoiceListEditor';
import { FormPreviewPanel } from '@/components/common/shell/FormPreviewPanel';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { useErrorTotals } from '@/lib/hooks/common';
import { useFeatForm } from '@/lib/hooks/feats';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { FeatData } from '@/types/choices';

const FORM_ID = 'feat-form';

type FeatFormTabId = 'basics' | 'abilities' | 'choices';

export function FeatForm({
    campaignId,
    feat,
}: {
    campaignId: string;
    feat: FeatData;
}) {
    const t = useTranslations('feats');

    const ta = useTranslator('abilities');

    const tc = useTranslations('common');

    const { id, ...initial } = feat;

    const editor = useFeatForm(campaignId, id, initial);

    const { data, set } = editor.form;

    const preview = useDeferredValue(
        useMemo<FeatData>(() => ({ id, ...data }), [id, data])
    );

    const [invalid, setInvalid] = useState({
        abilities: false,
        choices: false,
    });

    const { report } = useErrorTotals((_, total) =>
        editor.abilities.setErrors(total)
    );

    const track = (key: keyof typeof invalid) => (_: boolean, n: number) => {
        report(key, n);
        setInvalid((p) => (p[key] === n > 0 ? p : { ...p, [key]: n > 0 }));
    };

    const tabs: HudTab<FeatFormTabId>[] = [
        {
            id: 'basics',
            label: tc('tabs.basic'),
            content: (
                <FeatBasicsTab
                    form={editor.form}
                    advancement={editor.status.advancement}
                />
            ),
        },
        {
            id: 'abilities',
            label: tc('tabs.abilities'),
            invalid: invalid.abilities,
            content: (
                <AbilityListEditor
                    campaignId={campaignId}
                    value={data.abilities}
                    onChange={(abilities) => set((p) => ({ ...p, abilities }))}
                    onValidityChange={track('abilities')}
                />
            ),
        },
        ...(editor.status.advancement
            ? []
            : [
                  {
                      id: 'choices' as const,
                      label: tc('tabs.choices'),
                      invalid: invalid.choices,
                      content: (
                          <ChoiceListEditor
                              campaignId={campaignId}
                              owner="feat"
                              value={data.choices}
                              onChange={(choices) =>
                                  set((p) => ({ ...p, choices }))
                              }
                              onValidityChange={track('choices')}
                          />
                      ),
                  },
              ]),
    ];

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('form.editTitle'),
                aside: t('form.editAside'),
                back: {
                    href: `/campaigns/${campaignId}/dm/feats`,
                    label: tc('dmSections.feats'),
                },
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={editor.actions.cancel}
                    >
                        {tc('actions.cancel')}
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
                                  tc('actions.save'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                <>
                    <FormPreviewPanel>
                        <FeatCard
                            feat={preview}
                            campaignId={campaignId}
                            canEdit={false}
                        />
                    </FormPreviewPanel>
                    <SourceNotes
                        campaignId={campaignId}
                        kind="feats"
                        targetId={id}
                    />
                </>
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={editor.actions.submit}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
            />
        </HudFormPage>
    );
}
