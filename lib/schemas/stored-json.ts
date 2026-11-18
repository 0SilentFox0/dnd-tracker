import { z } from 'zod';

import { isRecord } from '@/lib/utils/common/is-record';

/** Container-level check for JSON columns whose inner shape is upgraded on read (module keys must survive). */
export const storedRecord = <T extends object>() =>
    z.custom<T>(isRecord, 'stored.json.object');

export const storedRecordList = <T extends object>() =>
    z.array(storedRecord<T>()).catch([]);
