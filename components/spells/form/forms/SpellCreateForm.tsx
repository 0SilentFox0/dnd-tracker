'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HudFormPage } from '@/components/hud/form';
import { SpellFormBody } from '@/components/spells/form/forms/SpellFormBody';
import type { SpellFormData } from '@/components/spells/form/spell-form-defaults';
import { getDefaultSpellFormData } from '@/components/spells/form/spell-form-defaults';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/lib/hooks/common';
import {
    useCreateSpell,
    useSpellGroups,
    useSpellIssueText,
} from '@/lib/hooks/spells';
import { formToPayload, spellFormIssue } from '@/lib/utils/spells/model/form';

const FORM_ID = 'spell-form';

export function SpellCreateForm({ campaignId: id }: { campaignId: string }) {
    const t = useTranslations('spellEditor.page');

    const tc = useTranslations('common');

    const notify = useNotify();

    const issueText = useSpellIssueText();

    const router = useRouter();

    const listHref = `/campaigns/${id}/dm/spells`;

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
            onSuccess: () => router.push(listHref),
            onError: (error) => console.error('Error creating spell:', error),
        });
    };

    return (
        <HudFormPage
            width="wide"
            header={{
                title: t('createTitle'),
                aside: t('createAside'),
                back: { href: listHref, label: tc('dmSections.spells') },
            }}
            actions={
                <>
                    <Button type="button" variant="outline" asChild>
                        <Link href={listHref}>{tc('actions.cancel')}</Link>
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={createSpellMutation.isPending}
                    >
                        {createSpellMutation.isPending
                            ? tc('actions.saving')
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
                    id: FORM_ID,
                    onSubmit: handleSubmit,
                    error:
                        (createSpellMutation.error as Error)?.message ?? null,
                }}
            />
        </HudFormPage>
    );
}
