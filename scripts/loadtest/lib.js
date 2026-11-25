import encoding from 'k6/encoding';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export const BASE = __ENV.BASE_URL || 'http://localhost:3200';
const SUPABASE = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const MAX_CHUNK = 3180;

export const users = JSON.parse(open('../../.superpowers/loadtest/users.json'));
export const conflicts = new Counter('battle_conflicts');
export const mutations = new Counter('battle_mutations');

export function login(u) {
    const res = http.post(
        `${SUPABASE}/auth/v1/token?grant_type=password`,
        JSON.stringify({ email: u.email, password: u.password }),
        { headers: { apikey: ANON, 'content-type': 'application/json' } }
    );
    if (res.status !== 200) throw new Error(`login ${u.email}: ${res.status}`);
    const session = res.json();
    const name = `sb-${SUPABASE.replace(/^https?:\/\//, '').split('.')[0]}-auth-token`;
    const value =
        'base64-' + encoding.b64encode(JSON.stringify(session), 'rawurl');
    const cookies = {};
    if (value.length <= MAX_CHUNK) cookies[name] = value;
    else
        for (let i = 0; i * MAX_CHUNK < value.length; i++)
            cookies[`${name}.${i}`] = value.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK);
    return Object.keys(cookies)
        .map((k) => `${k}=${cookies[k]}`)
        .join('; ');
}

export function api(cookie, method, path, body, tags) {
    const params = {
        headers: { cookie, 'content-type': 'application/json', origin: BASE },
        tags: tags || {},
        // 409 = counted as a conflict, 422 = morale gate (handled by the caller)
        responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 409, 422),
    };
    const url = `${BASE}/api${path}`;
    return method === 'GET'
        ? http.get(url, params)
        : http.request(method, url, body ? JSON.stringify(body) : null, params);
}
