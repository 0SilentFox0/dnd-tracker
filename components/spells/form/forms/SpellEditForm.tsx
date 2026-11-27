'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { SpellReferenceDetail } from '@/components/campaigns/info/detail/SpellReferenceDetail';
import { FormPreviewPanel } from '@/components/common/shell/FormPreviewPanel';
import { LoadingState } from '@/components/common/states';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudFormMenu } from '@/components/hud';
import { HudFormPage } from '@/components/hud/form';
import { SpellFormBody } from '@/components/spells/form/forms/SpellFormBody';
import type { SpellFormData } from '@/components/spells/form/spell-form-defaults';
import { getDefaultSpellFormData } from '@/components/spells/form/spell-form-defaults';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/lib/hooks/common';
import {
    useDeleteSpell,
    useSpell,
    useSpellFormSync,
    useSpellGroups,
    useSpellIssueText,
    useUpdateSpell,
} from '@/lib/hooks/spells';
import {
    formToPayload,
    spellFormIssue,
    spellToForm,
} from '@/lib/utils/spells/model/form';
import { toSpellReferencePreview } from '@/lib/utils/spells/reference-preview';

const FORM_ID = 'spell-form';

export function SpellEditForm({
    campaignId: id,
    spellId,
}: {
    campaignId: string;
    spellId: string;
}) {
    const t = useTranslations();

    const notify = useNotify();

    const router = useRouter();

    const listHref = `/campaigns/${id}/dm/spells`;

    const issueText = useSpellIssueText();

    const [formData, setFormData] = useState<SpellFormData>(
        getDefaultSpellFormData
    );

    const { data: spell, isLoading: fetching } = useSpell(id, spellId);

    const { data: spellGroups = [] } = useSpellGroups(id);

    const updateSpellMutation = useUpdateSpell(id, spellId);

    const deleteSpellMutation = useDeleteSpell(id, spellId);

    useSpellFormSync(spell, setFormData, spellToForm);

    const preview = useDeferredValue(
        useMemo(
            () =>
                toSpellReferencePreview(formData, {
                    id: spellId,
                    groupName:
                        spellGroups.find((g) => g.id === formData.groupId)
                            ?.name ?? null,
                }),
            [formData, spellId, spellGroups]
        )
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const problem = spellFormIssue(formData);

        if (problem) {
            void notify(issueText(problem));

            return;
        }

        updateSpellMutation.mutate(formToPayload(formData), {
            onSuccess: () => router.push(listHref),
            onError: (error) => console.error('Error updating spell:', error),
        });
    };

    const handleDelete = () => {
        deleteSpellMutation.mutate(undefined, {
            onSuccess: () => {
                router.push(listHref);
            },
            onError: (error) => {
                console.error('Error deleting spell:', error);
            },
        });
    };

    if (fetching) {
        return (
            <HudFormPage header={{ title: t('spellEditor.page.editTitle') }}>
                <div className="px-4 py-3">
                    <LoadingState
                        count={6}
                        label={t('spellEditor.page.loading')}
                    />
                </div>
            </HudFormPage>
        );
    }

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('spellEditor.page.editTitleNamed', {
                    name: formData.name ?? '',
                }),
                aside: t('spellEditor.page.editAside'),
                back: { href: listHref, label: t('common.dmSections.spells') },
                menu: (
                    <HudFormMenu
                        items={[
                            {
                                label: t('common.actions.delete'),
                                tone: 'danger',
                                disabled: deleteSpellMutation.isPending,
                                confirm: {
                                    title: t('spellEditor.page.deleteConfirm'),
                                    confirmLabel: t('common.actions.delete'),
                                    destructive: true,
                                },
                                onSelect: handleDelete,
                            },
                        ]}
                    />
                ),
            }}
            actions={
                <>
                    <Button type="button" variant="outline" asChild>
                        <Link href={listHref}>
                            {t('common.actions.cancel')}
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={updateSpellMutation.isPending}
                    >
                        {updateSpellMutation.isPending
                            ? t('common.actions.saving')
                            : t('spellEditor.page.editSubmit')}
                    </Button>
                </>
            }
            side={
                <>
                    <FormPreviewPanel>
                        <SpellReferenceDetail
                            key={spellId}
                            campaignId={id}
                            item={preview}
                            isDM={false}
                        />
                    </FormPreviewPanel>
                    <SourceNotes
                        campaignId={id}
                        kind="spells"
                        targetId={spellId}
                    />
                </>
            }
        >
            <SpellFormBody
                campaignId={id}
                form={{ data: formData, set: setFormData }}
                spellGroups={spellGroups}
                submit={{
                    id: FORM_ID,
                    onSubmit: handleSubmit,
                    error:
                        (updateSpellMutation.error as Error)?.message ||
                        (deleteSpellMutation.error as Error)?.message ||
                        null,
                }}
            />
        </HudFormPage>
    );
}
