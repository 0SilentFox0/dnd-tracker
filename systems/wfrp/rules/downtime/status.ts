import { EARN_STATUS_DEFAULT } from './constants';

export type StatusTier = 'brass' | 'silver' | 'gold';

export type Status = { tier: StatusTier; level: number };

export function parseStatus(raw?: string | null): Status {
    const m = /^(brass|silver|gold)\s+(\d{1,2})$/i.exec(raw?.trim() ?? '');

    const level = m ? Number(m[2]) : 0;

    return m && level >= 1
        ? { tier: m[1].toLowerCase() as StatusTier, level }
        : EARN_STATUS_DEFAULT;
}
