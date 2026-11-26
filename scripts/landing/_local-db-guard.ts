const url = process.env.DATABASE_URL ?? '';

const host = (() => {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
})();

if (
    !['localhost', '127.0.0.1', '[::1]'].includes(host) &&
    !process.argv.includes('--allow-remote-db')
)
    throw new Error(
        'refusing to seed: DATABASE_URL is not localhost (pass --allow-remote-db to override)'
    );
