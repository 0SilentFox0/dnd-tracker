'use client';
import { useTranslations } from 'next-intl';

import type { QuestView } from '@/types/quests';

export function QuestProgress({ quest }: { quest: QuestView }) {
    const t = useTranslations('quests');

    const done = quest.objectives.filter(
        (o) => !o.hidden && o.completed
    ).length;

    return (
        <div className="space-y-1">
            <span className="text-xs text-hud-muted">
                {t('progress', { done, total: quest.objectives.length })}
            </span>
            <div className="h-1 overflow-hidden rounded bg-hud-field">
                <div
                    className="h-full bg-hud-gold"
                    style={{
                        width: `${quest.objectives.length ? (done / quest.objectives.length) * 100 : 0}%`,
                    }}
                />
            </div>
        </div>
    );
}
