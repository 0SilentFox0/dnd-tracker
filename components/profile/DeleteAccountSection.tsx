'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { LEGAL } from '@/lib/constants/site';
import { useDeleteAccount } from '@/lib/hooks/account';

const sameEmail = (a: string, b: string) =>
    a.trim().toLowerCase() === b.toLowerCase();

export function DeleteAccountSection({ email }: { email: string }) {
    const t = useTranslations('auth.deleteAccount');

    const { remove, reset, isPending, error, isBlocked } = useDeleteAccount();

    const [open, setOpen] = useState(false);

    const [typed, setTyped] = useState('');

    const close = (next: boolean) => {
        if (isPending) return;

        setOpen(next);
        setTyped('');
        reset();
    };

    return (
        <ProfileSectionCard title={t('title')}>
            <p className="text-sm text-hud-soft">{t('text')}</p>
            <Button
                type="button"
                variant="destructive"
                
                onClick={() => setOpen(true)}
            >
                {t('open')}
            </Button>
            <ResponsiveDialog
                hud
                open={open}
                onOpenChange={close}
                title={t('dialogTitle')}
                description={t('dialogText')}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            
                            disabled={isPending}
                            onClick={() => close(false)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            
                            disabled={!sameEmail(typed, email) || isPending}
                            onClick={() => void remove(email)}
                        >
                            {t('button')}
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-xs text-hud-muted">
                        {t('confirmLabel', { email })}
                        <Input
                            value={typed}
                            autoComplete="off"
                            inputMode="email"
                            className="min-h-10"
                            onChange={(e) => setTyped(e.target.value)}
                        />
                    </label>
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {isBlocked
                                ? t('blocked', {
                                      contactEmail: LEGAL.contactEmail,
                                  })
                                : t('failed')}
                        </p>
                    ) : null}
                </div>
            </ResponsiveDialog>
        </ProfileSectionCard>
    );
}
