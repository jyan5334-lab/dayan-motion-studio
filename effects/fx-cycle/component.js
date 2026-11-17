/* 循环闭环（fx-cycle）—— v1.12 补齐分类「04 流程 · 关系」
   什么时候用：讲飞轮、正循环、闭环（"内容 → 流量 → 收入 → 更好的内容"）：节点沿圆环依次亮起，箭头弧线一段段画过去，中心写主题，最后整圈转一下表示转起来了
   字段：items:[节点文字…]（3–6 个）；center 中心文字；sub 中心小字；spinAt 整圈转动时刻 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-cycle'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-cycle');
      const it = p.items || [], n = it.length;
      const ring = el('div', 'rg', `<svg viewBox="-60 -60 120 120">${it.map((_, i) => { const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.32, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.32;
        return `<path class="ar" pathLength="1" marker-end="url(#cm)" d="M${(Math.cos(a0) * 44).toFixed(2)} ${(Math.sin(a0) * 44).toFixed(2)} A44 44 0 0 1 ${(Math.cos(a1) * 44).toFixed(2)} ${(Math.sin(a1) * 44).toFixed(2)}"/>`; }).join('')}
        <defs><marker id="cm" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="var(--hl, #FFC24B)"/></marker></defs></svg>
        <div class="ct"><b>${esc(p.center || '')}</b><small>${esc(p.sub || '')}</small></div>`, e);
      const nodes = it.map((t, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, d = el('div', 'nd', `<i>${i + 1}</i><span>${esc(t)}</span>`, ring);
        d.style.left = (50 + Math.cos(a) * 36.7) + '%'; d.style.top = (50 + Math.sin(a) * 36.7) + '%'; return d; });
      return { ring, arcs: [...ring.querySelectorAll('.ar')], nodes, ct: ring.querySelector('.ct') };
    },
    update(e, lt, p, s) {
      const n = s.nodes.length, st = 0.55, sa = p.spinAt == null ? 0.4 + n * st + 0.2 : p.spinAt;
      const cq = prog(lt, 0, 0.5); s.ct.style.opacity = clamp(cq * 3).toFixed(3); s.ct.style.transform = `translate(-50%,-50%) scale(${lerp(0.6, 1, sp(cq)).toFixed(3)})`;
      s.nodes.forEach((d, i) => { const q = prog(lt, 0.3 + i * st, 0.4); d.style.opacity = clamp(q * 3).toFixed(3); d.style.transform = `translate(-50%,-50%) scale(${lerp(0.4, 1, sp(q)).toFixed(3)})`; d.style.setProperty('--on', q.toFixed(3)); });
      s.arcs.forEach((a, i) => { const q = E.inOutCubic(prog(lt, 0.5 + i * st, 0.45)); a.style.strokeDasharray = `${q} 1`; a.style.opacity = q > 0 ? 1 : 0; });
      const sq = E.inOutCubic(prog(lt, sa, 1.1)); s.ring.querySelector('svg').style.transform = `rotate(${(sq * 360).toFixed(1)}deg)`;
      s.ring.style.setProperty('--glow', Math.sin(sq * Math.PI).toFixed(3));
    },
    sfx(p) { const n = (p.items || []).length, o = []; for (let i = 0; i < n; i++) o.push({ at: 0.3 + i * 0.55, kind: 'pop', gain: 0.35 }); o.push({ at: p.spinAt == null ? 0.4 + n * 0.55 + 0.2 : p.spinAt, kind: 'whoosh', gain: 0.4 }); return o; },
  };
})();
