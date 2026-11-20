#!/usr/bin/env node
/* 可编辑性体检（references/editable.md）：动效入库前，按剪辑台的编辑方式“动一动”，看会不会错位、断开、出框。
   用法：node editcheck.mjs <工程目录> <文字加长版工程目录> <动效 id> <检查时刻秒> [--json 输出.json]
   查四件事（编号对应 references/editable.md 的十条规则）：
     第 1 条 连线 / 箭头：两端贴着别的元素时必须用 DMS.link 画；DMS.link 画的线，把终点元素挪开 120px 后线还得接在它身上
     第 2 条 附着装饰：圈注、高亮框、光环、光标、角标这类装饰压在某个元素上，就得是那个元素的子元素（或写 data-attach），否则那个元素一挪它就掉队
     第 4 条 文字变长：所有文字参数加长 60% 重建后，不能冲出画面、冲出自己的卡片、被裁掉
     第 5 条 文字变长后不能和别的文字互相压住
   输出 issues：level = error（必须改）/ warn（建议改） */
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

/* ---------- 在页面里跑：结构检查（连线、附着装饰、DMS.link 跟随） ---------- */
const STRUCT = (ID, T) => {
  const host = document.getElementById('stage'); const root = host.querySelector('.dms-layer[data-c="' + ID + '"]');
  if (!root) return { err: '画面里找不到图层 ' + ID };
  const hr = host.getBoundingClientRect(); const out = [];
  const R = el => { const r = el.getBoundingClientRect(); return { x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height }; };
  const own = el => [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
  const name = el => ((el.getAttribute('class') || '').trim().split(/\s+/)[0] || el.tagName.toLowerCase());
  const inLink = el => !!el.closest('svg.dms-link');
  const all = [...root.querySelectorAll('*')];
  const vis = el => { const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.02; };
  const blocks = all.filter(el => { if (inLink(el) || !vis(el)) return false; const c = getComputedStyle(el), r = R(el); if (r.w < 20 || r.h < 14) return false;
    return own(el) || (c.backgroundColor && !/,\s*0\)$|transparent/.test(c.backgroundColor)) || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0 || /^(img|svg)$/i.test(el.tagName); });
  const near = (el, x, y) => blocks.find(b => b !== el && !b.contains(el) && !el.contains(b) && (() => { const r = R(b); return x > r.x - 36 && x < r.x + r.w + 36 && y > r.y - 36 && y < r.y + r.h + 36; })());
  // 1 手画的连线（不是 DMS.link）
  all.forEach(el => {
    if (inLink(el)) return;
    const t = el.tagName.toLowerCase(); let ends = null;
    if (/^(path|line|polyline)$/.test(t) && el.getTotalLength) {
      const svg = el.ownerSVGElement; if (!svg) return; const sr = R(svg); if (Math.max(sr.w, sr.h) < 80) return;
      try { const L = el.getTotalLength(); if (L < 40) return; const m = el.getScreenCTM(); const pt = q => { const p = el.getPointAtLength(q); const P = new DOMPoint(p.x, p.y).matrixTransform(m); return [P.x - hr.left, P.y - hr.top]; }; ends = [pt(0), pt(L)]; } catch (e) { return; }
    } else if (!(el instanceof SVGElement)) {
      const r = R(el), thin = Math.min(r.w, r.h), long = Math.max(r.w, r.h);
      if (own(el) || el.children.length || !(thin > 0 && thin <= 8 && long >= 40 && long / thin >= 6)) return;
      ends = r.w >= r.h ? [[r.x, r.y + r.h / 2], [r.x + r.w, r.y + r.h / 2]] : [[r.x + r.w / 2, r.y], [r.x + r.w / 2, r.y + r.h]];
    } else return;
    const e1 = near(el, ...ends[0]), e2 = near(el, ...ends[1]);
    if (e1 || e2) out.push({ level: 'error', rule: 1, what: `手画的连线 / 箭头（${name(el)}）接在「${((e1 || e2).textContent || '').trim().slice(0, 10) || name(e1 || e2)}」上，那个元素一挪线就断：改用 DMS.link(起点, 终点) 画` });
  });
  // 2 附着装饰
  const content = blocks.filter(b => own(b) || /^(img|svg)$/i.test(b.tagName));
  all.forEach(el => {
    if (inLink(el) || el.closest('[data-attach]')) return;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') return;
    const c = getComputedStyle(el); if (!vis(el) || !/absolute|fixed/.test(c.position) || el.textContent.trim()) return;
    const r = R(el); if (r.w < 8 || r.h < 8 || r.w * r.h > 1920 * 1080 * 0.4) return;
    const hit = content.find(b => { if (b.contains(el) || el.contains(b)) return false; const q = R(b); const ix = Math.max(0, Math.min(r.x + r.w, q.x + q.w) - Math.max(r.x, q.x)), iy = Math.max(0, Math.min(r.y + r.h, q.y + q.h) - Math.max(r.y, q.y)); return ix * iy > 0.25 * Math.min(r.w * r.h, q.w * q.h); });
    if (hit) out.push({ level: 'warn', rule: 2, what: `装饰（${name(el)}）压在「${(hit.textContent || '').trim().slice(0, 10) || name(hit)}」上但不是它的子元素：放进那个元素里，或在装饰上写 data-attach（说明它跟谁走）` });
  });
  // 1b DMS.link 跟随测试：把终点元素挪开，重画一帧，线头还得接在它身上
  const links = [...root.querySelectorAll('svg.dms-link')];
  const res = [];
  links.forEach((svg, i) => {
    const ends = svg._dmsEnds; if (!ends) return;
    const b = ends[1], p = svg.querySelector('path'); const old = b.style.translate;
    b.style.setProperty('translate', '120px 70px', 'important');
    DMS.renderAt(T);
    const L = p.getTotalLength(), m = p.getScreenCTM(), e = p.getPointAtLength(L), P = new DOMPoint(e.x, e.y).matrixTransform(m);
    const r = b.getBoundingClientRect(), gap = 40;
    const ok = P.x > r.left - gap && P.x < r.right + gap && P.y > r.top - gap && P.y < r.bottom + gap;
    if (!ok) out.push({ level: 'error', rule: 1, what: `第 ${i + 1} 条 DMS.link 连线：终点元素挪开后线没跟上（检查 update 里每帧都调用了 ln.update）` });
    res.push(ok);
    b.style.translate = old; DMS.renderAt(T);
  });
  return { issues: out, links: links.length, linkOk: res.filter(Boolean).length };
};

/* ---------- 文字测量（两版工程各量一次，比出“加长后才出现”的问题） ---------- */
const MEAS = (ID) => {
  const host = document.getElementById('stage'); const L = host.querySelector('.dms-layer[data-c="' + ID + '"]'); if (!L) return null;
  const hr = host.getBoundingClientRect(); const out = { K: [], T: [] };
  const R = r => ({ x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height });
  const W = document.createTreeWalker(L, NodeFilter.SHOW_TEXT);
  const clipAnc = el => { for (let p = el; p && p !== L; p = p.parentElement) { const c = getComputedStyle(p); if (/hidden|clip/.test(c.overflow + c.overflowX + c.overflowY)) return p; } return null; };
  const cw = host.offsetWidth || 1920, ch = host.offsetHeight || 1080;
  for (let n; (n = W.nextNode());) {
    if (!n.nodeValue.trim() || n.parentElement.closest('.wall,svg.dms-link')) continue;
    const el = n.parentElement, cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const r = R(rg.getBoundingClientRect()); if (!r.w) continue;
    const key = n.nodeValue.replace(/(加长文字测试)*(加长文字测|加长文字|加长文|加长|加)?$/, '').replace(/x{2,}$/, '').trim().slice(0, 10);
    out.T.push([key, r]);
    const a = clipAnc(el); if (a) { const q = R(a.getBoundingClientRect()); if (r.x + r.w > q.x + q.w + 2 || r.y + r.h > q.y + q.h + 2) out.K.push('被裁掉：' + key); }
    if (r.x < -2 || r.x + r.w > cw + 2 || r.y + r.h > ch + 2 || r.y < -2) out.K.push('冲出画面：' + key);
    for (let p = el.parentElement; p && p !== L; p = p.parentElement) { const pc = getComputedStyle(p); if ((pc.backgroundColor && !/,\s*0\)$|transparent/.test(pc.backgroundColor)) || parseFloat(pc.borderTopWidth) > 0) { const q = R(p.getBoundingClientRect()); if (r.x + r.w > q.x + q.w + 4 || r.y + r.h > q.y + q.h + 4) out.K.push('冲出卡片：' + key); break; } }
  }
  return out;
};

async function main() {
  const [proj, proj2, id, tArg] = process.argv.slice(2);
  const jo = process.argv.indexOf('--json'); const jsonOut = jo > 0 ? process.argv[jo + 1] : null;
  if (!proj || !proj2 || !id) { console.error('用法：node editcheck.mjs <工程> <加长版工程> <动效id> <时刻>'); process.exit(2); }
  const t = +tArg || 2;
  const pw = loadPlaywright(), exe = findBrowser();
  const launch = { args: ['--allow-file-access-from-files', '--disable-web-security'] };
  let browser; try { browser = await pw.chromium.launch(Object.assign({}, launch, exe ? { executablePath: exe } : {})); } catch (e) { browser = await pw.chromium.launch(launch); }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1140 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const open = async dir => { await page.goto(pathToFileURL(path.join(dir, 'index.html')).href); await page.waitForFunction(() => window.DMS && window.TIMELINE, null, { timeout: 20000 }); await page.waitForTimeout(800); await page.evaluate(async tt => { await DMS.renderAt(tt); }, t); await page.waitForTimeout(150); };
  await open(proj);
  const S = await page.evaluate(`(${STRUCT})(${JSON.stringify(id)}, ${t})`);
  const A = await page.evaluate(`(${MEAS})(${JSON.stringify(id)})`);
  await open(proj2);
  const B = await page.evaluate(`(${MEAS})(${JSON.stringify(id)})`);
  await browser.close();
  const issues = (S && S.issues) || [];
  if (S && S.err) issues.push({ level: 'error', rule: 0, what: S.err });
  if (A && B) {
    B.K.filter(x => !A.K.includes(x)).filter((x, i, a) => a.indexOf(x) === i).forEach(x => issues.push({ level: 'error', rule: 4, what: '文字加长 60% 后' + x + '（用 DMS.fitText 自动缩字、或让卡片跟着文字长高 / 变宽）' }));
    const ov = (p, q) => p.x < q.x + q.w - 2 && p.x + p.w > q.x + 2 && p.y < q.y + q.h - 2 && p.y + p.h > q.y + 2;
    const base = new Set(); A.T.forEach((a, i) => A.T.slice(i + 1).forEach(b => { if (ov(a[1], b[1])) base.add(a[0] + '|' + b[0]); }));
    const seen = new Set();
    B.T.forEach((a, i) => B.T.slice(i + 1).forEach(b => { const k = a[0] + '|' + b[0]; if (a[0] !== b[0] && ov(a[1], b[1]) && !base.has(k) && !seen.has(k)) { seen.add(k); issues.push({ level: 'error', rule: 5, what: `文字加长后「${a[0]}」和「${b[0]}」压在一起（用 flex / grid 排版让它们互相让位，不要各自写死坐标）` }); } }));
  }
  errs.forEach(e => issues.push({ level: 'error', rule: 0, what: '页面报错：' + e.slice(0, 160) }));
  const rep = { id, t, links: S && S.links || 0, linkOk: S && S.linkOk || 0, issues };
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep));
}
main().catch(e => { console.error(e); process.exit(1); });
