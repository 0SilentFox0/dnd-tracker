import { check, sleep } from 'k6';
import exec from 'k6/execution';

import { api, conflicts, login, mutations, users } from './lib.js';

const BATTLES = Number(__ENV.BATTLES || 1);
const LOOP_S = Number(__ENV.LOOP_S || 300);
const POLL_S = Number(__ENV.POLL_S || 2);
const campaignId = users.campaignId;
const dm = users.users[0];
const players = users.users.slice(1);

export const options = {
    scenarios: {
        dm: {
            executor: 'shared-iterations',
            vus: BATTLES,
            iterations: BATTLES,
            maxDuration: '30m',
            exec: 'dmLoop',
        },
        players: {
            executor: 'shared-iterations',
            vus: BATTLES * players.length,
            iterations: BATTLES * players.length,
            maxDuration: '30m',
            exec: 'playerLoop',
        },
    },
    thresholds: { http_req_failed: ['rate<0.05'] },
    summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
    const cookie = login(dm);
    const unitsRes = api(cookie, 'GET', `/campaigns/${campaignId}/units`);
    const units = unitsRes.json().map((u) => u.id).slice(0, 4);
    const battles = [];
    for (let i = 0; i < BATTLES; i++) {
        const body = {
            name: `loadtest-${Date.now()}-${i}`,
            participants: [
                ...users.heroIds.map((id) => ({ id, type: 'character', side: 'ally' })),
                ...units.map((id) => ({ id, type: 'unit', side: 'enemy', quantity: 2 })),
            ],
        };
        const c = api(cookie, 'POST', `/campaigns/${campaignId}/battles`, body);
        if (c.status >= 300) throw new Error(`create ${c.status} ${c.body}`);
        const id = c.json().id;
        const s = api(cookie, 'POST', `/campaigns/${campaignId}/battles/${id}/start`, {});
        if (s.status >= 300) throw new Error(`start ${s.status} ${s.body}`);
        battles.push(id);
    }
    return { battles };
}

function turnLoop(cookie, battleId, me, side) {
    const base = `/campaigns/${campaignId}/battles/${battleId}`;
    let lastVersion = -1;
    const end = Date.now() + 1000 * LOOP_S;
    while (Date.now() < end) {
        const v = api(cookie, 'GET', `${base}?versionOnly=1`, null, { name: 'poll' });
        const version = v.status === 200 ? JSON.stringify(v.json()) : lastVersion;
        if (version !== lastVersion) {
            lastVersion = version;
            const r = api(cookie, 'GET', base, null, { name: 'scene' });
            if (r.status === 200) {
                const scene = r.json();
                const order = scene.initiativeOrder || [];
                const cur = order[scene.currentTurnIndex];
                const mine =
                    cur &&
                    (side === 'dm'
                        ? cur.basicInfo.side === 'enemy'
                        : cur.basicInfo.controlledBy === me.id);
                if (mine) {
                    sleep(1 + Math.random() * 2);
                    const foes = order.filter(
                        (p) =>
                            p.basicInfo.side !== cur.basicInfo.side &&
                            p.combatStats.currentHp > 0
                    );
                    const weapon = (cur.battleData.attacks || [])[0];
                    let res;
                    if (foes.length && weapon)
                        res = api(cookie, 'POST', `${base}/attack`, {
                            attackerId: cur.basicInfo.id,
                            targetId: foes[0].basicInfo.id,
                            attackId: weapon.id,
                            serverRoll: true,
                            damageRolls: [4, 3],
                            endTurn: true,
                        }, { name: 'attack' });
                    else res = api(cookie, 'POST', `${base}/next-turn`, {}, { name: 'next-turn' });
                    if (res.status === 422 && String(res.body).includes('moraleLog.rejectFirst')) {
                        api(cookie, 'POST', `${base}/system/morale-check`, {
                            participantId: cur.basicInfo.id,
                            d10Roll: 6,
                        }, { name: 'morale-check' });
                        res = api(cookie, 'POST', `${base}/next-turn`, {}, { name: 'next-turn' });
                    }
                    mutations.add(1);
                    if (res.status === 409) conflicts.add(1);
                    else if (res.status >= 300 && !globalThis.__logged) {
                        globalThis.__logged = true;
                        console.warn(`mutation ${res.status} ${String(res.body).slice(0, 200)}`);
                    }
                    check(res, { 'mutation ok or conflict': (x) => x.status < 300 || x.status === 409 });
                }
            }
        }
        sleep(POLL_S);
    }
}

export function dmLoop(data) {
    const idx = exec.scenario.iterationInTest;
    turnLoop(login(dm), data.battles[idx], dm, 'dm');
}

export function playerLoop(data) {
    const n = exec.scenario.iterationInTest;
    const idx = Math.floor(n / players.length) % BATTLES;
    const me = players[n % players.length];
    turnLoop(login(me), data.battles[idx], me, 'player');
}
