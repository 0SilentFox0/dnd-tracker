import { readFileSync } from 'node:fs';

const REF = process.env.SUPABASE_PROJECT_REF ?? 'mpvcaxsukbwzgrbvzmjj';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required');

const dir = new URL('../../supabase/email-templates/', import.meta.url);
const subjects = JSON.parse(
    readFileSync(new URL('subjects.json', dir), 'utf8')
);

const body = {};

for (const [key, subject] of Object.entries(subjects)) {
    body[`mailer_subjects_${key}`] = subject;
    body[`mailer_templates_${key}_content`] = readFileSync(
        new URL(`${key}.html`, dir),
        'utf8'
    );
}

const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/config/auth`,
    {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }
);

console.log(res.status, res.ok ? 'updated' : await res.text());
