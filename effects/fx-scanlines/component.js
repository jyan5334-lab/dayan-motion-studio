/* 屏幕扫描线（fx-scanlines）—— v1.12 补齐分类「12 质感 · 调色层」
   什么时候用："像在屏幕上看"的科技 / 复古感：细横向扫描线 + 一条亮带缓慢从上往下扫 + 边缘轻微色差，适合讲 AI、代码、监控、复古游戏
   字段：amount 强度（默认 0.35）；gap 线距 px（默认 4）；band 是否有扫描亮带（默认 true）；rgb 边缘色差（默认 true）；speed */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-scanlines'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-scanlines'); e.style.setProperty('--gap', (p.gap || 4) + 'px');
      const l = el('div', 'l', '', e), b = p.band === false ? null : el('div', 'b', '', e), r = p.rgb === false ? null : el('div', 'r', '', e);
      return { l, b, r };
    },
    update(e, lt, p, s) {
      const a = p.amount == null ? 0.35 : p.amount; s.l.style.opacity = a.toFixed(3);
      if (s.b) { s.b.style.top = `${(((p.speed || 1) * lt * 22) % 130) - 20}%`; s.b.style.opacity = (a * 0.5).toFixed(3); }
      if (s.r) s.r.style.opacity = (a * 0.8).toFixed(3);
    },
  };
})();
