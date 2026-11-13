#!/usr/bin/env node
/* 看一张原卡：node card.mjs <卡号> <输出目录> [replace.json]
   在 1920×1080 舞台里挂载原卡，截 3 帧（入场中 / 落定 / 后段）拼成一张图，并列出卡里全部可见文字（文字墙除外），
   这些文字都是样板，按本期口播用 replace 换掉。 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), req = createRequire(import.meta.url);
function loadPlaywright() { for (const t of ['playwright', 'playwright-core', path.join(here, '..', 'node_modules', 'playwright-core')]) { try { return req(t); } catch (e) { } } throw new Error('找不到 playwright-core：在技能目录运行 npm install'); }
function findBrowser() {
  if (process.env.DMS_CHROME && fs.existsSync(process.env.DMS_CHROME)) return process.env.DMS_CHROME;
  const c = []; if (process.platform === 'win32') [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']].filter(Boolean).forEach(p => { c.push(path.join(p, 'Google/Chrome/Application/chrome.exe')); c.push(path.join(p, 'Microsoft/Edge/Application/msedge.exe')); });
  else if (process.platform === 'darwin') c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  else c.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  return c.find(p => fs.existsSync(p)) || null;
}
const [id, outDir, repFile] = process.argv.slice(2);
const lib = path.join(here, '..', 'assets', 'dayan-library.html');
const replace = repFile && fs.existsSync(repFile) ? JSON.parse(fs.readFileSync(repFile, 'utf8')) : null;
fs.mkdirSync(outDir, { recursive: true });
const wrap = path.join(outDir, '_card.html');
fs.writeFileSync(wrap, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#000}iframe{border:0;width:1920px;height:1080px}</style>
<iframe id="f" src="${pathToFileURL(lib).href}?embed=1"></iframe><script>
const f=document.getElementById('f');let n=0,w={};window.addEventListener('message',e=>{const m=e.data;if(!m||m.vs!==1)return;if(m.event==='ready')window.__ready=true;if(m.rid&&w[m.rid]){w[m.rid](m);delete w[m.rid];}});
window.call=msg=>new Promise(r=>{const rid='c'+(++n);w[rid]=r;f.contentWindow.postMessage(Object.assign({vs:1,rid},msg),'*');setTimeout(()=>r({timeout:true}),5000);});
</script>`);
const pw = loadPlaywright(), exe = findBrowser();
const launch = { args: ['--allow-file-access-from-files', '--disable-web-security'] };
let b; try { b = await pw.chromium.launch(Object.assign({}, launch, exe ? { executablePath: exe } : {})); } catch (e) { b = await pw.chromium.launch(launch); }
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(wrap).href); await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const r = await p.evaluate(a => window.call({ cmd: 'mount', id: a.id, replace: a.replace, noTag: true, t: 0 }), { id, replace });
if (!r.ok) { console.error('挂载失败：', r.err || JSON.stringify(r)); await b.close(); process.exit(1); }
const shots = [];
for (const t of [0.5, 1.6, 3.2]) { await p.evaluate(tt => window.call({ cmd: 'seek', t: tt }), t); await p.waitForTimeout(120); const f = path.join(outDir, `_t${t}.png`); await p.screenshot({ path: f }); shots.push(f); }
const texts = await p.frames()[1].evaluate(() => {
  const st = document.querySelector('#vsHost .stage'); if (!st) return [];
  const out = []; const tw = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) { const n = tw.currentNode, t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    if (n.parentElement.closest('.wall,.dwall,.wrow')) continue; const cs = getComputedStyle(n.parentElement); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (!out.includes(t)) out.push(t); }
  return out;
});
await b.close();
console.log(JSON.stringify({ shots, texts }));
