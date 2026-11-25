import { api, login, users } from './lib.js';

const campaignId = users.campaignId;
const BATTLE_ID = __ENV.BATTLE_ID;
const PATHS = ['', '/characters', '/units', '/spells', '/races', '/classes', '/feats', '/backgrounds', '/members', '/battles?brief=1', '/notifications'];

export const options = { vus: 1, iterations: 1 };

const size = (v) => (v === undefined ? 0 : JSON.stringify(v).length);

export default function () {
    const cookie = login(users.users[0]);
    const rows = [];
    for (const p of PATHS) {
        const r = api(cookie, 'GET', `/campaigns/${campaignId}${p}`);
        rows.push(`open${p || '/campaign'}: ${r.body.length} B (${r.headers['Content-Encoding'] || 'identity'})`);
    }
    console.log(rows.join('\n'));
    if (!BATTLE_ID) return;
    const scene = api(cookie, 'GET', `/campaigns/${campaignId}/battles/${BATTLE_ID}`).json();
    const out = [`scene total: ${size(scene)} B`];
    for (const k of Object.keys(scene)) out.push(`  ${k}: ${size(scene[k])} B`);
    const order = scene.initiativeOrder || [];
    out.push(`participants: ${order.length}`);
    const sample = order[0] || {};
    for (const k of Object.keys(sample)) {
        const total = order.reduce((s, p) => s + size(p[k]), 0);
        out.push(`  participant.${k}: ${total} B`);
        if (total > 4000 && sample[k] && typeof sample[k] === 'object')
            for (const kk of Object.keys(sample[k])) {
                const t = order.reduce((s, p) => s + size((p[k] || {})[kk]), 0);
                if (t > 1500) out.push(`    ${k}.${kk}: ${t} B`);
            }
    }
    console.log(out.join('\n'));
}
