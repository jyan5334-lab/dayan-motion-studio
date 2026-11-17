/* 冲刺变焦（fx-zoom-burst）—— v1.12 补齐分类「08 转场」
   什么时候用：进入重点、"直接上干货""冲"：画面中心向外拉出放射速度线、边缘径向模糊，0.4 秒冲进下一句，适合节奏加速和高能段落开头
   字段：dur（默认 0.5）；cx, cy 冲刺中心（0–1，默认 0.5）；color 线色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-zoom-burst'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-zoom-burst');
      const bl = el('div', 'bl', '', e);
      let ln = ''; for (let i = 0; i < 64; i++) { const a = i / 64 * 360 + (i * 37 % 7), w = 0.15 + (i * 13 % 5) * 0.12; ln += `<rect x="0" y="${(-w / 2).toFixed(2)}" width="100" height="${w.toFixed(2)}" transform="rotate(${a.toFixed(1)})"/>`; }
      const sv = el('div', 'ln', `<svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice"><g>${ln}</g></svg>`, e);
      return { bl, sv, g: sv.querySelector('g') };
    },
    update(e, lt, p, s) {
      const d = p.dur || 0.5, k = clamp(lt / d), env = Math.sin(Math.PI * k);
      const cx = (p.cx == null ? 0.5 : p.cx) * 100, cy = (p.cy == null ? 0.5 : p.cy) * 100;
      e.style.setProperty('--cx', cx + '%'); e.style.setProperty('--cy', cy + '%');
      s.bl.style.opacity = env.toFixed(3); s.bl.style.backdropFilter = s.bl.style.webkitBackdropFilter = `blur(${(env * 14).toFixed(1)}px) brightness(${(1 + env * 0.3).toFixed(2)})`;
      s.sv.style.opacity = (env * 0.6).toFixed(3); s.g.style.transform = `scale(${lerp(0.6, 1.6, k).toFixed(3)})`;
    },
    sfx() { return [{ at: 0, kind: 'swoosh-in', gain: 0.55 }]; },
  };
})();
