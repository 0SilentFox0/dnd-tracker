import { useCallback, useState } from 'react';

import { useProfile } from '../ProfileContext';
import type { SheetRollRequest } from '../rest/SheetRollDialog';

export function useSheetRollRequest() {
    const { sheet } = useProfile();

    const [request, setRequest] = useState<SheetRollRequest | null>(null);

    const close = useCallback(() => setRequest(null), []);

    return {
        request,
        setRequest,
        close,
        canRoll: !!sheet.rest && (sheet.viewer.isOwner || sheet.viewer.isDM),
    };
}
