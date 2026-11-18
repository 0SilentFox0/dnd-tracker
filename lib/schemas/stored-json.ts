import { z } from 'zod';

import { isRecord } from '@/lib/utils/common/is-record';

/** Container-level check for JSON columns whose inner shape is upgraded on read (module keys must survive). */
export const storedRecord = <T extends object>() =>
    z.custom<T>(isRecord, 'stored.json.object');

/** Invalid items are dropped one by one (logged); a non-array becomes an empty list. */
export const storedRecordList = <T extends object>() =>
    z
        .array(z.unknown())
        .transform((items) =>
            items.filter((item): item is T => {
                if (isRecord(item)) return true;

                console.error('stored json list item dropped: not an object');

                return false;
            })
        )
        .catch([]);
