'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { HudFormMenu, HudFormPage } from '@/components/hud/form';
import { SpellFormBody } from '@/components/spells/form/forms/SpellFormBody';
import type { SpellFormData } from '@/components/spells/form/spell-form-defaults';
import { getDefaultSpellFormData } from '@/components/spells/form/spell-form-defaults';
import { SPELL_FORM_ID } from '@/components/spells/form/spell-form-tabs';
import { Button } from '@/components/ui/button';
import { useConfirm, useNotify } from '@/lib/hooks/common';
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

export function SpellEditForm({
    campaignId: id,
    spellId,
    side,
}: {
    campaignId: string;
    spellId: string;
    side?: ReactNode;
}) {
    const t = useTranslations();

    const tm = useTranslations('common.dmSections');

    const confirm = useConfirm();

    const notify = useNotify();

    const router = useRouter();

    const issueText = useSpellIssueText();

    const [formData, setFormData] = useState<SpellFormData>(
        getDefaultSpellFormData
    );

    const { data: spell, isLoading: fetching } = useSpell(id, spellId);

    const { data: spellGroups = [] } = useSpellGroups(id);

    const updateSpellMutation = useUpdateSpell(id, spellId);

    const deleteSpellMutation = useDeleteSpell(id, spellId);

    useSpellFormSync(spell, setFormData, spellToForm);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const problem = spellFormIssue(formData);

        if (problem) {
            void notify(issueText(problem));

            return;
        }

        updateSpellMutation.mutate(formToPayload(formData), {
            onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
            onError: (error) => console.error('Error updating spell:', error),
        });
    };

    const handleDelete = async () => {
        if (
            !(await confirm({
                title: t('spellEditor.page.deleteConfirm'),
                confirmLabel: t('common.actions.delete'),
                destructive: true,
            }))
        ) {
            return;
        }

        deleteSpellMutation.mutate(undefined, {
            onSuccess: () => {
                router.push(`/campaigns/${id}/dm/spells`);
            },
            onError: (error) => {
                console.error('Error deleting spell:', error);
            },
        });
    };

    if (fetching) {
        return (
            <HudFormPage width="wide" title={t('spellEditor.page.editTitle')}>
                <div className="px-4 py-3">
                    <LoadingState
                        rows={6}
                        label={t('spellEditor.page.loading')}
                    />
                </div>
            </HudFormPage>
        );
    }

    return (
        <HudFormPage
            width="wide"
            title={
                <>
                    <Link
                        href={`/campaigns/${id}/dm/spells`}
                        className="hover:text-hud-accent-fg"
                    >
                        {tm('spells')}
                    </Link>
                    {' › '}
                    {t('spellEditor.page.editTitleNamed', {
                        name: formData.name ?? '',
                    })}
                </>
            }
            aside={t('spellEditor.page.editAside')}
            side={side}
            actions={
                <>
                    <HudFormMenu
                        label={t('common.form.more')}
                        items={[
                            {
                                label: deleteSpellMutation.isPending
                                    ? t('spellEditor.page.deleting')
                                    : t('common.actions.delete'),
                                tone: 'danger',
                                onSelect: handleDelete,
                            },
                        ]}
                    />
                    <Button type="button" variant="outline" asChild>
                        <Link href={`/campaigns/${id}/dm/spells`}>
                            {t('common.actions.cancel')}
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        form={SPELL_FORM_ID}
                        disabled={updateSpellMutation.isPending}
                    >
                        {updateSpellMutation.isPending
                            ? t('common.actions.saving')
                            : t('spellEditor.page.editSubmit')}
                    </Button>
                </>
            }
        >
            <SpellFormBody
                campaignId={id}
                form={{ data: formData, set: setFormData }}
                spellGroups={spellGroups}
                submit={{
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
