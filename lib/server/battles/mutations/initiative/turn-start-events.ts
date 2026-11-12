import { textRef } from '@/lib/i18n/text-ref';
import { dmEvent } from '@/lib/utils/battle/store';
import type { LogLine } from '@/types/text';

export function turnStartEvents(round: number, messages: LogLine[]) {
    return messages.length > 0
        ? [
              dmEvent(round, [
                  textRef('battleLog.triggers.turnStart'),
                  ...messages,
              ]),
          ]
        : [];
}
