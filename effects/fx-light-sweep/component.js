/* 光斑过曝（fx-light-sweep）—— v1.12 补齐分类「08 转场」
   什么时候用：温柔的情绪转场、回忆 / 憧憬 / "想象一下"：一团暖色光从画面一角涌入、整体过曝到接近白，再退去露出下一段，适合情绪、生活类内容
   字段：dur（默认 0.8）；from 光源方位 tl/tr/bl/br（默认 tr）；color 光色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-light-sweep'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-light-sweep'); if (p.color) e.style.setProperty('--lc', p.color);
      const pos = { tl: '0% 0%', tr: '100% 0%', bl: '0% 100%', br: '100% 100%' }[p.from || 'tr'];
      e.style.setProperty('--lp', pos);
      return { a: el('div', 'a', '', e), b: el('div', 'b', '', e) };
    },
    update(e, lt, p, s) {
      const d = p.dur || 0.8, k = clamp(lt / d), env = Math.sin(Math.PI * k);
      s.a.style.opacity = env.toFixed(3); s.a.style.transform = `scale(${lerp(0.4, 2.2, E.inOutCubic(k)).toFixed(3)})`;
      s.b.style.opacity = (Math.pow(env, 3) * 0.85).toFixed(3);
    },
    sfx() { return [{ at: 0, kind: 'rise', gain: 0.35 }, { at: 0.35, kind: 'air', gain: 0.4 }]; },
  };
})();
