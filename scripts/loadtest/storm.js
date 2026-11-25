import { check, sleep } from 'k6';

import { api, login, users } from './lib.js';

const campaignId = users.campaignId;
const PATHS = [
    '',
    '/characters',
    '/units',
    '/spells',
    '/races',
    '/classes',
    '/feats',
    '/backgrounds',
    '/members',
    '/battles?brief=1',
    '/notifications',
];

export const options = {
    scenarios: {
        storm: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: Number(__ENV.VUS || 100) },
                { duration: __ENV.HOLD || '2m', target: Number(__ENV.VUS || 100) },
                { duration: '15s', target: 0 },
            ],
        },
    },
    thresholds: { http_req_failed: ['rate<0.05'] },
    summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
    return { cookies: users.users.map((u) => login(u)) };
}

export default function (data) {
    const cookie = data.cookies[__VU % data.cookies.length];
    for (const p of PATHS) {
        const r = api(cookie, 'GET', `/campaigns/${campaignId}${p}`, null, { name: `open${p || '/campaign'}` });
        check(r, { ok: (x) => x.status === 200 });
    }
    sleep(1 + Math.random() * 3);
}
