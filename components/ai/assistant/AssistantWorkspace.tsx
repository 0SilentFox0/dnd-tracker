'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { AiPanel } from '../chat/AiPanel';
import { AssistantReview } from './AssistantReview';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { useTranslator } from '@/lib/i18n/use-translator';
import { focusLabelOf } from '@/lib/utils/ai/focus';
import type { AiFocus } from '@/types/ai';
export function AssistantWorkspace({
    campaignId,
    campaignName,
    initialIntentId,
}: {
    campaignId: string;
    campaignName: string;
    initialIntentId?: string;
}) {
    const t = useTranslations('ai');

    const tr = useTranslator('ai');

    const [focus, setFocus] = useState<AiFocus>();

    const [kind, setKind] = useState('campaign');

    const [id, setId] = useState('');

    const label = focusLabelOf(tr, undefined, focus);

    const pick = () => {
        const value = id.trim();

        if (kind === 'campaign') setFocus({ kind: 'campaign' });
        else if (value)
            setFocus(
                kind === 'character'
                    ? { kind: 'character', characterId: value }
                    : kind === 'battle'
                      ? { kind: 'battle', battleId: value }
                      : { pageId: value }
            );
    };

    return (
        <main className="mx-auto flex min-h-[85dvh] max-w-7xl flex-col gap-3 p-3">
            <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    pick();
                }}
            >
                <label>
                    {t('workspace.focusKind')}
                    <SelectField
                        aria-label={t('workspace.focusKind')}
                        value={kind}
                        onValueChange={setKind}
                        options={(
                            [
                                'campaign',
                                'scenario',
                                'character',
                                'battle',
                            ] as const
                        ).map((k) => ({
                            value: k,
                            label: t(`workspace.kinds.${k}`),
                        }))}
                    />
                </label>
                {kind !== 'campaign' && (
                    <label>
                        {t('workspace.focusId')}
                        <Input
                            aria-label={t('workspace.focusId')}
                            maxLength={40}
                            value={id}
                            onChange={(event) => setId(event.target.value)}
                        />
                    </label>
                )}
                <Button
                    type="submit"
                    variant="outline"
                    disabled={kind !== 'campaign' && !id.trim()}
                >
                    {t('workspace.pick')}
                </Button>
                {label && (
                    <>
                        <p className="break-words">{label}</p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFocus(undefined)}
                        >
                            {t('workspace.clear')}
                        </Button>
                    </>
                )}
            </form>
            <div className="min-h-0 flex-1">
                <AiPanel
                    campaignId={campaignId}
                    campaignName={campaignName}
                    mode="scenario"
                    embedded
                    focus={{ value: focus, onClear: () => setFocus(undefined) }}
                    proposals={{
                        review: (
                            <AssistantReview
                                campaignId={campaignId}
                                initialIntentId={initialIntentId}
                            />
                        ),
                    }}
                    actions={{ onClose: () => {} }}
                />
            </div>
        </main>
    );
}
