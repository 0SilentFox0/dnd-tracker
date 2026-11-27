'use client';

import { useTranslations } from 'next-intl';

import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { LoadingState } from '@/components/common/states';
import { HudFormPage, HudSection } from '@/components/hud/form';
import { useUpdatePassword } from '@/lib/hooks/auth';

export function PasswordSettingsClient() {
    const t = useTranslations('auth.settings');

    const { session, email, hasPassword, pending, error, done, update } =
        useUpdatePassword();

    return (
        <HudFormPage header={{ title: hasPassword ? t('changeTitle') : t('setTitle'), aside: hasPassword ? t('changeSubtitle') : t('setSubtitle') }}>
            <HudSection className="mx-auto w-full max-w-sm space-y-4">
                {session === 'checking' ? (
                    <LoadingState />
                ) : (
                    <>
                        {email && (
                            <p className="text-sm text-hud-muted">
                                {t('account', { email })}
                            </p>
                        )}
                        {done && (
                            <p
                                role="status"
                                className="rounded-lg border border-hud-good-dim bg-[rgba(127,168,106,.1)] p-2 text-sm text-hud-good"
                            >
                                {t('saved')}
                            </p>
                        )}
                        <NewPasswordForm
                            pending={pending}
                            error={error}
                            submitLabel={
                                hasPassword ? t('changeTitle') : t('setTitle')
                            }
                            onSubmit={(v) => void update(v)}
                        />
                    </>
                )}
            </HudSection>
        </HudFormPage>
    );
}
