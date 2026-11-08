/* =====================================================================
   组件库 · 文字与标注族
   每个组件：build(el, props, L) 只建一次 DOM；update(el, lt, props, state, L, t) 每帧调用
   lt = 当前时间 - 本层 at（秒）；t = 全片时间。sfx(props) 返回相对 at 的音效事件。
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, esc = DMS.esc, el = DMS.el;

  /* ---------- 线性图标（stroke=currentColor） ---------- */
  const IC = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>', up: '<path d="M12 20V5M6 11l6-6 6 6"/>', down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
    star: '<path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/>', heart: '<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 4 4 7.2 4c2 0 3.6 1.2 4.8 2.8C13.2 5.2 14.8 4 16.8 4 20 4 22.4 7.2 21.2 10.6 19.5 15.4 12 20 12 20z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    bot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 13v.5M15 13v.5"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', gift: '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
    play: '<path d="M7 4l13 8-13 8z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>', cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    cloud: '<path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.3 3.3 0 007 18z"/>', fire: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>', video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 4v16M15 4v16"/>', file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    book: '<path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6M20 4v14h-6"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0012 3z"/>',
  };
  DMS.icon = function (name, cls) {
    if (!name) return '';
    if (/^(https?:|data:|\.{0,2}\/|assets\/|media\/)/.test(name) || /\.(png|jpe?g|svg|webp)$/i.test(name)) return `<img class="dms-ico-img ${cls || ''}" src="${esc(name)}">`;
    if (IC[name]) return `<svg class="dms-ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${IC[name]}</svg>`;
    return `<span class="dms-emoji ${cls || ''}">${esc(name)}</span>`;
  };
  DMS.ICONS = Object.keys(IC);

  /* 逐字拆分（保留高亮分组），返回 html 与字符数 */
  function splitChars(text, hl, cls) {
    const marks = (Array.isArray(hl) ? hl : hl ? [hl] : []).filter(Boolean);
    let n = 0, html = '';
    String(text).split('\n').forEach((line, li, arr) => {
      let i = 0;
      while (i < line.length) {
        const m = marks.find(w => line.startsWith(w, i));
        if (m) { html += `<em class="${cls || 'hl'}">` + [...m].map(ch => `<span class="ch" data-i="${n++}">${esc(ch)}</span>`).join('') + '</em>'; i += m.length; }
        else { const ch = line[i]; html += ch === ' ' ? '<span class="ch sp" data-i="' + (n++) + '">&nbsp;</span>' : `<span class="ch" data-i="${n++}">${esc(ch)}</span>`; i++; }
      }
      if (li < arr.length - 1) html += '<br>';
    });
    return { html, n };
  }
  DMS.splitChars = splitChars;

  /* ====== title：大标题（逐字 / 上浮 / 擦出 / 砸入 / 打字） ====== */
  C.title = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('c-title', 'st-' + (p.style || 'heavy'), 'al-' + (p.align || 'left'));
      if (p.color) e.style.setProperty('--t-color', p.color);
      if (p.size) e.style.setProperty('--t-size', p.size + 'px');
      const eb = p.eyebrow ? el('div', 'eyebrow', esc(p.eyebrow), e) : null;
      const sp = splitChars(p.text || '', p.hl);
      const h = el('div', 'tt', sp.html, e);
      const sub = p.sub ? el('div', 'sub', DMS.hl(p.sub, p.subHl), e) : null;
      const bar = p.underline ? el('div', 'uline', '', e) : null;
      if (p.reveal === 'slam') DMS.shake(L.at + 0.14, p.shake == null ? 16 : p.shake);
      return { chars: [...h.querySelectorAll('.ch')], h, eb, sub, bar, n: sp.n };
    },
    update(e, lt, p, s) {
      const mode = p.reveal || 'chars', st = p.stagger == null ? Math.min(0.055, 0.9 / Math.max(1, s.n)) : p.stagger;
      const done = mode === 'chars' ? s.n * st + 0.45 : mode === 'type' ? s.n / (p.cps || 16) : 0.6;
      if (s.eb) { const k = E.outExpo(prog(lt, 0, 0.5)); s.eb.style.opacity = k; s.eb.style.transform = `translateY(${lerp(14, 0, k)}px)`; }
      if (mode === 'chars') s.chars.forEach((c, i) => { const k = prog(lt, 0.08 + i * st, 0.5); const q = E.outExpo(k); c.style.opacity = clamp(k * 2.2); c.style.transform = `translateY(${lerp(0.55, 0, q)}em) rotate(${lerp(6, 0, q)}deg)`; c.style.filter = k < 1 ? `blur(${lerp(8, 0, E.outQuart(k)).toFixed(1)}px)` : ''; });
      else if (mode === 'type') { const n = Math.floor(lt * (p.cps || 16)); s.chars.forEach((c, i) => { c.style.opacity = i < n ? 1 : 0; }); }
      else if (mode === 'rise') { const k = E.outExpo(prog(lt, 0.05, 0.7)); s.h.style.transform = `translateY(${lerp(60, 0, k)}px)`; s.h.style.opacity = clamp(k * 1.8); s.h.style.filter = `blur(${lerp(10, 0, k).toFixed(1)}px)`; }
      else if (mode === 'mask') { const k = E.inOutExpo(prog(lt, 0.05, 0.8)); s.h.style.clipPath = `inset(-10% ${((1 - k) * 100).toFixed(1)}% -10% 0)`; }
      else if (mode === 'slam') { const k = prog(lt, 0, 0.2); s.h.style.transform = `scale(${lerp(2.4, 1, E.outBack(k, 1.4))})`; s.h.style.opacity = clamp(k * 4); }
      if (s.sub) { const k = E.outExpo(prog(lt, Math.min(done, p.subAt == null ? done : p.subAt), 0.6)); s.sub.style.opacity = k; s.sub.style.transform = `translateY(${lerp(18, 0, k)}px)`; }
      if (s.bar) { const k = E.inOutExpo(prog(lt, done * 0.8, 0.6)); s.bar.style.transform = `scaleX(${k})`; }
      /* 高亮色块：在字出现后从左扫入 */
      e.style.setProperty('--hlk', E.inOutCubic(prog(lt, done * 0.7, 0.45)).toFixed(3));
    },
    sfx(p) {
      const m = p.reveal || 'chars';
      if (m === 'slam') return [{ at: 0.1, kind: 'impact', gain: 0.8 }];
      if (m === 'type') return [{ at: 0, kind: 'typing', dur: [...(p.text || '')].length / (p.cps || 16), gain: 0.45 }];
      return [{ at: 0, kind: 'whoosh-soft', gain: 0.45 }];
    },
  };

  /* ====== stamp：印章 / 斜贴纸砸下（HOLD ON! / FREE / 封 / 重中之重） ====== */
  C.stamp = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('c-stamp', 'sk-' + (p.style || 'box'));
      if (p.color) e.style.setProperty('--s-color', p.color);
      if (p.size) e.style.setProperty('--s-size', p.size + 'px');
      const w = el('div', 'stw', '', e);
      w.style.rotate = (p.rotate == null ? -7 : p.rotate) + 'deg';
      const b = el('div', 'stb', esc(p.text || 'HOLD ON!') + (p.sub ? `<small>${esc(p.sub)}</small>` : ''), w);
      const ring = el('div', 'string', '', e);
      if (p.shake !== 0) DMS.shake(L.at + 0.16, p.shake || 15, 0.36);
      return { w, b, ring };
    },
    update(e, lt, p, s) {
      const k = prog(lt, 0, 0.2);
      s.w.style.transform = `scale(${lerp(2.6, 1, E.outBack(k, 1.6))})`;
      s.w.style.opacity = clamp(k * 5);
      const r = prog(lt, 0.15, 0.55);
      s.ring.style.opacity = r > 0 && r < 1 ? (1 - r) * 0.9 : 0;
      s.ring.style.transform = `translate(-50%,-50%) scale(${lerp(0.6, 1.9, E.outCubic(r))})`;
    },
    sfx: () => [{ at: 0.14, kind: 'stamp', gain: 0.85 }],
  };

  /* ====== strike：划掉 → 改写（不可能 → 可能！ / v3 → v7） ====== */
  C.strike = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-strike', 'lay-' + (p.layout || 'inline'));
      if (p.size) e.style.setProperty('--k-size', p.size + 'px');
      const a = el('div', 'from', `<span>${esc(p.from || '')}</span><i class="ln"></i><i class="x1"></i><i class="x2"></i>`, e);
      a.classList.add('mk-' + (p.mark || 'line'));
      const ar = p.arrow === false ? null : el('div', 'arr', DMS.icon('arrow'), e);
      const b = el('div', 'to', esc(p.to || ''), e);
      return { a, ar, b, ln: a.querySelector('.ln'), x1: a.querySelector('.x1'), x2: a.querySelector('.x2') };
    },
    update(e, lt, p, s) {
      const sa = p.strikeAt == null ? 0.55 : p.strikeAt, ta = p.toAt == null ? sa + 0.45 : p.toAt;
      const k = E.inOutExpo(prog(lt, sa, 0.28));
      s.ln.style.transform = `scaleX(${k})`;
      s.x1.style.transform = `rotate(42deg) scaleX(${E.outExpo(prog(lt, sa, 0.2))})`;
      s.x2.style.transform = `rotate(-42deg) scaleX(${E.outExpo(prog(lt, sa + 0.12, 0.2))})`;
      s.a.querySelector('span').style.opacity = lerp(1, 0.42, k);
      if (s.ar) { const q = E.outExpo(prog(lt, ta - 0.15, 0.35)); s.ar.style.opacity = q; s.ar.style.transform = `translateX(${lerp(-24, 0, q)}px)`; }
      const q = prog(lt, ta, 0.22);
      s.b.style.opacity = clamp(q * 4);
      s.b.style.transform = `scale(${lerp(2, 1, E.outBack(q, 1.5))}) rotate(${p.toRotate == null ? -4 : p.toRotate}deg)`;
    },
    sfx: p => { const sa = p.strikeAt == null ? 0.55 : p.strikeAt; return [{ at: sa, kind: 'scratch', gain: 0.6 }, { at: p.toAt == null ? sa + 0.45 : p.toAt, kind: 'stamp', gain: 0.6 }]; },
  };

  /* ====== type：输入框 / 终端打字（提示词、命令、搜索） ====== */
  C.type = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-type', 'bx-' + (p.boxStyle || 'input'));
      const head = p.label ? el('div', 'lab', DMS.icon(p.icon || 'spark') + esc(p.label), e) : null;
      const line = el('div', 'line', `<span class="pr">${esc(p.prompt == null ? (p.boxStyle === 'terminal' ? '>' : '') : p.prompt)}</span><span class="tx"></span><i class="caret"></i>`, e);
      if (p.size) line.style.fontSize = p.size + 'px';
      const btn = p.submitAt != null ? el('div', 'send', DMS.icon('arrow'), e) : null;
      const st = p.strikeAt != null ? el('i', 'tstrike', '', line) : null;
      return { tx: line.querySelector('.tx'), caret: line.querySelector('.caret'), btn, st, chars: [...(p.text || '')] };
    },
    update(e, lt, p, s, L, t) {
      const cps = p.cps || 14, start = p.typeAt || 0.2;
      const n = Math.max(0, Math.min(s.chars.length, Math.floor((lt - start) * cps)));
      const txt = s.chars.slice(0, n).join('');
      if (s.tx.textContent !== txt) s.tx.textContent = txt;
      s.caret.style.opacity = (Math.floor(t * 2.2) % 2 === 0 || n < s.chars.length) ? 1 : 0;
      if (s.btn) { const k = prog(lt, p.submitAt, 0.25); s.btn.style.transform = `scale(${k > 0 && k < 1 ? lerp(0.82, 1, E.outBack(k)) : 1})`; s.btn.classList.toggle('on', lt >= p.submitAt); }
      if (s.st) s.st.style.transform = `scaleX(${E.inOutExpo(prog(lt, p.strikeAt, 0.3))})`;
    },
    sfx: p => { const a = [{ at: p.typeAt || 0.2, kind: 'typing', dur: [...(p.text || '')].length / (p.cps || 14), gain: 0.5 }]; if (p.submitAt != null) a.push({ at: p.submitAt, kind: 'click', gain: 0.7 }); if (p.strikeAt != null) a.push({ at: p.strikeAt, kind: 'scratch', gain: 0.5 }); return a; },
  };

  /* ====== chips：胶囊 / 标签 / 玻璃按钮 逐个出现（列举、关键词点亮） ====== */
  C.chips = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-chips', 'dir-' + (p.dir || 'row'), 'cs-' + (p.style || 'glass'), 'al-' + (p.align || 'start'));
      if (p.size) e.style.setProperty('--c-size', p.size + 'px');
      if (p.gap != null) e.style.setProperty('--c-gap', p.gap + 'px');
      const items = (p.items || []).map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const c = el('div', 'chip tn-' + (o.tone || p.tone || 'default'), `${o.icon ? DMS.icon(o.icon) : ''}<b>${DMS.hl(o.t, o.hl)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}`, e);
        if (o.rotate) c.style.rotate = o.rotate + 'deg';
        return { c, o, at: o.at == null ? i * (p.stagger == null ? 0.32 : p.stagger) : o.at };
      });
      return { items };
    },
    update(e, lt, p, s) {
      const mode = p.reveal || 'pop';
      s.items.forEach(({ c, o, at }) => {
        const k = prog(lt, at, mode === 'light' ? 0.3 : 0.42);
        if (mode === 'light') { c.style.opacity = lerp(0.28, 1, E.outQuad(k)); c.classList.toggle('lit', k > 0.05); }
        else { c.style.opacity = clamp(k * 3); c.style.transform = `translateY(${lerp(20, 0, E.outExpo(k))}px) scale(${lerp(0.7, 1, E.spring(k))})`; }
        if (o.off != null) { const q = prog(lt, o.off, 0.3); if (q > 0) c.style.opacity = 1 - q; }
      });
    },
    sfx: p => (p.items || []).map((it, i) => ({ at: (typeof it === 'object' && it.at != null) ? it.at : i * (p.stagger == null ? 0.32 : p.stagger), kind: p.reveal === 'light' ? 'tick' : 'pop', gain: 0.42 })),
  };

  /* ====== equation：A = B 分立人物两侧（Bot = 子Agent） ====== */
  C.equation = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-eq');
      if (p.size) e.style.setProperty('--q-size', p.size + 'px');
      const a = el('div', 'qa', DMS.hl(p.left || '', p.hl), e);
      const o = el('div', 'qo', esc(p.op || '='), e);
      const b = el('div', 'qb', DMS.hl(p.right || '', p.hl), e);
      return { a, o, b };
    },
    update(e, lt, p, s) {
      const ka = E.outExpo(prog(lt, 0, 0.55)), kb = E.outExpo(prog(lt, p.rightAt == null ? 0.35 : p.rightAt, 0.55)), ko = prog(lt, p.opAt == null ? 0.2 : p.opAt, 0.35);
      s.a.style.transform = `translateX(${lerp(-160, 0, ka)}px)`; s.a.style.opacity = clamp(ka * 1.6);
      s.b.style.transform = `translateX(${lerp(160, 0, kb)}px)`; s.b.style.opacity = clamp(kb * 1.6);
      s.o.style.transform = `scale(${lerp(0.3, 1, E.spring(ko))})`; s.o.style.opacity = clamp(ko * 3);
    },
    sfx: p => [{ at: 0, kind: 'whoosh', gain: 0.5 }, { at: p.opAt == null ? 0.2 : p.opAt, kind: 'pop-big', gain: 0.5 }, { at: p.rightAt == null ? 0.35 : p.rightAt, kind: 'whoosh', gain: 0.45 }],
  };

  /* ====== tags：人物两侧"术语雨"，左右交替弹出 ====== */
  C.tags = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-tags', 'tg-' + (p.style || 'glow'));
      const rnd = DMS.rand(DMS.hash((p.left || []).join() + (p.right || []).join()));
      const all = [];
      const col = (arr, side) => arr.forEach((t, i) => {
        const o = typeof t === 'string' ? { t } : t;
        const c = el('div', 'tag', (o.icon ? DMS.icon(o.icon) : '') + esc(o.t), e);
        const n = arr.length; const y = 0.08 + (0.8 * (i + 0.5)) / n + (rnd() - 0.5) * 0.05;
        const x = side === 'l' ? 0.02 + rnd() * 0.1 : 0.98 - rnd() * 0.1;
        c.style.top = (y * 100).toFixed(1) + '%';
        if (side === 'l') c.style.left = (x * 100).toFixed(1) + '%'; else c.style.right = ((1 - x) * 100).toFixed(1) + '%';
        c.style.rotate = ((rnd() - 0.5) * 8).toFixed(1) + 'deg';
        all.push({ c, side, o });
      });
      col(p.left || [], 'l'); col(p.right || [], 'r');
      /* 交替顺序：左右左右 */
      const L = all.filter(a => a.side === 'l'), R = all.filter(a => a.side === 'r'), order = [];
      for (let i = 0; i < Math.max(L.length, R.length); i++) { if (L[i]) order.push(L[i]); if (R[i]) order.push(R[i]); }
      order.forEach((a, i) => (a.at = a.o.at == null ? i * (p.stagger == null ? 0.22 : p.stagger) : a.o.at));
      return { order };
    },
    update(e, lt, p, s, L, t) {
      s.order.forEach(a => { const k = prog(lt, a.at, 0.45); a.c.style.opacity = clamp(k * 3); a.c.style.transform = `translate(${lerp(a.side === 'l' ? -50 : 50, 0, E.outExpo(k))}px, ${Math.sin(t * 1.1 + a.at * 3) * 4}px) scale(${lerp(0.75, 1, E.spring(k))})`; });
    },
    sfx: p => { const n = (p.left || []).length + (p.right || []).length; return Array.from({ length: n }, (_, i) => ({ at: i * (p.stagger == null ? 0.22 : p.stagger), kind: 'pop-soft', gain: 0.3 })); },
  };

  /* ====== chapter：章节标识（#2 巨号 / No.04/10 眉标 / 横条） ====== */
  C.chapter = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('c-chapter', 'ch-' + (p.style || 'giant'));
      const no = el('div', 'no', esc(p.no || '#1'), e);
      const tx = el('div', 'tx', `<b>${DMS.hl(p.title || '', p.hl)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`, e);
      const bar = el('i', 'bar', '', e);
      if ((p.style || 'giant') === 'giant') DMS.shake(L.at + 0.12, 10, 0.3);
      return { no, tx, bar };
    },
    update(e, lt, p, s) {
      const g = (p.style || 'giant') === 'giant';
      const k = prog(lt, 0, g ? 0.22 : 0.5);
      s.no.style.transform = g ? `scale(${lerp(2.2, 1, E.outBack(k, 1.3))})` : `translateY(${lerp(20, 0, E.outExpo(k))}px)`;
      s.no.style.opacity = clamp(k * 4);
      const q = E.outExpo(prog(lt, g ? 0.16 : 0.12, 0.6));
      s.tx.style.transform = `translateX(${lerp(-40, 0, q)}px)`; s.tx.style.opacity = q;
      s.bar.style.transform = `scaleX(${E.inOutExpo(prog(lt, 0.1, 0.7))})`;
    },
    sfx: p => ((p.style || 'giant') === 'giant' ? [{ at: 0.08, kind: 'hit', gain: 0.75 }] : [{ at: 0, kind: 'tick', gain: 0.5 }, { at: 0.1, kind: 'whoosh-soft', gain: 0.35 }]),
  };

  /* ====== nav：常驻章节导航（侧栏目录 / 顶部进度条），当前项随时间移动 ====== */
  C.nav = {
    enter: 'fade',
    build(e, p) {
      e.classList.add('c-nav', 'nv-' + (p.style || 'side'));
      const items = (p.items || []).map((t, i) => el('div', 'it', `<i>${String(i + 1).padStart(2, '0')}</i><b>${esc(t)}</b>`, e));
      const ind = el('div', 'ind', '', e);
      return { items, ind };
    },
    update(e, lt, p, s, L, t) {
      const steps = (p.steps || [{ t: 0, i: p.current || 0 }]).slice().sort((a, b) => a.t - b.t);
      let cur = steps[0].i, prev = cur, pk = 1;
      steps.forEach(st => { if (t >= st.t) { prev = cur; cur = st.i; pk = E.smooth(prog(t, st.t, 0.5)); } });
      const pos = lerp(prev, cur, pk);
      s.items.forEach((it, i) => it.classList.toggle('on', i === cur));
      const a = s.items[Math.floor(pos)], b = s.items[Math.min(s.items.length - 1, Math.ceil(pos))];
      if (a && b) {
        const f = pos - Math.floor(pos);
        const ra = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight }, rb = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
        Object.assign(s.ind.style, { left: lerp(ra.x, rb.x, f) + 'px', top: lerp(ra.y, rb.y, f) + 'px', width: lerp(ra.w, rb.w, f) + 'px', height: lerp(ra.h, rb.h, f) + 'px' });
      }
    },
    sfx: p => (p.steps || []).slice(1).map(st => ({ at: st.t - 0, kind: 'tick', gain: 0.35, abs: true })),
  };

  /* ====== namecard：名牌 / 自我介绍（我叫 XX） ====== */
  C.namecard = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-name', 'nm-' + (p.style || 'big'));
      const n = el('div', 'nm', esc(p.name || ((window.TIMELINE || {}).brand || {}).name || ''), e);
      const h = el('div', 'hd', (p.icon ? DMS.icon(p.icon) : '') + esc(p.handle || ''), e);
      const bar = el('i', 'bar', '', e);
      return { n, h, bar };
    },
    update(e, lt, p, s) {
      const k = E.outExpo(prog(lt, 0, 0.7));
      s.n.style.clipPath = `inset(0 ${((1 - E.inOutExpo(prog(lt, 0, 0.6))) * 100).toFixed(1)}% 0 0)`;
      s.n.style.transform = `translateX(${lerp(-30, 0, k)}px)`;
      const q = E.outExpo(prog(lt, 0.4, 0.5)); s.h.style.opacity = q; s.h.style.transform = `translateY(${lerp(14, 0, q)}px)`;
      s.bar.style.transform = `scaleX(${E.inOutExpo(prog(lt, 0.2, 0.7))})`;
    },
    sfx: () => [{ at: 0, kind: 'whoosh', gain: 0.5 }, { at: 0.42, kind: 'pop-soft', gain: 0.4 }],
  };

  /* ====== bubble：云朵 / 评论 / 对话气泡 ====== */
  C.bubble = {
    enter: 'pop',
    build(e, p) {
      e.classList.add('c-bubble', 'bb-' + (p.style || 'speech'), 'tl-' + (p.tail || 'left'));
      el('div', 'bx', (p.icon ? DMS.icon(p.icon) : '') + `<span>${DMS.hl(p.text || '', p.hl)}</span>` + (p.sub ? `<small>${esc(p.sub)}</small>` : ''), e);
    },
    enterSfx: 'bubble',
  };

  /* ====== echo：描边字重复堆叠（出发喽~ ×3） ====== */
  C.echo = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-echo');
      if (p.size) e.style.setProperty('--e-size', p.size + 'px');
      const rows = Array.from({ length: p.rows || 3 }, (_, i) => el('div', 'row' + (i === 0 ? ' solid' : ''), esc(p.text || ''), e));
      return { rows };
    },
    update(e, lt, p, s) {
      s.rows.forEach((r, i) => { const k = prog(lt, i * 0.09, 0.45); r.style.opacity = clamp(k * 3) * (i === 0 ? 1 : 0.85 - i * 0.18); r.style.transform = `translateY(${lerp(-50, 0, E.outBack(k))}px)`; });
    },
    sfx: p => Array.from({ length: p.rows || 3 }, (_, i) => ({ at: i * 0.09, kind: 'thud', gain: 0.4 - i * 0.08 })),
  };

  /* ====== quote：引用卡（网友评论 / 名言 / 弹幕） ====== */
  C.quote = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-quote', 'qs-' + (p.style || 'cards'));
      const items = (p.items || [p]).map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const c = el('div', 'q', `<span class="qm">“</span><p>${DMS.hl(o.t || o.text || '', o.hl)}</p>${o.who ? `<small>— ${esc(o.who)}</small>` : ''}`, e);
        return { c, at: o.at == null ? i * (p.stagger || 0.5) : o.at, i };
      });
      return { items };
    },
    update(e, lt, p, s) { s.items.forEach(({ c, at, i }) => { const k = prog(lt, at, 0.55); c.style.opacity = clamp(k * 2.5); c.style.transform = `translateX(${lerp(i % 2 ? 60 : -60, 0, E.outExpo(k))}px) rotate(${(i % 2 ? 1.2 : -1.2) * (1 - E.outExpo(k)) * 4}deg)`; }); },
    sfx: p => (p.items || [p]).map((it, i) => ({ at: (it && it.at != null) ? it.at : i * (p.stagger || 0.5), kind: 'pop-soft', gain: 0.4 })),
  };
})();
