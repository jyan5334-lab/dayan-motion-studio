/* 斜排关键词墙（fx-bg-tilt-words）—— v1.12 补齐分类「10 背景」
   什么时候用：整段话题的氛围底（和品牌文字墙不同：这里用本段关键词）：几行斜排大字，实心与描边交替，相邻两行反向慢移，整体压暗，让人物和动效浮在上面
   字段：words:[关键词…]；angle 倾角（默认 -8）；speed；tone 亮度 0–1（默认 0.18）；color 实心字颜色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-bg-tilt-words'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      e.classList.add('fx-bg-tilt-words'); e.style.setProperty('--tone', p.tone == null ? 0.18 : p.tone); if (p.color) e.style.setProperty('--wc', p.color);
      const ws = p.words && p.words.length ? p.words : ['DAYAN'];
      const pl = el('div', 'pl', '', e); pl.style.transform = `rotate(${p.angle == null ? -8 : p.angle}deg)`;
      const rows = []; for (let r = 0; r < 7; r++) { let h = ''; for (let k = 0; k < 10; k++) { const w = ws[(r * 3 + k) % ws.length]; h += `<span class="${(r + k) % 2 ? 'o' : 's'}">${esc(w)}</span>`; } rows.push(el('div', 'rw', h + h, pl)); }
      return { rows };
    },
    update(e, lt, p, s) {
      const v = (p.speed || 1) * lt;
      s.rows.forEach((r, i) => { const d = i % 2 ? 1 : -1; r.style.transform = `translateX(${(-25 + d * ((v * 1.6 + i * 7) % 25)).toFixed(2)}%)`; });
    },
  };
})();
