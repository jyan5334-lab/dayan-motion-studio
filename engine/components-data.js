/* =====================================================================
   组件库 · 数据、结构与关系族
   数字 / 仪表 / 条形对比 / 对比卡 / 清单 / 流程 / 时间线 / 节点网络 / 记忆堆叠 / 网格 / 卡片阵 / 特效
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, esc = DMS.esc, el = DMS.el;

  const fmt = (v, p) => {
    const d = p.decimals == null ? (Math.abs(p.value % 1) > 0 ? String(p.value).split('.')[1].length : 0) : p.decimals;
    let s = Number(v).toFixed(d);
    if (p.sep !== false && Math.abs(v) >= 1000) { const [a, b] = s.split('.'); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); }
    return s;
  };
  DMS.fmtNum = fmt;

  /* ====== number：巨号数字滚动定格（12.8万 / 92.4% / ¥129/月 / 1亿+） ====== */
  C.number = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-number', 'ns-' + (p.style || 'plain'), 'al-' + (p.align || 'left'));
      if (p.size) e.style.setProperty('--n-size', p.size + 'px');
      if (p.color) e.style.setProperty('--n-color', p.color);
      const lab = p.label ? el('div', 'lab', (p.icon ? DMS.icon(p.icon) : '') + esc(p.label), e) : null;
      const row = el('div', 'row', `<span class="pre">${esc(p.prefix || '')}</span><span class="v"></span><span class="suf">${esc(p.suffix || '')}</span>${p.unit ? `<span class="unit">${esc(p.unit)}</span>` : ''}`, e);
      const sub = p.sub ? el('div', 'sub', DMS.hl(p.sub, p.subHl), e) : null;
      const line = el('i', 'nline', '', e);
      return { lab, row, v: row.querySelector('.v'), sub, line };
    },
    update(e, lt, p, s) {
      const d = p.dur == null ? 1.1 : p.dur;
      const k = prog(lt, 0.1, d);
      const v = lerp(p.from == null ? 0 : p.from, p.value, E.outExpo(k));
      s.v.textContent = p.text && k >= 1 ? p.text : fmt(v, p);
      const ent = prog(lt, 0, 0.35);
      s.row.style.opacity = clamp(ent * 3);
      const punch = prog(lt, 0.1 + d, 0.3);
      s.row.style.transform = `translateY(${lerp(40, 0, E.outExpo(ent))}px) scale(${punch > 0 && punch < 1 ? 1 + 0.07 * Math.sin(Math.PI * punch) : 1})`;
      s.row.style.filter = k < 0.85 ? `blur(${(1 - k) * 3}px)` : '';
      if (s.lab) { const q = E.outExpo(prog(lt, 0, 0.5)); s.lab.style.opacity = q; s.lab.style.transform = `translateY(${lerp(12, 0, q)}px)`; }
      if (s.sub) { const q = E.outExpo(prog(lt, 0.3 + d * 0.6, 0.5)); s.sub.style.opacity = q; s.sub.style.transform = `translateY(${lerp(14, 0, q)}px)`; }
      s.line.style.transform = `scaleX(${E.inOutExpo(prog(lt, 0.2, d))})`;
    },
    sfx: p => { const d = p.dur == null ? 1.1 : p.dur; return [{ at: 0.1, kind: 'roll', dur: d * 0.8, gain: 0.4 }, { at: 0.1 + d, kind: 'ding', gain: 0.6 }]; },
  };

  /* ====== gauge：仪表盘 / 圆环百分比（<1% token / 进度 35%） ====== */
  C.gauge = {
    enter: 'pop',
    build(e, p) {
      e.classList.add('c-gauge', 'gs-' + (p.style || 'arc'));
      const ring = p.style === 'ring';
      const svg = ring
        ? `<svg viewBox="0 0 200 200"><circle class="trk" cx="100" cy="100" r="84"/><circle class="val" cx="100" cy="100" r="84" pathLength="100"/></svg>`
        : `<svg viewBox="0 0 200 120"><path class="trk" d="M20 110 A80 80 0 0 1 180 110"/><path class="val" pathLength="100" d="M20 110 A80 80 0 0 1 180 110"/><line class="ndl" x1="100" y1="110" x2="100" y2="44"/><circle class="hub" cx="100" cy="110" r="7"/></svg>`;
      const gv = el('div', 'gv', svg, e);
      const num = el('div', 'gn', '', ring ? gv : e);
      const lab = p.label ? el('div', 'gl', esc(p.label), e) : null;
      return { val: e.querySelector('.val'), ndl: e.querySelector('.ndl'), num, lab };
    },
    update(e, lt, p, s) {
      const max = p.max || 100, d = p.dur || 1.2;
      const k = E.outExpo(prog(lt, 0.2, d));
      const v = lerp(p.from || 0, p.value, k), f = clamp(v / max);
      s.val.style.strokeDasharray = `${(f * 100).toFixed(2)} 100`;
      if (s.ndl) s.ndl.setAttribute('transform', `rotate(${lerp(-90, 90, f)} 100 110)`);
      s.num.innerHTML = `${esc(p.prefix || '')}${fmt(v, p)}<small>${esc(p.suffix == null ? '%' : p.suffix)}</small>`;
    },
    sfx: p => [{ at: 0.2, kind: 'roll', dur: (p.dur || 1.2) * 0.7, gain: 0.35 }, { at: 0.2 + (p.dur || 1.2), kind: 'ding', gain: 0.5 }],
  };

  /* ====== bars：条形对比 / 成本收缩（时间成本 ↓ token 成本 ↓） ====== */
  C.bars = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-bars');
      if (p.title) el('div', 'bt', esc(p.title), e);
      const max = p.max || Math.max(...(p.items || []).map(i => Math.max(i.value, i.to || 0)), 1);
      const rows = (p.items || []).map((it, i) => {
        const r = el('div', 'br tn-' + (it.tone || 'default'), `<div class="bl">${esc(it.label)}</div><div class="bw"><i class="bf"></i><i class="bo"></i></div><div class="bv"></div>${it.note ? `<div class="bn">${esc(it.note)}</div>` : ''}`, e);
        return { r, it, f: r.querySelector('.bf'), o: r.querySelector('.bo'), v: r.querySelector('.bv'), n: r.querySelector('.bn'), at: it.at == null ? 0.15 + i * 0.25 : it.at };
      });
      return { rows, max };
    },
    update(e, lt, p, s) {
      s.rows.forEach(R => {
        const g = E.outExpo(prog(lt, R.at, 0.9));
        let val = R.it.value * g;
        if (R.it.to != null) { const q = E.inOutExpo(prog(lt, R.it.toAt == null ? R.at + 1.2 : R.it.toAt, 0.8)); val = lerp(val, R.it.to, q); R.o.style.width = (R.it.value / s.max * 100 * (q > 0 ? 1 : 0)) + '%'; R.r.classList.toggle('shrunk', q > 0.5); }
        R.f.style.width = (val / s.max * 100).toFixed(2) + '%';
        R.v.textContent = (R.it.prefix || '') + fmt(val, { value: R.it.to != null ? R.it.to : R.it.value, decimals: R.it.decimals }) + (R.it.unit || p.unit || '');
        if (R.n) R.n.style.opacity = E.outQuad(prog(lt, (R.it.toAt || R.at + 1.2) + 0.4, 0.4));
      });
    },
    sfx: p => (p.items || []).flatMap((it, i) => { const at = it.at == null ? 0.15 + i * 0.25 : it.at; const a = [{ at, kind: 'rise', gain: 0.35, dur: 0.8 }]; if (it.to != null) a.push({ at: it.toAt == null ? at + 1.2 : it.toAt, kind: 'shrink', gain: 0.5 }); return a; }),
  };

  /* ====== compare：对比卡（A → B / A vs B / 三列 + 胜出高亮） ====== */
  C.compare = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-compare', 'cp-' + (p.style || 'cards'));
      const cards = [];
      (p.items || []).forEach((it, i) => {
        if (i > 0 && p.op !== '') { const o = el('div', 'op', p.op === 'vs' ? 'VS' : DMS.icon(p.op === '=' ? 'plus' : 'arrow'), e); if (p.op === '=') o.innerHTML = '='; cards.push({ op: o, at: (it.at == null ? i * (p.stagger || 0.6) : it.at) - 0.15 }); }
        const c = el('div', 'card tn-' + (it.tone || 'default'), `${it.tag ? `<div class="tag">${esc(it.tag)}</div>` : ''}${it.icon ? `<div class="ic">${DMS.icon(it.icon)}</div>` : ''}<div class="ttl">${DMS.hl(it.title || '', it.hl)}</div>${it.body ? `<div class="body">${DMS.hl(it.body, it.bodyHl)}</div>` : ''}${it.big ? `<div class="big">${esc(it.big)}</div>` : ''}<div class="badge">${DMS.icon('check')}</div>`, e);
        cards.push({ c, i, at: it.at == null ? i * (p.stagger || 0.6) : it.at });
      });
      return { cards };
    },
    update(e, lt, p, s) {
      const wa = p.winnerAt == null ? null : p.winnerAt; const wk = wa == null ? 0 : E.outBack(prog(lt, wa, 0.4));
      s.cards.forEach(x => {
        const k = prog(lt, x.at, 0.6);
        if (x.op) { x.op.style.opacity = clamp(k * 3); x.op.style.transform = `scale(${lerp(0.4, 1, E.spring(k))})`; return; }
        const win = p.winner === x.i;
        const base = E.outExpo(k);
        x.c.style.opacity = clamp(k * 2.5) * (wa != null && !win ? lerp(1, 0.45, clamp(wk)) : 1);
        x.c.style.transform = `translateY(${lerp(70, 0, base)}px) rotate(${lerp(x.i % 2 ? 4 : -4, 0, base)}deg) scale(${win ? 1 + 0.06 * clamp(wk) : 1})`;
        x.c.classList.toggle('win', win && lt >= (wa || 0));
      });
    },
    sfx: p => { const a = (p.items || []).map((it, i) => ({ at: it.at == null ? i * (p.stagger || 0.6) : it.at, kind: 'card', gain: 0.45 })); if (p.winnerAt != null) a.push({ at: p.winnerAt, kind: 'success', gain: 0.6 }); return a; },
  };

  /* ====== checklist：日志式清单（✓ 完成 / ⚠ 出问题 / ↑ 上升），可带结论标签 ====== */
  C.checklist = {
    enter: 'rise',
    build(e, p) {
      e.classList.add('c-check', 'ck-' + (p.style || 'log'));
      if (p.title) el('div', 'ct', `${DMS.icon(p.icon || 'bolt')}<b>${esc(p.title)}</b>`, e);
      const rows = (p.items || []).map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const st = o.state || 'ok';
        const ic = { ok: 'check', warn: 'warn', x: 'x', todo: 'clock', up: 'up', down: 'down', star: 'star' }[st] || st;
        const r = el('div', 'row st-' + st, `<span class="ic">${DMS.icon(ic)}</span><b>${DMS.hl(o.t, o.hl)}</b>${o.note ? `<em class="note tn-${o.noteTone || (st === 'warn' || st === 'x' ? 'warn' : 'accent')}">${esc(o.note)}</em>` : ''}`, e);
        return { r, at: o.at == null ? 0.2 + i * 0.6 : o.at, noteAt: o.noteAt, st };
      });
      return { rows };
    },
    update(e, lt, p, s) {
      s.rows.forEach(R => {
        const k = prog(lt, R.at, 0.5);
        R.r.style.opacity = clamp(k * 2.5); R.r.style.transform = `translateX(${lerp(-40, 0, E.outExpo(k))}px)`;
        const ic = R.r.querySelector('.ic'); const q = prog(lt, R.at + 0.18, 0.35); ic.style.transform = `scale(${lerp(0, 1, E.spring(q))})`;
        const n = R.r.querySelector('.note'); if (n) { const z = prog(lt, R.noteAt == null ? R.at + 0.45 : R.noteAt, 0.35); n.style.opacity = clamp(z * 3); n.style.transform = `scale(${lerp(0.6, 1, E.spring(z))})`; }
      });
    },
    sfx: p => (p.items || []).map((it, i) => { const o = typeof it === 'string' ? {} : it; return { at: (o.at == null ? 0.2 + i * 0.6 : o.at) + 0.18, kind: o.state === 'warn' || o.state === 'x' ? 'error' : 'tick-ok', gain: 0.5 }; }),
  };

  /* ====== flow：流程步骤（整理 → 上传 → 分享），连线逐段画出 ====== */
  C.flow = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-flow', 'fl-' + (p.dir || 'row'), 'fs-' + (p.style || 'chip'));
      const steps = (p.steps || []).map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const link = i > 0 ? el('div', 'lk', '<i></i>' + DMS.icon('arrow'), e) : null;
        const s = el('div', 'st tn-' + (o.tone || 'default'), `${o.icon ? DMS.icon(o.icon) : `<span class="n">${i + 1}</span>`}<b>${esc(o.t)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}`, e);
        return { s, link, at: o.at == null ? i * (p.stagger || 0.55) : o.at };
      });
      return { steps };
    },
    update(e, lt, p, s, L, t) {
      const act = p.active ? p.active.filter(a => t >= a.t).map(a => a.i).pop() : null;
      s.steps.forEach((x, i) => {
        const k = prog(lt, x.at, 0.45);
        x.s.style.opacity = clamp(k * 3); x.s.style.transform = `scale(${lerp(0.7, 1, E.spring(k))})`;
        x.s.classList.toggle('on', act == null ? (p.highlightLast && i === s.steps.length - 1 && k > 0.5) : act === i);
        if (x.link) { const q = E.inOutExpo(prog(lt, x.at - 0.3, 0.35)); x.link.style.setProperty('--lk', q.toFixed(3)); x.link.style.opacity = q > 0 ? 1 : 0; }
      });
    },
    sfx: p => (p.steps || []).map((it, i) => ({ at: (it.at == null ? i * (p.stagger || 0.55) : it.at), kind: 'pop', gain: 0.4 })),
  };

  /* ====== timeline：时间线节点（日期 → 事件），当前节点放大 ====== */
  C.timeline = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-timeline');
      const axis = el('i', 'axis', '', e);
      const n = (p.items || []).length;
      const nodes = (p.items || []).map((it, i) => {
        const x = n > 1 ? 4 + (92 * i) / (n - 1) : 50;
        const d = el('div', 'nd' + (it.current ? ' cur' : '') + (i % 2 ? ' dn' : ''), `<i class="dot"></i><div class="lb"><small>${esc(it.date || '')}</small><b>${esc(it.t || '')}</b></div>`, e);
        d.style.left = x + '%';
        return { d, at: it.at == null ? 0.3 + i * 0.4 : it.at };
      });
      return { axis, nodes };
    },
    update(e, lt, p, s) {
      s.axis.style.transform = `scaleX(${E.inOutExpo(prog(lt, 0, (p.items || []).length * 0.4 + 0.3))})`;
      s.nodes.forEach(N => { const k = prog(lt, N.at, 0.45); N.d.style.opacity = clamp(k * 3); N.d.querySelector('.dot').style.transform = `scale(${E.spring(k)})`; N.d.querySelector('.lb').style.transform = `translateY(${lerp(16, 0, E.outExpo(k))}px)`; });
    },
    sfx: p => (p.items || []).map((it, i) => ({ at: it.at == null ? 0.3 + i * 0.4 : it.at, kind: 'tick', gain: 0.45 })),
  };

  /* ====== nodes：中心节点 + 卫星 + 连线 + 流动光点（知识网络 / API 关系 / 子 Agent） ====== */
  C.nodes = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-nodes', 'nd-' + (p.style || 'glow'));
      const W = e.parentNode.offsetWidth || 900, H = e.parentNode.offsetHeight || 600;
      const svg = el('div', 'lines', `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`, e).firstChild;
      const cx = W / 2, cy = H / 2;
      const ctr = el('div', 'ctr', `${p.center && p.center.icon ? DMS.icon(p.center.icon) : ''}<b>${esc((p.center && p.center.t) || '')}</b>${p.center && p.center.sub ? `<small>${esc(p.center.sub)}</small>` : ''}`, e);
      ctr.style.left = cx + 'px'; ctr.style.top = cy + 'px';
      const orbit = p.orbit ? el('i', 'orbit', '', e) : null;
      if (orbit) { const r = Math.min(W, H) * 0.42; Object.assign(orbit.style, { left: cx - r + 'px', top: cy - r + 'px', width: r * 2 + 'px', height: r * 2 + 'px' }); }
      const n = (p.items || []).length;
      const items = (p.items || []).map((it, i) => {
        const o = typeof it === 'string' ? { t: it } : it;
        const ang = (o.ang != null ? o.ang : -90 + (360 * i) / n) * Math.PI / 180;
        const rx = (o.r || 0.4) * W, ry = (o.r || 0.4) * H * 1.05;
        const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
        const d = el('div', 'sat tn-' + (o.tone || 'default'), `${o.icon ? DMS.icon(o.icon) : ''}<b>${esc(o.t)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}`, e);
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        ln.setAttribute('d', `M${cx} ${cy} L${x} ${y}`); ln.setAttribute('pathLength', '100'); ln.setAttribute('class', 'ln' + (p.dashed ? ' dash' : ''));
        svg.appendChild(ln);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '5'); dot.setAttribute('class', 'pkt'); svg.appendChild(dot);
        return { d, ln, dot, x, y, cx, cy, at: o.at == null ? 0.4 + i * (p.stagger || 0.28) : o.at };
      });
      return { ctr, items, orbit };
    },
    update(e, lt, p, s, L, t) {
      const k0 = prog(lt, 0, 0.45);
      s.ctr.style.transform = `translate(-50%,-50%) scale(${lerp(0.4, 1, E.spring(k0))})`; s.ctr.style.opacity = clamp(k0 * 3);
      if (s.orbit) { const q = E.outExpo(prog(lt, 0.2, 1)); s.orbit.style.opacity = q * 0.9; s.orbit.style.transform = `scale(${lerp(0.5, 1, q)}) rotate(${t * 12}deg)`; }
      s.items.forEach((it, i) => {
        const k = prog(lt, it.at, 0.6), q = E.outExpo(k);
        const x = lerp(it.cx, it.x, q), y = lerp(it.cy, it.y, q);
        it.d.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${lerp(0.3, 1, E.spring(k))})`; it.d.style.opacity = clamp(k * 3);
        it.ln.style.strokeDasharray = p.dashed ? '' : `${(q * 100).toFixed(1)} 100`;
        it.ln.style.opacity = q;
        const ph = ((t * 0.55 + i * 0.37) % 1);
        it.dot.setAttribute('cx', lerp(it.cx, it.x, ph)); it.dot.setAttribute('cy', lerp(it.cy, it.y, ph));
        it.dot.style.opacity = k >= 1 && p.flow !== false ? Math.sin(Math.PI * ph) : 0;
      });
    },
    sfx: p => [{ at: 0, kind: 'pop-big', gain: 0.5 }].concat((p.items || []).map((it, i) => ({ at: (it.at == null ? 0.4 + i * (p.stagger || 0.28) : it.at), kind: 'pop-soft', gain: 0.32 }))),
  };

  /* ====== stacks：记忆堆叠 / 柱状积累（每个 Bot 一摞，聊得越多越高） ====== */
  C.stacks = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-stacks');
      const cols = (p.items || []).map((it, i) => {
        const c = el('div', 'col tn-' + (it.tone || 'default'), `<div class="hd">${it.icon ? DMS.icon(it.icon) : DMS.icon('bot')}</div><div class="pile"></div><div class="lb">${esc(it.label || '')}</div>`, e);
        const pile = c.querySelector('.pile'); const max = Math.max(it.h1 || it.h || 6, it.h0 || 0);
        const bars = Array.from({ length: max }, () => el('i', 'pl', '', pile));
        return { c, bars, it, at: it.at == null ? i * (p.stagger || 0.2) : it.at };
      });
      return { cols };
    },
    update(e, lt, p, s) {
      s.cols.forEach(C2 => {
        const k = prog(lt, C2.at, 0.4); C2.c.style.opacity = clamp(k * 3); C2.c.style.transform = `translateY(${lerp(40, 0, E.outExpo(k))}px)`;
        const h0 = C2.it.h0 == null ? (C2.it.h || 6) : C2.it.h0, h1 = C2.it.h1 == null ? h0 : C2.it.h1;
        const g = C2.it.growAt == null ? 1 : E.outCubic(prog(lt, C2.it.growAt, C2.it.growDur || 1.2));
        const nOn = Math.round(lerp(h0, h1, g)) * clamp(prog(lt, C2.at, 0.6) * 1.4);
        C2.bars.forEach((b, j) => { const on = j < nOn; b.style.opacity = on ? 1 : 0; b.style.transform = on ? 'none' : 'translateY(-14px)'; });
      });
    },
    sfx: p => (p.items || []).flatMap((it, i) => { const a = [{ at: it.at == null ? i * (p.stagger || 0.2) : it.at, kind: 'pop-soft', gain: 0.35 }]; if (it.growAt != null) a.push({ at: it.growAt, kind: 'stack', dur: it.growDur || 1.2, gain: 0.4 }); return a; }),
  };

  /* ====== grid：网格逐格填满 + 高亮筛选 + 计数（作品墙 / 成千上万 → 选出几个） ====== */
  C.grid = {
    enter: 'fade',
    build(e, p) {
      e.classList.add('c-grid', 'gd-' + (p.style || 'tiles'));
      const n = p.count || (p.images || []).length || 24, cols = p.cols || 8;
      e.style.setProperty('--cols', cols);
      const g = el('div', 'gw', '', e);
      const rnd = DMS.rand(n * 7 + cols);
      const hues = p.hues || [262, 200, 330, 20, 150, 45];
      const cells = Array.from({ length: n }, (_, i) => {
        const c = el('div', 'cell', '', g);
        const img = p.images && p.images[i % p.images.length];
        if (img) c.style.backgroundImage = `url("${img}")`;
        else if ((p.style || 'tiles') === 'tiles') { const h = hues[Math.floor(rnd() * hues.length)]; c.style.background = `linear-gradient(${Math.floor(rnd() * 360)}deg,hsl(${h} 70% ${30 + rnd() * 25}%),hsl(${(h + 40) % 360} 75% ${45 + rnd() * 20}%))`; }
        return { c, o: rnd() };
      });
      const cnt = p.counter ? el('div', 'cnt', '', e) : null;
      if (p.label) el('div', 'glab', esc(p.label), e);
      return { cells, cnt, n };
    },
    update(e, lt, p, s) {
      const fd = p.fillDur || 1.6, order = p.order === 'random';
      const hl = new Set(p.highlight || []), ha = p.highlightAt;
      let shown = 0;
      s.cells.forEach((x, i) => {
        const at = 0.1 + (order ? x.o : i / s.n) * fd; const k = prog(lt, at, 0.3);
        if (k > 0) shown++;
        x.c.style.opacity = clamp(k * 3) * (ha != null && lt >= ha && !hl.has(i) ? lerp(1, 0.18, E.outQuad(prog(lt, ha, 0.5))) : 1);
        x.c.style.transform = `scale(${lerp(0.4, 1, E.outBack(k))})`;
        x.c.classList.toggle('hl', ha != null && lt >= ha && hl.has(i));
      });
      if (s.cnt) s.cnt.textContent = `${Math.min(shown, p.total || s.n)} / ${p.total || s.n}`;
    },
    sfx: p => { const a = [{ at: 0.1, kind: 'roll', dur: p.fillDur || 1.6, gain: 0.3 }]; if (p.highlightAt != null) a.push({ at: p.highlightAt, kind: 'success', gain: 0.5 }); return a; },
  };

  /* ====== cards：卡片阵（扇形 / 斜置飞入 / 横排 / 散落） ====== */
  C.cards = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-cards', 'cl-' + (p.layout || 'fan'));
      const items = (p.items || []).map((it, i) => {
        const o = typeof it === 'string' ? { img: it } : it;
        const c = el('div', 'cd' + (o.img ? ' has-img' : ''), `${o.img ? `<div class="im" style="background-image:url('${esc(o.img)}')"></div>` : ''}${o.tag ? `<div class="tag">${esc(o.tag)}</div>` : ''}${o.title ? `<b>${DMS.hl(o.title, o.hl)}</b>` : ''}${o.body ? `<p>${esc(o.body)}</p>` : ''}`, e);
        return { c, at: o.at == null ? i * (p.stagger || 0.14) : o.at, i };
      });
      return { items };
    },
    update(e, lt, p, s) {
      const n = s.items.length, lay = p.layout || 'fan';
      s.items.forEach(({ c, at, i }) => {
        const k = prog(lt, at, 0.7), q = E.outExpo(k), sp = E.spring(k, 0.5, 11);
        const mid = (n - 1) / 2, off = i - mid;
        let tx = 0, ty = 0, rot = 0;
        if (lay === 'fan') { tx = off * 210; ty = Math.abs(off) * 26; rot = off * 7; }
        else if (lay === 'row') { tx = off * (p.gap || 330); }
        else if (lay === 'stack') { tx = off * 26; ty = -off * 18; rot = off * 2.5; }
        else if (lay === 'scatter') { const r = DMS.rand(i * 31 + 7); tx = (r() - 0.5) * 900; ty = (r() - 0.5) * 360; rot = (r() - 0.5) * 22; }
        c.style.opacity = clamp(k * 3);
        c.style.transform = `translate(-50%,-50%) translate(${lerp(tx + 500, tx, q)}px,${lerp(ty + 300, ty, q)}px) rotate(${lerp(rot + 25, rot, sp)}deg)`;
        c.style.zIndex = lay === 'stack' ? 10 + i : 10 + n - Math.abs(Math.round(off));
      });
    },
    sfx: p => (p.items || []).map((it, i) => ({ at: (it && it.at != null) ? it.at : i * (p.stagger || 0.14), kind: 'card', gain: 0.35 })),
  };

  /* ====== confetti：彩纸爆炸（太兴奋了 / 成功 / 万粉） ====== */
  C.confetti = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-confetti');
      const r = DMS.rand(p.seed || 9), n = p.count || 90, cols = p.colors || ['#FFD23F', '#FF3D6E', '#2CE0C0', '#4DA3FF', '#8E7CFF', '#ffffff'];
      const bits = Array.from({ length: n }, (_, i) => { const b = el('i', 'cf', '', e); b.style.background = cols[i % cols.length]; const a = r() * Math.PI * 2, v = 380 + r() * 900; return { b, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 500, spin: (r() - 0.5) * 1400, w: 8 + r() * 12, ratio: 0.35 + r() * 0.6 }; });
      bits.forEach(x => { x.b.style.width = x.w + 'px'; x.b.style.height = x.w * x.ratio + 'px'; });
      return { bits };
    },
    update(e, lt, p, s) {
      const ox = (p.x == null ? 0.5 : p.x) * e.offsetWidth, oy = (p.y == null ? 0.5 : p.y) * e.offsetHeight;
      s.bits.forEach(x => {
        const tt = Math.max(0, lt), drag = 1 - Math.exp(-2.2 * tt);
        const px = ox + x.vx * drag / 2.2, py = oy + x.vy * drag / 2.2 + 600 * tt * tt * 0.5;
        x.b.style.transform = `translate(${px}px,${py}px) rotate(${x.spin * tt}deg) rotateX(${tt * 700}deg)`;
        x.b.style.opacity = clamp(1.6 - tt * 0.7);
      });
    },
    sfx: () => [{ at: 0, kind: 'confetti', gain: 0.7 }],
  };

  /* ====== burst：速度线 / 冲击环（重点砸下时的冲击感） ====== */
  C.burst = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-burst');
      const n = p.lines || 28; const r = DMS.rand(5);
      return { ls: Array.from({ length: n }, (_, i) => { const l = el('i', 'bl', '', e); l.style.rotate = (360 * i / n + r() * 6) + 'deg'; return l; }), ring: el('div', 'br2', '', e) };
    },
    update(e, lt, p, s) {
      const k = prog(lt, 0, p.dur || 0.6);
      s.ls.forEach((l, i) => { l.style.opacity = k < 1 ? (1 - k) : 0; l.style.transform = `translateX(${lerp(60, 520, E.outExpo(k))}px) scaleX(${lerp(1.4, 0.3, k)})`; });
      s.ring.style.opacity = (1 - k) * 0.9; s.ring.style.transform = `translate(-50%,-50%) scale(${lerp(0.2, 2.2, E.outExpo(k))})`;
    },
    sfx: () => [{ at: 0, kind: 'impact', gain: 0.6 }],
  };

  /* ====== arrow：手绘箭头 / 指引线（从 A 指向 B） ====== */
  C.arrow = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-arrow');
      const W = e.parentNode.offsetWidth, H = e.parentNode.offsetHeight;
      const a = p.from || [0.1, 0.5], b = p.to || [0.9, 0.5], c = p.curve == null ? 0.18 : p.curve;
      const ax = a[0] * W, ay = a[1] * H, bx = b[0] * W, by = b[1] * H, mx = (ax + bx) / 2 - (by - ay) * c, my = (ay + by) / 2 + (bx - ax) * c;
      const ang = Math.atan2(by - my, bx - mx) * 180 / Math.PI;
      e.innerHTML = `<svg width="${W}" height="${H}"><path class="ap" pathLength="100" d="M${ax} ${ay} Q${mx} ${my} ${bx} ${by}"/><path class="ah" d="M-22 -13 L0 0 L-22 13" transform="translate(${bx} ${by}) rotate(${ang})"/></svg>`;
      if (p.label) { const l = el('div', 'al', esc(p.label), e); l.style.left = mx + 'px'; l.style.top = my + 'px'; }
      return { ap: e.querySelector('.ap'), ah: e.querySelector('.ah'), lab: e.querySelector('.al') };
    },
    update(e, lt, p, s) { const k = E.inOutCubic(prog(lt, 0, p.dur || 0.6)); s.ap.style.strokeDasharray = `${k * 100} 100`; s.ah.style.opacity = k > 0.95 ? 1 : 0; if (s.lab) s.lab.style.opacity = E.outQuad(prog(lt, (p.dur || 0.6) * 0.8, 0.3)); },
    sfx: () => [{ at: 0, kind: 'draw', gain: 0.4, dur: 0.5 }],
  };
})();
