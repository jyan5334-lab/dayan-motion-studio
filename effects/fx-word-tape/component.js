/* 字卡听写 / 口误剪除（fx-word-tape）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"逐字听写 / 字级时间码"（mode:listen）：一条声波被压扁，变成一排字卡，每张卡下面标着时间码，播放头扫过；
             讲"口误自动剪掉"（mode:cut）：同一排字卡里口误的卡变红抖动 → 被踩碎（碎片带重力飞散）→ 两边的卡"咔"地合拢，上方弹出剪掉了几秒。
   两种模式版式完全相同，可以前后两段接着用（listen 段结束的画面 = cut 段开始的画面）。
   标准：时间的纯函数、有入场和落定、带音效、字号按 box 自动缩放（三种画幅都排得下）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emW = t => { let w = 0; for (const ch of String(t)) w += /[⺀-￿]/.test(ch) ? 1 : 0.56; return w + 1.3; };
  const GAP = 0.34, NB = 72;
  /* 一排卡的版式（单位 em，原点在整排中心）；python 侧排精灵落点时用同一公式 */
  function layout(ws, skip) {
    const keep = ws.map((w, i) => !(skip && skip(i)));
    let tot = 0; ws.forEach((w, i) => { if (keep[i]) tot += w.w + GAP; }); tot -= GAP;
    let x = -tot / 2; const xs = [];
    ws.forEach((w, i) => { xs.push(keep[i] ? x + w.w / 2 : null); if (keep[i]) x += w.w + GAP; });
    return { xs, tot };
  }
  C['fx-word-tape'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-word-tape');
      const ws = (p.words || []).map(o => { const d = typeof o === 'string' ? { t: o } : o; return Object.assign({ w: emW(d.t) }, d); });
      const full = layout(ws), tight = layout(ws, i => ws[i].bad);
      e.style.setProperty('--fs', `min(${(94 / full.tot).toFixed(3)}cqw, ${p.maxSize || 13}cqh)`);
      const wave = el('div', 'wave', '', e), bars = [];
      for (let i = 0; i < NB; i++) bars.push(el('i', '', '', wave));
      const head = el('div', 'head', '<i></i>', e);
      const row = el('div', 'row', '', e);
      const chips = ws.map((w, i) => {
        const c = el('div', 'chip' + (w.bad ? ' bad' : ''), `<b>${esc(w.t)}</b><small>${esc(w.tc || '')}</small>`, row);
        c.style.width = `calc(var(--fs) * ${w.w.toFixed(3)})`;
        const shards = [];
        if (w.bad) for (let k = 0; k < 7; k++) { const s = el('i', 'shard', '', row); shards.push(s); }
        return { el: c, w, x0: full.xs[i], x1: tight.xs[i], shards };
      });
      const cutL = el('div', 'cutl', `<span>${esc(p.cutText || '−2.6 秒口误')}</span>`, e);
      // 冲击：碎的那一下给全片一个小震
      if (p.mode === 'cut' && L && L.def) DMS.shake((L.def.at || 0) + (p.smashAt == null ? 1.0 : p.smashAt), 9, 0.32);
      return { ws, bars, head, chips, cutL, full };
    },
    update(e, lt, p, s) {
      const cut = p.mode === 'cut';
      const pa = cut ? -1 : (p.pressAt == null ? 0.7 : p.pressAt), stg = p.stagger == null ? 0.075 : p.stagger;
      const ba = p.badAt == null ? 0.25 : p.badAt, sa = p.smashAt == null ? 1.0 : p.smashAt, ca = p.closeAt == null ? sa + 0.45 : p.closeAt;
      // 声波（listen）：先满幅跳动，到 pressAt 被压扁、淡出
      const press = cut ? 1 : E.inOutCubic(prog(lt, pa, 0.5));
      const wIn = cut ? 0 : clamp(lt * 3);
      s.bars.forEach((b, i) => {
        const h = (0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + lt * 6.2) * Math.sin(i * 0.23 + lt * 2.7 + 0.6))) * (1 - press * 0.92);
        b.style.transform = `scaleY(${h.toFixed(3)})`;
      });
      s.bars[0].parentNode.style.opacity = (wIn * (1 - E.inCubic(prog(lt, pa + 0.35, 0.5)))).toFixed(3);
      // 播放头：listen 时随字卡出现从左扫到右；cut 时不显示
      const n = s.chips.length, hk = cut ? 0 : prog(lt, pa, stg * n + 0.25);
      s.head.style.opacity = (cut ? 0 : (hk > 0 && hk < 1 ? 1 : 0)).toFixed(3);
      s.head.style.left = `calc(50% + var(--fs) * ${lerp(-s.full.tot / 2 - 0.4, s.full.tot / 2 + 0.4, hk).toFixed(3)})`;
      const ck = cut ? E.inOutCubic(prog(lt, ca, 0.42)) : 0;
      s.chips.forEach((c, i) => {
        const at = cut ? -1 : pa + 0.15 + i * stg, q = cut ? 1 : prog(lt, at, 0.42), sp = cut ? 1 : E.spring(q, 0.48, 12);
        let x = c.x0, o = cut ? 1 : clamp(q * 3), sc = lerp(0.3, 1, sp), rot = 0, y = cut ? 0 : lerp(1.6, 0, E.outExpo(q));
        if (cut && !c.w.bad && c.x1 != null) x = lerp(c.x0, c.x1, ck);
        if (cut && c.w.bad) {
          const rk = prog(lt, ba, 0.25);
          c.el.style.setProperty('--red', rk.toFixed(3));
          if (lt >= ba && lt < sa) { rot = Math.sin(lt * 46) * 3.2 * rk; x += Math.sin(lt * 53) * 0.05 * rk; }
          if (lt >= sa) { const g = prog(lt, sa, 0.12); sc = lerp(1, 1.18, g); o = 1 - g; }
          // 碎片：踩下去那一刻向上、向两边炸开，再被重力拉下去
          c.shards.forEach((sh, k) => {
            const u = lt - sa, live = u >= 0 && u < 1.1;
            const vx = (k - 3) * 0.55 + Math.sin(k * 2.3) * 0.25, vy = -2.2 - (k % 3) * 0.7;
            const px = c.x0 + vx * u * 1.6, py = vy * u + 4.6 * u * u;
            sh.style.opacity = (live ? clamp(1.3 - u * 1.2) : 0).toFixed(3);
            sh.style.left = `calc(50% + var(--fs) * ${px.toFixed(3)})`;
            sh.style.transform = `translate(-50%, calc(-50% + var(--fs) * ${py.toFixed(3)})) rotate(${(u * (200 + k * 70) * (k % 2 ? 1 : -1)).toFixed(1)}deg)`;
          });
        }
        c.el.style.opacity = o.toFixed(3);
        c.el.style.left = `calc(50% + var(--fs) * ${x.toFixed(3)})`;
        c.el.style.transform = `translate(-50%, calc(-50% + var(--fs) * ${y.toFixed(3)})) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        // listen：播放头扫过时字卡亮一下
        if (!cut) c.el.style.setProperty('--lit', clamp(1 - Math.abs(lt - at - 0.12) * 5).toFixed(3));
      });
      // 合拢后上方弹出剪掉了多少
      const lq = cut ? prog(lt, ca + 0.3, 0.45) : 0;
      s.cutL.style.opacity = clamp(lq * 3).toFixed(3);
      s.cutL.style.transform = `translate(-50%, ${lerp(1.2, 0, E.outExpo(lq)).toFixed(2)}em) scale(${lerp(0.6, 1, E.spring(lq, 0.5, 12)).toFixed(3)})`;
    },
    sfx(p) {
      const out = [];
      const n = (p.words || []).length;
      if (p.mode === 'cut') {
        const ba = p.badAt == null ? 0.25 : p.badAt, sa = p.smashAt == null ? 1.0 : p.smashAt, ca = p.closeAt == null ? sa + 0.45 : p.closeAt;
        out.push({ at: ba, kind: 'error', gain: 0.45 }, { at: sa, kind: 'impact', gain: 0.8 }, { at: sa + 0.02, kind: 'scratch', gain: 0.35 },
          { at: ca + 0.38, kind: 'thud', gain: 0.6 }, { at: ca + 0.32, kind: 'pop', gain: 0.4 });
      } else {
        const pa = p.pressAt == null ? 0.7 : p.pressAt, stg = p.stagger == null ? 0.075 : p.stagger;
        out.push({ at: 0, kind: 'rise', gain: 0.3 }, { at: pa, kind: 'shrink', gain: 0.4 });
        for (let i = 0; i < n; i += 2) out.push({ at: pa + 0.15 + i * stg, kind: 'tick', gain: 0.22 });
      }
      return out;
    },
  };
})();
