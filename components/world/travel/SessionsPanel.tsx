'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, Square, Trash2 } from 'lucide-react';

import { SessionFormDialog } from './SessionFormDialog';

import { HudIconButton } from '@/components/hud';
import { HudPanel } from '@/components/hud/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/lib/hooks/common';
import { useWorldSessions } from '@/lib/hooks/world';
import type { WorldSession } from '@/types/world';

export function SessionsPanel({ campaignId }: { campaignId: string }) {
    const t = useTranslations('world.sessions');

    const tc = useTranslations('common.actions');

    const confirm = useConfirm();

    const { list, update, remove } = useWorldSessions(campaignId);

    const [form, setForm] = useState<{ session?: WorldSession } | null>(null);

    const sessions = list.data ?? [];

    const removeSession = async (s: WorldSession) => {
        const ok = await confirm({
            title: t('deleteTitle', { name: s.name }),
            description: t('deleteDescription'),
            confirmLabel: tc('delete'),
            destructive: true,
        });

        if (ok) await remove.mutateOk(s.id);
    };

    return (
        <HudPanel as="div" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-hud-ink">
                    {t('title')}
                </h2>
                <Button size="sm" onClick={() => setForm({})}>
                    <Plus className="size-4" aria-hidden />
                    {t('new')}
                </Button>
            </div>

            {sessions.length === 0 ? (
                <p className="text-xs text-hud-muted">{t('empty')}</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {sessions.map((s) => (
                        <li
                            key={s.id}
                            className="flex items-center gap-2 text-sm text-hud-ink"
                        >
                            <span
                                aria-hidden
                                className="size-3 shrink-0 rounded-full"
                                style={{ background: s.color }}
                            />
                            <span className="min-w-0 flex-1 truncate">
                                {s.name}
                            </span>
                            {s.entryCount === undefined ? null : (
                                <span className="shrink-0 text-xs text-hud-muted">
                                    {t('entryCount', { count: s.entryCount })}
                                </span>
                            )}
                            {s.active ? <Badge>{t('active')}</Badge> : null}
                            <HudIconButton
                                aria-label={`${t('edit')}: ${s.name}`}
                                onClick={() => setForm({ session: s })}
                            >
                                <Pencil className="size-4" />
                            </HudIconButton>
                            {s.active ? (
                                <HudIconButton
                                    aria-label={`${t('end')}: ${s.name}`}
                                    onClick={() =>
                                        update.mutate({
                                            id: s.id,
                                            data: { end: true },
                                        })
                                    }
                                >
                                    <Square className="size-4" />
                                </HudIconButton>
                            ) : null}
                            <HudIconButton
                                tone="danger"
                                aria-label={`${t('delete')}: ${s.name}`}
                                onClick={() => void removeSession(s)}
                            >
                                <Trash2 className="size-4" />
                            </HudIconButton>
                        </li>
                    ))}
                </ul>
            )}

            <SessionFormDialog
                campaignId={campaignId}
                open={form !== null}
                onOpenChange={(open) => {
                    if (!open) setForm(null);
                }}
                session={form?.session}
            />
        </HudPanel>
    );
}
