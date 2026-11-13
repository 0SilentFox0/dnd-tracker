import { isRecord } from '@/lib/utils/common/is-record';
import {
    composition,
    kindOf,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';
import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';
import { RULES_PRESETS } from '@/lib/utils/rules/systems/rules-presets';

const mergeSections = (
    into: Record<string, unknown>,
    layer: Readonly<Record<string, unknown>> | undefined
) => {
    for (const [name, value] of Object.entries(layer ?? {}))
        into[name] =
            isRecord(into[name]) && isRecord(value)
                ? { ...into[name], ...value }
                : value;
};

/** Raw rules JSON of a new campaign: base preset, then the key's preset, then `extra`; `modules` is always written explicitly (`[]` = bare base) */
export function initialRules(
    system: SystemSelection,
    extra?: Record<string, unknown>
): Record<string, unknown> {
    const { base, modules } = composition(system);

    const meta = SYSTEM_META.find((m) =>
        (m.keys as readonly string[]).includes(system.key)
    );

    const rules: Record<string, unknown> = {};

    mergeSections(rules, RULES_PRESETS[base]);

    if (meta && kindOf(meta) === 'preset')
        mergeSections(rules, RULES_PRESETS[meta.module]);

    mergeSections(rules, extra);

    return { ...rules, system: { key: system.key, modules } };
}
