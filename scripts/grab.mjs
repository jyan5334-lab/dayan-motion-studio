// 联网取材：网页真实截图（dms.py grab shot 调用）
//   node grab.mjs <网址> <输出.png> [--w 1440] [--h 900] [--full] [--scroll 0] [--selector css] [--dark] [--wait 1500]
// 打印一行 JSON：{ok, file, title, url, failed:[加载失败的样式/脚本], blank}
// 页面样式没加载全（网络限制、被墙）时 ok=false：截出来的页面不像真网页，不能当真实素材用。
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), req = createRequire(import.meta.url);
function loadPlaywright() {   // 和 render.mjs 一样的找法：本地 / 全局的 playwright 或 playwright-core
  for (const t of ['playwright', 'playwright-core', path.join(here, '..', 'node_modules', 'playwright-core'), path.join(here, '..', 'node_modules', 'playwright')]) { try { return req(t); } catch (e) { } }
  throw new Error('找不到 playwright：在技能目录运行 npm install');
}
const { chromium } = loadPlaywright();

const a = process.argv.slice(2);
const url = a[0], out = a[1];
const opt = k => { const i = a.indexOf('--' + k); return i < 0 ? null : (a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true); };
const W = +(opt('w') || 1440), H = +(opt('h') || 900), wait = +(opt('wait') || 1500);

const browser = await chromium.launch();
// --images：不截图，取页面里的配图（og:image / twitter:image / 正文大图），下载到 out 目录，打印 JSON 列表
if (opt('images')) {
  const outDir = out, n = +(opt('n') || 4), minW = +(opt('min') || 800);
  const res = { ok: false, url, files: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
    const page = await ctx.newPage();
    const isImg = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
    let cands = [];
    if (isImg) cands = [{ src: url, w: 0, why: '图片地址' }];
    else {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1200);
      res.title = await page.title();
      cands = await page.evaluate((minW) => {
        const out = [], seen = new Set(), add = (src, w, why) => { if (!src || src.startsWith('data:')) return; const u = new URL(src, location.href).href; if (seen.has(u)) return; seen.add(u); out.push({ src: u, w, why }); };
        const meta = n => document.querySelector(`meta[property="${n}"],meta[name="${n}"]`);
        if (meta('og:image')) add(meta('og:image').content, 0, '页面封面图 og:image');
        if (meta('twitter:image')) add(meta('twitter:image').content, 0, '页面封面图 twitter:image');
        [...document.images].filter(i => i.naturalWidth >= minW).sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
          .forEach(i => add(i.currentSrc || i.src, i.naturalWidth, `正文图 ${i.naturalWidth}×${i.naturalHeight}` + (i.alt ? ' · ' + i.alt.slice(0, 30) : '')));
        return out;
      }, minW);
    }
    const fs = await import('node:fs');
    for (const c of cands.slice(0, n)) {
      try {
        const r = await page.request.get(c.src, { headers: { Referer: url } });
        if (!r.ok()) continue;
        const ct = r.headers()['content-type'] || '', ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg';
        const f = path.join(outDir, `img_${res.files.length + 1}.${ext}`); fs.writeFileSync(f, await r.body());
        res.files.push({ file: f, src: c.src, why: c.why });
      } catch (e) { }
    }
    res.ok = res.files.length > 0;
  } catch (e) { res.error = String(e.message || e).slice(0, 200); }
  await browser.close(); console.log(JSON.stringify(res)); process.exit(0);
}
const failed = [];
let res = { ok: false, file: out, url };
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: opt('dark') ? 'dark' : 'light', locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
  const page = await ctx.newPage();
  page.on('requestfailed', r => { if (['stylesheet', 'script', 'font'].includes(r.resourceType())) failed.push(r.resourceType() + ' ' + r.url().slice(0, 120)); });
  page.on('response', r => { const t = r.request().resourceType(); if (t === 'stylesheet' && r.status() >= 400) failed.push('stylesheet ' + r.status() + ' ' + r.url().slice(0, 120)); });
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => { res.error = String(e.message || e).slice(0, 200); return null; });
  if (resp) {
    await page.waitForTimeout(wait);
    // 关掉常见的 cookie / 登录弹层（只点"拒绝 / 关闭"，不登录、不同意条款）
    for (const sel of ['button:has-text("Reject")', 'button:has-text("拒绝")', '[aria-label="Close"]', '[aria-label="关闭"]']) {
      const b = page.locator(sel).first(); if (await b.isVisible().catch(() => false)) await b.click({ timeout: 1000 }).catch(() => {});
    }
    const sc = +(opt('scroll') || 0); if (sc) { await page.mouse.wheel(0, sc); await page.waitForTimeout(600); }
    const sel = opt('selector');
    if (sel && sel !== true) await page.locator(sel).first().screenshot({ path: out });
    else await page.screenshot({ path: out, fullPage: !!opt('full') });
    res.title = await page.title();
    res.status = resp.status();
    // 样式是否生效：页面上有没有被样式改过的元素（没样式的页面几乎全是默认的 Times / 白底黑字）
    res.styled = await page.evaluate(() => document.styleSheets.length > 0 && [...document.querySelectorAll('body *')].slice(0, 400).some(n => getComputedStyle(n).display === 'flex' || getComputedStyle(n).display === 'grid'));
    res.failed = failed;
    res.ok = res.status < 400 && res.styled && !failed.some(f => f.startsWith('stylesheet'));
  }
} catch (e) { res.error = String(e.message || e).slice(0, 200); }
await browser.close();
console.log(JSON.stringify(res));
