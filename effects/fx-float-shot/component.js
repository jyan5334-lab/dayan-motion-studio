/* 3D 悬浮截图（fx-float-shot）—— v1.12 补齐分类「11 浮窗 · 画中画」
   什么时候用：讲到某个产品 / 页面 / 作品时，让真实截图"立"在人物旁边：截图带透视倾斜从远处飞入，悬浮轻摆，底下有投影和倒影，边缘一道高光扫过
   字段：img 真实截图；ry 左右倾角（默认 -18，人物在右时用负值让图朝向人物）；rx 上下倾角（默认 8）；caption 图下说明（可选）；radius 圆角 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放真实截图 / 照片；没有就显示占位，绝不生成假图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-float-shot'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-float-shot'); if (p.radius != null) e.style.setProperty('--r', p.radius + 'cqh');
      const st = el('div', 'st', `<div class="cd">${IMGSLOT(p.img, 'pic', '待放真实截图')}<i class="gl"></i></div><div class="rf">${p.img ? `<img src="${esc(p.img)}">` : ''}</div>`, e);
      const cp = p.caption ? el('div', 'cp', esc(p.caption), e) : null;
      return { st, gl: st.querySelector('.gl'), cp };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.9), k = E.outExpo(q), ry = p.ry == null ? -18 : p.ry, rx = p.rx == null ? 8 : p.rx;
      const fl = Math.sin(lt * 1.4) * 1.2;
      s.st.style.opacity = clamp(q * 3).toFixed(3);
      s.st.style.transform = `translateZ(${lerp(-600, 0, k).toFixed(1)}px) translateY(${(lerp(14, 0, k) + fl).toFixed(2)}cqh) rotateY(${(lerp(ry * 2.2, ry, k) + Math.sin(lt * 0.9) * 2).toFixed(2)}deg) rotateX(${(rx + Math.cos(lt * 1.1) * 1.2).toFixed(2)}deg)`;
      const g = prog(lt, 0.7, 0.9); s.gl.style.transform = `translateX(${lerp(-120, 220, E.inOutCubic(g)).toFixed(1)}%) skewX(-18deg)`;
      if (s.cp) { const c = prog(lt, 0.8, 0.4); s.cp.style.opacity = clamp(c * 3).toFixed(3); s.cp.style.transform = `translateY(${lerp(2, 0, E.outExpo(c)).toFixed(2)}cqh)`; }
    },
    sfx() { return [{ at: 0, kind: 'swoosh-in', gain: 0.45 }, { at: 0.75, kind: 'air', gain: 0.25 }]; },
  };
})();
