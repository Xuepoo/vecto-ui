/**
 * VectoJS (single canvas) vs traditional DOM — CPU & memory comparison.
 *
 * Spins up the demo Vite dev server, drives `compare.html` in headless Chrome for
 * both modes across several N, and reads authoritative browser-side metrics via
 * the CDP `Performance` domain (Nodes, JSHeapUsedSize, LayoutCount/Duration,
 * RecalcStyleDuration, ScriptDuration). The workload animates N text labels
 * (text + position mutated every frame).
 *
 * Usage: bun run scripts/compare-dom.ts [--n=500,2000,5000] [--frames=120]
 */
import { execSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('=') as [string, string]),
);
const COUNTS = (args.get('n') ?? '500,2000,5000').split(',').map(Number);
const FRAMES = Number(args.get('frames') ?? 120);
const MODES = ['dom', 'vecto'] as const;
const WORKS = (args.get('work') ?? 'move,text').split(',');

function loadPlaywright() {
  const pkgDir = dirname(execSync('readlink -f "$(which playwright)"').toString().trim());
  return createRequire(join(pkgDir, 'package.json'))(pkgDir) as typeof import('playwright');
}
function chromePath(): string {
  return execSync('readlink -f "$(which google-chrome-stable)"').toString().trim();
}
async function waitForServer(url: string, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Vite dev server did not start within ${timeoutMs}ms`);
}

type Row = {
  mode: string;
  work: string;
  n: number;
  domNodes: number;
  heapMB: number | null;
  meanFrameMs: number;
  fps: number;
  cdpNodes: number;
  layoutCount: number;
  layoutMs: number;
  recalcMs: number;
  scriptMs: number;
};

async function main() {
  const demoDir = join(dirname(new URL(import.meta.url).pathname), '..', 'apps', 'demo');
  const vite = spawn('node_modules/.bin/vite', ['--port', '5179'], {
    cwd: demoDir,
    stdio: 'ignore',
  });
  const base = 'http://localhost:5179';
  await waitForServer(base + '/');

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath(),
    args: ['--no-sandbox', '--enable-precise-memory-info'],
  });

  const results: Row[] = [];
  try {
    for (const work of WORKS) {
      for (const mode of MODES) {
        for (const n of COUNTS) {
          const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Performance.enable');

          await page.goto(
            `${base}/compare.html?mode=${mode}&n=${n}&frames=${FRAMES}&work=${work}`,
            {
              waitUntil: 'load',
            },
          );
          await page.waitForFunction(() => (window as { __READY__?: boolean }).__READY__, {
            timeout: 30_000,
          });

          const before = await cdp.send('Performance.getMetrics');
          await page.waitForFunction(
            () => (window as { __COMPARE_DONE__?: boolean }).__COMPARE_DONE__,
            { timeout: 120_000 },
          );
          const after = await cdp.send('Performance.getMetrics');

          const m = (snap: { metrics: { name: string; value: number }[] }, name: string) =>
            snap.metrics.find((x) => x.name === name)?.value ?? 0;
          const delta = (name: string) => m(after, name) - m(before, name);

          const r = (await page.evaluate(
            () => (window as { __COMPARE__?: unknown }).__COMPARE__,
          )) as Omit<Row, 'cdpNodes' | 'layoutCount' | 'layoutMs' | 'recalcMs' | 'scriptMs'>;

          results.push({
            ...r,
            cdpNodes: Math.round(m(after, 'Nodes')),
            layoutCount: Math.round(delta('LayoutCount')),
            layoutMs: Number((delta('LayoutDuration') * 1000).toFixed(1)),
            recalcMs: Number((delta('RecalcStyleDuration') * 1000).toFixed(1)),
            scriptMs: Number((delta('ScriptDuration') * 1000).toFixed(1)),
          });
          console.log(
            `${work.padEnd(4)} ${mode.padEnd(5)} n=${String(n).padStart(5)}  ${r.meanFrameMs.toFixed(2)}ms/frame  nodes=${Math.round(m(after, 'Nodes'))}  layout=${delta('LayoutCount')}  layoutMs=${(delta('LayoutDuration') * 1000).toFixed(0)}  recalcMs=${(delta('RecalcStyleDuration') * 1000).toFixed(0)}  scriptMs=${(delta('ScriptDuration') * 1000).toFixed(0)}`,
          );
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    vite.kill();
  }

  const table = [
    '',
    '| Work | Mode | N | ms/frame | FPS | DOM nodes | Layout count | Layout ms | Recalc ms | Script ms |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.work} | ${r.mode} | ${r.n} | ${r.meanFrameMs} | ${r.fps} | ${r.cdpNodes} | ${r.layoutCount} | ${r.layoutMs} | ${r.recalcMs} | ${r.scriptMs} |`,
    ),
  ].join('\n');
  console.log(table);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
