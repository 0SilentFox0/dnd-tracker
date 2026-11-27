'use client';

import { useTranslations } from 'next-intl';
import { Pencil, X } from 'lucide-react';

import { HudIconButton } from '@/components/hud';

export function ActiveToolChip({
    tool,
    onClear,
}: {
    tool: { label: string; detail?: string } | null;
    onClear: () => void;
}) {
    const t = useTranslations('maps.editor.workbench');

    if (!tool) return null;

    return (
        <div className="ds-raised pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-hud-ink">
            <Pencil aria-hidden="true" className="h-4 w-4 text-hud-accent-fg" />
            <span className="min-w-0 truncate font-medium">
                {tool.label}
                {tool.detail ? ` · ${tool.detail}` : ''}
            </span>
            <span className="hidden text-xs text-hud-muted sm:inline">
                {t('toolHint')}
            </span>
            <HudIconButton
                type="button"
                aria-label={t('clearTool')}
                onClick={onClear}
            >
                <X aria-hidden="true" className="h-4 w-4" />
            </HudIconButton>
        </div>
    );
}
