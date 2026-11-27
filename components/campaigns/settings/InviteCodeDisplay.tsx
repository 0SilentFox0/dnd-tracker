'use client';

import { useTranslations } from 'next-intl';
import { Check, Copy, Link } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/lib/hooks/common';
import { inviteLinkPath } from '@/lib/utils/campaigns/invite-link';

interface InviteCodeDisplayProps {
    inviteCode: string;
    compact?: boolean;
}

export function InviteCodeDisplay({
    inviteCode,
    compact = false,
}: InviteCodeDisplayProps) {
    const t = useTranslations('campaigns');

    const code = useCopyToClipboard();

    const link = useCopyToClipboard();

    const iconClass = (done: boolean) =>
        `${compact ? 'size-3.5' : 'size-4'}${done ? ' text-hud-accent-fg' : ''}`;

    return (
        <div className="flex min-w-0 items-center gap-1">
            <code
                className={
                    compact
                        ? 'max-w-full truncate rounded-sm bg-hud-field px-1.5 py-0.5 font-mono text-xs font-semibold text-hud-ink sm:text-sm'
                        : 'rounded-sm bg-hud-field px-2 py-1 font-mono text-lg font-semibold text-hud-ink'
                }
            >
                {inviteCode}
            </code>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => void code.copy(inviteCode)}
                className="shrink-0"
                title={t('settings.copyCode')}
                aria-label={t('settings.copyCode')}
            >
                {code.copied ? <Check className={iconClass(true)} /> : <Copy className={iconClass(false)} />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                    void link.copy(
                        `${window.location.origin}${inviteLinkPath(inviteCode)}`
                    )
                }
                className="shrink-0"
                title={link.copied ? t('settings.linkCopied') : t('settings.copyLink')}
                aria-label={t('settings.copyLink')}
            >
                {link.copied ? <Check className={iconClass(true)} /> : <Link className={iconClass(false)} />}
            </Button>
        </div>
    );
}
