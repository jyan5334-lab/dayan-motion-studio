#!/usr/bin/env node
/* 大琰DAYAN Motion Studio — 逐帧渲染器
   用法：
     node render.mjs <工程目录> <输出.mp4> [--fps 60] [--from 0] [--to 末尾] [--audio mix.wav] [--workers 2] [--crf 16] [--preset medium]
     node render.mjs <工程目录> --stills 0.5,3,8 [--outdir stills]       抽静帧（PNG）
     node render.mjs <工程目录> --sweep 0.0333 [--from 0] [--to 末尾]      逐帧试跑查页面报错（不截图）
     node render.mjs <工程目录> --cues sfx_cues.json                       导出音效事件
     node render.mjs <工程目录> 动效层.mov --alpha                          透明动效层（.mov = ProRes 4444，.webm = VP9 透明）
   浏览器：优先 DMS_CHROME 环境变量，其次 Playwright 自带 Chromium，再找系统 Chrome / Edge。 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
function loadPlaywright() {
  const tries = ['playwright', 'playwright-core', path.join(here, '..', 'node_modules', 'playwright-core'), path.join(here, '..', 'node_modules', 'playwright')];
  for (const t of tries) { try { return req(t); } catch (e) { } }
  try { const g = spawn('npm', ['root', '-g'], { shell: true }); } catch (e) { }
  throw new Error('找不到 playwright / playwright-core。请在技能目录运行：npm install playwright-core');
}
function findBrowser() {
  if (process.env.DMS_CHROME && fs.existsSync(process.env.DMS_CHROME)) return process.env.DMS_CHROME;
  const c = [];
  if (process.platform === 'win32') {
    const pf = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']].filter(Boolean);
    pf.forEach(p => { c.push(path.join(p, 'Google/Chrome/Application/chrome.exe')); c.push(path.join(p, 'Microsoft/Edge/Application/msedge.exe')); });
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else c.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge');
  return c.find(p => fs.existsSync(p)) || null;
}
function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; o[k] = v; } else o._.push(a[i]); }
  return o;
}
const A = args();
const proj = path.resolve(A._[0] || '.');
const FF = process.env.FFMPEG || 'ffmpeg';
const tl = JSON.parse(fs.readFileSync(path.join(proj, 'timeline.json'), 'utf8'));
const W = tl.canvas.w, H = tl.canvas.h, FPS = +(A.fps || tl.canvas.fps || 60);
const DUR = tl.duration;

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(A.scale || 1) });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[page]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.route(/^https?:/, r => r.abort());
  await page.goto(pathToFileURL(path.join(proj, 'index.html')).href + '?render=1' + (A.alpha ? '&alpha=1' : ''));
  await page.waitForFunction(() => window.__dmsReady === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => DMS.renderAt(0));
  return page;
}
/* 每帧：设置时间 → 等图片解码与字体 → 等两次绘制，保证截到的是已上屏的画面（首帧也不会漏字） */
const warmed = new WeakSet();
const frameAt = async (page, t) => { if (!warmed.has(page)) { warmed.add(page); await frameAt(page, t); await new Promise(r => setTimeout(r, 300)); } await page.evaluate(tt => DMS.renderAt(tt).then(() => document.fonts.ready).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => 1), t); };

async function main() {
  const pw = loadPlaywright();
  const exe = findBrowser();
  const launch = { args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] };
  let browser;
  try { browser = await pw.chromium.launch(Object.assign({}, launch, exe && process.env.DMS_USE_SYSTEM !== '0' ? { executablePath: exe } : {})); }
  catch (e) { browser = await pw.chromium.launch(launch); }

  if (A.cues) {
    const page = await openPage(browser);
    const cues = await page.evaluate(() => DMS.collectSfx());
    fs.writeFileSync(path.resolve(proj, A.cues === true ? 'sfx_cues.json' : A.cues), JSON.stringify(cues, null, 1));
    console.log('cues', cues.length); await browser.close(); return;
  }
  if (A.sweep) {   // 逐帧试跑：不截图，只按步长把时间轴跑一遍，页面报错会打印 [page]/[console]（抽几帧看不到的瞬时错误靠它抓）
    const page = await openPage(browser); const step = +A.sweep > 0 ? +A.sweep : 1 / 30;
    const f0 = +(A.from || 0), f1 = +(A.to || DUR); let n = 0;
    for (let t = f0; t <= f1 + 1e-6; t += step) { await page.evaluate(tt => DMS.renderAt(tt), +t.toFixed(4)); n++; }
    const ov = await page.evaluate(() => DMS.overflowCheck ? DMS.overflowCheck() : []);
    ov.forEach(o => console.log(`[overflow:${o.level}] ${o.scene} ${o.c} @${o.t}s「${o.text}」${o.why} ${o.px}px`));
    console.log('sweep', n, 'frames'); await browser.close(); return;
  }
  if (A.stills) {
    const page = await openPage(browser);
    const outdir = path.resolve(proj, A.outdir || 'stills'); fs.mkdirSync(outdir, { recursive: true });
    for (const s of String(A.stills).split(',').map(Number)) { await frameAt(page, s); await page.screenshot({ path: path.join(outdir, `t${s.toFixed(2)}.png`) }); }
    console.log('stills ->', outdir); await browser.close(); return;
  }

  const out = path.resolve(A._[1] || path.join(proj, 'render.mp4'));
  const f0 = Math.round(+(A.from || 0) * FPS), f1 = Math.round(+(A.to || DUR) * FPS);
  const N = f1 - f0, workers = Math.max(1, Math.min(+(A.workers || Math.max(1, Math.floor(os.cpus().length / 2))), 8));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-'));
  const crf = String(A.crf || 16), preset = String(A.preset || 'medium');
  const seg = Math.ceil(N / workers), parts = [];
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = f0 + w * seg, b = Math.min(f1, a + seg); if (a >= b) return;
    const ext = A.alpha ? (out.toLowerCase().endsWith('.webm') ? '.webm' : '.mov') : '.mp4';
    const part = path.join(tmp, `part${w}${ext}`); parts[w] = part;
    const page = await openPage(browser);
    const enc = !A.alpha ? ['-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p']
      : ext === '.webm' ? ['-c:v', 'png', '-i', '-', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '28', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0']
      : ['-c:v', 'png', '-i', '-', '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', '-qscale:v', '11'];
    const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), ...enc, '-r', String(FPS), part], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      await frameAt(page, f / FPS);
      const buf = A.alpha ? await page.screenshot({ type: 'png', omitBackground: true }) : await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      done++;
      if (done % (FPS * 2) === 0) { const el = (Date.now() - t0) / 1000; process.stdout.write(`\r渲染 ${done}/${N} 帧  ${(done / el).toFixed(1)} fps  剩余≈${((N - done) / (done / el)).toFixed(0)}s   `); }
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await page.close();
  }));
  await browser.close();
  const list = path.join(tmp, 'list.txt'); fs.writeFileSync(list, parts.filter(Boolean).map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const audio = A.audio ? path.resolve(proj, A.audio) : null;
  const mux = ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list];
  if (A.alpha) mux.push('-c', 'copy', out);
  else if (audio && fs.existsSync(audio)) mux.push('-ss', String(f0 / FPS), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(N / FPS), '-movflags', '+faststart', out);
  else mux.push('-c', 'copy', '-movflags', '+faststart', out);
  await new Promise((res, rej) => { const p = spawn(FF, mux, { stdio: 'inherit' }); p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg mux failed')))); });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n完成 ${out}  ${N} 帧 ${(N / FPS).toFixed(2)}s  用时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
main().catch(e => { console.error(e); process.exit(1); });
