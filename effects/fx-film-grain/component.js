/* 胶片颗粒（fx-film-grain）—— v1.12 补齐分类「12 质感 · 调色层」
   什么时候用：整片加一层会动的细颗粒 + 轻微闪烁，去掉"数码塑料感"，让 HTML 动效和真人素材更融为一体；建议全片低强度常开
   字段：amount 强度（默认 0.35）；size 颗粒大小（默认 1）；flicker 亮度闪烁（默认 0.04）；dust 是否有灰尘划痕（默认 false） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-film-grain'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-film-grain');
      const R = DMS.rand(17), cv = document.createElement('canvas'), N = 256; cv.width = cv.height = N; const x = cv.getContext('2d'), im = x.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const v = R() * 2 - 1, c = v > 0 ? 255 : 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = c; im.data[i * 4 + 3] = Math.pow(Math.abs(v), 1.6) * 70; } x.putImageData(im, 0, 0);
      const g = el('div', 'g', '', e); g.style.backgroundImage = `url(${cv.toDataURL()})`; g.style.backgroundSize = `${256 * (p.size || 1)}px`;
      const f = el('div', 'f', '', e), ds = p.dust ? [0, 1, 2].map(() => el('i', 'ds', '', e)) : [];
      return { g, f, ds };
    },
    update(e, lt, p, s) {
      const fr = Math.floor(lt * 24); s.g.style.opacity = (p.amount == null ? 0.35 : p.amount).toFixed(3);
      s.g.style.backgroundPosition = `${(fr * 73) % 256}px ${(fr * 151) % 256}px`;
      s.f.style.opacity = (0.4 * (p.flicker == null ? 0.04 : p.flicker) * (0.5 + 0.5 * Math.sin(fr * 2.7))).toFixed(3);
      s.ds.forEach((d, i) => { const r = Math.sin((fr + i * 31) * 12.9898) * 43758.5453 % 1; const on = Math.abs(r) < 0.18; d.style.opacity = on ? 0.5 : 0; d.style.left = (Math.abs(r) * 520 % 100) + '%'; d.style.height = (20 + Math.abs(r) * 300 % 60) + '%'; d.style.top = (Math.abs(r) * 900 % 50) + '%'; });
    },
  };
})();
