/* 点阵波浪（fx-bg-dotwave）—— v1.12 补齐分类「10 背景」
   什么时候用：数据、科技、"算法 / 规律"段落的底：一片透视点阵，像海面一样起伏波动，远处渐隐，高光点随波峰发亮
   字段：color 点色；rows / cols 点数（默认 26 × 48）；amp 波高（默认 1）；speed */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-bg-dotwave'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-bg-dotwave');
      const cv = el('canvas', 'cv', '', e);
      return { cv };
    },
    update(e, lt, p, s) {
      const cv = s.cv, W = e.clientWidth || 1920, H = e.clientHeight || 1080;
      if (cv.width !== W) { cv.width = W; cv.height = H; }
      const x = cv.getContext('2d'); x.clearRect(0, 0, W, H);
      const R = p.rows || 26, Cn = p.cols || 48, amp = (p.amp == null ? 1 : p.amp) * H * 0.05, v = (p.speed || 1) * lt;
      const col = p.color || getComputedStyle(e).getPropertyValue('--accent').trim() || '#2CE0C0';
      for (let r = 0; r < R; r++) { const z = r / (R - 1), pz = 0.25 + z * 0.75, yb = H * (0.34 + z * 0.7);
        for (let c = 0; c < Cn; c++) { const u = c / (Cn - 1) - 0.5, wv = Math.sin(u * 9 + v * 1.4 + z * 5) * Math.cos(z * 6 - v * 0.9);
          const px = W / 2 + u * W * 1.8 * pz, py = yb - wv * amp * pz; if (px < -10 || px > W + 10) continue;
          const rad = Math.max(1, H / 300 * pz * (1 + Math.max(0, wv) * 0.8)); x.globalAlpha = Math.min(1, (0.3 + z * 0.8) * (0.7 + Math.max(0, wv) * 0.9));
          x.fillStyle = wv > 0.7 ? '#fff' : col; x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill(); } }
      x.globalAlpha = 1;
    },
  };
})();
