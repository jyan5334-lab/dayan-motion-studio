/* VS 对撞（fx-vs-split）—— v1.12 补齐分类「03 对比 · 论证」
   什么时候用：两方硬碰硬（工具 A vs 工具 B、国内 vs 海外、老办法 vs 新办法）：左右两块色板从两侧冲进来撞在中线，闪光后 VS 字砸出，两边各列 2–3 个要点
   字段：left / right：{name 名称, img 真实 logo（可选）, color, points:[要点]}；vs 中间字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  const pane = (o, cls) => `<div class="pn ${cls}" style="--pc:${esc(o.color || '#333')}"><div class="hd">${o.img ? `<img src="${esc(o.img)}">` : ''}<b>${esc(o.name || '')}</b></div>
    <ul>${(o.points || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  C['fx-vs-split'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-vs-split');
      const w = el('div', 'w', pane(p.left || {}, 'l') + pane(p.right || {}, 'r') + `<div class="fl"></div><div class="vs">${esc(p.vs || 'VS')}</div>`, e);
      if (L && L.def) DMS.shake((L.def.at || 0) + 0.42, 10, 0.32);
      return { l: w.querySelector('.l'), r: w.querySelector('.r'), fl: w.querySelector('.fl'), vs: w.querySelector('.vs'), li: [...w.querySelectorAll('li')] };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.42), k = E.inQuad(q), bounce = lt > 0.42 ? Math.exp(-(lt - 0.42) * 7) * Math.sin((lt - 0.42) * 22) * 1.2 : 0;
      s.l.style.transform = `translateX(${(lerp(-60, 0, k) - bounce).toFixed(2)}cqw) skewX(-6deg)`;
      s.r.style.transform = `translateX(${(lerp(60, 0, k) + bounce).toFixed(2)}cqw) skewX(-6deg)`;
      const f = prog(lt, 0.42, 0.35); s.fl.style.opacity = (f > 0 && f < 1 ? 1 - f : 0).toFixed(3); s.fl.style.transform = `scale(${lerp(0.3, 2.4, E.outCubic(f)).toFixed(3)})`;
      const v = prog(lt, 0.5, 0.45); s.vs.style.opacity = clamp(v * 4).toFixed(3); s.vs.style.transform = `translate(-50%,-50%) scale(${lerp(3, 1, E.outBack(v, 1.4)).toFixed(3)}) rotate(-8deg)`;
      const n = s.li.length / 2;
      s.li.forEach((li, i) => { const j = i % Math.max(1, n); const q2 = prog(lt, 0.9 + j * 0.35 + (i >= n ? 0.12 : 0), 0.4);
        li.style.opacity = clamp(q2 * 3).toFixed(3); li.style.transform = `translateY(${lerp(2, 0, E.outExpo(q2)).toFixed(2)}cqh)`; });
    },
    sfx(p) { const n = Math.max((p.left || {}).points ? p.left.points.length : 0, (p.right || {}).points ? p.right.points.length : 0), o = [{ at: 0, kind: 'whoosh', gain: 0.45 }, { at: 0.42, kind: 'impact', gain: 0.75 }];
      for (let j = 0; j < n; j++) o.push({ at: 0.9 + j * 0.35, kind: 'tick', gain: 0.3 }); return o; },
  };
})();
