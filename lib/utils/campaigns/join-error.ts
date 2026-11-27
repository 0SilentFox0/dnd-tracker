import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Translator } from '@/lib/i18n/translator';

const JOIN_ERROR_KEYS: Array<[string, string]> = [
    [API_ERRORS.CAMPAIGN_NOT_FOUND, 'common.joinErrors.campaignNotFound'],
    [API_ERRORS.ALREADY_MEMBER, 'common.joinErrors.alreadyMember'],
    [API_ERRORS.CAMPAIGN_NOT_ACTIVE, 'common.joinErrors.campaignNotActive'],
    [API_ERRORS.TEMPLATE_NOT_JOINABLE, 'common.joinErrors.templateNotJoinable'],
    [API_ERRORS.DEMO_NOT_JOINABLE, 'common.joinErrors.demoNotJoinable'],
];

function errorSource(err: Error): string {
    return (err as { errorKey?: string }).errorKey ?? err.message;
}

/** Key under `common` for a known server join error, else null. */
export function joinErrorKey(error: string): string | null {
    const match = JOIN_ERROR_KEYS.find(([needle]) => error.includes(needle));

    return match ? match[1].replace('common.', '') : null;
}

export function isAlreadyMemberError(err: unknown): boolean {
    return (
        err instanceof Error &&
        errorSource(err).includes(API_ERRORS.ALREADY_MEMBER)
    );
}

export function joinErrorMessage(err: unknown, t: Translator): string {
    if (!(err instanceof Error)) return t('common.joinErrors.failed');

    const source = errorSource(err);

    const match = JOIN_ERROR_KEYS.find(([needle]) => source.includes(needle));

    return match ? t(match[1]) : err.message;
}
