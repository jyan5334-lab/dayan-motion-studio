/* 暗角聚焦（fx-vignette）—— v1.12 补齐分类「12 质感 · 调色层」
   什么时候用：整片或某段压暗四角，把视线收到人物和主内容上（几乎每条片子都可以开着）；可以随重点句短暂收紧
   字段：amount 强度 0–1（默认 0.45）；shape round/wide（默认 wide，横屏更自然）；pulse:[时刻…] 这些时刻收紧一下；cx, cy 中心 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-vignette'] = {
    enter: 'none', enterSfx: null,
    build(e, p) { e.classList.add('fx-vignette'); return { v: el('div', 'v', '', e) }; },
    update(e, lt, p, s) {
      const a = p.amount == null ? 0.45 : p.amount; let k = 0; (p.pulse || []).forEach(t => { const u = lt - t; if (u > 0 && u < 1.2) k = Math.max(k, Math.sin(Math.PI * u / 1.2)); });
      const r = (p.shape === 'round' ? 55 : 70) - k * 14;
      s.v.style.background = `radial-gradient(${p.shape === 'round' ? '' : '130% 100% '}at ${((p.cx == null ? 0.5 : p.cx) * 100)}% ${((p.cy == null ? 0.45 : p.cy) * 100)}%, transparent ${(r - 30).toFixed(1)}%, rgba(0,0,0,${(a * 0.6).toFixed(3)}) ${r.toFixed(1)}%, rgba(0,0,0,${Math.min(1, a * 1.5 + k * 0.2).toFixed(3)}) 100%)`;
    },
  };
})();
