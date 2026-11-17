/* 转化漏斗（fx-funnel）—— v1.12 补齐分类「04 流程 · 关系」
   什么时候用：讲层层筛选、转化率（"1000 人看到 → 100 人点进 → 10 人下单"）：漏斗一层层从上往下展开，每层数字滚动，右侧标出层间转化率，底部出口亮起
   字段：levels:[{t 名称, v 数值}]；unit；showRate 是否标转化率（默认是）；color */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-funnel'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-funnel'); if (p.color) e.style.setProperty('--fc', p.color);
      const lv = p.levels || [], n = lv.length;
      const rows = lv.map((o, i) => { const w0 = 100 - i * (62 / Math.max(1, n - 1)), w1 = 100 - (i + 1) * (62 / Math.max(1, n - 1)) * (i === n - 1 ? 0.6 : 1);
        const r = el('div', 'lv', `<div class="sh" style="clip-path:polygon(${(100 - w0) / 2}% 0, ${(100 + w0) / 2}% 0, ${(100 + w1) / 2}% 100%, ${(100 - w1) / 2}% 100%);--k:${i / Math.max(1, n - 1)}"></div><span>${esc(o.t)}</span><b>0</b>${i > 0 && p.showRate !== false ? `<em>${(o.v / lv[i - 1].v * 100).toFixed(o.v / lv[i - 1].v < 0.1 ? 1 : 0)}%</em>` : ''}`, e);
        return { r, b: r.querySelector('b'), em: r.querySelector('em'), v: o.v }; });
      return { rows };
    },
    update(e, lt, p, s) {
      s.rows.forEach((o, i) => { const q = prog(lt, 0.1 + i * 0.5, 0.5);
        o.r.style.opacity = clamp(q * 3).toFixed(3); o.r.style.transform = `scaleY(${lerp(0.3, 1, E.outBack(q, 1.3)).toFixed(3)})`;
        o.b.textContent = Math.round(o.v * E.outExpo(prog(lt, 0.2 + i * 0.5, 0.8))).toLocaleString() + (p.unit || '');
        if (o.em) { const q2 = prog(lt, 0.45 + i * 0.5, 0.4); o.em.style.opacity = clamp(q2 * 3).toFixed(3); o.em.style.transform = `translateX(${lerp(-2, 0, E.outExpo(q2)).toFixed(2)}cqw)`; } });
    },
    sfx(p) { return (p.levels || []).map((o, i) => ({ at: 0.1 + i * 0.5, kind: i === (p.levels || []).length - 1 ? 'success' : 'card', gain: 0.4 })); },
  };
})();
