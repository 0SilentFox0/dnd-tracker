import { check, sleep } from 'k6';

import { Counter } from 'k6/metrics';

import { api, login, users } from './lib.js';

const failedTargets = new Counter('copy_failed_targets');

const campaignId = users.campaignId;
const dm = users.users[0];
const COPIERS = Number(__ENV.COPIERS || 4);
const IMPORTERS = Number(__ENV.IMPORTERS || 3);
const ROWS = Number(__ENV.ROWS || 200);
const ITER = Number(__ENV.ITER || 5);

export const options = {
    scenarios: {
        copy: { executor: 'per-vu-iterations', vus: COPIERS, iterations: ITER, maxDuration: '10m', exec: 'copy' },
        imports: { executor: 'per-vu-iterations', vus: IMPORTERS, iterations: ITER, maxDuration: '10m', exec: 'importRows' },
    },
    thresholds: {
        'http_req_duration{name:copy}': ['p(95)>=0'],
        'http_req_duration{name:import}': ['p(95)>=0'],
        'http_req_failed{name:copy}': ['rate>=0'],
        'http_req_failed{name:import}': ['rate>=0'],
        'http_reqs{name:copy,status:200}': ['count>=0'],
        'http_reqs{name:copy,status:503}': ['count>=0'],
        'http_reqs{name:import,status:200}': ['count>=0'],
        'http_reqs{name:import,status:503}': ['count>=0'],
    },
    summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
    const cookie = login(dm);
    const base = `/campaigns/${campaignId}`;
    const ids = (kind) => api(cookie, 'GET', `${base}/${kind}`).json().map((x) => x.id);
    const t = api(cookie, 'GET', `${base}/content-copy?campaignsOnly=1`).json().campaigns;
    if (!t.length) throw new Error('no target campaigns: run seed.ts targets');
    return {
        cookie,
        items: [
            { kind: 'units', ids: ids('units').slice(0, 150) },
            { kind: 'spells', ids: ids('spells').slice(0, 100) },
        ],
        targets: t.map((c) => c.id),
    };
}

export function copy(data) {
    const target = data.targets[(__VU + __ITER) % data.targets.length];
    const res = api(data.cookie, 'POST', `/campaigns/${campaignId}/content-copy`, {
        items: data.items,
        targets: { campaignIds: [target] },
    }, { name: 'copy' });
    if (res.status === 200) {
        const failed = res.json().targets.filter((t) => t.status !== 'ok').length;
        if (failed) failedTargets.add(failed);
    }
    check(res, { 'copy ok or busy': (r) => r.status === 200 || r.status === 503 });
    sleep(1);
}

export function importRows(data) {
    const rows = [];
    for (let i = 0; i < ROWS; i++)
        rows.push({ name: `loadtest-feat-${__VU}-${__ITER}-${i}`, description: 'load test row' });
    const res = api(data.cookie, 'POST', `/campaigns/${campaignId}/content-import/feats`, {
        rows, mode: 'create',
    }, { name: 'import' });
    if (__ITER === 0 && res.status !== 200) console.warn(`import ${res.status} ${String(res.body).slice(0, 300)}`);
    check(res, { 'import ok or busy': (r) => r.status === 200 || r.status === 503 });
    sleep(1);
}
