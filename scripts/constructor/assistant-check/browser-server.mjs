import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import * as esbuild from 'esbuild';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw Error('Expected an absolute fresh output directory');

const manifestPath = process.argv.find((arg, index) => index > 2 && !arg.startsWith('--') && path.isAbsolute(arg));
// Crash recovery reads these pids; the parent is the only other writer and is idle while the server builds.
const recordPids = pids => {
  if (!manifestPath) return;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.pids = { ...manifest.pids, ...pids };
  writeFileSync(`${manifestPath}.${process.pid}.tmp`, JSON.stringify(manifest, null, 2));
  renameSync(`${manifestPath}.${process.pid}.tmp`, manifestPath);
};

let chrome;
let server;
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  server?.close();
  if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = once(chrome, 'exit');
    chrome.kill('SIGTERM');
    const timer = setTimeout(() => chrome.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timer);
  }
  process.exit(code);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
// Parent crash/exit must not leave Chrome running.
process.on('disconnect', stop);

try {
  await esbuild.build({
    entryPoints: [path.join(sourceDir, 'browser-app.tsx')], outfile: path.join(output, 'bundle.js'),
    bundle: true, format: 'esm', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    alias: { '@': process.cwd() },
    plugins: [{ name: 'next-browser-stubs', setup(build) {
      build.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'next-stub' }));
      build.onLoad({ filter: /.*/, namespace: 'next-stub' }, args => ({
        contents: args.path === 'next/navigation'
          ? `export const useRouter=()=>({push:()=>{},refresh:()=>{}});export const usePathname=()=>'/';export const useSearchParams=()=>new URLSearchParams(location.search);`
          : `import React from 'react'; export default function Link({children,href,...props}){return React.createElement('a',{href,...props},children);}`,
        loader: 'js', resolveDir: process.cwd(),
      }));
    } }],
  });
  // Compile the tracked stylesheet directly; no previous Next build is required.
  const css = await postcss([tailwindcss()]).process(readFileSync('app/globals.css', 'utf8'), { from: path.resolve('app/globals.css') });
  writeFileSync(path.join(output, 'style.css'), css.css);
  if (process.argv.includes('--bundle-only')) process.exit(0);

  server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const asset = pathname === '/bundle.js' ? ['bundle.js', 'text/javascript'] : pathname === '/style.css' ? ['style.css', 'text/css'] : null;
    if (asset) {
      res.setHeader('Content-Type', asset[1]);
      res.end(readFileSync(path.join(output, asset[0])));
    } else if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<html lang="uk"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = path.join(output, 'chrome-profile');
  chrome = spawn(process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', 'about:blank',
  ], { stdio: 'ignore' });
  chrome.on('error', () => { void stop(1); });
  chrome.on('exit', () => { if (!stopping) void stop(1); });
  recordPids({ server: process.pid, chrome: chrome.pid });
  const metadata = { pid: process.pid, chrome: chrome.pid, origin };
  writeFileSync(path.join(output, 'process.json'), JSON.stringify(metadata));
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (chrome.exitCode !== null || chrome.signalCode !== null) throw Error('Owned Chrome exited before readiness');
    try {
      const cdpPort = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (Number.isInteger(cdpPort) && cdpPort > 0) {
        const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        if (response.ok) {
          writeFileSync(path.join(output, 'process.json'), JSON.stringify({ ...metadata, cdpPort, ready: true }));
          break;
        }
      }
    } catch { /* Only inspect this run's fresh profile. */ }
    if (attempt === 149) throw Error('Owned Chrome readiness timed out');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
} catch {
  process.stderr.write('ASSISTANT_BROWSER_SERVER_FAILED\n');
  await stop(1);
}
