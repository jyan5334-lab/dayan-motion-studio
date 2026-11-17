/* 巨字在人身后（fx-depth-word）—— v1.12 补齐分类「01 开场 · 标识」
   什么时候用：开场钩子、情绪词（急 / 卷 / 慌 / 爽）：一个巨字砸进画面，配合 scene.personFront 让人物压在字前面；旁边两行小标题点题
   字段：word 巨字（1–2 字）；color 字色；side:[{t,hl}] 旁边两行；sideAt；pos left/right 巨字在左或右；tilt 倾角 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-depth-word'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-depth-word'); if (p.pos === 'right') e.classList.add('r');
      const w = el('div', 'w', `<b>${esc(p.word || '急')}</b>`, e);
      if (p.color) w.style.setProperty('--wc', p.color);
      const side = el('div', 'sd', (p.side || []).map(o => `<div class="${o.hl ? 'hl' : ''}">${esc(o.t)}</div>`).join(''), e);
      if (L && L.def) DMS.shake((L.def.at || 0) + 0.12, 8, 0.3);
      return { w, rows: [...side.children] };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.32), k = E.outExpo(q);
      const tilt = p.tilt == null ? -3 : p.tilt;
      s.w.style.opacity = clamp(q * 4).toFixed(3);
      s.w.style.filter = `blur(${lerp(14, 0, k).toFixed(2)}px)`;
      s.w.style.transform = `translateY(${(Math.sin(lt * 0.9) * 0.6).toFixed(2)}cqh) rotate(${(tilt + lerp(-6, 0, k)).toFixed(2)}deg) scale(${(lerp(1.45, 1, k) + Math.max(0, lt - 0.3) * 0.012).toFixed(4)})`;
      const sa = p.sideAt == null ? 0.6 : p.sideAt;
      s.rows.forEach((r, i) => { const u = prog(lt, sa + i * 0.14, 0.45); r.style.opacity = clamp(u * 3).toFixed(3);
        r.style.transform = `translateX(${lerp(4, 0, E.outExpo(u)).toFixed(2)}cqw)`; r.style.clipPath = `inset(0 ${((1 - E.outCubic(u)) * 100).toFixed(1)}% 0 0)`; });
    },
    sfx(p) { return [{ at: 0.05, kind: 'impact', gain: 0.7 }, { at: (p.sideAt == null ? 0.6 : p.sideAt), kind: 'swoosh-soft', gain: 0.35 }]; },
  };
})();
