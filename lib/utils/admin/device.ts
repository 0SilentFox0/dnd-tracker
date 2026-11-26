function browserOf(ua: string): string {
    if (ua.includes('Edg/')) return 'Edge';

    if (ua.includes('OPR/')) return 'Opera';

    if (ua.includes('Chrome')) return 'Chrome';

    if (ua.includes('Firefox')) return 'Firefox';

    if (ua.includes('Safari')) return 'Safari';

    return 'Other';
}

function osOf(ua: string): string {
    if (/iPhone|iPad/.test(ua)) return 'iOS';

    if (ua.includes('Android')) return 'Android';

    if (ua.includes('Windows')) return 'Windows';

    if (ua.includes('Mac OS X')) return 'macOS';

    if (ua.includes('Linux')) return 'Linux';

    return 'Other';
}

export function parseDevice(ua: string | null): string | null {
    if (!ua) return null;

    return `${browserOf(ua)} · ${osOf(ua)}`;
}
