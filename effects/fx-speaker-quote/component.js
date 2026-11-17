/* 金句引用（fx-speaker-quote）—— v1.12 补齐分类「06 人物 · 字幕」
   什么时候用：人物说出一句金句、观点、别人的原话时：巨大的引号先落下，金句逐字打出，关键词变色，下方一条细线拉出署名
   字段：text 金句；hl 高亮词；by 署名；tone 引号颜色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-speaker-quote'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-speaker-quote'); if (p.tone) e.style.setProperty('--qc', p.tone);
      const qm = el('div', 'qm', '“', e);
      const tx = String(p.text || ''), hl = p.hl || '';
      const hs = hl ? tx.indexOf(hl) : -1;
      const t = el('div', 'tx', [...tx].map((c, i) => `<i class="${hs >= 0 && i >= hs && i < hs + hl.length ? 'h' : ''}">${esc(c)}</i>`).join(''), e);
      const by = el('div', 'by', `<u></u><span>${esc(p.by || '')}</span>`, e);
      return { qm, cs: [...t.children], by, u: by.querySelector('u'), sp: by.querySelector('span') };
    },
    update(e, lt, p, s) {
      e.style.fontSize = Math.min(e.clientWidth / 9.5, e.clientHeight / 4.2).toFixed(1) + 'px';
      const q = prog(lt, 0, 0.45); s.qm.style.opacity = clamp(q * 3).toFixed(3); s.qm.style.transform = `translateY(${lerp(-0.6, 0, E.outBack(q, 1.5)).toFixed(3)}em) scale(${lerp(1.6, 1, E.outExpo(q)).toFixed(3)})`;
      const cps = 14; s.cs.forEach((c, i) => { const a = 0.35 + i / cps; c.style.opacity = lt >= a ? 1 : 0; });
      const be = 0.35 + s.cs.length / cps + 0.2; s.u.style.transform = `scaleX(${E.outExpo(prog(lt, be, 0.5)).toFixed(3)})`; s.sp.style.opacity = prog(lt, be + 0.2, 0.4).toFixed(3);
      e.style.setProperty('--hk', prog(lt, be - 0.1, 0.4).toFixed(3));
    },
    sfx(p) { const n = [...String(p.text || '')].length; return [{ at: 0, kind: 'thud', gain: 0.4 }, { at: 0.35, kind: 'typing', gain: 0.3 }, { at: 0.35 + n / 14 + 0.2, kind: 'swoosh-soft', gain: 0.25 }]; },
  };
})();
