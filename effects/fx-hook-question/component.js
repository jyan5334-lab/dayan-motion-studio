/* 大问句钩子（fx-hook-question）—— v1.12 补齐分类「01 开场 · 标识」
   什么时候用：开场或转折抛问题（"凭什么免费？""谁来教？""值不值？"）：粗体问句砸出，问号跳动，下面一行英文小字，左上角压一条色块
   字段：q 问句（含问号）；en 英文小字；tone 主色；at 默认 0
   字号按 box 高度取，问句太长时自动缩小到 box 宽度以内 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-hook-question'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-hook-question'); if (p.tone) e.style.setProperty('--qc', p.tone);
      const q = String(p.q || '凭什么免费？'), m = q.match(/[?？]$/);
      const body = m ? q.slice(0, -1) : q;
      const box = el('div', 'qb', `<span class="bar"></span><b>${[...body].map(c => `<i>${esc(c)}</i>`).join('')}${m ? `<em>${esc(m[0])}</em>` : ''}</b><small>${esc(p.en || '')}</small>`, e);
      return { chars: [...box.querySelectorAll('b i')], qm: box.querySelector('b em'), bar: box.querySelector('.bar'), en: box.querySelector('small'), b: box.querySelector('b') };
    },
    update(e, lt, p, s) {
      // 问句按 box 宽度自动缩小：字号原本只看 box 高度，问句一长就冲出画面（v1.13.2 修）
      DMS.fitText(s.b, e.clientWidth * 0.97);
      s.bar.style.transform = `scaleX(${E.outExpo(prog(lt, 0, 0.35)).toFixed(3)})`;
      s.chars.forEach((c, i) => { const q = prog(lt, 0.08 + i * 0.06, 0.4);
        c.style.opacity = clamp(q * 4).toFixed(3); c.style.transform = `translateY(${lerp(40, 0, E.outBack(q, 1.6)).toFixed(1)}%) scale(${lerp(1.4, 1, E.outExpo(q)).toFixed(3)})`; });
      if (s.qm) { const a = 0.08 + s.chars.length * 0.06 + 0.1, q = prog(lt, a, 0.5), u = Math.max(0, lt - a - 0.5);
        s.qm.style.opacity = clamp(q * 3).toFixed(3);
        s.qm.style.transform = `translateY(${(-Math.abs(Math.sin(u * 3.2)) * 10 * Math.exp(-u * 0.6)).toFixed(1)}%) rotate(${(lerp(-40, 12, E.outBack(q, 2)) + Math.sin(u * 3.2) * 4).toFixed(1)}deg) scale(${lerp(0.2, 1, sp(q, 0.4, 14)).toFixed(3)})`; }
      const eq = prog(lt, 0.4, 0.5); s.en.style.opacity = clamp(eq * 2).toFixed(3); s.en.style.letterSpacing = lerp(0.6, 0.28, E.outExpo(eq)).toFixed(3) + 'em';
    },
    sfx(p) { const n = [...String(p.q || '凭什么免费？')].length; return [{ at: 0, kind: 'swoosh-soft', gain: 0.3 }, { at: 0.12, kind: 'pop', gain: 0.4 }, { at: 0.08 + n * 0.06 + 0.1, kind: 'pop-big', gain: 0.45 }]; },
  };
})();
