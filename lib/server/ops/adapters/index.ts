import { cloudflareAdapter } from './cloudflare';
import { pusherAdapter } from './pusher';
import type { ProviderAdapter } from './types';

export type { ProviderAdapter } from './types';

export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
    cloudflareAdapter,
    pusherAdapter,
];
