/* 蓝图工程（fx-bg-blueprint）—— v1.12 补齐分类「10 背景」
   什么时候用：讲原理、架构、"拆解一下它是怎么做的"：蓝色工程图纸底，网格 + 若干辅助线、圆规弧、尺寸标注慢慢被画出来，像设计稿；可以换成暗色
   字段：tone blue/dark（默认 blue）；notes:[标注文字…]（默认几个尺寸数字） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-bg-blueprint'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-bg-blueprint', 't-' + (p.tone || 'blue'));
      const N = p.notes || ['1920', '1080', '16:9', 'R 240'];
      const svg = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g class="ln"><path pathLength="1" d="M0 300 H1600"/><path pathLength="1" d="M0 640 H1600"/><path pathLength="1" d="M420 0 V900"/><path pathLength="1" d="M1180 0 V900"/>
        <circle pathLength="1" cx="420" cy="300" r="240"/><circle pathLength="1" cx="1180" cy="640" r="160"/><path pathLength="1" d="M420 300 L1180 640"/><rect pathLength="1" x="600" y="160" width="460" height="300"/></g>
        <g class="dm"><path pathLength="1" d="M600 130 H1060 M600 120 V140 M1060 120 V140"/><path pathLength="1" d="M1090 160 V460 M1080 160 H1100 M1080 460 H1100"/></g>
        <g class="tx"><text x="830" y="118">${esc(N[0] || '')}</text><text x="1110" y="318">${esc(N[1] || '')}</text><text x="440" y="560">${esc(N[2] || '')}</text><text x="1200" y="470">${esc(N[3] || '')}</text></g></svg>`;
      el('div', 'gd', '', e); const w = el('div', 'sv', svg, e);
      return { ps: [...w.querySelectorAll('[pathLength]')], ts: [...w.querySelectorAll('text')] };
    },
    update(e, lt, p, s) {
      s.ps.forEach((x, i) => { const k = E.inOutCubic(prog(lt, 0.1 + i * 0.18, 1.2)); x.style.strokeDasharray = `${k.toFixed(4)} 1`; });
      s.ts.forEach((x, i) => { x.style.opacity = prog(lt, 1.4 + i * 0.25, 0.4).toFixed(3); });
    },
  };
})();
