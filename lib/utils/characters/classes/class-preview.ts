import { toClassForReference } from '@/lib/utils/campaigns/info-reference';
import type { GameClassData } from '@/types/classes';
import type { ClassForReference } from '@/types/info-reference';

export type ClassFormData = Omit<GameClassData, 'id'>;

export function toClassReferencePreview(
    data: ClassFormData,
    ctx: { id?: string }
): ClassForReference {
    return toClassForReference({ ...data, id: ctx.id ?? '' });
}
