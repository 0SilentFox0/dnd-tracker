'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface InviteCodeDisplayProps {
    inviteCode: string;
    compact?: boolean;
}

export function InviteCodeDisplay({
    inviteCode,
    compact = false,
}: InviteCodeDisplayProps) {
    const t = useTranslations('campaigns');

    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="flex min-w-0 items-center gap-1">
            <code
                className={
                    compact
                        ? 'max-w-full truncate rounded bg-hud-field px-1.5 py-0.5 font-mono text-xs font-semibold text-hud-ink sm:text-sm'
                        : 'rounded bg-hud-field px-2 py-1 font-mono text-lg font-semibold text-hud-ink'
                }
            >
                {inviteCode}
            </code>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className={'size-10 shrink-0'}
                title={t('settings.copyCode')}
                aria-label={t('settings.copyCode')}
            >
                {copied ? (
                    <Check className={compact ? 'size-3.5 text-hud-gold' : 'h-4 w-4 text-hud-gold'} />
                ) : (
                    <Copy className={compact ? 'size-3.5' : 'h-4 w-4'} />
                )}
            </Button>
        </div>
    );
}
