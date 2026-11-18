'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { usePlayerDraftForm } from '@/lib/hooks/characters';

type Draft = ReturnType<typeof usePlayerDraftForm>;

export function DraftRegenerateBar({
    form,
    generate,
    ai,
    busy,
}: {
    form: Draft['form'];
    generate: Draft['generate'];
    ai: Draft['ai'];
    busy: boolean;
}) {
    const t = useTranslations('characters.draft');

    const { values } = form;

    return (
        <div className="mb-4 flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" disabled={busy}>
                        {t('regenerate')}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={generate.all}>
                        {t('regenAll')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={generate.name}>
                        {t('regenName')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={generate.scores}>
                        {t('regenScores')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={generate.backstory}>
                        {t('regenBackstory')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {ai.available && (
                <Button
                    type="button"
                    variant="outline"
                    disabled={
                        busy || ai.isPending || !values.name || !values.race
                    }
                    onClick={ai.run}
                >
                    {ai.isPending ? t('aiBackstoryPending') : t('aiBackstory')}
                </Button>
            )}
        </div>
    );
}
