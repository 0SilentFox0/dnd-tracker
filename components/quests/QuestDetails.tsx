'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Circle, HelpCircle, MapPin, ScrollText } from 'lucide-react';

import { QuestProgress } from './QuestProgress';

import { Button } from '@/components/ui/button';
import type { QuestView } from '@/types/quests';

export function QuestDetails({
    quest,
    campaignId,
    isDM,
    actions,
}: {
    quest: QuestView;
    campaignId: string;
    isDM: boolean;
    actions: {
        edit(): void;
        track(): void;
        pending: boolean;
        readOnly: boolean;
    };
}) {
    const t = useTranslations('quests');

    return (
        <article className="w-full max-w-[760px] min-w-0 space-y-5 p-4 sm:p-7">
            <div className="flex items-start gap-3">
                <ScrollText className="mt-1 size-7 shrink-0 text-hud-gold" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs tracking-widest text-hud-gold uppercase">
                        {t(quest.kind)}
                        {quest.marker && ` · ${quest.marker.name}`}
                    </p>
                    <h2 className="hud-sc text-2xl break-words text-hud-ink">
                        {quest.title}
                    </h2>
                </div>
                <span className="rounded border border-hud-line px-2 py-1 text-xs text-hud-muted">
                    {t(quest.status)}
                </span>
            </div>
            <p className="text-sm break-words whitespace-pre-wrap text-hud-bone">
                {quest.description}
            </p>
            <div className="max-w-[360px]">
                <QuestProgress quest={quest} />
            </div>
            <section className="space-y-2">
                <h3 className="hud-sc text-hud-gold">{t('objectives')}</h3>
                {quest.objectives.map((o, index) => (
                    <div
                        key={o.hidden ? `hidden-${index}` : o.id}
                        className={`flex items-start gap-3 rounded border p-3 text-sm ${o.hidden || !o.visible ? 'border-dashed border-hud-line text-hud-muted' : 'border-hud-edge text-hud-bone'}`}
                    >
                        {o.hidden ? (
                            <HelpCircle className="size-5 shrink-0" />
                        ) : o.completed ? (
                            <Check className="size-5 shrink-0 text-hud-gold" />
                        ) : (
                            <Circle className="size-5 shrink-0" />
                        )}
                        <span
                            className={`min-w-0 break-words ${o.hidden ? 'italic' : o.completed ? 'line-through' : ''}`}
                        >
                            {o.hidden ? t('hidden') : o.title}
                            {!o.hidden && !o.visible && (
                                <span className="ml-2 text-xs text-hud-muted">
                                    ({t('private')})
                                </span>
                            )}
                        </span>
                    </div>
                ))}
            </section>
            {(['notes', 'reward'] as const).map(
                (field) =>
                    quest[field] && (
                        <section key={field} className="space-y-2">
                            <h3 className="hud-sc text-hud-gold">{t(field)}</h3>
                            <p
                                className={`text-sm break-words whitespace-pre-wrap text-hud-bone ${field === 'reward' ? 'inline-block rounded-md border border-hud-line bg-hud-field px-2 py-1' : ''}`}
                            >
                                {quest[field]}
                            </p>
                        </section>
                    )
            )}
            <div className="flex flex-wrap gap-2">
                {quest.marker && (
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-10 border-hud-gold text-hud-gold"
                    >
                        <Link
                            href={`/campaigns/${campaignId}/${isDM ? 'dm/' : ''}world?map=${encodeURIComponent(quest.marker.mapId)}&marker=${encodeURIComponent(quest.marker.id)}`}
                        >
                            <MapPin className="size-4" />
                            {t('map')}
                        </Link>
                    </Button>
                )}
                {!actions.readOnly && (
                    <Button
                        variant="outline"
                        className="min-h-10"
                        disabled={actions.pending}
                        onClick={actions.track}
                    >
                        {t(quest.tracked ? 'untrack' : 'track')}
                    </Button>
                )}
                {isDM && (
                    <Button
                        variant="outline"
                        className="min-h-10"
                        onClick={actions.edit}
                    >
                        {t('edit')}
                    </Button>
                )}
            </div>
        </article>
    );
}
