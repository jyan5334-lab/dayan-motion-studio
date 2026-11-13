/* 前后对比滑块（fx-before-after）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：说到以前/现在、之前/之后、手动/自动这类前后反差时：一张卡上分割线扫过，旧状态被新状态替换
   标准：画面跟着口播的字走（revealAt / revealCue 落在说出"现在"那个字）、有入场和落定、带音效、
   16:9 / 4:3 / 9:16 都排得下（尺寸用 cqw/cqh/cqmin）、时间的纯函数、不出现任何人的品牌。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const side = (o, cls) => `<div class="pane ${cls}"><span class="lab">${DMS.icon(o.icon || (cls === 'af' ? 'bolt' : 'clock'))}${esc(o.label || (cls === 'af' ? '现在' : '以前'))}</span>
      <b>${DMS.hl(o.t || '', o.hl)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</div>`;
  C['fx-before-after'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-before-after');
      const card = el('div', 'card', side(p.before || {}, 'bf') + side(p.after || {}, 'af') + '<i class="bar"><i class="knob">⟷</i></i>', e);
      return { card, af: card.querySelector('.af'), bar: card.querySelector('.bar'), bf: card.querySelector('.bf') };
    },
    update(e, lt, p, s) {
      const k = prog(lt, 0, 0.6), sp = E.spring(k, 0.55, 11);
      s.card.style.opacity = clamp(k * 2.5).toFixed(3);
      s.card.style.transform = `translateY(${lerp(4, 0, E.outExpo(k))}cqh) scale(${lerp(0.94, 1, sp).toFixed(4)})`;
      s.card.style.filter = `blur(${lerp(8, 0, E.outQuart(k)).toFixed(2)}px)`;
      const ra = p.revealAt == null ? 1.4 : p.revealAt, w = E.inOutCubic(prog(lt, ra, p.revealDur || 0.85));
      const x = lerp(100, 0, w);                                   // 分割线从右往左扫，右边露出"现在"
      s.af.style.clipPath = `inset(0 0 0 ${x.toFixed(2)}%)`;
      s.bar.style.left = x + '%'; s.bar.style.opacity = (w > 0.001 && w < 0.999 ? 1 : w >= 0.999 ? clamp(1 - (lt - ra - (p.revealDur || 0.85)) * 3) : 0).toFixed(3);
      s.bf.style.filter = `grayscale(${(0.3 + 0.6 * w).toFixed(2)}) brightness(${(1 - 0.35 * w).toFixed(2)})`;
      const pop = Math.exp(-Math.max(0, lt - ra - (p.revealDur || 0.85)) * 3) * (w >= 0.999 ? 1 : 0);
      s.af.style.setProperty('--pop', pop.toFixed(3));             // 换完一瞬间新状态亮一下
    },
    sfx: p => { const ra = p.revealAt == null ? 1.4 : p.revealAt; return [{ at: 0, kind: 'card', gain: 0.4 }, { at: ra, kind: 'whoosh', gain: 0.5 }, { at: ra + (p.revealDur || 0.85), kind: 'ding', gain: 0.45 }]; },
  };
})();
