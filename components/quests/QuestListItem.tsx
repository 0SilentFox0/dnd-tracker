'use client';

import { useTranslations } from 'next-intl';
import { ScrollText, Star } from 'lucide-react';

import { QuestProgress } from './QuestProgress';

import { Button } from '@/components/ui/button';
import type { QuestView } from '@/types/quests';

export function QuestListItem({
    quest,
    selected,
    onSelect,
}: {
    quest: QuestView;
    selected: boolean;
    onSelect(): void;
}) {
    const t = useTranslations('quests');

    return (
        <Button
            variant="ghost"
            aria-pressed={selected}
            onClick={onSelect}
            className={`h-auto w-full items-start justify-start rounded-md border p-3 text-left whitespace-normal ${selected ? 'border-hud-gold bg-hud-field' : 'border-transparent'}`}
        >
            <ScrollText className="mt-1 size-5 shrink-0 text-hud-gold" />
            <span className="min-w-0 flex-1 space-y-2">
                <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 break-words text-hud-ink">
                        {quest.title}
                    </span>
                    {quest.tracked && (
                        <Star
                            className="size-4 shrink-0 text-hud-gold"
                            aria-label={t('tracked')}
                        />
                    )}
                </span>
                {quest.marker && (
                    <span className="block text-xs text-hud-muted">
                        {quest.marker.name}
                    </span>
                )}
                <QuestProgress quest={quest} />
                <span className="inline-flex rounded-full border border-hud-line px-2 py-0.5 text-xs text-hud-muted">
                    {t(quest.status)}
                    {!quest.visible && ` · ${t('private')}`}
                </span>
            </span>
        </Button>
    );
}
