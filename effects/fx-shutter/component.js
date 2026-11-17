/* 快门开合（fx-shutter）—— v1.12 补齐分类「08 转场」
   什么时候用："咔嚓"一下换镜头、讲到拍照 / 截图 / 记住这一刻：上下两片黑色快门合上（中间一道亮线），停一帧再打开，可选闪白
   字段：dur（默认 0.6）；hold 合上停留（默认 0.06）；flash 是否闪白（默认 true）；label 合上时中间小字（可选，如 "CHAPTER 2"） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-shutter'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-shutter');
      return { a: el('div', 'a', '', e), b: el('div', 'b', '', e), ln: el('div', 'ln', '', e), lb: el('div', 'lb', esc(p.label || ''), e), fl: el('div', 'fl', '', e) };
    },
    update(e, lt, p, s) {
      const d = p.dur || 0.6, h = p.hold == null ? 0.06 : p.hold, half = (d - h) / 2;
      const c = lt < half ? E.inCubic(clamp(lt / half)) : lt < half + h ? 1 : 1 - E.outExpo(clamp((lt - half - h) / half));
      s.a.style.transform = `translateY(${((c - 1) * 100).toFixed(2)}%)`; s.b.style.transform = `translateY(${((1 - c) * 100).toFixed(2)}%)`;
      s.ln.style.opacity = (c > 0.9 ? 1 : 0); s.lb.style.opacity = (c > 0.95 ? 1 : 0);
      const fq = prog(lt, half + h, 0.25); s.fl.style.opacity = (p.flash === false ? 0 : (fq > 0 && fq < 1 ? 0.6 * (1 - fq) : 0)).toFixed(3);
    },
    sfx(p) { const d = p.dur || 0.6, h = p.hold == null ? 0.06 : p.hold; return [{ at: (d - h) / 2 - 0.05, kind: 'click', gain: 0.6 }, { at: (d - h) / 2, kind: 'thud', gain: 0.4 }]; },
  };
})();
