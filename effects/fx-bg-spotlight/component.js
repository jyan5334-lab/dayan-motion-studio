/* 舞台追光（fx-bg-spotlight）—— v1.12 补齐分类「10 背景」
   什么时候用：发布、揭晓、"隆重介绍"段落的底：暗场里两三束追光从顶部斜打下来、慢慢摆动，地面有光斑和反光，空气里有细尘
   字段：beams 光束数（默认 3）；color 光色；focus 地面光斑中心 x（0–1，默认 0.5，可对准人物） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-bg-spotlight'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-bg-spotlight'); if (p.color) e.style.setProperty('--lc', p.color);
      const n = p.beams || 3, bs = []; for (let i = 0; i < n; i++) bs.push(el('div', 'bm', '', e));
      const fl = el('div', 'fl', '', e), ds = []; for (let i = 0; i < 40; i++) { const d = el('i', 'du', '', e); ds.push(d); }
      return { bs, fl, ds };
    },
    update(e, lt, p, s) {
      const n = s.bs.length, f = p.focus == null ? 0.5 : p.focus;
      s.bs.forEach((b, i) => { const x0 = n === 1 ? 0.5 : 0.15 + i * 0.7 / (n - 1), a = Math.atan2((f - x0) * 1.78, 1) * 180 / Math.PI + Math.sin(lt * 0.6 + i * 2) * 6;
        b.style.left = (x0 * 100) + '%'; b.style.transform = `rotate(${(-a).toFixed(2)}deg)`; b.style.opacity = (0.55 + 0.25 * Math.sin(lt * 1.3 + i)).toFixed(3); });
      s.fl.style.left = (f * 100) + '%';
      s.ds.forEach((d, i) => { const r1 = Math.sin(i * 12.9898) * 43758.5453 % 1, r2 = Math.sin(i * 78.233) * 12345.678 % 1; const x = (Math.abs(r1) * 100 + lt * (1 + i % 3)) % 100, y = (Math.abs(r2) * 100 - lt * (2 + i % 4) + 200) % 100;
        d.style.left = x + '%'; d.style.top = y + '%'; d.style.opacity = (0.25 + 0.5 * Math.abs(Math.sin(lt + i))).toFixed(3); });
    },
  };
})();
