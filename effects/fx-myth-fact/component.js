/* 误区 vs 真相（fx-myth-fact）—— v1.12 补齐分类「03 对比 · 论证」
   什么时候用：纠正常见说法（"很多人以为……其实……"）：先出一张"误区"卡，红色 ✕ 盖章划掉，卡片翻转成"真相"卡，绿色 ✓ 落定
   字段：myth 误区原话；fact 真相；mythLabel / factLabel 标签（默认 误区 / 真相）；flipAt 翻转时刻 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-myth-fact'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-myth-fact');
      const f = el('div', 'fl', `<div class="fc m"><small>${esc(p.mythLabel || '误区')}</small><b>${esc(p.myth || '')}</b><i class="x">✕</i></div>
        <div class="fc t"><small>${esc(p.factLabel || '真相')}</small><b>${esc(p.fact || '')}</b><i class="ok">✓</i></div>`, e);
      return { f, x: f.querySelector('.x'), ok: f.querySelector('.ok'), mb: f.querySelector('.m b') };
    },
    update(e, lt, p, s) {
      const fa = p.flipAt == null ? 1.8 : p.flipAt;
      const q = prog(lt, 0, 0.5); const fq = E.inOutCubic(prog(lt, fa, 0.6));
      s.f.style.opacity = clamp(q * 3).toFixed(3);
      s.f.style.transform = `perspective(1600px) rotateY(${(fq * 180).toFixed(1)}deg) scale(${(lerp(0.85, 1, sp(q)) * (1 + Math.sin(fq * Math.PI) * 0.06)).toFixed(4)})`;
      const xq = prog(lt, fa - 1.0, 0.35); s.x.style.opacity = clamp(xq * 4).toFixed(3); s.x.style.transform = `rotate(-12deg) scale(${lerp(2.4, 1, E.outBack(xq, 1.6)).toFixed(3)})`;
      s.mb.style.setProperty('--st', E.outCubic(prog(lt, fa - 0.8, 0.3)).toFixed(3));
      const oq = prog(lt, fa + 0.55, 0.4); s.ok.style.opacity = clamp(oq * 4).toFixed(3); s.ok.style.transform = `rotate(-8deg) scale(${lerp(2.2, 1, E.outBack(oq, 1.6)).toFixed(3)})`;
    },
    sfx(p) { const fa = p.flipAt == null ? 1.8 : p.flipAt; return [{ at: 0, kind: 'card', gain: 0.4 }, { at: fa - 1.0, kind: 'error', gain: 0.45 }, { at: fa, kind: 'whoosh-soft', gain: 0.4 }, { at: fa + 0.55, kind: 'tick-ok', gain: 0.5 }]; },
  };
})();
