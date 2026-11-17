/* 关键词弹词（fx-keyword-pop）—— v1.12 补齐分类「06 人物 · 字幕」
   什么时候用：口播里一个重点词需要被"喊"出来（"免费""三分钟""翻车"）：贴纸感的大词带描边和投影弹出，轻微倾斜晃动，四周迸出小火花，适合放在人物旁或字幕上方
   字段：word 关键词；sub 小字（可选）；tone 底色；tilt 倾角；pos 用 box 控制 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-keyword-pop'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-keyword-pop'); if (p.tone) e.style.setProperty('--kc', p.tone);
      const w = el('div', 'w', `<b>${esc(p.word || '')}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`, e);
      const sp = []; for (let i = 0; i < 10; i++) sp.push(el('i', 'sp', '', e));
      return { w, sp };
    },
    update(e, lt, p, s) {
      e.style.fontSize = Math.min(e.clientHeight * 0.5, e.clientWidth / Math.max(2.5, [...String(p.word || '')].length * 1.05)).toFixed(1) + 'px';
      const q = prog(lt, 0, 0.45), tilt = p.tilt == null ? -6 : p.tilt, u = Math.max(0, lt - 0.45);
      s.w.style.opacity = clamp(q * 4).toFixed(3);
      s.w.style.transform = `rotate(${(tilt + Math.sin(u * 4) * 2 * Math.exp(-u * 0.8)).toFixed(2)}deg) scale(${lerp(0.2, 1, E.outBack(q, 2.2)).toFixed(3)})`;
      s.sp.forEach((x, i) => { const a = i / 10 * Math.PI * 2, k = prog(lt, 0.15, 0.6), r = lerp(0.3, 1.2 + (i % 3) * 0.2, E.outCubic(k));
        x.style.opacity = (k > 0 && k < 1 ? 1 - k : 0).toFixed(3); x.style.transform = `translate(${(Math.cos(a) * r).toFixed(3)}em, ${(Math.sin(a) * r * 0.6).toFixed(3)}em) rotate(${(a * 57).toFixed(0)}deg)`; });
    },
    sfx() { return [{ at: 0.05, kind: 'pop-big', gain: 0.55 }, { at: 0.15, kind: 'confetti', gain: 0.25 }]; },
  };
})();
