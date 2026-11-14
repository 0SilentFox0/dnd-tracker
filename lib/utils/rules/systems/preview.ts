import {
    composition,
    contentKindsOf,
    dmSectionsOf,
    moduleChange,
    type SystemSelection,
} from './catalog';
import { ruleSystemOf } from './lookup';

import { sectionsOfComposition } from '@/lib/utils/rules/section-registry';

export interface CompositionPreview {
    base: string;
    modules: string[];
    sheetBlocks: number;
    rulesSections: string[];
    contentKinds: string[];
    dmSections: string[];
    actions: string[];
    added: string[];
    removed: string[];
    setup: string[];
}

/** Read-only: what the draft composition would give the campaign, nothing is persisted */
export function previewComposition(
    current: SystemSelection,
    draft: SystemSelection
): CompositionPreview {
    const { base, modules } = composition(draft);

    const definition = ruleSystemOf({ system: draft });

    const sections = sectionsOfComposition({ base, modules });

    const { added, removed, setup } = moduleChange(current, draft);

    return {
        base,
        modules: [...modules],
        sheetBlocks: definition.sheet?.blocks.length ?? 0,
        rulesSections: Object.keys(sections).filter(
            (key) => sections[key].mechanic
        ),
        contentKinds: [...contentKindsOf(draft)].sort(),
        dmSections: [...dmSectionsOf(draft)].sort(),
        actions: Object.keys(definition.combat.actions.catalog).sort(),
        added,
        removed,
        setup,
    };
}
