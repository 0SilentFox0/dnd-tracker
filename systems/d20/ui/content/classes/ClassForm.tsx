'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ClassBasicsTab } from './ClassBasicsTab';
import { ClassColumnsEditor } from './ClassColumnsEditor';
import { ClassFeaturesEditor } from './ClassFeaturesEditor';
import { ClassProgressionMap } from './progression';
import { SubclassesEditor } from './SubclassesEditor';

import { withAbilityErrors } from '@/components/abilities';
import { ClassReferenceDetail } from '@/components/campaigns/info/detail/ClassReferenceDetail';
import { FormPreviewPanel } from '@/components/common/shell/FormPreviewPanel';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { useClassForm } from '@/lib/hooks/classes';
import { useErrorTotals } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { buildClassProgression } from '@/lib/utils/characters/classes';
import { toClassReferencePreview } from '@/lib/utils/characters/classes/reference-preview';
import type { GameClassData } from '@/types/classes';

const FORM_ID = 'class-form';

type ClassFormTabId = 'map' | 'basics' | 'table' | 'features' | 'subclasses';

export function ClassForm({
    campaignId,
    gameClass,
}: {
    campaignId: string;
    gameClass: GameClassData;
}) {
    const t = useTranslations();

    const ta = useTranslator('abilities');

    const { id, ...initial } = gameClass;

    const editor = useClassForm(campaignId, id, initial);

    const [invalid, setInvalid] = useState({
        features: false,
        subclasses: false,
    });

    const { setErrors: setTotal } = editor.abilities;

    const { report } = useErrorTotals((_, total) => setTotal(total));

    const track = (key: keyof typeof invalid) => (_: boolean, n: number) => {
        report(key, n);
        setInvalid((p) => (p[key] === n > 0 ? p : { ...p, [key]: n > 0 }));
    };

    const { data, set } = editor.form;

    const [tab, setTab] = useState<ClassFormTabId>('basics');

    const progression = useMemo(
        () => buildClassProgression({ id, ...data }),
        [id, data]
    );

    const preview = useDeferredValue(
        useMemo(() => toClassReferencePreview(data, { id }), [data, id])
    );

    const tabs: HudTab<ClassFormTabId>[] = [
        {
            id: 'basics',
            label: t('common.tabs.basic'),
            content: (
                <ClassBasicsTab form={editor.form} campaignId={campaignId} />
            ),
        },
        {
            id: 'map',
            wide: true,
            label: t('classes.form.tabs.map'),
            content: (
                <ClassProgressionMap
                    progression={progression}
                    actions={{
                        onOpenLevel: (_, column) =>
                            setTab(
                                column === 'subclass'
                                    ? 'subclasses'
                                    : 'features'
                            ),
                    }}
                />
            ),
        },
        {
            id: 'table',
            wide: true,
            label: t('classes.form.tabs.table'),
            content: (
                <ClassColumnsEditor
                    value={data.columns ?? []}
                    onChange={(columns) =>
                        set((prev) => ({ ...prev, columns }))
                    }
                />
            ),
        },
        {
            id: 'features',
            label: t('classes.form.tabs.features'),
            invalid: invalid.features,
            content: (
                <ClassFeaturesEditor
                    campaignId={campaignId}
                    value={data.features}
                    onChange={(features) =>
                        set((prev) => ({ ...prev, features }))
                    }
                    onValidityChange={track('features')}
                    classColumns={data.columns ?? []}
                />
            ),
        },
        {
            id: 'subclasses',
            label: t('classes.form.tabs.subclasses'),
            invalid: invalid.subclasses,
            content: (
                <SubclassesEditor
                    campaignId={campaignId}
                    form={editor.form}
                    onValidityChange={track('subclasses')}
                />
            ),
        },
    ];

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('classes.form.title'),
                aside: t('classes.form.aside'),
                back: {
                    href: `/campaigns/${campaignId}/dm/classes`,
                    label: t('common.dmSections.classes'),
                },
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={editor.actions.cancel}
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={
                            editor.status.isSaving || !editor.abilities.valid
                        }
                    >
                        {editor.status.isSaving
                            ? t('common.actions.saving')
                            : withAbilityErrors(
                                  t('common.actions.save'),
                                  editor.abilities.errors,
                                  ta
                              )}
                    </Button>
                </>
            }
            side={
                <>
                    <FormPreviewPanel>
                        <ClassReferenceDetail
                            campaignId={campaignId}
                            item={preview}
                            isDM={false}
                        />
                    </FormPreviewPanel>
                    <SourceNotes
                        campaignId={campaignId}
                        kind="classes"
                        targetId={id}
                    />
                </>
            }
        >
            <HudForm
                id={FORM_ID}
                onSubmit={editor.actions.submit}
                tabs={tabs}
                tab={tab}
                onTabChange={setTab}
                tabStyles={{ variant: 'rail' }}
            />
        </HudFormPage>
    );
}
