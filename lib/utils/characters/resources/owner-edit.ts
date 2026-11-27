import type { ResourcesEditBody } from '@/types/characters';

const OWNER_EDITABLE = new Set(['hp', 'tempHp', 'slotsSpent']);

export const ownerMayEdit = (body: ResourcesEditBody) =>
    Object.entries(body).every(
        ([key, value]) => value === undefined || OWNER_EDITABLE.has(key)
    );
