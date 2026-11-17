/* 漏光（fx-light-leak）—— v1.12 补齐分类「12 质感 · 调色层」
   什么时候用：生活、情绪、回忆段落的胶片味：画面边缘偶尔飘过暖色漏光，像老相机进光，强度很低、慢慢呼吸，不影响阅读
   字段：amount 强度（默认 0.5）；colors 两个漏光色；speed；side 漏光主要出现的边 left/right/both（默认 both） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-light-leak'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-light-leak');
      const cs = p.colors || ['#FF7A2E', '#FFD27A'], sd = p.side || 'both';
      const ls = [0, 1, 2].map(i => { const d = el('div', 'lk', '', e); d.style.background = `radial-gradient(50% 50% at 50% 50%, ${cs[i % cs.length]}, transparent 70%)`; d.dataset.x = sd === 'left' ? 0 : sd === 'right' ? 1 : i % 2; return d; });
      return { ls };
    },
    update(e, lt, p, s) {
      const a = p.amount == null ? 0.5 : p.amount, v = (p.speed || 1) * lt;
      s.ls.forEach((d, i) => { const x0 = +d.dataset.x, b = Math.pow(Math.max(0, Math.sin(v * (0.35 + i * 0.12) + i * 2)), 2);
        d.style.opacity = (a * (0.25 + 0.75 * b)).toFixed(3); d.style.left = `${(x0 ? 78 : -28) + Math.sin(v * 0.3 + i) * 6}%`; d.style.top = `${-20 + i * 30 + Math.cos(v * 0.25 + i) * 10}%`; });
    },
  };
})();
