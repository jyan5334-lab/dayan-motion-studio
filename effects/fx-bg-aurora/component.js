/* 极光流动（fx-bg-aurora）—— v1.12 补齐分类「10 背景」
   什么时候用：高级、温柔、"未来感"段落的底：深色底上几条品牌色极光带缓慢流动、交叠发光，不抢主体；放在 scene.bg 里
   字段：colors 三个颜色；speed 流速（默认 1）；dim 暗度 0–1（默认 0.35）；base 底色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-bg-aurora'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-bg-aurora'); if (p.base) e.style.background = p.base;
      const cs = p.colors || ['var(--accent, #2CE0C0)', '#6B5BFF', 'var(--hl, #FFC24B)'];
      const bs = cs.map((c, i) => { const b = el('div', 'b', '', e); b.style.background = `radial-gradient(50% 50% at 50% 50%, ${c}, transparent 70%)`; return b; });
      el('div', 'n', '', e); const d = el('div', 'd', '', e); d.style.opacity = p.dim == null ? 0.35 : p.dim;
      return { bs };
    },
    update(e, lt, p, s) {
      const v = (p.speed || 1) * lt;
      s.bs.forEach((b, i) => { const a = v * (0.25 + i * 0.07) + i * 2.1;
        b.style.transform = `translate(${(Math.sin(a) * 22 + (i - 1) * 18).toFixed(2)}%, ${(Math.cos(a * 0.8) * 16 - 10 + i * 8).toFixed(2)}%) rotate(${(Math.sin(a * 0.5) * 18 - 10).toFixed(1)}deg) scale(${(1 + Math.sin(a * 1.3) * 0.12).toFixed(3)}, ${(0.75 + Math.cos(a) * 0.1).toFixed(3)})`; });
    },
  };
})();
