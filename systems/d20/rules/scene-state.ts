import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';

/** The d20 base owns the scene slot; modules keep their parts in `ext[<module>]` */
export const D20_SCENE = defineSlot<Record<string, unknown>>('d20', (raw) =>
    isRecord(raw) ? raw : undefined
);
