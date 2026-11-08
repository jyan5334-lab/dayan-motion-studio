/* =====================================================================
   讲解类组件 components-explain.js
   panel-stack  叠卡讲解：卡片逐张叠放（旧卡后退变暗、新卡在前），卡内 图标块 → 分支连线 → 要点行
   glow-quote   发光引用：一句原话逐字亮起，带柔光，适合压在侧边遮罩上
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ORN = '<svg viewBox="0 0 240 24" preserveAspectRatio="none"><path d="M0 12H96M144 12H240" stroke="currentColor" stroke-width="1.2"/><path d="M120 2l7 10-7 10-7-10z" fill="currentColor"/><path d="M104 12c4-7 9-7 12 0M136 12c-4-7-9-7-12 0" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="100" cy="12" r="1.8" fill="currentColor"/><circle cx="140" cy="12" r="1.8" fill="currentColor"/></svg>';

  /* ====== panel-stack ====== */
  C['panel-stack'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-pstack', 'ps-' + (p.style || 'ornate'));
      const cards = (p.cards || []).map((cd, i) => {
        const at = cd.at == null ? i * (p.stagger || 2.2) : cd.at;
        const items = (cd.items || []).map((it, j) => typeof it === 'string' ? { t: it } : it);
        const c = el('div', 'ps-card', `<div class="ps-frame">
            <div class="ps-orn">${ORN}</div>
            <div class="ps-head"><i class="ln"></i><b>${DMS.hl(cd.title || '', cd.hl)}</b><i class="ln r"></i></div>
            ${cd.sub ? `<div class="ps-sub">${esc(cd.sub)}</div>` : ''}
            <div class="ps-body${items.length ? '' : ' solo'}">
              <div class="ps-tile">${cd.logo ? `<span class="lg">${esc(cd.logo)}</span>` : DMS.icon(cd.icon || 'spark')}</div>
              ${items.length ? '<svg class="ps-wire"></svg>' : ''}
              <div class="ps-items">${items.map(it => `<div class="ps-it"><i class="ic">${DMS.icon(it.icon || 'check')}</i><div class="tx"><b>${DMS.hl(it.t || '', it.hl)}</b>${it.d ? `<small>${esc(it.d)}</small>` : ''}</div></div>`).join('')}</div>
            </div>
            <div class="ps-foot">◆</div></div>`, e);
        return { c, at, items: items.map((it, j) => ({ at: it.at == null ? at + 0.75 + j * (p.itemStagger || 0.42) : it.at })), wired: false };
      });
      return { cards };
    },
    wire(s) {   // 量一次布局，画出 图标块 → 各要点 的分支线
      const body = s.c.querySelector('.ps-body'), svg = s.c.querySelector('.ps-wire'), tile = s.c.querySelector('.ps-tile');
      if (!svg || !body.offsetWidth) return;
      const W = body.offsetWidth, H = body.offsetHeight, tr = tile.offsetLeft + tile.offsetWidth, ty = tile.offsetTop + tile.offsetHeight / 2;
      const rows = [...s.c.querySelectorAll('.ps-it')], x1 = rows.length ? rows[0].offsetLeft + rows[0].parentNode.offsetLeft : W * 0.5, xm = tr + (x1 - tr) * 0.45;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.innerHTML = rows.map(r => { const y = r.offsetTop + r.parentNode.offsetTop + r.offsetHeight / 2; return `<path d="M${tr} ${ty}H${xm}V${y}H${x1 - 2}"/><circle cx="${x1 - 2}" cy="${y}" r="3.2"/>`; }).join('') + `<circle class="hub" cx="${xm}" cy="${ty}" r="4"/>`;
      s.paths = [...svg.querySelectorAll('path')].map(pth => { const L = pth.getTotalLength(); pth.style.strokeDasharray = L; return { pth, L }; });
      s.dots = [...svg.querySelectorAll('circle:not(.hub)')]; s.hub = svg.querySelector('.hub'); s.rows = rows; s.wired = true;
    },
    update(e, lt, p, st) {
      const cs = st.cards, n = cs.length;
      cs.forEach((s, i) => {
        const k = prog(lt, s.at, 0.62), q = E.outExpo(k), sp = E.spring(k, 0.55, 11);
        let d = 0; for (let j = i + 1; j < n; j++) d += E.inOutCubic(prog(lt, cs[j].at, 0.62));   // 被后面几张卡压到了第几层
        const vis = k > 0 && d < 2.6;
        s.c.style.display = vis ? 'block' : 'none'; if (!vis) return;
        const tx = lerp(7, 0, q) - d * 6.5, ty = lerp(5, 0, q) - d * 8, sc = lerp(0.93, 1, sp) * (1 - d * 0.075);
        s.c.style.transform = `translate(${tx}cqw, ${ty}cqw) scale(${sc.toFixed(4)})`;
        s.c.style.opacity = (clamp(k * 2.4) * clamp(2.6 - d)).toFixed(3);
        s.c.style.filter = `brightness(${(1 - Math.min(d, 1.5) * 0.32).toFixed(3)}) blur(${(lerp(8, 0, E.outQuart(k)) + Math.max(0, d - 1) * 1.6).toFixed(2)}px)`;
        s.c.style.zIndex = 10 + i;
        const bh = s.c.querySelector('.ps-body').offsetHeight;
        if (!s.wired || s.bh !== bh) { s.bh = bh; C['panel-stack'].wire(s); }   // 字体晚到导致行高变化时重新量
        const l = lt - s.at;
        const orn = s.c.querySelector('.ps-orn'), head = s.c.querySelector('.ps-head b'), lns = s.c.querySelectorAll('.ps-head .ln'), sub = s.c.querySelector('.ps-sub'), tile = s.c.querySelector('.ps-tile');
        const ko = E.outCubic(prog(l, 0.1, 0.5)); orn.style.transform = `scaleX(${ko.toFixed(3)})`; orn.style.opacity = ko;
        const kh = E.outCubic(prog(l, 0.18, 0.45)); head.style.opacity = kh; head.style.letterSpacing = lerp(0.5, 0.12, kh).toFixed(3) + 'em';
        lns.forEach(x => { x.style.transform = `scaleX(${E.outCubic(prog(l, 0.25, 0.5)).toFixed(3)})`; });
        if (sub) { const ks = E.outCubic(prog(l, 0.32, 0.45)); sub.style.opacity = ks; sub.style.transform = `translateY(${lerp(8, 0, ks)}px)`; }
        const kt = prog(l, 0.3, 0.55); tile.style.transform = `scale(${lerp(0.6, 1, E.spring(kt, 0.5, 12)).toFixed(4)})`; tile.style.opacity = clamp(kt * 3);
        tile.style.setProperty('--glow', (0.35 + 0.65 * Math.exp(-Math.max(0, l - 0.6) * 2.2) * clamp(kt * 2)).toFixed(3));
        if (s.wired) s.items.forEach((it, j) => {
          const kw = E.inOutCubic(prog(lt, it.at - 0.28, 0.32)), kr = prog(lt, it.at, 0.4);
          const P = s.paths[j]; if (P) P.pth.style.strokeDashoffset = (P.L * (1 - kw)).toFixed(1);
          if (s.dots[j]) s.dots[j].style.opacity = clamp(kr * 3);
          const r = s.rows[j]; r.style.opacity = clamp(kr * 2.5); r.style.transform = `translateX(${lerp(-18, 0, E.outExpo(kr)).toFixed(1)}px)`;
          r.style.setProperty('--hot', (Math.exp(-Math.max(0, lt - it.at) * 2.5) * clamp(kr * 3)).toFixed(3));
        });
        if (s.hub) s.hub.style.opacity = clamp(prog(lt, (s.items[0] || { at: 0 }).at - 0.3, 0.2));
      });
    },
    sfx: p => {
      const a = []; (p.cards || []).forEach((cd, i) => {
        const at = cd.at == null ? i * (p.stagger || 2.2) : cd.at; a.push({ at, kind: i ? 'card' : 'swoosh-in', gain: 0.42 });
        (cd.items || []).forEach((it, j) => a.push({ at: (it && it.at != null) ? it.at : at + 0.75 + j * (p.itemStagger || 0.42), kind: 'tick', gain: 0.26 }));
      }); return a;
    },
  };


  /* ====== demo-zone：演示区（侧推讲解左侧那块）——按口播一拍一拍换演示 ======
     beats:[{c:'chat'|'type'|'compare'|'flow'|…, props, at|cue, box?:[x,y,w,h] 相对演示区}]
     一拍 = 口播里的一个意思。新拍从前方落定，旧拍后退、变暗、虚化后淡出（同一空间里的"翻页"） */
  const ZBOX = { 'panel-stack': [0, 0, 1, 1], chat: [0.04, 0.16, 0.92, 0.56], type: [0.02, 0.3, 0.96, 0.3], compare: [0, 0.14, 1, 0.62], flow: [0, 0.18, 1, 0.56],
    number: [0.04, 0.16, 0.92, 0.56], gauge: [0.18, 0.1, 0.64, 0.7], progress: [0.04, 0.16, 0.92, 0.6], nodes: [0, 0.02, 1, 0.9], checklist: [0.04, 0.08, 0.92, 0.78],
    timeline: [0, 0.24, 1, 0.46], doc: [0.06, 0.04, 0.88, 0.86], bars: [0.02, 0.14, 0.96, 0.62], window: [0, 0.06, 1, 0.78], quote: [0.04, 0.2, 0.92, 0.5],
    grid: [0, 0.04, 1, 0.86], logo: [0.14, 0.24, 0.72, 0.42], title: [0.02, 0.28, 0.96, 0.3], chips: [0.02, 0.36, 0.96, 0.2], stacks: [0, 0.06, 1, 0.82],
    equation: [0, 0.26, 1, 0.4], cards: [0, 0.06, 1, 0.82], phone: [0.28, 0.02, 0.44, 0.92], media: [0.02, 0.08, 0.96, 0.76], 'glow-quote': [0.02, 0.3, 0.96, 0.3] };
  C['demo-zone'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('c-dzone');
      const plate = p.plate === false ? null : el('div', 'dz-plate', '', e);   // 演示区暗场：让内容从文字墙/画面里"浮"出来（只压暗，不模糊）
      let beats = p.beats || [];
      if ((!beats || !beats.length) && p.cards && p.cards.length) beats = [{ c: 'panel-stack', at: 0, props: { cards: p.cards, style: p.style } }];
      const list = beats.map((b, i) => {
        const at = b.at == null ? i * (p.stagger || 3) : b.at, comp = C[b.c];
        const wrap = el('div', 'dz-beat', '', e), bx = b.box || ZBOX[b.c] || [0, 0.08, 1, 0.8];
        Object.assign(wrap.style, { left: bx[0] * 100 + '%', top: bx[1] * 100 + '%', width: bx[2] * 100 + '%', height: bx[3] * 100 + '%' });
        const inner = el('div', 'dz-in', '', wrap);
        const props = Object.assign({}, b.props || {}); if (b.c === 'panel-stack' && !props.style && p.style) props.style = p.style;
        let st = {};
        if (!comp) console.error('demo-zone: 没有组件', b.c);
        else try { st = comp.build ? (comp.build(inner, props, L) || {}) : {}; } catch (err) { console.error('demo-zone', b.c, err); }
        return { b, at, comp, wrap, inner, props, st };
      });
      return { list, plate };
    },
    update(e, lt, p, s, L, t) {
      const n = s.list.length;
      if (s.plate) {
        if (!s.plateSide) {   // 底板在内容层（比人物层高）：靠哪边就只往那边外扩，朝画面中间（人物那侧）不伸出、软收边，免得压暗人物卡
          const cx = (e.offsetLeft + e.offsetWidth / 2) / DMS.W();
          s.plateSide = DMS.H() > DMS.W() ? 'c' : cx < 0.42 ? 'l' : cx > 0.58 ? 'r' : 'c';
          if (s.plateSide !== 'c') s.plate.classList.add('pl-' + s.plateSide);
        }
        s.plate.style.opacity = E.outCubic(prog(lt, (s.list[0] || { at: 0 }).at - 0.2, 0.7)).toFixed(3);
      }
      s.list.forEach((x, i) => {
        const nx = s.list[i + 1], k = prog(lt, x.at, 0.6), q = E.outExpo(k), sp = E.spring(k, 0.55, 11);
        const d = nx ? E.inOutCubic(prog(lt, nx.at - 0.1, 0.6)) : 0;                 // 被下一拍压下去的程度
        const gone = nx ? prog(lt, nx.at + 0.1, 0.45) : 0;
        const vis = lt >= x.at - 0.001 && gone < 1;
        x.wrap.style.display = vis ? 'block' : 'none'; if (!vis) return;
        const mode = p.swap || 'depth';
        let tx = 0, ty = lerp(26, 0, q), sc = lerp(0.95, 1, sp), op = clamp(k * 2.4), bl = lerp(9, 0, E.outQuart(k));
        if (mode === 'depth') { tx -= d * 4; ty -= d * 6; sc *= 1 - d * 0.08; bl += d * 5; op *= 1 - gone; }
        else { ty -= d * 60; op *= 1 - d; bl += d * 6; }
        x.wrap.style.transform = `translate(${tx}%, ${ty}px) scale(${sc.toFixed(4)})`;
        x.wrap.style.opacity = op.toFixed(3); x.wrap.style.filter = `blur(${bl.toFixed(2)}px) brightness(${(1 - d * 0.35).toFixed(3)})`;
        x.wrap.style.zIndex = 10 + i;
        if (x.comp && x.comp.update) { try { x.comp.update(x.inner, lt - x.at, x.props, x.st, L, t); } catch (err) { console.error('demo-zone', x.b.c, err); } }
      });
    },
    sfx: (p, d) => {
      let beats = p.beats || []; if (!beats.length && p.cards) beats = [{ c: 'panel-stack', at: 0, props: { cards: p.cards } }];
      const out = [];
      beats.forEach((b, i) => {
        const at = b.at == null ? i * (p.stagger || 3) : b.at, comp = C[b.c];
        if (i) out.push({ at, kind: 'swoosh-soft', gain: 0.34 });
        if (comp && comp.sfx) { try { (comp.sfx(b.props || {}, b) || []).forEach(c => out.push(Object.assign({}, c, { at: at + (c.at || 0) }))); } catch (e) { } }
        else out.push({ at, kind: comp && comp.enterSfx || 'pop', gain: 0.45 });
      });
      return out;
    },
  };

  /* ====== glow-quote ====== */
  C['glow-quote'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('c-gquote', 'gq-' + (p.font || 'light'));
      if (p.align) e.style.textAlign = p.align;
      const marks = (p.hl ? (Array.isArray(p.hl) ? p.hl : [p.hl]) : []);
      if (!p.text) return { chars: [] };   // 没写引用就什么都不显示
      const txt = (p.quote === false ? '' : '“') + p.text + (p.quote === false ? '' : '”');
      const hot = new Set(); marks.forEach(m => { let i = txt.indexOf(m); if (i >= 0) for (let k = i; k < i + m.length; k++) hot.add(k); });
      const box = el('div', 'gq-t', [...txt].map((ch, i) => ch === '\n' ? '<br>' : `<span class="${hot.has(i) ? 'h' : ''}">${esc(ch)}</span>`).join(''), e);
      if (p.size) box.style.fontSize = p.size + 'px';
      return { chars: [...box.querySelectorAll('span')] };
    },
    update(e, lt, p, s) {
      const n = s.chars.length, per = p.per == null ? Math.min(0.06, 1.4 / Math.max(1, n)) : p.per;
      s.chars.forEach((c, i) => {
        const k = prog(lt, i * per, 0.38), q = E.outCubic(k);
        c.style.opacity = q.toFixed(3); c.style.filter = `blur(${lerp(7, 0, q).toFixed(2)}px)`;
        c.style.transform = `translateY(${lerp(0.25, 0, q).toFixed(3)}em)`;
      });
      const done = n * per + 0.38, breath = lt > done ? 0.88 + 0.12 * Math.cos((lt - done) * 2.2) : 1;
      e.style.setProperty('--gl', breath.toFixed(3));
    },
    sfx: p => [{ at: 0, kind: 'whoosh-soft', gain: 0.3 }],
  };
})();
