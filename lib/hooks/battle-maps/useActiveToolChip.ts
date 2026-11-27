'use client';

import { useTranslations } from 'next-intl';

import { DAMAGE_ELEMENT_OPTIONS } from '@/lib/constants/damage';
import type { BattleMapEditor } from '@/lib/hooks/battles';

export function useActiveToolChip(editor: BattleMapEditor) {
    const t = useTranslations('battleSetup.map');

    const tDamage = useTranslations('gameTerms.damageTypes');

    const { tool } = editor.state;

    const { brush, actions } = editor;

    const element = DAMAGE_ELEMENT_OPTIONS.find(
        (o) => o.value === brush.damageType
    )?.value;

    const detail =
        tool === 'hazard' && brush.dice.trim()
            ? [brush.dice.trim(), element && tDamage(element)]
                  .filter(Boolean)
                  .join(' ')
            : undefined;

    return {
        tool: tool ? { label: t(`tools.${tool}`), detail } : null,
        onClear: () => actions.setTool(null),
        onEscape: () => {
            if (!tool) return false;

            actions.setTool(null);

            return true;
        },
    };
}
