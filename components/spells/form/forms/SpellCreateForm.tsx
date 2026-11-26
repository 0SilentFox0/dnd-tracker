'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HudFormPage } from '@/components/hud/form';
import { SpellFormBody } from '@/components/spells/form/forms/SpellFormBody';
import type { SpellFormData } from '@/components/spells/form/spell-form-defaults';
import { getDefaultSpellFormData } from '@/components/spells/form/spell-form-defaults';
import { SPELL_FORM_ID } from '@/components/spells/form/spell-form-tabs';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/lib/hooks/common';
import {
    useCreateSpell,
    useSpellGroups,
    useSpellIssueText,
} from '@/lib/hooks/spells';
import { formToPayload, spellFormIssue } from '@/lib/utils/spells/model/form';

export function SpellCreateForm({ campaignId: id }: { campaignId: string }) {
    const t = useTranslations('spellEditor.page');

    const notify = useNotify();

    const tm = useTranslations('common.dmSections');

    const tc = useTranslations('common.actions');

    const issueText = useSpellIssueText();

    const router = useRouter();

    const [formData, setFormData] = useState<SpellFormData>(
        getDefaultSpellFormData
    );

    const { data: spellGroups = [] } = useSpellGroups(id);

    const createSpellMutation = useCreateSpell(id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const problem = spellFormIssue(formData);

        if (problem) {
            void notify(issueText(problem));

            return;
        }

        createSpellMutation.mutate(formToPayload(formData), {
            onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
            onError: (error) => console.error('Error creating spell:', error),
        });
    };

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
                    {t('createTitle')}
                </>
            }
            aside={t('createAside')}
            actions={
                <>
                    <Button type="button" variant="outline" asChild>
                        <Link href={`/campaigns/${id}/dm/spells`}>
                            {tc('cancel')}
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        form={SPELL_FORM_ID}
                        disabled={createSpellMutation.isPending}
                    >
                        {createSpellMutation.isPending
                            ? tc('saving')
                            : t('createSubmit')}
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
                        (createSpellMutation.error as Error)?.message ?? null,
                }}
            />
        </HudFormPage>
    );
}
