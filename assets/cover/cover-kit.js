/* 大琰DAYAN Motion Studio 封面工具包（v1.17，用户 2026-11-23 定：封面元素要环绕人物）
   模板封面（cover.html）和自定义封面（AI 按口播写的 HTML）共用：
   - KIT.person(root, info, box, align)   放人物抠像，记下人物轮廓（逐行左右边界，来自 dms_cover.py 算好的 prof）
   - KIT.free(y0, y1)                       这几行里人物左右两侧还空着的区间（已扣掉安全边距和与人物的间隙）
   - KIT.fitTitle(el, maxPx, minPx, opt)    标题按它所在的行能用的宽度自动缩字（行跨过人物头顶时也算）
   - KIT.flow(nodes, opt)                   把徽章 / 截图 / 便签按"货架"排进人物旁边的空隙，靠人物那一侧对齐（贴着人物，留 gap）
   - KIT.audit()                            检查：压到人物 / 离人物太远 / 出画布 → window.__coverIssues
   人物轮廓：prof.l[i] / prof.r[i] = 第 i 行（共 N 行，从上到下）不透明像素的最左 / 最右（占图片宽度的比例），-1 = 这一行没有人。 */
(function () {
  const K = {}; let P = null; const W = () => K.W, H = () => K.H;
  K.init = (root, w, h, opt = {}) => { K.root = root; K.W = w; K.H = h; K.m = opt.margin != null ? opt.margin : Math.round(Math.min(w, h) * 0.045); K.gapP = opt.gap != null ? opt.gap : Math.round(Math.min(w, h) * 0.022); K.items = []; return K; };
  /* 放人物：box = {x,y,w,h}（px），图片按 contain 放进框里，align 'r' 贴右、'l' 贴左、'c' 居中，底边贴框底 */
  K.person = (info, box, align = 'r', cls = 'person') => new Promise(res => {
    const e = document.createElement('div'); e.className = cls; Object.assign(e.style, { position: 'absolute', left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px', zIndex: box.z || 2 });
    const img = new Image(); img.src = info.src; img.style.cssText = `width:100%;height:100%;object-fit:contain;object-position:${align === 'r' ? 'right' : align === 'l' ? 'left' : 'center'} bottom;display:block`;
    e.appendChild(img); K.root.appendChild(e);
    const done = () => {
      const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1, s = Math.min(box.w / iw, box.h / ih), dw = iw * s, dh = ih * s;
      const dx = box.x + (align === 'r' ? box.w - dw : align === 'l' ? 0 : (box.w - dw) / 2), dy = box.y + box.h - dh;
      P = { dx, dy, dw, dh, prof: info.prof || null, el: e, img }; K.p = P; res(e);
    };
    if (img.complete && img.naturalWidth) done(); else { img.onload = done; img.onerror = done; }
  });
  /* 人物在 [y0, y1] 这几行占的横向范围（px），没有人返回 null */
  K.occ = (y0, y1) => {
    if (!P) return null;
    if (!P.prof) { if (y1 < P.dy) return null; return { l: P.dx, r: P.dx + P.dw }; }
    const L = P.prof.l, R = P.prof.r, N = L.length; let l = 1e9, r = -1e9;
    const i0 = Math.max(0, Math.floor((y0 - P.dy) / P.dh * N)), i1 = Math.min(N - 1, Math.ceil((y1 - P.dy) / P.dh * N));
    for (let i = i0; i <= i1; i++) if (L[i] >= 0) { l = Math.min(l, P.dx + L[i] * P.dw); r = Math.max(r, P.dx + R[i] * P.dw); }
    return r < 0 ? null : { l, r };
  };
  /* 空区间：返回 [{a, b, side}]，side = 'l'（人物左边）/ 'r'（人物右边）/ 'o'（这几行没有人） */
  K.free = (y0, y1) => {
    const m = K.m, o = K.occ(y0, y1);
    if (!o) return [{ a: m, b: W() - m, side: 'o' }];
    const out = [];
    if (o.l - K.gapP - m > 0) out.push({ a: m, b: o.l - K.gapP, side: 'l' });
    if (W() - m - (o.r + K.gapP) > 0) out.push({ a: o.r + K.gapP, b: W() - m, side: 'r' });
    return out;
  };
  const widest = fr => fr.reduce((x, y) => (y.b - y.a > x.b - x.a ? y : x), { a: 0, b: 0, side: 'none' });
  /* 标题：el 已经在页面里（position:absolute）；从 maxPx 往下缩，直到每一行都放得进它那几行的空区间 */
  K.fitTitle = (el, maxPx, minPx, opt = {}) => {
    const top = opt.top != null ? opt.top : K.m; let fs = maxPx, iv;
    for (let k = 0; k < 90; k++) {
      el.style.fontSize = fs + 'px'; el.style.left = '0px'; el.style.top = top + 'px'; el.style.width = 'auto';
      const w = Math.max(el.scrollWidth, ...[...el.querySelectorAll('.ln')].map(x => x.scrollWidth)), h = el.offsetHeight;
      iv = opt.side ? (K.free(top, top + h).find(f => f.side === opt.side || f.side === 'o') || widest(K.free(top, top + h))) : widest(K.free(top, top + h));
      if ((w <= iv.b - iv.a && (opt.maxH == null || h <= opt.maxH)) || fs <= minPx) {
        const x = opt.align === 'center' ? iv.a + (iv.b - iv.a - w) / 2 : (iv.side === 'r' ? iv.a : (opt.hug && iv.side === 'l' ? iv.b - w : iv.a));
        el.style.left = x + 'px'; el.style.width = w + 'px'; return { fs, w, h, x, y: top, iv };
      }
      fs = Math.floor(fs * 0.96);
    }
  };
  /* 排元素：nodes = 已经 append 好、position:absolute 的元素。从 opt.top 排到 opt.bottom；放不下整体缩小，空太多整体放大（最多 opt.maxScale）。
     每一层货架贴着人物那一侧对齐；元素之间 opt.gap。返回实际用的缩放 */
  K.flow = (nodes, opt = {}) => {
    const top = opt.top, bottom = opt.bottom != null ? opt.bottom : H() - K.m, gap = opt.gap != null ? opt.gap : K.gapP, maxS = opt.maxScale || 1.35, minS = opt.minScale || 0.45;
    const base = nodes.map(n => { n.style.transformOrigin = '0 0'; n.style.position = 'absolute'; n.style.left = '0px'; n.style.top = '0px'; const r = n.getBoundingClientRect(); return { n, w: r.width, h: r.height, rot: n.style.transform || '' }; });
    const pack = s => {
      const shelves = []; let y = top, cur = null;
      for (const b of base) {
        let w = b.w * s, h = b.h * s, si = s;
        for (let tries = 0; tries < 60; tries++) {
          if (!cur) { const fr = K.free(y, y + h); const iv = opt.side ? (fr.find(f => f.side === opt.side || f.side === 'o')) : widest(fr); cur = { y, h: 0, items: [], iv: iv || { a: 0, b: -1, side: 'none' }, used: 0 }; }
          const hh = Math.max(cur.h, h); const fr = K.free(cur.y, cur.y + hh);
          const iv = fr.find(f => f.side === cur.iv.side) || (cur.items.length ? null : widest(fr));
          if (iv && !cur.items.length && w > iv.b - iv.a) {   // 单个太宽的元素：先往下找更宽的位置；找不到再自己缩（不拖累别的元素）
            const k = (iv.b - iv.a) / b.w;
            if (k >= s * 0.8 || (y + h * 1.3 > bottom && k >= minS)) { si = k; w = b.w * si; h = b.h * si; }
            else { y += Math.max(8, h * 0.25); cur = null; if (y + h > bottom + 1) { y -= Math.max(8, h * 0.25); si = Math.max(minS, k); w = b.w * si; h = b.h * si; cur = { y, h: 0, items: [], iv, used: 0 }; } else continue; }
          }
          const need = cur.used + (cur.items.length ? gap : 0) + w;
          if (iv && need <= iv.b - iv.a) { cur.iv = iv; cur.items.push({ b, w, h, s: si }); cur.used = need; cur.h = Math.max(cur.h, h); break; }
          if (cur.items.length) { shelves.push(cur); y = cur.y + cur.h + gap; cur = null; }
          else { y += Math.max(8, h * 0.25); cur = null; if (y + h > bottom + 1) return null; }
        }
      }
      if (cur && cur.items.length) shelves.push(cur);
      const end = shelves.length ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].h : top;
      return end <= bottom + 1 ? { shelves, end } : null;
    };
    let s = maxS, res = null;
    for (; s >= minS; s = +(s * 0.95).toFixed(3)) { res = pack(s); if (res) break; }
    if (!res) { s = minS; res = pack(s) || { shelves: [], end: top }; }
    // 剩下的高度平均撒在货架之间（不超过一个 gap 的 2 倍），让元素布满人物旁边，而不是全挤在上面
    const spare = Math.max(0, bottom - res.end), n = res.shelves.length;
    const okAt = a => res.shelves.every((sh, i) => { const yy = sh.y + a * i; const iv = K.free(yy, yy + sh.h).find(f => f.side === sh.iv.side); return iv && iv.b - iv.a >= sh.used - 0.5; });
    let add = n > 1 ? Math.min(spare / (n - 1), gap * 2) : 0;
    while (add > 1 && !okAt(add)) add *= 0.7;   // 撒开后有哪一层会碰到人物，就整体少撒一点（各层间距保持一致，不会互相压）
    if (!okAt(add)) add = 0;
    res.shelves.forEach((sh, i) => {
      const yy = sh.y + add * i; const iv = K.free(yy, yy + sh.h).find(f => f.side === sh.iv.side) || sh.iv;
      const hug = iv.side === 'l' ? 'right' : iv.side === 'r' ? 'left' : (opt.align || (P && P.dx + P.dw / 2 > W() / 2 ? 'right' : 'left'));
      let x = Math.max(K.m, Math.min(W() - K.m - sh.used, hug === 'right' ? iv.b - sh.used : iv.a));
      sh.items.forEach(it => { it.b.n.style.left = x + 'px'; it.b.n.style.top = (yy + (sh.h - it.h) / 2) + 'px'; it.b.n.style.transform = `scale(${it.s}) ${it.b.rot}`; x += it.w + gap; K.items.push(it.b.n); });
    });
    return s;
  };
  K.track = (...els) => { els.forEach(e => e && K.items.push(e)); };
  /* 检查：压到人物（矩形和人物轮廓重叠超过 4px）/ 离人物太远（同一高度上和人物之间空着超过画面宽度 12%）/ 出画布 */
  K.audit = () => {
    const iss = [];
    for (const e of K.items) {
      const r = e.getBoundingClientRect(); const name = (e.textContent || e.className || '').trim().slice(0, 12);
      if (r.left < -1 || r.top < -1 || r.right > W() + 1 || r.bottom > H() + 1) iss.push(`出画布「${name}」`);
      if (!P) continue;
      const o = K.occ(r.top + 4, r.bottom - 4);
      if (o && r.right > o.l + 4 && r.left < o.r - 4) iss.push(`压到人物「${name}」`);
      else if (o) {   // 只看这一排里离人物最近的那个元素（它和人物之间没有别的元素）
        const left = r.right <= o.l, d = left ? o.l - r.right : r.left - o.r;
        const between = K.items.some(x => { if (x === e) return false; const q = x.getBoundingClientRect(); return q.bottom > r.top + 4 && q.top < r.bottom - 4 && (left ? q.left >= r.right - 2 && q.right <= o.l + 2 : q.right <= r.left + 2 && q.left >= o.r - 2); });
        if (!between && d > W() * 0.12) iss.push(`离人物太远「${name}」${Math.round(d)}px`);
      }
    }
    window.__coverIssues = iss; return iss;
  };
  /* ---------- 自定义封面用：开机、标题、对比度、收尾 ---------- */
  K.boot = () => {   // 读 ?c=序号&w=&h=，建好 #root，返回这一套的配置 D（edit.json cover.custom[序号]）和人物 PER
    const Q = new URLSearchParams(location.search), w = +Q.get('w') || 1080, h = +Q.get('h') || 1440, i = +Q.get('c') || 0;
    const C0 = window.COVER || {}, D = Object.assign({}, (C0.custom || [])[i] || {}); const root = document.getElementById('root');
    Object.assign(root.style, { position: 'relative', overflow: 'hidden', width: w + 'px', height: h + 'px' });
    const CN = (window.COVER_FONTS || []).map(f => `"${f}"`).concat(['"Alibaba PuHuiTi 3.0"', '"Source Han Sans SC"', '"Noto Sans SC"', '"Noto Sans CJK SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif']).join(',');
    root.style.fontFamily = CN; root.style.setProperty('--cn', CN); root.style.setProperty('--en', '"Inter","Montserrat","Arial Black",' + CN);
    K.init(root, w, h, D.kit || {}); K.V = h > w; K.u = Math.min(w, h) / 1080; K.px = n => Math.round(n * K.u); K.D = D; K.PER = D.person || null; K.C0 = C0;
    return D;
  };
  K.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  K.lines = (lines, hl, hlCls = 'hl') => { let used = false; return (Array.isArray(lines) ? lines : String(lines).split(/\s*\/\s*/)).map(l => {
    const k = hl && !used ? l.indexOf(hl) : -1; if (k < 0) return `<span class="ln">${K.esc(l)}</span>`; used = true;
    return `<span class="ln">${K.esc(l.slice(0, k))}<span class="${hlCls}">${K.esc(hl)}</span>${K.esc(l.slice(k + hl.length))}</span>`; }).join(''); };
  K.el = (tag, cls, html, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; Object.assign(e.style, css || {}); (parent || K.root).appendChild(e); return e; };
  const rgb = c => { c = String(c).trim();
    if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return { c: [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)), a: 1 }; }
    const m = c.match(/[\d.]+/g) || [0, 0, 0]; return { c: m.slice(0, 3).map(Number), a: m.length > 3 ? +m[3] : 1 }; };
  const lum = v => { const a = v.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
  /* 对比度：每个带字的被跟踪元素，字色 vs 它落在的底色（最近的不透明背景；都透明就用 pageBg），大字 ≥3:1、其余 ≥4.5:1 */
  K.contrast = (pageBg) => {
    const pb = rgb(pageBg || '#000').c, bad = [];
    K.root.querySelectorAll('[data-text], .ln, .hl, .k-t').forEach(e => {
      if (!e.textContent.trim()) return; const cs = getComputedStyle(e); if (cs.webkitTextStroke && parseFloat(cs.webkitTextStrokeWidth) > 1) return;
      let bg = pb; for (let n = e; n && n !== K.root; n = n.parentElement) { const b = rgb(getComputedStyle(n).backgroundColor); if (b.a > .6) { bg = b.c; break; } }
      const f = rgb(cs.color).c, r = (Math.max(lum(f), lum(bg)) + .05) / (Math.min(lum(f), lum(bg)) + .05), min = parseFloat(cs.fontSize) >= 48 ? 3 : 4.5;
      if (r < min) bad.push(`「${e.textContent.trim().slice(0, 10)}」${r.toFixed(1)}:1`);
    });
    window.__coverContrast = bad; return bad;
  };
  K.ready = (pageBg) => { K.contrast(pageBg); K.audit(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__coverReady = true; })); };
  K.fonts = () => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => 0))]);
  window.KIT = K;
})();
