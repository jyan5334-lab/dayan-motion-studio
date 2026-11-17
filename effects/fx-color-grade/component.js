/* 统一调色（fx-color-grade）—— v1.12 补齐分类「12 质感 · 调色层」
   什么时候用：把整片（人物素材 + 动效）压成同一个色调：青橙电影感 / 暖调生活 / 冷调科技 / 黑白回忆；也可只在某一段切换风格，用来区分"过去 / 现在"
   字段：look teal-orange/warm/cool/mono/fade（默认 teal-orange）；amount 0–1（默认 0.6）；fadeIn 渐入秒数 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-color-grade'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-color-grade', 'k-' + (p.look || 'teal-orange'));
      return { f: el('div', 'f', '', e), t1: el('div', 't1', '', e), t2: el('div', 't2', '', e) };
    },
    update(e, lt, p, s) {
      const a = (p.amount == null ? 0.6 : p.amount) * (p.fadeIn ? clamp(lt / p.fadeIn) : 1), L = p.look || 'teal-orange';
      const F = { 'teal-orange': `contrast(${1 + a * 0.15}) saturate(${1 + a * 0.2}) sepia(${a * 0.12}) hue-rotate(${-a * 8}deg)`, warm: `sepia(${a * 0.3}) saturate(${1 + a * 0.15}) brightness(${1 + a * 0.03})`, cool: `saturate(${1 - a * 0.2}) contrast(${1 + a * 0.1}) hue-rotate(${a * 12}deg)`, mono: `grayscale(${a}) contrast(${1 + a * 0.15})`, fade: `contrast(${1 - a * 0.15}) brightness(${1 + a * 0.05})` }[L];
      s.f.style.backdropFilter = s.f.style.webkitBackdropFilter = F; s.t1.style.opacity = (a * (L === 'mono' ? 0 : 0.14)).toFixed(3); s.t2.style.opacity = 0;
    },
  };
})();
