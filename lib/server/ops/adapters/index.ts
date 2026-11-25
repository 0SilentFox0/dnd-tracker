import { cloudflareAdapter } from './cloudflare';
import { pusherAdapter } from './pusher';
import { supabaseAdapter } from './supabase';
import type { ProviderAdapter } from './types';
import { upstashAdapter } from './upstash';
import { vercelAdapter } from './vercel';

export type { ProviderAdapter } from './types';

export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
    cloudflareAdapter,
    pusherAdapter,
    supabaseAdapter,
    upstashAdapter,
    vercelAdapter,
];
