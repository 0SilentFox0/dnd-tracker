import { toClassForReference } from '@/lib/utils/campaigns/info-reference';
import type { GameClassData } from '@/types/classes';
import type { ClassForReference } from '@/types/info-reference';

export function toClassReferencePreview(
    data: Omit<GameClassData, 'id'>,
    ctx: { id?: string }
): ClassForReference {
    return toClassForReference({ ...data, id: ctx.id ?? '' });
}
