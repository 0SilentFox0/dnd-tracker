'use client';

import { useTranslations } from 'next-intl';

import { D100RollPicker } from './D100RollPicker';

import { btn } from '@/components/battle/wizards/attack/shared';
import { HUD_SURFACE } from '@/components/hud';
import type { ChannelDialogProps } from '@/components/systems/types';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';

export function ChannelDialog({
    channel: { view, actions },
}: ChannelDialogProps) {
    const t = useTranslations('wfrpMagic.ui.channel');

    const tc = useTranslations('common.actions');

    return (
        <ResponsiveDialog
            open={view.open}
            onOpenChange={(o) => !o && actions.close()}
            title={t('title')}
            className={cn(HUD_SURFACE, 'border-white/25')}
        >
            <div className="text-sm text-hud-gold">
                {t('target', { target: view.target, banked: view.banked })}
            </div>
            {view.error && (
                <p role="alert" className="mt-2 text-sm text-hud-danger">
                    {view.error}
                </p>
            )}
            <fieldset disabled={view.pending}>
                <D100RollPicker
                    fortune={{
                        available: false,
                        left: 0,
                        value: null,
                        onChange: () => undefined,
                    }}
                    onRoll={actions.roll}
                    onAuto={actions.auto}
                />
            </fieldset>
            <button
                type="button"
                disabled={view.pending}
                onClick={actions.close}
                className={cn(btn, 'mt-3 w-full border-white/25')}
            >
                {tc('cancel')}
            </button>
        </ResponsiveDialog>
    );
}
