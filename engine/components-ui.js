/* =====================================================================
   组件库 · 界面与媒体族
   手机 / 软件窗口（录屏、局部放大、光标点击、便签） / 文档标注 / 对话 / 任务进度 / 素材卡 / Logo / 图标贴纸
   DAYAN 动效库卡片（iframe 嵌入 + 逐帧 seek）
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, esc = DMS.esc, el = DMS.el;

  /* 图片序列（B-roll 录屏帧）：{path:'media/rec/%05d.jpg', fps, count, offset} */
  function seqSrc(seq, lt) {
    const f = Math.max(0, Math.min((seq.count || 1e9) - 1, Math.floor((lt + (seq.offset || 0)) * (seq.fps || 30))));
    return seq.path.replace(/%0(\d)d/, (m, n) => String(f + 1).padStart(+n, '0'));
  }
  function setImg(img, src) { if (src && img.getAttribute('src') !== src) { img.setAttribute('src', src); DMS.wait(img.decode().catch(() => { })); } }
  DMS.seqSrc = seqSrc; DMS.setImg = setImg;

  /* ====== phone：手机（通知角标跳涨 / 消息列表 / 录音 / 截图） ====== */
  C.phone = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-phone', 'ph-' + (p.mode || 'list'));
      const f = el('div', 'pf', '<i class="notch"></i>', e);
      const scr = el('div', 'scr', '', f);
      const st = el('div', 'sb', `<b>${esc(p.time || '9:41')}</b><span>${DMS.icon('globe')}</span>`, scr);
      let img = null, list = null, badge = null, rec = null;
      if (p.title) el('div', 'ttl', `${esc(p.title)}${p.badge ? '<span class="bdg"></span>' : ''}`, scr);
      badge = scr.querySelector('.bdg');
      if (p.image || p.seq) { img = el('img', 'shot', null, scr); if (p.image) img.src = p.image; }
      if (p.items) list = (p.items || []).map((it, i) => { const o = typeof it === 'string' ? { t: it } : it; return { r: el('div', 'msg', `<i class="av">${o.icon ? DMS.icon(o.icon) : esc((o.who || o.t || '?')[0])}</i><div><b>${esc(o.who || o.t)}</b>${o.who ? `<p>${esc(o.t)}</p>` : o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div>${o.badge ? `<em>${esc(o.badge)}</em>` : ''}`, scr), at: o.at == null ? 0.3 + i * 0.25 : o.at }; });
      if (p.mode === 'record') rec = el('div', 'rec', `<div class="wave">${Array.from({ length: 28 }, () => '<i></i>').join('')}</div><div class="rt"></div><div class="rb"><i></i></div>`, scr);
      return { img, list, badge, rec, wave: rec ? [...rec.querySelectorAll('.wave i')] : null };
    },
    update(e, lt, p, s, L, t) {
      if (s.badge && p.badge) { const b = p.badge; const k = E.outExpo(prog(lt, b.at || 0.4, b.dur || 1.2)); const v = Math.round(lerp(b.from || 0, b.to || 99, k)); s.badge.textContent = b.max && v >= b.max ? b.max + '+' : v; s.badge.style.transform = `scale(${1 + 0.25 * Math.sin(Math.PI * clamp(k * 6 % 1))})`; }
      if (s.list) s.list.forEach(m => { const k = prog(lt, m.at, 0.4); m.r.style.opacity = clamp(k * 3); m.r.style.transform = `translateY(${lerp(-30, 0, E.outExpo(k))}px)`; });
      if (s.img && p.seq) setImg(s.img, seqSrc(p.seq, lt));
      if (s.wave) { s.wave.forEach((w, i) => { w.style.height = (8 + Math.abs(Math.sin(t * 7 + i * 0.7) * Math.sin(t * 2.3 + i)) * 46) + '%'; }); const sec = Math.max(0, lt); s.rec.querySelector('.rt').textContent = `00:${String(Math.floor(sec)).padStart(2, '0')}.${String(Math.floor(sec * 10) % 10)}`; }
    },
    sfx: p => { const a = [{ at: 0, kind: 'whoosh-soft', gain: 0.4 }]; if (p.badge) a.push({ at: p.badge.at || 0.4, kind: 'notify', gain: 0.55 }); (p.items || []).forEach((it, i) => a.push({ at: (it.at == null ? 0.3 + i * 0.25 : it.at), kind: 'notify-soft', gain: 0.3 })); return a; },
  };

  /* ====== window：软件窗口 / 浏览器（真实录屏、截图或"界面示意"），支持局部放大、光标点击、便签、圈选 ====== */
  C.window = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-window', 'wc-' + (p.chrome || 'mac'), p.dark ? 'dark' : 'light');
      const bar = p.chrome === 'none' ? null : el('div', 'wb', `<i></i><i></i><i></i><span>${esc(p.title || p.url || '')}</span>${p.badge ? `<em>${esc(p.badge)}</em>` : ''}`, e);
      const vp = el('div', 'wv', '', e);
      const cam = el('div', 'wcam', '', vp);
      let img = null;
      if (p.image || p.seq) { img = el('img', 'wimg', null, cam); if (p.image) img.src = p.image; if (p.fit) img.style.objectFit = p.fit; }
      if (p.html) el('div', 'whtml', p.html, cam);
      if (p.sim) el('div', 'simtag', '界面示意', e);
      const marks = (p.highlight || []).map(h => { const m = el('div', 'wmark', h.label ? `<span>${esc(h.label)}</span>` : '', cam); Object.assign(m.style, { left: h.box[0] * 100 + '%', top: h.box[1] * 100 + '%', width: h.box[2] * 100 + '%', height: h.box[3] * 100 + '%' }); return { m, h }; });
      const notes = (p.callouts || []).map(c => { const n = el('div', 'wnote', esc(c.text), vp); n.style.left = c.x * 100 + '%'; n.style.top = c.y * 100 + '%'; return { n, c }; });
      const cur = p.cursor ? el('div', 'wcur', '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9 19z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><i class="rip"></i>', vp) : null;
      return { img, cam, marks, notes, cur };
    },
    update(e, lt, p, s) {
      if (s.img && p.seq) setImg(s.img, seqSrc(p.seq, lt));
      /* 镜头：zoom 关键帧 [{at, x, y, s, dur}]，x/y 为放大中心（0..1） */
      let z = { x: 0.5, y: 0.5, s: 1 };
      (p.zoom || []).forEach(k => { if (lt >= k.at) { const q = E.smooth(prog(lt, k.at, k.dur || 0.7)); z = { x: lerp(z.x, k.x == null ? 0.5 : k.x, q), y: lerp(z.y, k.y == null ? 0.5 : k.y, q), s: lerp(z.s, k.s || 1, q) }; } });
      s.cam.style.transformOrigin = `${z.x * 100}% ${z.y * 100}%`;
      s.cam.style.transform = `scale(${z.s})`;
      s.marks.forEach(({ m, h }) => { const k = E.inOutCubic(prog(lt, h.at || 0, 0.45)); m.style.opacity = k > 0 ? 1 : 0; m.style.setProperty('--mk', k.toFixed(3)); if (h.out != null && lt > h.out) m.style.opacity = 1 - prog(lt, h.out, 0.3); });
      s.notes.forEach(({ n, c }) => { const k = prog(lt, c.at || 0, 0.4); n.style.opacity = clamp(k * 3) * (c.out != null ? 1 - prog(lt, c.out, 0.3) : 1); n.style.transform = `translate(-50%,-100%) scale(${lerp(0.6, 1, E.spring(k))}) rotate(-2deg)`; });
      if (s.cur) {
        const ks = p.cursor; let x = ks[0].x, y = ks[0].y, rip = -1;
        ks.forEach((k, i) => { if (i === 0) return; const pv = ks[i - 1]; const d = k.dur || 0.6; const st = k.at - d; if (lt >= st) { const q = E.inOutCubic(prog(lt, st, d)); x = lerp(pv.x, k.x, q); y = lerp(pv.y, k.y, q); } if (k.click && lt >= k.at) rip = lt - k.at; });
        if (ks[0].click && lt >= ks[0].at) rip = lt - ks[0].at;
        s.cur.style.left = x * 100 + '%'; s.cur.style.top = y * 100 + '%';
        s.cur.style.opacity = clamp(prog(lt, ks[0].at - 0.3, 0.3) * 3);
        const r = s.cur.querySelector('.rip'); r.style.opacity = rip >= 0 && rip < 0.5 ? 1 - rip * 2 : 0; r.style.transform = `translate(-50%,-50%) scale(${rip >= 0 ? 0.3 + rip * 3 : 0})`;
        s.cur.querySelector('svg').style.transform = `scale(${rip >= 0 && rip < 0.15 ? 0.82 : 1})`;
      }
    },
    sfx: p => {
      const a = [{ at: 0, kind: 'whoosh-soft', gain: 0.4 }];
      (p.zoom || []).forEach(z => a.push({ at: z.at, kind: (z.s || 1) >= 1 ? 'zoom-in' : 'zoom-out', gain: 0.35 }));
      (p.cursor || []).forEach(k => { if (k.click) a.push({ at: k.at, kind: 'click', gain: 0.6 }); });
      (p.callouts || []).forEach(c => a.push({ at: c.at || 0, kind: 'pop', gain: 0.4 }));
      (p.highlight || []).forEach(h => a.push({ at: h.at || 0, kind: 'draw', gain: 0.35, dur: 0.4 }));
      return a;
    },
  };

  /* ====== doc：文档卡（灰行骨架或真文本），逐条高亮 + 侧边批注 + 字数计数 ====== */
  C.doc = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-doc', p.dark ? 'dark' : 'light');
      el('div', 'dh', `${DMS.icon(p.icon || 'doc')}<b>${esc(p.title || '文档')}</b>${p.tag ? `<em>${esc(p.tag)}</em>` : ''}`, e);
      const body = el('div', 'db', '', e);
      const rnd = DMS.rand(DMS.hash(p.title || 'doc'));
      const lines = (p.text || Array.from({ length: p.lines || 12 }, () => null)).map((tx, i) => {
        const r = el('div', 'dl' + (tx ? ' tx' : ''), tx ? DMS.hl(tx, p.hl) : '', body);
        if (!tx) r.style.width = (55 + rnd() * 42) + '%';
        return r;
      });
      const hls = (p.highlights || []).map(h => { const ln = lines[h.line] || lines[0]; ln.classList.add('mk-' + (h.tone || 'yellow')); const n = h.note ? el('em', 'dn tn-' + (h.tone || 'yellow'), esc(h.note), ln) : null; return { ln, n, h }; });
      const cnt = p.counter ? el('div', 'dc', '', e) : null;
      return { lines, hls, cnt };
    },
    update(e, lt, p, s) {
      if (p.typing) { const k = prog(lt, p.typing.at || 0, p.typing.dur || 1.5); s.lines.forEach((l, i) => { const q = clamp(k * s.lines.length - i); l.style.clipPath = `inset(0 ${(1 - q) * 100}% 0 0)`; }); }
      s.hls.forEach(({ ln, n, h }) => { const k = E.inOutCubic(prog(lt, h.at || 0, 0.4)); ln.style.setProperty('--hk', k.toFixed(3)); if (n) { const q = prog(lt, (h.at || 0) + 0.25, 0.35); n.style.opacity = clamp(q * 3); n.style.transform = `translateY(-50%) scale(${lerp(0.5, 1, E.spring(q))})`; } });
      if (s.cnt) { const c = p.counter; const k = E.outCubic(prog(lt, c.at || 0, c.dur || 1)); s.cnt.innerHTML = `${esc(c.label || '')} <b>${Math.round(lerp(c.from || 0, c.to, k)).toLocaleString()}</b> / ${(c.max || c.to).toLocaleString()} ${esc(c.unit || '字')}`; }
    },
    sfx: p => { const a = [{ at: 0, kind: 'paper', gain: 0.45 }]; (p.highlights || []).forEach(h => a.push({ at: h.at || 0, kind: 'marker', gain: 0.4 })); if (p.typing) a.push({ at: p.typing.at || 0, kind: 'typing', dur: p.typing.dur || 1.5, gain: 0.35 }); if (p.counter) a.push({ at: p.counter.at || 0, kind: 'roll', dur: (p.counter.dur || 1) * 0.8, gain: 0.3 }); return a; },
  };

  /* ====== chat：对话回放（我 ↔ AI），AI 先打点再出字 ====== */
  C.chat = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-chat', p.dark ? 'dark' : 'light');
      if (p.title) el('div', 'chd', `${DMS.icon(p.icon || 'spark')}<b>${esc(p.title)}</b>`, e);
      const box = el('div', 'chb', '', e);
      const msgs = (p.msgs || []).map((m, i) => {
        const r = el('div', 'cm ' + (m.who === 'me' ? 'me' : 'ai'), `${m.who === 'me' ? '' : `<i class="av">${DMS.icon(p.aiIcon || 'spark')}</i>`}<div class="bb"><span class="dots"><i></i><i></i><i></i></span><span class="txt">${DMS.hl(m.t, m.hl)}</span></div>`, box);
        return { r, m, at: m.at == null ? i * 1.2 : m.at };
      });
      return { msgs, box };
    },
    update(e, lt, p, s) {
      let shownH = 0;
      s.msgs.forEach(({ r, m, at }) => {
        const k = prog(lt, at, 0.4); r.style.display = lt >= at ? 'flex' : 'none';
        r.style.opacity = clamp(k * 3); r.style.transform = `translateY(${lerp(20, 0, E.outExpo(k))}px)`;
        const think = m.who !== 'me' ? (m.think == null ? 0.7 : m.think) : 0;
        r.classList.toggle('thinking', lt < at + think);
        if (lt >= at) shownH += r.offsetHeight + 16;
      });
      const over = shownH - s.box.offsetHeight; s.box.scrollTop = 0;
      s.box.firstChild && (s.box.style.setProperty('--shift', (over > 0 ? -over : 0) + 'px'));
    },
    sfx: p => (p.msgs || []).flatMap((m, i) => { const at = m.at == null ? i * 1.2 : m.at; return m.who === 'me' ? [{ at, kind: 'send', gain: 0.5 }] : [{ at: at + (m.think == null ? 0.7 : m.think), kind: 'receive', gain: 0.45 }]; }),
  };

  /* ====== progress：任务进度卡（Agent 执行中 35% → 需要确认 → 100% 完成） ====== */
  C.progress = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-progress', p.dark ? 'dark' : 'light');
      el('div', 'ph', `${DMS.icon(p.icon || 'bot')}<b>${esc(p.title || '任务执行中')}</b><span class="pp"></span>`, e);
      el('div', 'pbar', '<i></i>', e);
      const steps = (p.steps || []).map(t => el('div', 'pst', `<span>${DMS.icon('check')}</span>${esc(t)}`, e));
      const dlg = p.dialog ? el('div', 'pdlg', `<b>${esc(p.dialog.title || '需要你确认')}</b><p>${esc(p.dialog.text || '允许执行这一步？')}</p><div><span class="no">${esc(p.dialog.no || '拒绝')}</span><span class="ok">${esc(p.dialog.ok || '允许')}</span></div>`, e) : null;
      const done = p.done ? el('div', 'pdone', `${DMS.icon('check')}${esc(p.done.text || '任务完成')}`, e) : null;
      return { pp: e.querySelector('.pp'), bar: e.querySelector('.pbar i'), steps, dlg, done };
    },
    update(e, lt, p, s) {
      const d = p.dialog, segs = [];
      const from = p.from || 0, to = p.to == null ? 100 : p.to, at = p.at || 0.3, dur = p.dur || 2;
      let v;
      if (d) { const stop = d.stopAt == null ? (from + to) / 2 : d.stopAt; const a = E.outCubic(prog(lt, at, dur * 0.4)); const b = E.inOutCubic(prog(lt, (d.pressAt || d.at + 1) + 0.2, dur * 0.6)); v = b > 0 ? lerp(stop, to, b) : lerp(from, stop, a); }
      else v = lerp(from, to, E.inOutCubic(prog(lt, at, dur)));
      s.pp.textContent = Math.round(v) + '%'; s.bar.style.width = v + '%';
      s.steps.forEach((st, i) => st.classList.toggle('on', v >= ((i + 1) / s.steps.length) * 100 - 1));
      if (s.dlg) { const k = prog(lt, d.at, 0.35); const out = prog(lt, (d.pressAt || d.at + 1) + 0.15, 0.3); s.dlg.style.opacity = clamp(k * 3) * (1 - out); s.dlg.style.transform = `translate(-50%,-50%) scale(${lerp(0.8, 1, E.spring(k))})`; s.dlg.querySelector('.ok').classList.toggle('press', lt >= (d.pressAt || d.at + 1) && out < 1); }
      if (s.done) { const k = prog(lt, p.done.at, 0.4); s.done.style.opacity = clamp(k * 3); s.done.style.transform = `scale(${lerp(0.6, 1, E.spring(k))})`; }
    },
    sfx: p => { const a = [{ at: 0, kind: 'whoosh-soft', gain: 0.35 }]; if (p.dialog) { a.push({ at: p.dialog.at, kind: 'alert', gain: 0.5 }); a.push({ at: p.dialog.pressAt || p.dialog.at + 1, kind: 'click', gain: 0.65 }); } if (p.done) a.push({ at: p.done.at, kind: 'success', gain: 0.6 }); return a; },
  };

  /* ====== media：素材卡（截图 / 录屏帧序列 / 照片），可带相框、倾斜、慢推 ====== */
  C.media = {
    enter: 'zoom',
    build(e, p) {
      e.classList.add('c-media', 'mf-' + (p.frame || 'card'));
      const img = el('img', 'mi', null, el('div', 'mw', '', e));
      if (p.src) img.src = p.src;
      img.style.objectFit = p.fit || 'cover';
      if (p.position) img.style.objectPosition = p.position;
      if (p.caption) el('div', 'mc', esc(p.caption), e);
      if (p.radius != null) e.style.setProperty('--m-r', p.radius + 'px');
      if (p.tilt) e.style.transform = `perspective(1600px) rotateY(${p.tilt}deg)`;
      return { img };
    },
    update(e, lt, p, s) {
      if (p.seq) setImg(s.img, seqSrc(p.seq, lt));
      if (p.kenburns) { const k = p.kenburns; const q = prog(lt, 0, k.dur || 6); s.img.style.transform = `scale(${lerp(k.from || 1, k.to || 1.1, q)}) translate(${lerp(0, k.x || 0, q)}%,${lerp(0, k.y || 0, q)}%)`; }
    },
    enterSfx: 'whoosh-soft',
  };

  /* ====== logo：品牌字卡 / 玻璃 Logo 卡（Claude Code / GPT / Codex） ====== */
  C.logo = {
    enter: 'pop',
    build(e, p) {
      e.classList.add('c-logo', 'lg-' + (p.style || 'glass'));
      el('div', 'lw', `${p.src ? `<img src="${esc(p.src)}">` : p.icon ? DMS.icon(p.icon) : ''}<b>${esc(p.text || '')}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`, e);
      if (p.color) e.style.setProperty('--lg-c', p.color);
    },
    enterSfx: 'pop-big',
  };

  /* ====== sticker：单个图标 / emoji 贴纸弹出（😂 / ✓ / 🔥） ====== */
  C.sticker = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-sticker', 'sk-' + (p.style || 'round'));
      const s = el('div', 'sw', `${DMS.icon(p.icon || 'star')}${p.text ? `<b>${esc(p.text)}</b>` : ''}`, e);
      s.style.rotate = (p.rotate == null ? -6 : p.rotate) + 'deg';
      return { s };
    },
    update(e, lt, p, s, L, t) { const k = prog(lt, 0, 0.45); s.s.style.transform = `scale(${E.spring(k, 0.35, 15)}) translateY(${p.bob ? Math.sin(t * 2.4) * 6 : 0}px)`; s.s.style.opacity = clamp(k * 4); },
    sfx: () => [{ at: 0, kind: 'pop-big', gain: 0.5 }],
  };

  /* ====== mark：在任意区域画圈 / 下划线 / 荧光笔（强调画面某处） ====== */
  C.mark = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-mark', 'mk-' + (p.style || 'box'));
      const W = e.parentNode.offsetWidth, H = e.parentNode.offsetHeight;
      const shape = p.style === 'circle' ? `<ellipse pathLength="100" cx="${W / 2}" cy="${H / 2}" rx="${W / 2 - 6}" ry="${H / 2 - 6}"/>` : p.style === 'under' ? `<path pathLength="100" d="M6 ${H - 8} Q${W / 2} ${H - 18} ${W - 6} ${H - 6}"/>` : `<rect pathLength="100" x="4" y="4" width="${W - 8}" height="${H - 8}" rx="14"/>`;
      e.innerHTML = p.style === 'marker' ? '<i class="mb"></i>' : `<svg width="${W}" height="${H}">${shape}</svg>`;
      if (p.label) el('div', 'ml', esc(p.label), e);
      return { sh: e.querySelector('svg > *'), mb: e.querySelector('.mb'), ml: e.querySelector('.ml') };
    },
    update(e, lt, p, s) { const k = E.inOutCubic(prog(lt, 0, p.dur || 0.5)); if (s.sh) s.sh.style.strokeDasharray = `${k * 100} 100`; if (s.mb) s.mb.style.transform = `scaleX(${k})`; if (s.ml) { const q = prog(lt, (p.dur || 0.5) * 0.8, 0.35); s.ml.style.opacity = clamp(q * 3); s.ml.style.transform = `scale(${lerp(0.6, 1, E.spring(q))})`; } },
    sfx: p => [{ at: 0, kind: p.style === 'marker' ? 'marker' : 'draw', gain: 0.4, dur: p.dur || 0.5 }],
  };

  /* ====== dayan：嵌入大琰DAYAN 动效库卡片（334 条），逐帧 seek，可换文案/品牌/文字墙 ====== */
  let dayanSeq = 0;
  C.dayan = {
    enter: 'fade',
    build(e, p, L) {
      e.classList.add('c-dayan');
      const lib = p.library || (window.TIMELINE && window.TIMELINE.dayanLibrary) || 'assets/dayan-library.html';
      const fr = el('iframe', 'dyf', null, e);
      fr.setAttribute('src', lib + (lib.includes('?') ? '&' : '?') + 'embed=1');
      const st = { fr, ready: false, rid: 0, waits: {}, mounted: false, lastT: -1 };
      const id = 'dy' + (dayanSeq++);
      st.ready = new Promise(res => {
        window.addEventListener('message', ev => {
          const m = ev.data; if (!m || m.vs !== 1 || ev.source !== fr.contentWindow) return;
          if (m.event === 'ready') res(true);
          if (m.rid && st.waits[m.rid]) { st.waits[m.rid](m); delete st.waits[m.rid]; }
        });
      });
      st.call = msg => new Promise(res => { const rid = id + ':' + (++st.rid); st.waits[rid] = res; fr.contentWindow.postMessage(Object.assign({ vs: 1, rid }, msg), '*'); setTimeout(() => res({ timeout: true }), 4000); });
      const W = e.parentNode.offsetWidth || 1920; fr.style.transform = `scale(${W / 1920})`;
      return st;
    },
    update(e, lt, p, s) {
      const job = (async () => {
        await s.ready;
        if (!s.mounted) { s.mounted = true; await s.call({ cmd: 'mount', id: p.id, text: p.text, props: p.props, brand: p.brand, wall: p.wall, ident: p.ident || { name: ((window.TIMELINE || {}).brand || {}).name || '', handle: ((window.TIMELINE || {}).brand || {}).handle || '' }, noTag: true, t: 0 }); }
        const tt = Math.max(0, lt * (p.speed || 1));
        if (Math.abs(tt - s.lastT) > 1e-4) { s.lastT = tt; await s.call({ cmd: 'seek', t: tt }); }
      })();
      DMS.wait(job);
    },
    sfx: p => p.sfx || [{ at: 0, kind: 'whoosh-soft', gain: 0.4 }],
  };
})();
