/* 放大镜细节（fx-magnify）—— v1.12 补齐分类「11 浮窗 · 画中画」
   什么时候用："注意看这个细节""小字里写着…"：一张真实图片上，放大镜从边上滑入停在细节处，镜片里是放大 2–3 倍的画面，旁边拉出一句标注
   字段：img 真实图片；x, y 放大点（0–1）；zoom 倍数（默认 2.4）；note 标注文字；size 镜片直径（占框高比例，默认 0.42） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放真实截图 / 照片；没有就显示占位，绝不生成假图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-magnify'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-magnify'); e.style.setProperty('--d', ((p.size || 0.42) * 100) + 'cqh');
      const bs = el('div', 'bs', IMGSLOT(p.img, 'pic', '待放真实图片'), e);
      const lz = el('div', 'lz', `<div class="in">${p.img ? `<img src="${esc(p.img)}">` : '<div class="ph2"></div>'}</div><i class="hd"></i>`, e);
      const nt = p.note ? el('div', 'nt', `<b>${esc(p.note)}</b>`, e) : null;
      return { bs, lz, img: lz.querySelector('img, .ph2'), nt };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.bs.style.opacity = clamp(q * 3).toFixed(3);
      const x = p.x == null ? 0.5 : p.x, y = p.y == null ? 0.5 : p.y, z = p.zoom || 2.4, m = E.outExpo(prog(lt, 0.4, 0.9));
      const cx = lerp(1.15, x, m), cy = lerp(0.95, y, m);
      s.lz.style.left = (cx * 100) + '%'; s.lz.style.top = (cy * 100) + '%'; s.lz.style.opacity = clamp(prog(lt, 0.4, 0.2) * 3).toFixed(3);
      const W = e.clientWidth || 1, H = e.clientHeight || 1, D = (p.size || 0.42) * H;
      Object.assign(s.img.style, { width: W * z + 'px', height: H * z + 'px', left: (D / 2 - cx * W * z) + 'px', top: (D / 2 - cy * H * z) + 'px' });
      if (s.nt) { const nq = prog(lt, 1.3, 0.45); s.nt.style.opacity = clamp(nq * 3).toFixed(3); s.nt.style.left = (cx * 100) + '%'; s.nt.style.top = (cy * 100) + '%'; s.nt.style.setProperty('--k', E.outBack(nq, 1.3).toFixed(3)); s.nt.classList.toggle('lf', x > 0.55); }
    },
    sfx(p) { return [{ at: 0.4, kind: 'whoosh-soft', gain: 0.35 }, { at: 1.1, kind: 'zoom-in', gain: 0.35 }].concat(p.note ? [{ at: 1.3, kind: 'pop', gain: 0.35 }] : []); },
  };
})();
