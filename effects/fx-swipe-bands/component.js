/* 彩带横扫（fx-swipe-bands）—— v1.12 补齐分类「08 转场」
   什么时候用：段落之间的轻快过渡、"好，下一个"：三条品牌色斜带从一侧依次扫过整屏，最宽那条刚好盖满时切换内容，适合清单类 / 轻松段落
   字段：dur（默认 0.7）；dir left/right（默认 left，从右往左）；colors 三个颜色；angle 倾角（默认 -12） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-swipe-bands'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-swipe-bands');
      const cs = p.colors || ['var(--accent, #2CE0C0)', 'var(--hl, #FFC24B)', '#15171D'];
      const w = el('div', 'w', '', e); w.style.transform = `rotate(${p.angle == null ? -12 : p.angle}deg)`;
      return { bs: cs.map((c, i) => { const b = el('div', 'b b' + i, '', w); b.style.background = c; return b; }) };
    },
    update(e, lt, p, s) {
      const d = p.dur || 0.7, dir = p.dir === 'right' ? -1 : 1;
      s.bs.forEach((b, i) => { const q = E.inOutCubic(prog(lt, i * d * 0.06, d * 0.88)); b.style.transform = `translateX(${(dir * lerp(125, -125, q)).toFixed(2)}%)`; });
    },
    sfx() { return [{ at: 0, kind: 'whoosh', gain: 0.5 }]; },
  };
})();
