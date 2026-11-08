/* =====================================================================
   大琰DAYAN · Motion Studio — 组件库 components.js
   每个组件：build(el, p, ctx) 建 DOM；update(el, lt, p, ctx, k) 按本地时间编舞；
   sfx(p) 声明自己的接触点音效（相对 at 的秒数）。
   组件只管“内部动作”，入场/出场由图层的 enter/exit 统一处理。
   ===================================================================== */
(function () {
  'use strict';
  const D = window.DMS;
  const { def, h, px, css, mark, splitChars, icon, E, spring, seg, clamp, lerp, rng, hash, esc } = D;
  const U = D.U;
  const fmtNum = (v, dec = 0, sep = true) => {
    const s = Math.abs(v).toFixed(dec);
    const [a, b] = s.split('.');
    const aa = sep ? a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : a;
    return (v < 0 ? '-' : '') + aa + (b ? '.' + b : '');
  };
  const at = (item, i, base = 0, step = .3) => (item && item.at != null ? item.at : base + i * step);
  const popIn = (lt, a) => clamp(spring(lt - a, 3.2, .5), 0, 1.2);
  const riseIn = (lt, a, d = .5) => E.out4(seg(lt, a, a + d));
  function applyPop(el, v, extra = '') {
    el.style.opacity = clamp(v * 2.5);
    el.style.transform = `${extra} scale(${Math.max(0, v)})`;
    el.style.visibility = v <= .001 ? 'hidden' : 'visible';
  }
  function applyRise(el, v, dist = 26) {
    el.style.opacity = clamp(v * 1.4);
    el.style.transform = `translateY(${px((1 - v) * dist * U)})`;
    el.style.filter = v < .98 ? `blur(${((1 - v) * 6).toFixed(1)}px)` : '';
    el.style.visibility = v <= .001 ? 'hidden' : 'visible';
  }
  const fs = (n) => px(n * U);

  /* =================================================================
     一、文字与标题
     ================================================================= */

  /* title：巨型标题。reveal: chars | rise | mask | slam | type | lines
     style: heavy | serif | outline | glow | 3d | brush */
  def('title', {
    box: 'title', enter: 'none',
    defaults: { text: '标题', hl: [], sub: '', reveal: 'chars', style: 'heavy', size: 120, align: 'left', stagger: .045, eyebrow: '', underline: false },
    build(el, p) {
      el.classList.add('ttl', 'st-' + p.style, 'al-' + p.align);
      if (p.eyebrow) el.append(h('div', { class: 'ttl-eyebrow', html: esc(p.eyebrow) }));
      const main = h('div', { class: 'ttl-main', style: { fontSize: fs(p.size) } });
      el.append(main);
      const lines = String(p.text).split('\n');
      p._lines = lines.map(line => { const ln = h('div', { class: 'ttl-line' }); main.append(ln); return { ln, spans: splitChars(ln, line, p.hl) }; });
      if (p.underline) { p._ul = h('div', { class: 'ttl-ul' }); el.append(p._ul); }
      if (p.sub) { p._sub = h('div', { class: 'ttl-sub', style: { fontSize: fs(p.subSize || p.size * .3) }, html: mark(p.sub, p.subHl) }); el.append(p._sub); }
      if (p.caret) { p._caret = h('span', { class: 'caret' }); main.lastChild.append(p._caret); }
    },
    update(el, lt, p) {
      let n = 0;
      const total = p._lines.reduce((a, l) => a + l.spans.length, 0);
      p._lines.forEach((L, li) => {
        L.spans.forEach((s) => {
          const a = n * p.stagger; n++;
          if (p.reveal === 'type') { s.style.visibility = lt >= a ? 'visible' : 'hidden'; return; }
          if (p.reveal === 'slam') { const v = E.outBack(seg(lt, a, a + .22), 1.6); s.style.opacity = clamp(v * 3); s.style.transform = `scale(${lerp(2.2, 1, clamp(v))})`; return; }
          if (p.reveal === 'mask') { const v = E.out4(seg(lt, li * .14, li * .14 + .7)); s.style.transform = `translateY(${(1 - v) * 105}%)`; s.parentNode.style.overflow = 'hidden'; return; }
          if (p.reveal === 'lines') { const v = E.out4(seg(lt, li * .16, li * .16 + .6)); applyRise(s, v, 40); return; }
          if (p.reveal === 'rise') { const v = E.out4(seg(lt, 0, .7)); applyRise(s, v, 50); return; }
          const v = E.out4(seg(lt, a, a + .5));
          s.style.opacity = clamp(v * 1.5);
          s.style.transform = `translateY(${px((1 - v) * 38 * U)}) scale(${lerp(.92, 1, v)})`;
          s.style.filter = v < .97 ? `blur(${((1 - v) * 9).toFixed(1)}px)` : '';
        });
      });
      const endT = total * p.stagger + .3;
      if (p._ul) { const v = E.inOut3(seg(lt, endT * .6, endT * .6 + .5)); p._ul.style.transform = `scaleX(${v})`; }
      if (p._sub) applyRise(p._sub, E.out4(seg(lt, endT * .7, endT * .7 + .55)), 22);
      if (p._caret) p._caret.style.opacity = (Math.floor(lt * 2.2) % 2 === 0 || lt < endT) ? 1 : 0;
    },
    sfx(p) {
      const n = [...String(p.text).replace(/\n/g, '')].length;
      if (p.reveal === 'type') return [{ at: 0, kind: 'typing', dur: n * p.stagger, gain: .5 }];
      if (p.reveal === 'slam') return [{ at: .05, kind: 'hit', gain: .9 }];
      return [{ at: 0, kind: p.size >= 140 ? 'whoosh-rise' : 'air', gain: .55 }];
    },
  });

  /* stamp：印章 / 斜贴（HOLD ON! / FREE / 封 / 重中之重） */
  def('stamp', {
    box: [.35, .35, .3, .2], enter: 'none',
    defaults: { text: 'FREE', rotate: -8, tone: 'red', size: 96, style: 'stamp', shake: 14, ring: true },
    build(el, p, ctx, inst) {
      el.classList.add('stmp', 'tone-' + p.tone, 'sty-' + p.style);
      p._b = h('div', { class: 'stmp-b', style: { fontSize: fs(p.size) }, html: mark(p.text, p.hl) });
      p._r = h('div', { class: 'stmp-ring' });
      el.append(p._r, p._b);
      if (p.shake) ctx.shake(inst.at + .12, p.shake);
    },
    update(el, lt, p) {
      const v = E.outBack(seg(lt, 0, .24), 2.2);
      p._b.style.opacity = clamp(lt / .06);
      p._b.style.transform = `rotate(${p.rotate}deg) scale(${lerp(2.6, 1, clamp(v, 0, 1.1))})`;
      const r = seg(lt, .12, .62);
      p._r.style.opacity = p.ring ? (1 - r) * .9 * (lt > .12 ? 1 : 0) : 0;
      p._r.style.transform = `rotate(${p.rotate}deg) scale(${.9 + r * .7})`;
    },
    sfx: () => [{ at: .1, kind: 'stamp', gain: 1 }],
  });

  /* strike：划掉 + 改写（不可能 → 可能！ / v3 → v7） */
  def('strike', {
    box: 'left', enter: 'rise',
    defaults: { from: '不可能', to: '可能！', strikeAt: .8, toAt: 1.15, size: 110, mode: 'x', tone: 'red', arrow: true },
    build(el, p) {
      el.classList.add('strk');
      p._a = h('div', { class: 'strk-a', style: { fontSize: fs(p.size) } }, p.from);
      p._line = h('div', { class: 'strk-line ' + p.mode });
      p._a.append(p._line);
      p._arr = p.arrow ? h('div', { class: 'strk-arr', style: { fontSize: fs(p.size * .6) } }, '→') : null;
      p._b = h('div', { class: 'strk-b tone-' + p.tone, style: { fontSize: fs(p.size * .9) }, html: mark(p.to, p.hl) });
      el.append(p._a); if (p._arr) el.append(p._arr); el.append(p._b);
    },
    update(el, lt, p) {
      const s = E.inOut3(seg(lt, p.strikeAt, p.strikeAt + .28));
      p._line.style.setProperty('--p', s);
      p._a.style.opacity = lerp(1, .55, s);
      if (p._arr) applyRise(p._arr, E.out3(seg(lt, p.toAt - .1, p.toAt + .3)), 10);
      const b = E.outBack(seg(lt, p.toAt, p.toAt + .26), 2);
      p._b.style.opacity = clamp((lt - p.toAt) / .05);
      p._b.style.transform = `rotate(-5deg) scale(${lerp(2, 1, clamp(b, 0, 1.1))})`;
    },
    sfx: (p) => [{ at: p.strikeAt, kind: 'scribble', gain: .8 }, { at: p.toAt + .08, kind: 'stamp', gain: .85 }],
  });

  /* type：打字机（提示词 / 代码 / 搜索框） */
  def('type', {
    box: 'center', enter: 'rise',
    defaults: { text: '给我做一个 30 秒的宣传片', cps: 14, delay: .25, style: 'prompt', label: '', size: 44, strikeAt: null, caret: true, hl: [] },
    build(el, p) {
      el.classList.add('typ', 'sty-' + p.style);
      if (p.label) el.append(h('div', { class: 'typ-label' }, p.label));
      const row = h('div', { class: 'typ-row', style: { fontSize: fs(p.size) } });
      if (p.style === 'search') row.append(icon('search', 1.1));
      if (p.style === 'code') row.append(h('span', { class: 'typ-pr' }, '›'));
      p._txt = h('span', { class: 'typ-txt' }); p._c = h('span', { class: 'caret' });
      row.append(p._txt, p._c);
      if (p.style === 'prompt') row.append(h('span', { class: 'typ-send' }, icon('up', .9)));
      el.append(row);
      p._chars = [...String(p.text)];
      p._strike = h('div', { class: 'typ-strike' }); row.append(p._strike);
    },
    update(el, lt, p) {
      const n = Math.floor(clamp((lt - p.delay) * p.cps, 0, p._chars.length));
      const cur = p._chars.slice(0, n).join('');
      if (p._last !== n) { p._txt.innerHTML = mark(cur, p.hl); p._last = n; }
      const done = n >= p._chars.length;
      p._c.style.opacity = p.caret && (!done || Math.floor(lt * 2.2) % 2 === 0) ? 1 : 0;
      if (p.strikeAt != null) p._strike.style.transform = `scaleX(${E.inOut3(seg(lt, p.strikeAt, p.strikeAt + .35))})`;
      else p._strike.style.transform = 'scaleX(0)';
    },
    sfx: (p) => { const d = [...String(p.text)].length / p.cps; const l = [{ at: p.delay, kind: 'typing', dur: d, gain: .55 }]; if (p.style === 'prompt') l.push({ at: p.delay + d + .15, kind: 'click', gain: .7 }); if (p.strikeAt != null) l.push({ at: p.strikeAt, kind: 'scribble', gain: .7 }); return l; },
  });

  /* chips：胶囊 / 词卡，逐个弹出或逐词点亮（剪辑 / 服务于 / 内容） */
  def('chips', {
    box: 'bottom', enter: 'none',
    defaults: { items: [], dir: 'row', style: 'glass', size: 36, step: .35, mode: 'pop', light: false, align: 'start', gap: 18 },
    build(el, p) {
      el.classList.add('chips', 'dir-' + p.dir, 'sty-' + p.style, 'al-' + p.align);
      el.style.gap = fs(p.gap);
      p._els = p.items.map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const c = h('div', { class: 'chip' + (o.tone ? ' tone-' + o.tone : ''), style: { fontSize: fs(o.size || p.size) } });
        if (o.icon) c.append(icon(o.icon, (o.size || p.size) / 34));
        c.append(h('span', { class: 'chip-t', html: mark(o.t, o.hl) }));
        if (o.sub) c.append(h('span', { class: 'chip-s' }, o.sub));
        if (o.rot) c.style.setProperty('--rot', o.rot + 'deg');
        el.append(c);
        return { c, o, a: at(o, i, 0, p.step) };
      });
    },
    update(el, lt, p) {
      p._els.forEach(({ c, a }) => {
        if (p.mode === 'light') {
          const v = E.out3(seg(lt, a, a + .25));
          c.style.opacity = .28 + .72 * v; c.classList.toggle('on', lt >= a);
          c.style.transform = `scale(${1 + .08 * Math.sin(clamp((lt - a) / .3) * Math.PI)})`;
        } else if (p.mode === 'rise') applyRise(c, riseIn(lt, a), 30);
        else if (p.mode === 'slide') { const v = E.out4(seg(lt, a, a + .5)); c.style.opacity = clamp(v * 2); c.style.transform = `translateX(${px((1 - v) * (p.from === 'right' ? 80 : -80) * U)})`; }
        else applyPop(c, popIn(lt, a), c.style.getPropertyValue('--rot') ? `rotate(${c.style.getPropertyValue('--rot')})` : '');
      });
    },
    sfx: (p) => p.items.map((it, i) => ({ at: at(it, i, 0, p.step) + .02, kind: p.mode === 'light' ? 'tick' : 'pop', gain: .55 })),
  });

  /* number：巨号数字滚动（12.8万 / 92.4% / ¥129/月 / 1亿+） */
  def('number', {
    box: 'left', enter: 'rise',
    defaults: { value: 100, from: 0, dec: 0, prefix: '', suffix: '', unit: '', label: '', size: 220, dur: 1.1, delay: .1, tone: 'accent', sep: true, glow: false, style: 'solid', align: 'left' },
    build(el, p) {
      el.classList.add('num', 'tone-' + p.tone, 'sty-' + p.style, 'al-' + p.align);
      if (p.eyebrow) el.append(h('div', { class: 'num-eyebrow' }, p.eyebrow));
      const row = h('div', { class: 'num-row' });
      if (p.prefix) row.append(h('span', { class: 'num-pre', style: { fontSize: fs(p.size * .42) } }, p.prefix));
      p._v = h('span', { class: 'num-v', style: { fontSize: fs(p.size) } });
      row.append(p._v);
      if (p.suffix) row.append(h('span', { class: 'num-suf', style: { fontSize: fs(p.size * .5) } }, p.suffix));
      if (p.unit) row.append(h('span', { class: 'num-unit', style: { fontSize: fs(p.size * .2) } }, p.unit));
      el.append(row);
      if (p.label) { p._l = h('div', { class: 'num-label', style: { fontSize: fs(Math.max(28, p.size * .17)) }, html: mark(p.label, p.hl) }); el.append(p._l); }
      if (p.bar) { p._bar = h('div', { class: 'num-bar' }, h('i')); el.append(p._bar); }
    },
    update(el, lt, p) {
      const f = E.out4(seg(lt, p.delay, p.delay + p.dur));
      const v = lerp(p.from, p.value, f);
      p._v.textContent = fmtNum(v, p.dec, p.sep);
      p._v.style.filter = f < .97 ? `blur(${((1 - f) * 3).toFixed(1)}px)` : '';
      const land = seg(lt, p.delay + p.dur - .05, p.delay + p.dur + .25);
      p._v.style.transform = `scale(${1 + .06 * Math.sin(land * Math.PI)})`;
      if (p._l) applyRise(p._l, E.out4(seg(lt, p.delay + p.dur * .6, p.delay + p.dur * .6 + .5)), 18);
      if (p._bar) p._bar.firstChild.style.transform = `scaleX(${f * (p.barValue == null ? 1 : p.barValue)})`;
    },
    sfx: (p) => [{ at: p.delay, kind: 'roll', dur: p.dur, gain: .5 }, { at: p.delay + p.dur, kind: 'ding', gain: .7 }],
  });

  /* equation：A = B（Bot = 子Agent），两侧夹住人物 */
  def('equation', {
    box: 'full', enter: 'none', lint: false,
    defaults: { left: 'A', right: 'B', op: '=', size: 150, y: .3, gap: .2, tone: 'fg' },
    build(el, p) {
      el.classList.add('eqn');
      p._a = h('div', { class: 'eqn-a', style: { fontSize: fs(p.size), top: (p.y * 100) + '%', right: (50 + p.gap * 50) + '%' }, html: mark(p.left, p.hl) });
      p._o = h('div', { class: 'eqn-o', style: { fontSize: fs(p.size * .8), top: (p.y * 100) + '%' } }, p.op);
      p._b = h('div', { class: 'eqn-b', style: { fontSize: fs(p.size), top: (p.y * 100) + '%', left: (50 + p.gap * 50) + '%' }, html: mark(p.right, p.hl) });
      el.append(p._a, p._o, p._b);
    },
    update(el, lt, p) {
      const a = E.out4(seg(lt, 0, .5)); p._a.style.opacity = a; p._a.style.transform = `translate(${px(-(1 - a) * 140 * U)}, -50%)`;
      applyPop(p._o, popIn(lt, .32), 'translate(-50%,-50%)');
      const b = E.out4(seg(lt, .5, 1)); p._b.style.opacity = b; p._b.style.transform = `translate(${px((1 - b) * 140 * U)}, -50%)`;
    },
    sfx: () => [{ at: 0, kind: 'swipe', gain: .6 }, { at: .34, kind: 'pop', gain: .6 }, { at: .5, kind: 'swipe', gain: .6 }],
  });

  /* tags：人物两侧漂浮的术语标签（LLM / Token / Agent …） */
  def('tags', {
    box: 'full', enter: 'none', lint: false,
    defaults: { left: [], right: [], step: .22, size: 40, style: 'glow', top: .12, bottom: .72, inset: .06, float: true },
    build(el, p) {
      el.classList.add('tags', 'sty-' + p.style);
      p._els = [];
      const place = (arr, side) => arr.forEach((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const n = arr.length;
        const y = lerp(p.top, p.bottom, n === 1 ? .5 : i / (n - 1));
        const xo = (i % 2 ? .05 : 0) + (o.dx || 0);
        const c = h('div', { class: 'tag ' + side, style: { fontSize: fs(o.size || p.size), top: (y * 100) + '%', [side === 'l' ? 'left' : 'right']: ((p.inset + xo) * 100) + '%' } });
        if (o.icon) c.append(icon(o.icon, (o.size || p.size) / 34));
        c.append(h('span', {}, o.t));
        el.append(c);
        p._els.push({ c, o, side, i, seed: hash(o.t) % 1000 });
      });
      place(p.left, 'l'); place(p.right, 'r');
      p._els.sort((a, b) => a.i - b.i || (a.side < b.side ? -1 : 1));
      p._els.forEach((e, k) => e.a = e.o.at != null ? e.o.at : k * p.step);
    },
    update(el, lt, p) {
      p._els.forEach(e => {
        const v = popIn(lt, e.a);
        const fy = p.float ? Math.sin((lt + e.seed) * 1.3) * 6 * U : 0;
        applyPop(e.c, v, `translateY(${px(fy)})`);
      });
    },
    sfx: (p) => { const n = p.left.length + p.right.length; return Array.from({ length: n }, (_, k) => ({ at: k * p.step, kind: 'pop', gain: .4 })); },
  });

  /* chapter：章节标（#2 第二个兴奋点 / No.04/10 · SKILLS / 巨号 01） */
  def('chapter', {
    box: 'title', enter: 'none',
    defaults: { no: '#1', title: '第一个重点', sub: '', style: 'giant', size: 150, tone: 'accent' },
    build(el, p) {
      el.classList.add('chap', 'sty-' + p.style, 'tone-' + p.tone);
      p._n = h('div', { class: 'chap-no', style: { fontSize: fs(p.size) } }, p.no);
      p._t = h('div', { class: 'chap-t', style: { fontSize: fs(p.size * .36) }, html: mark(p.title, p.hl) });
      p._s = p.sub ? h('div', { class: 'chap-s', style: { fontSize: fs(p.size * .13) } }, p.sub) : null;
      const col = h('div', { class: 'chap-col' }, p._t, p._s);
      el.append(p._n, col);
    },
    update(el, lt, p) {
      const v = E.outBack(seg(lt, 0, .3), 1.8);
      p._n.style.opacity = clamp(lt / .08); p._n.style.transform = `scale(${lerp(1.8, 1, clamp(v, 0, 1.1))})`;
      applyRise(p._t, E.out4(seg(lt, .18, .68)), 22);
      if (p._s) applyRise(p._s, E.out4(seg(lt, .32, .8)), 14);
    },
    sfx: () => [{ at: .03, kind: 'hit', gain: .75 }],
  });

  /* nav：常驻章节导航（侧栏列表或顶部标签栏），当前项高亮滑动 */
  def('nav', {
    box: 'top-left', enter: 'fade',
    defaults: { items: ['开场', '原理', '演示', '总结'], marks: [], style: 'side', size: 22 },
    build(el, p) {
      el.classList.add('nav', 'sty-' + p.style);
      p._els = p.items.map((t, i) => { const r = h('div', { class: 'nav-i', style: { fontSize: fs(p.size) } }, h('b', {}, String(i + 1).padStart(2, '0')), h('span', {}, t)); el.append(r); return r; });
      p._bar = h('div', { class: 'nav-bar' }); el.append(p._bar);
    },
    update(el, lt, p, ctx, k, t) {
      /* marks: 每一章开始的全片时间 */
      let cur = 0; (p.marks || []).forEach((m, i) => { if (t >= m) cur = i; });
      let prevT = (p.marks || [])[cur] || 0;
      const f = E.glide(seg(t, prevT, prevT + .5));
      p._els.forEach((e, i) => e.classList.toggle('on', i === cur));
      const a = p._els[Math.max(0, cur - 1)], b = p._els[cur];
      if (b) {
        const ra = (cur > 0 && f < 1 ? a : b), rb = b;
        const x = lerp(ra.offsetLeft, rb.offsetLeft, cur > 0 ? f : 1), y = lerp(ra.offsetTop, rb.offsetTop, cur > 0 ? f : 1);
        const w = lerp(ra.offsetWidth, rb.offsetWidth, cur > 0 ? f : 1), hh = lerp(ra.offsetHeight, rb.offsetHeight, cur > 0 ? f : 1);
        css(p._bar, { left: px(x), top: px(y), width: px(w), height: px(hh) });
      }
    },
    sfx: (p) => (p.marks || []).slice(1).map(m => ({ at: m - (p._at || 0), kind: 'tick', gain: .4 })),
  });

  /* namecard：名牌 / 自我介绍（我叫 XX 👋） */
  def('namecard', {
    box: [.06, .56, .5, .2], enter: 'none',
    defaults: { name: '', handle: '', sub: '', size: 110, wave: '👋' },
    build(el, p) {
      el.classList.add('namec');
      p._n = h('div', { class: 'namec-n', style: { fontSize: fs(p.size) } }); p._spans = splitChars(p._n, p.name);
      p._s = h('div', { class: 'namec-s', style: { fontSize: fs(p.size * .3) } }, p.sub || p.handle, p.wave ? h('span', { class: 'wave' }, p.wave) : null);
      el.append(p._n, p._s);
    },
    update(el, lt, p) {
      p._spans.forEach((s, i) => { const v = E.out4(seg(lt, i * .05, i * .05 + .5)); s.style.opacity = v; s.style.transform = `translateY(${(1 - v) * 60}%)`; });
      applyRise(p._s, E.out4(seg(lt, .35, .85)), 18);
      const w = p._s.querySelector('.wave'); if (w) w.style.transform = `rotate(${Math.sin(lt * 9) * 18 * clamp(2 - lt)}deg)`;
    },
    sfx: () => [{ at: 0, kind: 'whoosh-rise', gain: .5 }, { at: .4, kind: 'sparkle', gain: .5 }],
  });

  /* bubble：云朵 / 评论 / 对话气泡 */
  def('bubble', {
    box: 'upper-l', enter: 'none',
    defaults: { text: '留下你的行业', style: 'comment', size: 46, tail: 'bl', label: '', icon: '' },
    build(el, p) {
      el.classList.add('bub', 'sty-' + p.style, 'tail-' + p.tail);
      const b = h('div', { class: 'bub-b', style: { fontSize: fs(p.size) } });
      if (p.label) b.append(h('div', { class: 'bub-l' }, p.label));
      const row = h('div', { class: 'bub-r' });
      if (p.icon || p.style === 'comment') row.append(icon(p.icon || 'chat', p.size / 36));
      row.append(h('span', { html: mark(p.text, p.hl) }));
      b.append(row); el.append(b); p._b = b;
    },
    update(el, lt, p) { const v = clamp(spring(lt, 2.6, .48), 0, 1.15); p._b.style.opacity = clamp(v * 3); p._b.style.transform = `scale(${v})`; },
    sfx: () => [{ at: 0, kind: 'bubble', gain: .7 }],
  });

  /* echo：描边字重复多行（出发喽~ ×3） */
  def('echo', {
    box: 'center', enter: 'none',
    defaults: { text: '出发喽~', rows: 3, size: 130, step: .12 },
    build(el, p) {
      el.classList.add('echo');
      p._rows = Array.from({ length: p.rows }, (_, i) => { const r = h('div', { class: 'echo-r' + (i === 0 ? ' solid' : ''), style: { fontSize: fs(p.size) } }, p.text); el.append(r); return r; });
    },
    update(el, lt, p) { p._rows.forEach((r, i) => applyRise(r, E.out4(seg(lt, i * p.step, i * p.step + .45)), 50)); },
    sfx: (p) => [{ at: 0, kind: 'whoosh', gain: .6 }],
  });

  /* quote：引用卡 / 网友评论（多条错落弹幕） */
  def('quote', {
    box: 'left', enter: 'none',
    defaults: { items: [], step: .45, size: 30, style: 'danmaku' },
    build(el, p) {
      el.classList.add('quote', 'sty-' + p.style);
      p._els = p.items.map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const q = h('div', { class: 'q', style: { fontSize: fs(o.size || p.size), marginLeft: ((o.indent != null ? o.indent : (i % 2) * 8) ) + '%' } });
        if (o.who) q.append(h('b', {}, o.who));
        q.append(h('span', { html: mark(o.t, o.hl) }));
        el.append(q); return { q, a: at(o, i, 0, p.step) };
      });
    },
    update(el, lt, p) { p._els.forEach(({ q, a }) => { const v = E.out4(seg(lt, a, a + .5)); q.style.opacity = clamp(v * 1.5); q.style.transform = `translateX(${px((1 - v) * -60 * U)})`; }); },
    sfx: (p) => p.items.map((it, i) => ({ at: at(it, i, 0, p.step), kind: 'pop-soft', gain: .5 })),
  });

  /* =================================================================
     二、结构与关系
     ================================================================= */

  /* checklist：日志式清单逐条出现（剪完一条✓ / ⚠哪里出问题了?） */
  def('checklist', {
    box: 'left', enter: 'none',
    defaults: { items: [], title: '', step: .6, size: 34, style: 'log' },
    build(el, p) {
      el.classList.add('ckl', 'sty-' + p.style);
      if (p.title) el.append(h('div', { class: 'ckl-title' }, p.title));
      p._els = p.items.map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const st = o.state || 'ok';
        const r = h('div', { class: 'ckl-i st-' + st, style: { fontSize: fs(o.size || p.size) } });
        const ic = h('span', { class: 'ckl-ic' }, icon({ ok: 'check', warn: 'warn', x: 'x', todo: 'clock', up: 'up', star: 'star' }[st] || st, .8));
        r.append(ic, h('span', { class: 'ckl-t', html: mark(o.t, o.hl) }));
        if (o.note) r.append(h('span', { class: 'ckl-n' }, o.note));
        el.append(r); return { r, ic, a: at(o, i, 0, p.step) };
      });
    },
    update(el, lt, p) {
      p._els.forEach(({ r, ic, a }) => {
        const v = E.out4(seg(lt, a, a + .45)); r.style.opacity = clamp(v * 1.6); r.style.transform = `translateX(${px((1 - v) * -40 * U)})`;
        const c = popIn(lt, a + .18); ic.style.transform = `scale(${c})`;
      });
    },
    sfx: (p) => p.items.map((it, i) => { const st = (typeof it === 'string' ? 'ok' : it.state) || 'ok'; return { at: at(it, i, 0, p.step) + .18, kind: st === 'warn' || st === 'x' ? 'error' : 'check', gain: .55 }; }),
  });

  /* flow：步骤流（整理 → 上传 → 分享），连接线逐段描出 */
  def('flow', {
    box: 'bottom', enter: 'none',
    defaults: { steps: [], step: .5, size: 34, dir: 'row', style: 'pill', arrow: true },
    build(el, p) {
      el.classList.add('flw', 'dir-' + p.dir, 'sty-' + p.style);
      p._els = [];
      p.steps.forEach((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        if (i > 0) { const ln = h('div', { class: 'flw-ln' }, h('i')); if (p.arrow) ln.append(h('b', {}, '')); el.append(ln); p._els.push({ ln, a: at(o, i, 0, p.step) - .25 }); }
        const n = h('div', { class: 'flw-n' + (o.tone ? ' tone-' + o.tone : ''), style: { fontSize: fs(o.size || p.size) } });
        if (o.icon) n.append(icon(o.icon, (o.size || p.size) / 34));
        n.append(h('span', { html: mark(o.t, o.hl) }));
        if (o.sub) n.append(h('small', {}, o.sub));
        el.append(n); p._els.push({ n, a: at(o, i, 0, p.step) });
      });
    },
    update(el, lt, p) {
      p._els.forEach(e => {
        if (e.ln) e.ln.firstChild.style.transform = `scale${p.dir === 'col' ? 'Y' : 'X'}(${E.inOut3(seg(lt, e.a, e.a + .25))})`;
        else applyPop(e.n, popIn(lt, e.a));
      });
    },
    sfx: (p) => p.steps.map((it, i) => ({ at: at(it, i, 0, p.step), kind: i ? 'snap' : 'pop', gain: .55 })),
  });

  /* compare：A → B / A vs B / 三列对比 + 赢家高亮 */
  def('compare', {
    box: 'center', enter: 'none',
    defaults: { cols: [], op: '→', step: .7, winner: null, winnerAt: null, size: 36 },
    build(el, p) {
      el.classList.add('cmp');
      p._els = [];
      p.cols.forEach((c, i) => {
        if (i > 0 && p.op) { const o = h('div', { class: 'cmp-op', style: { fontSize: fs(p.size * 1.6) } }, p.op); el.append(o); p._els.push({ op: o, a: at(c, i, 0, p.step) - .2 }); }
        const card = h('div', { class: 'cmp-c' + (c.tone ? ' tone-' + c.tone : '') });
        if (c.tag) card.append(h('div', { class: 'cmp-tag' }, c.tag));
        if (c.icon) card.append(icon(c.icon, 1.5));
        if (c.big) card.append(h('div', { class: 'cmp-big', style: { fontSize: fs(p.size * 2.6) } }, c.big));
        card.append(h('div', { class: 'cmp-t', style: { fontSize: fs(p.size * 1.1) }, html: mark(c.title || '', c.hl) }));
        if (c.body) card.append(h('div', { class: 'cmp-b', style: { fontSize: fs(p.size * .72) }, html: mark(c.body, c.bhl) }));
        (c.lines || []).forEach(l => card.append(h('div', { class: 'cmp-l', style: { fontSize: fs(p.size * .7) } }, icon(l.icon || 'check', .6), h('span', {}, l.t || l))));
        el.append(card); p._els.push({ card, a: at(c, i, 0, p.step), i });
      });
    },
    update(el, lt, p) {
      const wa = p.winnerAt != null ? p.winnerAt : p.cols.length * p.step + .3;
      p._els.forEach(e => {
        if (e.op) { applyPop(e.op, popIn(lt, e.a)); return; }
        const v = E.out4(seg(lt, e.a, e.a + .55));
        let s = lerp(.9, 1, v);
        const isW = p.winner === e.i, isL = p.winner != null && !isW;
        const w = E.out3(seg(lt, wa, wa + .4));
        if (isW) s *= 1 + .06 * w;
        e.card.style.opacity = clamp(v * 1.5) * (isL ? lerp(1, .5, w) : 1);
        e.card.style.transform = `translateY(${px((1 - v) * 50 * U)}) scale(${s})`;
        e.card.classList.toggle('win', isW && lt >= wa);
      });
    },
    sfx: (p) => { const l = p.cols.map((c, i) => ({ at: at(c, i, 0, p.step), kind: 'card', gain: .6 })); if (p.winner != null) l.push({ at: p.winnerAt != null ? p.winnerAt : p.cols.length * p.step + .3, kind: 'success', gain: .7 }); return l; },
  });

  /* bars：进度条对比 / 收缩（时间成本 ↓） */
  def('bars', {
    box: 'right', enter: 'rise',
    defaults: { items: [], max: 100, unit: '', step: .25, size: 30, dur: .8 },
    build(el, p) {
      el.classList.add('brs');
      p._els = p.items.map((it, i) => {
        const r = h('div', { class: 'brs-r', style: { fontSize: fs(p.size) } });
        const lab = h('div', { class: 'brs-l' }, it.label);
        const tr = h('div', { class: 'brs-tr' }); const fill = h('i', { class: it.tone ? 'tone-' + it.tone : '' }); tr.append(fill);
        const val = h('div', { class: 'brs-v' });
        r.append(lab, tr, val); el.append(r);
        if (it.note) { const n = h('div', { class: 'brs-n' }, it.note); r.append(n); it._n = n; }
        return { it, fill, val, a: at(it, i, .1, p.step) };
      });
    },
    update(el, lt, p) {
      p._els.forEach(({ it, fill, val, a }) => {
        const g = E.out4(seg(lt, a, a + p.dur));
        let v = it.value * g;
        if (it.to != null) { const s = E.inOut3(seg(lt, it.toAt || 1.6, (it.toAt || 1.6) + .7)); v = lerp(v, it.to, s); fill.classList.toggle('shrunk', s > .5); }
        fill.style.transform = `scaleX(${clamp(v / p.max)})`;
        val.textContent = (it.fmt ? it.fmt.replace('{v}', fmtNum(v, it.dec || 0)) : fmtNum(v, it.dec || 0) + (it.unit || p.unit));
        if (it._n) applyRise(it._n, E.out3(seg(lt, (it.toAt || 1.6) + .5, (it.toAt || 1.6) + .9)), 10);
      });
    },
    sfx: (p) => { const l = p.items.map((it, i) => ({ at: at(it, i, .1, p.step), kind: 'riser-short', gain: .4 })); p.items.forEach(it => { if (it.to != null) l.push({ at: it.toAt || 1.6, kind: 'shrink', gain: .6 }); }); return l; },
  });

  /* gauge：仪表盘 / 圆环百分比（<1% / 92.4%） */
  def('gauge', {
    box: 'mid-r', enter: 'rise',
    defaults: { value: 1, max: 100, label: '', prefix: '', suffix: '%', dec: 0, dur: 1.2, delay: .2, style: 'ring', size: 1, tone: 'accent' },
    build(el, p) {
      el.classList.add('gge', 'sty-' + p.style, 'tone-' + p.tone);
      const S = 300 * p.size * U; p._S = S;
      const svg = `<svg viewBox="0 0 100 100" width="${S}" height="${S}"><circle class="g-bg" cx="50" cy="50" r="42" pathLength="100"/><circle class="g-fg" cx="50" cy="50" r="42" pathLength="100"/></svg>`;
      const wrap = h('div', { class: 'gge-w', html: svg, style: { width: px(S), height: px(S) } });
      p._v = h('div', { class: 'gge-v', style: { fontSize: px(S * .24) } }); wrap.append(p._v);
      el.append(wrap); if (p.label) el.append(h('div', { class: 'gge-l', style: { fontSize: px(Math.max(26 * U, S * .1)) }, html: mark(p.label, p.hl) }));
      p._fg = wrap.querySelector('.g-fg');
    },
    update(el, lt, p) {
      const f = E.out4(seg(lt, p.delay, p.delay + p.dur));
      const v = p.value * f;
      const frac = p.style === 'half' ? clamp(v / p.max) * 50 : clamp(v / p.max) * 100;
      p._fg.style.strokeDasharray = `${Math.max(.6, frac)} 100`;
      p._v.textContent = p.prefix + fmtNum(v, p.dec) + p.suffix;
    },
    sfx: (p) => [{ at: p.delay, kind: 'roll', dur: p.dur, gain: .4 }, { at: p.delay + p.dur, kind: 'ding', gain: .6 }],
  });

  /* timeline：日期节点（10.22 → 10.29 → 11.3 今天） */
  def('timeline', {
    box: 'center', enter: 'fade',
    defaults: { items: [], step: .45, size: 28 },
    build(el, p) {
      el.classList.add('tln');
      p._line = h('div', { class: 'tln-line' }, h('i')); el.append(p._line);
      p._els = p.items.map((it, i) => {
        const n = h('div', { class: 'tln-n' + (it.current ? ' cur' : ''), style: { left: (p.items.length === 1 ? 50 : (i / (p.items.length - 1)) * 100) + '%', fontSize: fs(p.size) } },
          h('div', { class: 'tln-d' }, it.date || ''), h('i', { class: 'tln-dot' }), h('div', { class: 'tln-t', html: mark(it.t || '', it.hl) }));
        el.append(n); return { n, a: at(it, i, .2, p.step) };
      });
    },
    update(el, lt, p) {
      const last = p._els.length ? p._els[p._els.length - 1].a : 0;
      p._line.firstChild.style.transform = `scaleX(${E.inOut3(seg(lt, 0, last + .3))})`;
      p._els.forEach(({ n, a }) => applyRise(n, E.out4(seg(lt, a, a + .45)), 20));
    },
    sfx: (p) => p.items.map((it, i) => ({ at: at(it, i, .2, p.step), kind: 'tick', gain: .5 })),
  });

  /* nodes：中心节点 + 卫星节点 + 连线 + 轨道（知识网络 / API 关系 / 一对多分发） */
  def('nodes', {
    box: 'center', enter: 'fade',
    defaults: { center: { t: 'AI' }, items: [], step: .3, orbit: true, radius: .38, size: 28, pulse: true, layout: 'radial' },
    build(el, p) {
      el.classList.add('nds');
      const B = p.__box; const cx = B.w / 2, cy = B.h / 2; const R = Math.min(B.w, B.h) * p.radius;
      p._cx = cx; p._cy = cy;
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', B.w); svg.setAttribute('height', B.h); svg.classList.add('nds-svg');
      el.append(svg); p._svg = svg;
      if (p.orbit) { const o = document.createElementNS(svgNS, 'circle'); o.setAttribute('cx', cx); o.setAttribute('cy', cy); o.setAttribute('r', R); o.setAttribute('pathLength', 100); o.classList.add('nds-orbit'); svg.append(o); p._orbit = o; }
      const n = p.items.length;
      p._els = p.items.map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        let x, y;
        if (p.layout === 'fan-right') { x = cx + R * 1.25; y = cy + (n === 1 ? 0 : (i / (n - 1) - .5) * B.h * .78); }
        else if (p.layout === 'fan-left') { x = cx - R * 1.25; y = cy + (n === 1 ? 0 : (i / (n - 1) - .5) * B.h * .78); }
        else { const ang = (o.ang != null ? o.ang : -90 + i * 360 / n) * Math.PI / 180; const r = R * (o.r || 1); x = cx + Math.cos(ang) * r * (B.w > B.h ? 1.25 : 1); y = cy + Math.sin(ang) * r; }
        const ln = document.createElementNS(svgNS, 'line');
        const sx = p.layout === 'fan-right' ? cx + R * .32 : p.layout === 'fan-left' ? cx - R * .32 : cx;
        ln.setAttribute('x1', sx); ln.setAttribute('y1', cy); ln.setAttribute('x2', x); ln.setAttribute('y2', y); ln.setAttribute('pathLength', 100); ln.classList.add('nds-ln'); svg.append(ln);
        const dot = document.createElementNS(svgNS, 'circle'); dot.setAttribute('r', 5 * U); dot.classList.add('nds-pk'); svg.append(dot);
        const nd = h('div', { class: 'nds-n' + (o.tone ? ' tone-' + o.tone : ''), style: { left: px(x), top: px(y), fontSize: fs(o.size || p.size) } });
        if (o.icon) nd.append(icon(o.icon, (o.size || p.size) / 30));
        nd.append(h('span', { html: mark(o.t, o.hl) })); if (o.sub) nd.append(h('small', {}, o.sub));
        el.append(nd);
        return { nd, ln, dot, a: at(o, i, .35, p.step), x, y, sx };
      });
      const c = p.center || {};
      p._c = h('div', { class: 'nds-c', style: { left: px(cx), top: px(cy), fontSize: fs(c.size || p.size * 1.5) } });
      if (c.icon) p._c.append(icon(c.icon, (c.size || p.size * 1.5) / 30));
      p._c.append(h('span', { html: mark(c.t || '', c.hl) })); if (c.sub) p._c.append(h('small', {}, c.sub));
      el.append(p._c);
    },
    update(el, lt, p) {
      applyPop(p._c, popIn(lt, 0), 'translate(-50%,-50%)');
      if (p._orbit) { p._orbit.style.strokeDasharray = `${E.inOut3(seg(lt, .1, 1.1)) * 100} 100`; p._orbit.style.transform = `rotate(${lt * 8}deg)`; p._orbit.style.transformOrigin = `${p._cx}px ${p._cy}px`; }
      p._els.forEach(e => {
        const d = E.inOut3(seg(lt, e.a - .15, e.a + .2));
        e.ln.style.strokeDasharray = `${d * 100} 100`;
        applyPop(e.nd, popIn(lt, e.a + .05), 'translate(-50%,-50%)');
        if (p.pulse && lt > e.a + .3) { const q = ((lt - e.a) * .7) % 1; e.dot.setAttribute('cx', lerp(e.sx, e.x, q)); e.dot.setAttribute('cy', lerp(p._cy, e.y, q)); e.dot.style.opacity = Math.sin(q * Math.PI); }
        else e.dot.style.opacity = 0;
      });
    },
    sfx: (p) => [{ at: 0, kind: 'pop', gain: .6 }].concat(p.items.map((it, i) => ({ at: at(it, i, .35, p.step) + .05, kind: 'blip', gain: .45 }))),
  });

  /* stacks：记忆堆叠（每个对象一摞条纹卡片，越聊越高） */
  def('stacks', {
    box: 'center', enter: 'fade',
    defaults: { items: [], step: .35, maxRows: 14, size: 26 },
    build(el, p) {
      el.classList.add('stk');
      p._els = p.items.map((it, i) => {
        const col = h('div', { class: 'stk-c' });
        const head = h('div', { class: 'stk-h' }, icon(it.icon || 'bot', 1.1));
        const pile = h('div', { class: 'stk-p' });
        const rows = Array.from({ length: p.maxRows }, (_, r) => { const row = h('i', { class: (it.tone ? 'tone-' + it.tone : '') }); pile.prepend(row); return row; });
        col.append(head, pile, h('div', { class: 'stk-l', style: { fontSize: fs(p.size) } }, it.label || ''));
        el.append(col);
        return { col, head, rows, it, a: at(it, i, 0, p.step) };
      });
    },
    update(el, lt, p) {
      p._els.forEach(({ col, head, rows, it, a }) => {
        applyRise(col, E.out4(seg(lt, a, a + .5)), 30);
        const h0 = it.h0 != null ? it.h0 : 3, h1 = it.h1 != null ? it.h1 : h0;
        const g = it.growAt != null ? E.inOut3(seg(lt, it.growAt, it.growAt + (it.growDur || 1.2))) : 1;
        const n = lerp(h0, h1, g);
        rows.forEach((r, k) => { const v = clamp(n - k); r.style.opacity = v; r.style.transform = `scaleY(${v})`; });
        const top = rows[Math.max(0, Math.ceil(n) - 1)];
        head.style.transform = `translateY(${px(-(Math.max(0, n) * 18 * U))})`;
      });
    },
    sfx: (p) => p.items.flatMap((it, i) => { const l = [{ at: at(it, i, 0, p.step), kind: 'pop-soft', gain: .45 }]; if (it.growAt != null) l.push({ at: it.growAt, kind: 'stack', dur: it.growDur || 1.2, gain: .5 }); return l; }),
  });

  /* grid：网格逐格填满（风格墙 / 成千上万 → 筛选高亮） */
  def('grid', {
    box: 'right-wide', enter: 'fade',
    defaults: { count: 24, cols: 6, images: [], fill: 1.4, delay: .1, highlight: [], highlightAt: null, counter: '', gap: 10, radius: 10, dim: false },
    build(el, p) {
      el.classList.add('grd');
      const g = h('div', { class: 'grd-g', style: { gridTemplateColumns: `repeat(${p.cols},1fr)`, gap: fs(p.gap) } });
      p._cells = Array.from({ length: p.count }, (_, i) => {
        const c = h('div', { class: 'grd-c', style: { borderRadius: fs(p.radius) } });
        const img = p.images[i % Math.max(1, p.images.length)];
        if (p.images.length) c.style.backgroundImage = `url("${img}")`;
        else c.classList.add('ph');
        g.append(c); return c;
      });
      el.append(g);
      if (p.counter) { p._ct = h('div', { class: 'grd-ct' }); el.append(p._ct); }
      const r = rng(hash(p.counter || 'g') + p.count); p._order = p._cells.map((_, i) => i).sort(() => r() - .5);
    },
    update(el, lt, p) {
      const per = p.fill / Math.max(1, p.count);
      let shown = 0;
      p._order.forEach((idx, k) => {
        const a = p.delay + k * per; const v = popIn(lt, a); const c = p._cells[idx];
        c.style.opacity = clamp(v * 2); c.style.transform = `scale(${clamp(v, 0, 1.1)})`; if (lt >= a) shown++;
      });
      if (p.highlight.length) {
        const ha = p.highlightAt != null ? p.highlightAt : p.delay + p.fill + .3; const w = E.out3(seg(lt, ha, ha + .4));
        p._cells.forEach((c, i) => { const on = p.highlight.includes(i); c.classList.toggle('hot', on && lt >= ha); if (!on) c.style.opacity = String(+c.style.opacity * lerp(1, .25, w)); });
      }
      if (p._ct) p._ct.textContent = p.counter.replace('{n}', shown).replace('{N}', p.count);
    },
    sfx: (p) => { const l = [{ at: p.delay, kind: 'cascade', dur: p.fill, gain: .45 }]; if (p.highlight.length) l.push({ at: p.highlightAt != null ? p.highlightAt : p.delay + p.fill + .3, kind: 'sparkle', gain: .6 }); return l; },
  });

  /* cards：截图卡扇形飞入 / 横排 / 堆叠 */
  def('cards', {
    box: 'right-wide', enter: 'none',
    defaults: { items: [], layout: 'fan', step: .14, ratio: 16 / 10, size: .42, labels: true },
    build(el, p) {
      el.classList.add('crd', 'lay-' + p.layout);
      const B = p.__box; const n = p.items.length;
      p._els = p.items.map((it, i) => {
        const o = typeof it === 'string' ? { src: it } : it;
        const w = B.w * (o.size || p.size); const hh = w / (o.ratio || p.ratio);
        const c = h('div', { class: 'crd-c', style: { width: px(w), height: px(hh) } });
        if (o.src) c.append(h('div', { class: 'crd-img', style: { backgroundImage: `url("${o.src}")` } }));
        else c.append(h('div', { class: 'crd-ph' }, h('b', {}, o.title || ''), h('i'), h('i'), h('i')));
        if (o.label && p.labels) c.append(h('div', { class: 'crd-lab' }, o.label));
        el.append(c);
        let x, y, r;
        const mid = (n - 1) / 2;
        if (p.layout === 'fan') { x = B.w / 2 + (i - mid) * w * .62; y = B.h / 2 + Math.abs(i - mid) * hh * .1; r = (i - mid) * 7; }
        else if (p.layout === 'row') { x = B.w / 2 + (i - mid) * w * 1.08; y = B.h / 2; r = 0; }
        else { x = B.w / 2 + (i - mid) * 18 * U; y = B.h / 2 + (i - mid) * 14 * U; r = (i - mid) * 2.5; }
        if (o.x != null) x = o.x * B.w; if (o.y != null) y = o.y * B.h; if (o.rot != null) r = o.rot;
        return { c, x, y, r, w, hh, a: at(o, i, 0, p.step) };
      });
    },
    update(el, lt, p) {
      p._els.forEach(e => {
        const v = clamp(spring(lt - e.a, 2.2, .62), 0, 1.08);
        const ix = e.x + (1 - v) * 260 * U, iy = e.y + (1 - v) * 200 * U;
        e.c.style.opacity = clamp((lt - e.a) / .12);
        e.c.style.transform = `translate(${px(ix - e.w / 2)},${px(iy - e.hh / 2 + Math.sin(lt * 1.1 + e.a * 5) * 4 * U)}) rotate(${e.r * v + (1 - v) * 18}deg)`;
      });
    },
    sfx: (p) => p.items.map((it, i) => ({ at: at(it, i, 0, p.step), kind: 'card', gain: .5 })),
  });

  /* =================================================================
     三、界面模拟（真实截图优先；无真实画面时标“界面示意”）
     ================================================================= */

  /* window：应用窗口（截图 / 录屏帧序列 / 示意界面），支持推近、光标点击、标注 */
  def('window', {
    box: 'right-wide', enter: 'rise',
    defaults: { title: '', src: '', seq: '', seqFps: 30, seqFrames: 0, seqOffset: 0, sim: false, zoom: [], cursor: [], callouts: [], highlights: [], chrome: 'mac', fit: 'cover', body: null },
    build(el, p) {
      el.classList.add('win', 'ch-' + p.chrome);
      const bar = h('div', { class: 'win-bar' }, h('i'), h('i'), h('i'), h('span', {}, p.title));
      const view = h('div', { class: 'win-view' });
      const canvas = h('div', { class: 'win-canvas' });
      p._img = h('img', { class: 'win-img', alt: '', style: { objectFit: p.fit } });
      if (p.src) p._img.setAttribute('src', p.src);
      if (p.src || p.seq) canvas.append(p._img);
      if (p.body) { const b = h('div', { class: 'win-body', html: p.body }); canvas.append(b); }
      p._hls = (p.highlights || []).map(hl => { const d = h('div', { class: 'win-hl', style: { left: hl.x * 100 + '%', top: hl.y * 100 + '%', width: hl.w * 100 + '%', height: hl.h * 100 + '%' } }); if (hl.label) d.append(h('span', {}, hl.label)); canvas.append(d); return { d, hl }; });
      p._cur = h('div', { class: 'win-cursor' }, icon('cursor', .9)); p._ring = h('div', { class: 'win-ring' });
      canvas.append(p._ring, p._cur);
      p._cos = (p.callouts || []).map(co => { const d = h('div', { class: 'win-co', style: { left: co.x * 100 + '%', top: co.y * 100 + '%' }, html: mark(co.t, co.hl) }); canvas.append(d); return { d, co }; });
      view.append(canvas); el.append(bar, view);
      if (p.sim) el.append(h('div', { class: 'win-sim' }, '界面示意'));
      p._canvas = canvas;
    },
    update(el, lt, p, ctx, k, t) {
      if (p.seq) {
        const fr = Math.max(0, Math.min(p.seqFrames - 1, Math.floor((lt + p.seqOffset) * p.seqFps)));
        const src = p.seq.replace('%06d', String(fr + 1).padStart(6, '0'));
        if (p._img.getAttribute('src') !== src) p._img.setAttribute('src', src);
      }
      /* 推近：zoom:[{at, x, y, s, dur}]  x,y 为目标中心（0–1） */
      let z = { s: 1, x: .5, y: .5 };
      for (const zk of p.zoom) { if (lt < zk.at) break; const f = E.glide(seg(lt, zk.at, zk.at + (zk.dur || .7))); z = { s: lerp(z.s, zk.s || 1, f), x: lerp(z.x, zk.x == null ? .5 : zk.x, f), y: lerp(z.y, zk.y == null ? .5 : zk.y, f) }; }
      p._canvas.style.transformOrigin = `${z.x * 100}% ${z.y * 100}%`;
      p._canvas.style.transform = `scale(${z.s})`;
      /* 光标：cursor:[{at,x,y,click}] */
      let c = null, cp = null;
      for (const ck of p.cursor) { if (lt < ck.at) break; cp = c; c = ck; }
      if (c) {
        const prev = cp || c; const f = E.glide(seg(lt, c.at, c.at + (c.dur || .55)));
        const x = lerp(prev.x, c.x, f), y = lerp(prev.y, c.y, f);
        css(p._cur, { left: x * 100 + '%', top: y * 100 + '%', opacity: 1 });
        const cl = c.click ? seg(lt, c.at + (c.dur || .55), c.at + (c.dur || .55) + .45) : 0;
        css(p._ring, { left: x * 100 + '%', top: y * 100 + '%', opacity: cl > 0 && cl < 1 ? 1 - cl : 0, transform: `translate(-50%,-50%) scale(${.3 + cl * 1.4})` });
        p._cur.style.transform = `scale(${c.click && cl > 0 && cl < .2 ? .85 : 1})`;
      } else p._cur.style.opacity = 0, p._ring.style.opacity = 0;
      p._hls.forEach(({ d, hl }) => { const v = E.inOut3(seg(lt, hl.at || 0, (hl.at || 0) + .4)); d.style.opacity = v; d.style.setProperty('--p', v); });
      p._cos.forEach(({ d, co }) => applyPop(d, popIn(lt, co.at || 0)));
    },
    sfx: (p) => { const l = []; (p.cursor || []).forEach(c => { if (c.click) l.push({ at: c.at + (c.dur || .55), kind: 'click', gain: .8 }); }); (p.zoom || []).forEach(z => l.push({ at: z.at, kind: 'zoom', gain: .45 })); (p.callouts || []).forEach(c => l.push({ at: c.at || 0, kind: 'pop', gain: .5 })); (p.highlights || []).forEach(x => l.push({ at: x.at || 0, kind: 'marker', gain: .5 })); return l; },
  });

  /* phone：手机（通知数跳涨 / 消息列表 / 录音 / 截图） */
  def('phone', {
    box: [.6, .1, .3, .78], enter: 'slide-u',
    defaults: { screen: 'notify', badgeFrom: 0, badgeTo: 99, badgeDur: 1.2, items: [], step: .35, src: '', title: '', app: '' },
    build(el, p) {
      el.classList.add('phn');
      const B = p.__box; const hh = B.h; const w = Math.min(B.w, hh * .5);
      const body = h('div', { class: 'phn-b', style: { width: px(w), height: px(hh) } });
      const scr = h('div', { class: 'phn-s scr-' + p.screen });
      body.append(h('div', { class: 'phn-notch' }), scr); el.append(body);
      if (p.src) scr.append(h('div', { class: 'phn-img', style: { backgroundImage: `url("${p.src}")` } }));
      if (p.title) scr.append(h('div', { class: 'phn-title' }, p.title));
      if (p.screen === 'notify') { p._badge = h('div', { class: 'phn-badge' }, '0'); const app = h('div', { class: 'phn-app' }, icon(p.appIcon || 'chat', 1.4), h('span', {}, p.app || '消息')); app.append(p._badge); scr.append(app); }
      if (p.screen === 'record') { p._wave = h('div', { class: 'phn-wave' }); for (let i = 0; i < 28; i++) p._wave.append(h('i')); p._time = h('div', { class: 'phn-time' }, '00:00'); scr.append(p._time, p._wave, h('div', { class: 'phn-rec' })); }
      p._els = (p.items || []).map((it, i) => { const o = typeof it === 'string' ? { t: it } : it; const r = h('div', { class: 'phn-i' + (o.me ? ' me' : '') }, h('b', {}, o.who || ''), h('span', { html: mark(o.t, o.hl) })); scr.append(r); return { r, a: at(o, i, .3, p.step) }; });
    },
    update(el, lt, p) {
      if (p._badge) { const f = E.out3(seg(lt, .2, .2 + p.badgeDur)); const v = Math.round(lerp(p.badgeFrom, p.badgeTo, f)); p._badge.textContent = v >= 99 && p.badgeTo >= 99 ? '99+' : String(v); p._badge.style.transform = `scale(${1 + .25 * Math.abs(Math.sin(f * Math.PI * 4)) * (1 - f)})`; }
      if (p._wave) { [...p._wave.children].forEach((b, i) => { b.style.transform = `scaleY(${.2 + .8 * Math.abs(Math.sin(lt * 6 + i * .7) * Math.sin(lt * 2.3 + i))})`; }); p._time.textContent = '00:' + String(Math.floor(lt)).padStart(2, '0'); }
      p._els.forEach(({ r, a }) => applyRise(r, E.out4(seg(lt, a, a + .4)), 20));
    },
    sfx: (p) => { const l = [{ at: 0, kind: 'swoosh-soft', gain: .5 }]; if (p.screen === 'notify') l.push({ at: .2, kind: 'notify', dur: p.badgeDur, gain: .5 }); (p.items || []).forEach((it, i) => l.push({ at: at(it, i, .3, p.step), kind: 'message', gain: .5 })); return l; },
  });

  /* doc：文档（字数进度 / 高亮句子 / 批注标签逐条出现） */
  def('doc', {
    box: 'right', enter: 'rise',
    defaults: { title: '逐字稿', lines: 12, fillFrom: 0, fillTo: 1, fillAt: .2, fillDur: 1.4, marks: [], counter: '', sim: true, text: null },
    build(el, p) {
      el.classList.add('doc');
      const page = h('div', { class: 'doc-p' });
      page.append(h('div', { class: 'doc-t' }, p.title));
      const r = rng(hash(p.title) + 3);
      p._ls = Array.from({ length: p.lines }, (_, i) => { const l = h('div', { class: 'doc-l', style: { width: (55 + r() * 42) + '%' } }); if (p.text && p.text[i]) { l.classList.add('txt'); l.textContent = p.text[i]; l.style.width = 'auto'; } page.append(l); return l; });
      p._ms = (p.marks || []).map(m => { const tag = h('div', { class: 'doc-m tone-' + (m.tone || 'yellow') }, m.t); page.append(tag); return { m, tag }; });
      el.append(page);
      if (p.counter) { p._ct = h('div', { class: 'doc-ct' }); el.append(p._ct); }
    },
    update(el, lt, p) {
      const f = lerp(p.fillFrom, p.fillTo, E.inOut2(seg(lt, p.fillAt, p.fillAt + p.fillDur)));
      p._ls.forEach((l, i) => { const v = clamp(f * p.lines - i); l.style.setProperty('--f', v); l.style.opacity = v > 0 ? 1 : .12; });
      p._ms.forEach(({ m, tag }) => {
        const l = p._ls[m.line] || p._ls[0];
        tag.style.top = px(l.offsetTop - 2 * U); tag.style.left = m.side === 'l' ? px(-8 * U) : 'auto';
        const v = popIn(lt, m.at || 0); applyPop(tag, v);
        l.classList.toggle('mk-' + (m.tone || 'yellow'), lt >= (m.at || 0));
      });
      if (p._ct) { const [a, b] = p.counter.split('/'); p._ct.textContent = `${Math.round(f * (+b || 1000))}/${b || ''} ${p.counterUnit || '字'}`; }
    },
    sfx: (p) => { const l = [{ at: p.fillAt, kind: 'typing', dur: p.fillDur, gain: .35 }]; (p.marks || []).forEach(m => l.push({ at: m.at || 0, kind: 'marker', gain: .55 })); return l; },
  });

  /* chat：对话气泡逐条出现（我 / AI） */
  def('chat', {
    box: 'left', enter: 'rise',
    defaults: { msgs: [], step: 1, size: 30, typing: true },
    build(el, p) {
      el.classList.add('cht');
      p._els = p.msgs.map((m, i) => { const r = h('div', { class: 'cht-m ' + (m.who === 'me' ? 'me' : 'ai'), style: { fontSize: fs(m.size || p.size) } }); if (m.name) r.append(h('b', {}, m.name)); const tx = h('span', { html: mark(m.t, m.hl) }); r.append(tx); const dots = h('em', { class: 'cht-dots' }, h('i'), h('i'), h('i')); r.append(dots); el.append(r); return { r, tx, dots, m, a: at(m, i, 0, p.step) }; });
    },
    update(el, lt, p) {
      p._els.forEach(({ r, tx, dots, m, a }) => {
        applyRise(r, E.out4(seg(lt, a, a + .4)), 24);
        const ty = p.typing && m.who !== 'me' ? .55 : 0;
        const show = lt >= a + ty;
        tx.style.display = show ? '' : 'none'; dots.style.display = show ? 'none' : '';
        [...dots.children].forEach((d, i) => d.style.opacity = .3 + .7 * Math.abs(Math.sin(lt * 5 - i * .7)));
      });
    },
    sfx: (p) => p.msgs.map((m, i) => ({ at: at(m, i, 0, p.step) + (m.who === 'me' ? 0 : .55), kind: m.who === 'me' ? 'send' : 'message', gain: .55 })),
  });

  /* progress：任务进度（35% → 100%）+ 确认弹窗 */
  def('progress', {
    box: 'right', enter: 'rise',
    defaults: { title: 'Agent · 执行任务中', from: 0, to: 100, at0: .3, dur: 2, steps: 5, dialog: null, doneText: '任务完成', sim: true },
    build(el, p) {
      el.classList.add('prg');
      p._t = h('div', { class: 'prg-t' }, icon('bot', .9), h('span', {}, p.title));
      p._v = h('div', { class: 'prg-v' }, '0%');
      p._bar = h('div', { class: 'prg-bar' }, h('i'));
      p._st = h('div', { class: 'prg-st' }); p._dots = Array.from({ length: p.steps }, (_, i) => { const d = h('i', {}, String(i + 1)); p._st.append(d); return d; });
      p._done = h('div', { class: 'prg-done' }, icon('check', .8), h('span', {}, p.doneText));
      el.append(p._t, p._v, p._bar, p._st, p._done);
      if (p.dialog) { p._dlg = h('div', { class: 'prg-dlg' }, h('b', {}, p.dialog.title || '需要你确认'), h('span', {}, p.dialog.body || '允许执行这一步吗？'), h('div', { class: 'prg-btns' }, h('em', {}, p.dialog.no || '拒绝'), h('em', { class: 'ok' }, p.dialog.yes || '允许'))); el.append(p._dlg); }
      if (p.sim) el.append(h('div', { class: 'win-sim' }, '界面示意'));
    },
    update(el, lt, p) {
      let f = E.inOut2(seg(lt, p.at0, p.at0 + p.dur));
      if (p._dlg) { const da = p.dialog.at, dd = p.dialog.hold || 1.2; if (lt >= da && lt < da + dd) f = Math.min(f, seg(da, p.at0, p.at0 + p.dur)); applyPop(p._dlg, lt < da + dd ? popIn(lt, da) : 1 - E.in2(seg(lt, da + dd, da + dd + .25)), 'translate(-50%,-50%)'); }
      const v = lerp(p.from, p.to, f);
      p._v.textContent = Math.round(v) + '%'; p._bar.firstChild.style.transform = `scaleX(${v / 100})`;
      p._dots.forEach((d, i) => d.classList.toggle('on', v / 100 >= (i + 1) / p.steps - .001));
      applyRise(p._done, v >= 99.5 ? E.out4(seg(lt, p.at0 + p.dur, p.at0 + p.dur + .4)) : 0, 12);
    },
    sfx: (p) => { const l = [{ at: p.at0 + p.dur, kind: 'success', gain: .7 }]; if (p.dialog) l.push({ at: p.dialog.at, kind: 'alert', gain: .6 }, { at: p.dialog.at + (p.dialog.hold || 1.2) - .15, kind: 'click', gain: .7 }); return l; },
  });

  /* media：图片 / 视频帧序列（B-roll、产品图、梗图），可斜置、圆角、描边 */
  def('media', {
    box: 'right', enter: 'zoom',
    defaults: { src: '', seq: '', seqFps: 30, seqFrames: 0, seqOffset: 0, fit: 'cover', radius: 22, tilt: 0, shadow: true, label: '', kenburns: .04 },
    build(el, p) {
      el.classList.add('med' + (p.shadow ? ' sh' : ''));
      el.style.borderRadius = fs(p.radius);
      p._img = h('img', { class: 'med-img', alt: '', style: { objectFit: p.fit } }); if (p.src) p._img.setAttribute('src', p.src);
      el.append(p._img);
      if (p.label) el.append(h('div', { class: 'med-lab' }, p.label));
      if (p.tilt) el.style.transform = `rotate(${p.tilt}deg)`;
    },
    update(el, lt, p) {
      if (p.seq) { const fr = Math.max(0, Math.min(p.seqFrames - 1, Math.floor((lt + p.seqOffset) * p.seqFps))); const src = p.seq.replace('%06d', String(fr + 1).padStart(6, '0')); if (p._img.getAttribute('src') !== src) p._img.setAttribute('src', src); }
      p._img.style.transform = `scale(${1 + p.kenburns * clamp(lt / 6)})`;
    },
    sfx: () => [{ at: 0, kind: 'swoosh-soft', gain: .45 }],
  });

  /* logo：品牌字 / Logo 卡（玻璃 / 金属 / 霓虹） */
  def('logo', {
    box: 'mid-l', enter: 'pop',
    defaults: { text: 'Claude', src: '', icon: '', style: 'glass', size: 64, sub: '' },
    build(el, p) {
      el.classList.add('lgo', 'sty-' + p.style);
      const b = h('div', { class: 'lgo-b' });
      if (p.src) b.append(h('img', { src: p.src, style: { height: fs(p.size * 1.2) } }));
      if (p.icon) b.append(icon(p.icon, p.size / 34));
      if (p.text) b.append(h('span', { style: { fontSize: fs(p.size) } }, p.text));
      if (p.sub) b.append(h('small', { style: { fontSize: fs(p.size * .32) } }, p.sub));
      el.append(b); p._b = b;
    },
    update(el, lt, p) { p._b.style.setProperty('--sheen', ((lt * .5) % 1.6 - .3) * 100 + '%'); },
    sfx: () => [{ at: 0, kind: 'shine', gain: .5 }],
  });

  /* highlight：在画面任意区域画圈 / 框（录屏重点） */
  def('highlight', {
    box: [.3, .3, .3, .2], enter: 'none',
    defaults: { shape: 'box', label: '', tone: 'accent', draw: .45 },
    build(el, p) { el.classList.add('hlt', 'sh-' + p.shape, 'tone-' + p.tone); p._f = h('div', { class: 'hlt-f' }); el.append(p._f); if (p.label) { p._l = h('div', { class: 'hlt-l' }, p.label); el.append(p._l); } },
    update(el, lt, p) { const v = E.inOut3(seg(lt, 0, p.draw)); p._f.style.setProperty('--p', v); p._f.style.opacity = clamp(v * 3); if (p._l) applyPop(p._l, popIn(lt, p.draw * .8)); },
    sfx: () => [{ at: 0, kind: 'marker', gain: .6 }],
  });

  /* confetti：彩纸爆炸（兴奋 / 成就） */
  def('confetti', {
    box: 'full', enter: 'none', lint: false,
    defaults: { n: 90, x: .5, y: .55, spread: 1, colors: null, dur: 2.2 },
    build(el, p) {
      el.classList.add('cft');
      const r = rng(hash('cft' + p.x + p.y) + p.n);
      const cols = p.colors || ['var(--accent)', 'var(--accent2)', 'var(--hl)', '#fff', 'var(--accent3)'];
      p._ps = Array.from({ length: p.n }, () => { const d = h('i', { style: { background: cols[Math.floor(r() * cols.length)], width: fs(8 + r() * 10), height: fs(14 + r() * 12) } }); el.append(d); const ang = -Math.PI / 2 + (r() - .5) * 2.4 * p.spread; const sp = (700 + r() * 900) * U; return { d, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: r() * 720 - 360, ph: r() * 6 }; });
    },
    update(el, lt, p, ctx) {
      const B = p.__box; const ox = B.w * p.x, oy = B.h * p.y;
      p._ps.forEach(q => { const u = lt; const x = ox + q.vx * u * .9 + Math.sin(u * 4 + q.ph) * 20 * U; const y = oy + q.vy * u + 1500 * U * u * u * .5; q.d.style.transform = `translate(${px(x)},${px(y)}) rotate(${q.rot * u}deg) scaleX(${Math.cos(u * 8 + q.ph)})`; q.d.style.opacity = 1 - seg(u, p.dur * .65, p.dur); });
    },
    sfx: () => [{ at: 0, kind: 'confetti', gain: .8 }],
  });

  /* arrow：手绘箭头 / 指引线 */
  def('arrow', {
    box: [.4, .4, .2, .1], enter: 'none',
    defaults: { dir: 'right', curve: .25, tone: 'hl', draw: .4, label: '' },
    build(el, p) {
      el.classList.add('arw', 'tone-' + p.tone);
      const B = p.__box; const w = B.w, hh = B.h;
      const pts = { right: [0, hh / 2, w, hh / 2], left: [w, hh / 2, 0, hh / 2], down: [w / 2, 0, w / 2, hh], up: [w / 2, hh, w / 2, 0] }[p.dir] || [0, hh / 2, w, hh / 2];
      const [x1, y1, x2, y2] = pts; const mx = (x1 + x2) / 2 + (y2 - y1) * p.curve, my = (y1 + y2) / 2 - (x2 - x1) * p.curve;
      const ang = Math.atan2(y2 - my, x2 - mx); const ah = 22 * U;
      el.innerHTML = `<svg width="${w}" height="${hh}" overflow="visible"><path class="arw-p" pathLength="100" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/><path class="arw-h" pathLength="100" d="M${x2 - ah * Math.cos(ang - .5)},${y2 - ah * Math.sin(ang - .5)} L${x2},${y2} L${x2 - ah * Math.cos(ang + .5)},${y2 - ah * Math.sin(ang + .5)}"/></svg>`;
      if (p.label) el.append(h('div', { class: 'arw-l' }, p.label));
    },
    update(el, lt, p) { const v = E.inOut3(seg(lt, 0, p.draw)); const a = el.querySelector('.arw-p'), b = el.querySelector('.arw-h'); a.style.strokeDasharray = `${v * 100} 100`; b.style.strokeDasharray = `${E.out3(seg(lt, p.draw * .85, p.draw + .15)) * 100} 100`; },
    sfx: () => [{ at: 0, kind: 'scribble', gain: .45 }],
  });

  /* dayan：直接调用 大琰DAYAN 动效库里的卡（iframe + 逐帧 seek） */
  def('dayan', {
    box: 'full', enter: 'fade', lint: false,
    defaults: { id: 'T02', text: {}, props: null, wall: null, lib: 'assets/dayan-library/dayan-library.html' },
    build(el, p, ctx) {
      el.classList.add('dyn');
      const f = h('iframe', { class: 'dyn-f', src: (p.lib) + '?embed=1', scrolling: 'no' });
      el.append(f); p._f = f; p._ready = false; p._rid = 0; p._wait = {};
      const B = p.__box; f.style.transform = `scale(${B.w / 1920}, ${B.h / 1080})`;
      window.addEventListener('message', e => {
        const m = e.data; if (!m || m.vs !== 1 || e.source !== f.contentWindow) return;
        if (m.event === 'ready') { p._ready = true; p._send({ cmd: 'mount', id: p.id, text: p.text, props: p.props, wall: p.wall, noTag: true, ident: ctx.brand.name ? { name: ctx.brand.name, handle: ctx.brand.handle || '' } : null }); }
        if (m.rid && p._wait[m.rid]) { p._wait[m.rid](); delete p._wait[m.rid]; }
      });
      p._send = (msg) => new Promise(res => { const rid = ++p._rid; p._wait[rid] = res; f.contentWindow.postMessage(Object.assign({ vs: 1, rid }, msg), '*'); setTimeout(res, 1500); });
    },
    update(el, lt, p) { if (p._ready) { const pr = p._send({ cmd: 'seek', t: Math.max(0, lt) }); (window.__dmsPending = window.__dmsPending || []).push(pr); } },
    sfx: () => [{ at: 0, kind: 'whoosh', gain: .5 }],
  });

  /* =================================================================
     四、背景 / 环境层
     ================================================================= */
  /* bg-wall：品牌文字墙（连续空间，缓慢平移） */
  def('bg-wall', {
    enter: 'none', exit: 'none',
    defaults: { text: '', rows: 9, speed: 26, tilt: -8, skin: 'mono', opacity: 1, size: 120 },
    build(el, p, ctx) {
      el.classList.add('bgw', 'skin-' + p.skin);
      const word = p.text || (ctx.brand.wall || ctx.brand.name || ((window.TIMELINE || {}).brand || {}).name || '') ;
      const inner = h('div', { class: 'bgw-in', style: { transform: `rotate(${p.tilt}deg)` } });
      p._rows = Array.from({ length: p.rows }, (_, i) => { const r = h('div', { class: 'bgw-r' + (i % 2 ? ' alt' : ''), style: { fontSize: fs(p.size) } }); r.textContent = (word + ' · ').repeat(14); inner.append(r); return r; });
      el.append(inner); el.style.opacity = p.opacity;
    },
    update(el, lt, p, ctx, k, t) { p._rows.forEach((r, i) => { const dir = i % 2 ? 1 : -1; const off = ((t * p.speed * U * dir) % (r.scrollWidth / 2 || 1000)); r.style.transform = `translateX(${px(off - (i % 2 ? 600 * U : 0))})`; }); },
  });
  /* bg-thumbs：倾斜作品墙（证据蒙太奇），推近 */
  def('bg-thumbs', {
    enter: 'none', exit: 'none',
    defaults: { images: [], cols: 9, rows: 6, tilt: -10, push: [1.25, 1], pushDur: 1.6, dim: .35, speed: 14 },
    build(el, p) {
      el.classList.add('bgt');
      const g = h('div', { class: 'bgt-g', style: { gridTemplateColumns: `repeat(${p.cols},1fr)` } });
      const n = p.cols * p.rows; const r = rng(77);
      for (let i = 0; i < n; i++) { const c = h('div', { class: 'bgt-c' }); if (p.images.length) c.style.backgroundImage = `url("${p.images[i % p.images.length]}")`; else c.style.setProperty('--hue', Math.floor(r() * 360)); g.append(c); }
      el.append(g, h('div', { class: 'bgt-dim', style: { opacity: p.dim } })); p._g = g;
    },
    update(el, lt, p, ctx, k, t) { const f = E.out3(seg(lt, 0, p.pushDur)); const s = lerp(p.push[0], p.push[1], f); p._g.style.transform = `rotate(${p.tilt}deg) scale(${s}) translateX(${px(-t * p.speed * U)})`; p._g.style.filter = f < .98 ? `blur(${((1 - f) * 6).toFixed(1)}px)` : ''; },
  });
  /* bg-burst：漫画放射线 + 网点 */
  def('bg-burst', {
    enter: 'none', exit: 'none',
    defaults: { c1: 'var(--burst1)', c2: 'var(--burst2)', rays: 22, spin: 6, halftone: true, cx: .5, cy: .5 },
    build(el, p) {
      el.classList.add('bgb');
      const stops = []; for (let i = 0; i < p.rays; i++) { const a = i * 360 / p.rays, b = a + 180 / p.rays; stops.push(`${p.c1} ${a}deg ${b}deg`, `${p.c2} ${b}deg ${a + 360 / p.rays}deg`); }
      p._r = h('div', { class: 'bgb-r', style: { background: `conic-gradient(from 0deg at ${p.cx * 100}% ${p.cy * 100}%, ${stops.join(',')})` } });
      el.append(p._r); if (p.halftone) el.append(h('div', { class: 'bgb-ht' })); el.append(h('div', { class: 'bgb-v' }));
    },
    update(el, lt, p, ctx, k, t) { p._r.style.transform = `rotate(${t * p.spin}deg) scale(1.6)`; },
  });
  /* bg-grid / bg-hud / bg-paper / bg-solid / bg-film / bg-glow / bg-watermark */
  def('bg-solid', { enter: 'none', exit: 'none', defaults: { color: 'var(--bg)', gradient: '' }, build(el, p) { el.classList.add('bgs'); el.style.background = p.gradient || p.color; } });
  def('bg-grid', {
    enter: 'none', exit: 'none', defaults: { perspective: true, speed: 40 },
    build(el, p) { el.classList.add('bgg'); p._g = h('div', { class: 'bgg-g' + (p.perspective ? ' persp' : '') }); el.append(h('div', { class: 'bgg-sky' }), p._g); },
    update(el, lt, p, ctx, k, t) { p._g.style.backgroundPosition = `0 ${px(t * p.speed * U)}`; },
  });
  def('bg-hud', {
    enter: 'none', exit: 'none', defaults: { label: '', corner: true },
    build(el, p, ctx) { el.classList.add('bgh'); el.append(h('div', { class: 'bgh-f' }), h('div', { class: 'bgh-scan' })); if (p.label) el.append(h('div', { class: 'bgh-l' }, p.label)); ['tl', 'tr', 'bl', 'br'].forEach(c => el.append(h('i', { class: 'bgh-c ' + c }))); p._scan = el.querySelector('.bgh-scan'); },
    update(el, lt, p, ctx, k, t) { p._scan.style.transform = `translateY(${px(((t * 120 * U) % (ctx.H * 1.2)) - ctx.H * .1)})`; },
  });
  def('bg-paper', { enter: 'none', exit: 'none', defaults: { tone: 'cream', lines: false }, build(el, p) { el.classList.add('bgp', 'tone-' + p.tone); if (p.lines) el.classList.add('lined'); el.append(h('div', { class: 'grain' })); } });
  def('bg-film', {
    enter: 'none', exit: 'none', defaults: { warm: true },
    build(el, p) { el.classList.add('bgf'); if (p.warm) el.classList.add('warm'); p._gr = h('div', { class: 'grain' }); el.append(p._gr, h('div', { class: 'bgf-v' })); },
    update(el, lt, p, ctx, k, t) { const f = Math.floor(t * 12); p._gr.style.backgroundPosition = `${(f * 37) % 200}px ${(f * 53) % 200}px`; },
  });
  def('bg-glow', {
    enter: 'none', exit: 'none', defaults: { a: 'var(--accent)', b: 'var(--accent2)', speed: .15 },
    build(el, p) { el.classList.add('bgl'); p._a = h('div', { class: 'bgl-a', style: { background: p.a } }); p._b = h('div', { class: 'bgl-b', style: { background: p.b } }); el.append(p._a, p._b, h('div', { class: 'grain' })); },
    update(el, lt, p, ctx, k, t) { p._a.style.transform = `translate(${px(Math.sin(t * p.speed) * 160 * U)},${px(Math.cos(t * p.speed * .8) * 90 * U)})`; p._b.style.transform = `translate(${px(Math.cos(t * p.speed * .7) * 200 * U)},${px(Math.sin(t * p.speed * 1.1) * 110 * U)})`; },
  });
  def('bg-watermark', {
    enter: 'none', exit: 'none', defaults: { text: 'Context', italic: true, size: 380, y: .38, drift: 18, base: 'glow' },
    build(el, p) { el.classList.add('bgm'); el.append(h('div', { class: 'bgm-base ' + p.base })); p._w = h('div', { class: 'bgm-w' + (p.italic ? ' it' : ''), style: { fontSize: fs(p.size), top: p.y * 100 + '%' } }, p.text); el.append(p._w); },
    update(el, lt, p, ctx, k, t) { p._w.style.transform = `translate(-50%,-50%) translateX(${px(-t * p.drift * U)})`; },
  });
})();
