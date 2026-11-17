/* 贴纸印章（fx-sticker-pop）—— v1.12 补齐分类「11 浮窗 · 画中画」
   什么时候用：给结论盖个章 / 贴个贴纸（"已购买""亲测有效""避雷""YYDS"）：一张带白边的异形贴纸从上方拍下来、轻微回弹，边角翘起投影，可以连贴几张
   字段：stickers:[{t 文字, x, y 位置 0–1, rot 角度, color, shape round/star/tag, at 出现时刻}] */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-sticker-pop'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-sticker-pop');
      const ss = (p.stickers || []).map(o => { const d = el('div', 'sk ' + (o.shape || 'round'), `<b>${esc(o.t)}</b>`, e); d.style.left = (o.x == null ? 0.5 : o.x) * 100 + '%'; d.style.top = (o.y == null ? 0.5 : o.y) * 100 + '%'; d.style.setProperty('--c', o.color || 'var(--hl, #FFC24B)'); return d; });
      return { ss };
    },
    update(e, lt, p, s) {
      const S = p.stickers || [];
      s.ss.forEach((d, i) => { const o = S[i], a = o.at == null ? 0.2 + i * 0.5 : o.at, q = prog(lt, a, 0.4), k = E.outBack(q, 2.2);
        d.style.opacity = clamp(q * 5).toFixed(3); d.style.transform = `translate(-50%, -50%) rotate(${((o.rot || 0) + lerp(-20, 0, E.outExpo(q))).toFixed(2)}deg) scale(${lerp(2.2, 1, k).toFixed(3)})`;
        d.style.setProperty('--sh', clamp(q * 2).toFixed(3)); });
    },
    sfx(p) { return (p.stickers || []).map((o, i) => ({ at: (o.at == null ? 0.2 + i * 0.5 : o.at) + 0.12, kind: 'stamp', gain: 0.45 })); },
  };
})();
