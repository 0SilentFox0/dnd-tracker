'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HudSegmented } from '@/components/hud/HudSegmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useAdminUserActions } from '@/lib/hooks/admin';
import { useConfirm } from '@/lib/hooks/common';
import { ADMIN_BAN_HOURS } from '@/lib/schemas/admin';
import type { AdminUserDetail } from '@/types/admin';

type Hours = (typeof ADMIN_BAN_HOURS)[number];

const HOURS_KEY = { 24: 'ban24', 168: 'ban168', 876000: 'banForever' } as const;

const sameEmail = (a: string, b: string) =>
    a.trim().toLowerCase() === b.toLowerCase();

export function UserActions({
    user,
    templates,
    selfId,
}: {
    user: AdminUserDetail['user'];
    templates: AdminUserDetail['templates'];
    selfId: string;
}) {
    const t = useTranslations('admin.actions');

    const router = useRouter();

    const confirm = useConfirm();

    const actions = useAdminUserActions(user.id);

    const [dialog, setDialog] = useState<'ban' | 'delete' | null>(null);

    const [hours, setHours] = useState<Hours>(168);

    const [typed, setTyped] = useState('');

    if (user.id === selfId)
        return <p className="text-sm text-hud-muted">{t('self')}</p>;

    const close = () => {
        setDialog(null);
        setTyped('');
        actions.remove.reset();
        actions.ban.reset();
    };

    const blocking = templates.filter((x) =>
        actions.blockedTemplateIds.includes(x.id)
    );

    const failed =
        actions.ban.isError || actions.unban.isError || actions.signOut.isError;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {user.bannedUntil ? (
                    <Button
                        variant="outline"
                        disabled={actions.unban.isPending}
                        onClick={async () => {
                            const ok = await confirm({
                                title: t('unbanTitle', {
                                    name: user.displayName,
                                }),
                                description: t('unbanText'),
                                confirmLabel: t('confirm'),
                                cancelLabel: t('cancel'),
                            });

                            if (ok) actions.unban.mutate();
                        }}
                    >
                        {t('unban')}
                    </Button>
                ) : (
                    <Button variant="outline" onClick={() => setDialog('ban')}>
                        {t('ban')}
                    </Button>
                )}
                <Button
                    variant="outline"
                    disabled={actions.signOut.isPending}
                    onClick={async () => {
                        const ok = await confirm({
                            title: t('signOutTitle', {
                                name: user.displayName,
                            }),
                            description: t('signOutText'),
                            confirmLabel: t('confirm'),
                            cancelLabel: t('cancel'),
                        });

                        if (ok) actions.signOut.mutate();
                    }}
                >
                    {t('signOut')}
                </Button>
                <Button
                    variant="destructive"
                    onClick={() => setDialog('delete')}
                >
                    {t('delete')}
                </Button>
            </div>
            {failed && (
                <p role="alert" className="text-sm text-destructive">
                    {t('failed')}
                </p>
            )}
            <ResponsiveDialog
                hud
                open={dialog === 'ban'}
                onOpenChange={(o) => !o && close()}
                title={t('banTitle', { name: user.displayName })}
                footer={
                    <>
                        <Button variant="ghost" onClick={close}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={actions.ban.isPending}
                            onClick={() =>
                                actions.ban.mutate(hours, { onSuccess: close })
                            }
                        >
                            {t('ban')}
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-3 text-sm">
                    <HudSegmented
                        id="admin-ban-hours"
                        label={t('banDuration')}
                        value={String(hours) as `${Hours}`}
                        onValueChange={(v) => setHours(Number(v) as Hours)}
                        options={ADMIN_BAN_HOURS.map((h) => ({
                            value: String(h) as `${Hours}`,
                            label: t(HOURS_KEY[h]),
                        }))}
                    />
                    <p className="text-hud-muted">{t('banNote')}</p>
                    {actions.ban.isError && (
                        <p role="alert" className="text-destructive">
                            {t('failed')}
                        </p>
                    )}
                </div>
            </ResponsiveDialog>
            <ResponsiveDialog
                hud
                open={dialog === 'delete'}
                onOpenChange={(o) => !o && !actions.remove.isPending && close()}
                title={t('deleteTitle', { name: user.displayName })}
                description={t('deleteText')}
                footer={
                    <>
                        <Button
                            variant="ghost"
                            disabled={actions.remove.isPending}
                            onClick={close}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={
                                !sameEmail(typed, user.email) ||
                                actions.remove.isPending
                            }
                            onClick={() =>
                                actions.remove.mutate(user.email, {
                                    onSuccess: () =>
                                        router.push('/admin/users'),
                                })
                            }
                        >
                            {t('delete')}
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-xs text-hud-muted">
                        {t('deleteLabel', { email: user.email })}
                        <Input
                            value={typed}
                            autoComplete="off"
                            inputMode="email"
                            className="min-h-10"
                            onChange={(e) => setTyped(e.target.value)}
                        />
                    </label>
                    {actions.remove.isError &&
                        (actions.blockedTemplateIds.length ? (
                            <div
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                <p>{t('blocked')}</p>
                                <ul className="list-disc pl-5">
                                    {actions.blockedTemplateIds.map((id) => (
                                        <li key={id}>
                                            {blocking.find((x) => x.id === id)
                                                ?.name ?? id}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {t('failed')}
                            </p>
                        ))}
                </div>
            </ResponsiveDialog>
        </div>
    );
}
