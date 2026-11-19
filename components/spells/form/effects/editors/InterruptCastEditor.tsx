'use client';

import type { SpellOnlyEditorProps } from '../spell-only-types';

import { useTranslator } from '@/lib/i18n/use-translator';

export function InterruptCastEditor(
    _props: SpellOnlyEditorProps<'interruptCast'>
) {
    const t = useTranslator('editors');

    return (
        <p className="col-span-6 text-xs text-muted-foreground">
            {t('spellEffects.hints.interruptCast')}
        </p>
    );
}
