'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@/components/auth/UserAvatar';
import { Button } from '@/components/ui/button';
import { FileButton } from '@/components/ui/file-button';
import { AVATAR_SOURCE_TYPES } from '@/lib/constants/profile';
import { useAvatar } from '@/lib/hooks/auth';
import { useConfirm } from '@/lib/hooks/common';
import type { SessionUser } from '@/lib/utils/auth/session-user';
import { isHostedOnProjectStorage } from '@/lib/utils/common/image-url';

export function AvatarEditor({
    user,
    children,
}: {
    user: SessionUser;
    children?: ReactNode;
}) {
    const t = useTranslations('common.profile');

    const confirm = useConfirm();

    const { upload, remove, pending } = useAvatar();

    const hasCustom = !!user.avatarUrl && isHostedOnProjectStorage(user.avatarUrl);

    const onRemove = async () => {
        const ok = await confirm({
            title: t('avatar.removeConfirm'),
            confirmLabel: t('avatar.remove'),
            destructive: true,
        });

        if (ok) await remove();
    };

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="ds-inset border border-hud-line p-1.5">
                <UserAvatar
                    user={user}
                    className="hud-sc size-28 rounded-xl border-0 text-4xl sm:size-32"
                    sizes="128px"
                />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
                <div className="min-w-0">
                    {user.name && (
                        <p className="hud-sc truncate text-2xl text-hud-ink">
                            {user.name}
                        </p>
                    )}
                    {user.email && (
                        <p className="truncate text-sm text-hud-muted">
                            {user.email}
                        </p>
                    )}
                </div>
                {children}
                <div className="flex flex-wrap gap-2">
                    <FileButton
                        size="sm"
                        accept={AVATAR_SOURCE_TYPES.join(',')}
                        inputLabel={t('avatar.change')}
                        disabled={pending}
                        onFile={(file) => void upload(file)}
                    >
                        {t('avatar.change')}
                    </FileButton>
                    {hasCustom && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => void onRemove()}
                        >
                            {t('avatar.remove')}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-hud-muted">{t('avatar.hint')}</p>
            </div>
        </div>
    );
}
