#!/usr/bin/env node
/* 封面截图：node cover.mjs <工作目录(含 cover.html + data.js)> <输出目录>
   三种风格 × 竖屏 3:4（1080×1440）/ 横屏 4:3（1440×1080），PNG。浏览器查找方式同 render.mjs。 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
function loadPlaywright() {
  for (const t of ['playwright', 'playwright-core', path.join(here, '..', 'node_modules', 'playwright-core'), path.join(here, '..', 'node_modules', 'playwright')]) { try { return req(t); } catch (e) { } }
  throw new Error('找不到 playwright / playwright-core。请在技能目录运行：npm install playwright-core');
}
function findBrowser() {
  if (process.env.DMS_CHROME && fs.existsSync(process.env.DMS_CHROME)) return process.env.DMS_CHROME;
  const c = [];
  if (process.platform === 'win32') {
    [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']].filter(Boolean).forEach(p => { c.push(path.join(p, 'Google/Chrome/Application/chrome.exe')); c.push(path.join(p, 'Microsoft/Edge/Application/msedge.exe')); });
  } else if (process.platform === 'darwin') c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  else c.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge');
  return c.find(p => fs.existsSync(p)) || null;
}
const [wk, out] = process.argv.slice(2).map(p => path.resolve(p));
const names = { A: '手账贴纸风', B: '科技海报风', C: '电影海报风' };
const pw = loadPlaywright(), exe = findBrowser();
const launch = { args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none', '--force-color-profile=srgb'] };
let b;
try { b = await pw.chromium.launch(Object.assign({}, launch, exe && process.env.DMS_USE_SYSTEM !== '0' ? { executablePath: exe } : {})); }
catch (e) { b = await pw.chromium.launch(launch); }
fs.mkdirSync(out, { recursive: true });
let errs = 0;
// v1.17：jobs.json 列出要出的每一套（模板 A/B/C 的子集 + 自定义封面），每套出竖屏 3:4 + 横屏 4:3
const jf = path.join(wk, 'jobs.json');
const jobs = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : ['A', 'B', 'C'].map(s => ({ page: 'cover.html', q: `s=${s}`, name: `封面_${s}_${names[s]}` }));
for (const j of jobs) for (const [w, h, tag] of [[1080, 1440, '竖屏3比4'], [1440, 1080, '横屏4比3']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => { errs++; console.error('[page]', j.name, tag, e.message); });
  await p.goto(pathToFileURL(path.join(wk, j.page)).href + `?${j.q}&w=${w}&h=${h}`);
  await p.waitForFunction(() => window.__coverReady === true, null, { timeout: 30000 });
  const low = await p.evaluate(() => window.__coverContrast || []);
  if (low.length) console.log(`[对比度] ${j.name} ${tag} 还有 ${low.length} 处偏低：` + low.join('；'));
  const iss = await p.evaluate(() => window.__coverIssues || []);
  if (iss.length) console.log(`[排版] ${j.name} ${tag}：` + iss.join('；'));
  await p.screenshot({ path: path.join(out, `${j.name}_${tag}.png`), clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
}
await b.close();
if (errs) process.exit(1);
console.log('ok');
