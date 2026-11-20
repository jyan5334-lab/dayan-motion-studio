/* 浏览器实拍（fx-browser-shot）—— v1.12 补齐分类「09 界面演示」
   什么时候用：讲到某个网站 / 官网 / 产品页（"打开它的官网""GitHub 上已经 2 万星"）：浏览器窗口弹出，网址逐字打出，页面是真实截图，自动往下滚一段，可在某处画框高亮
   字段：url 网址；img 真实网页截图（长图可滚）；scroll 滚动比例 0–1（默认 0.3）；mark [x, y, w, h] 高亮框（0–1，相对窗口可视区，可选）；markLabel 高亮旁标注；tabs:[标签页标题…] */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实截图槽：有 img 就放真实截图；没有就显示"待放真实截图"占位，绝不生成假界面图 */
  const CUR = '<svg class="cur" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.6 L11.5 14 L18 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-browser-shot'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-browser-shot');
      const w = el('div', 'w', `<div class="tb">${(p.tabs || ['新标签页']).map((t, i) => `<span class="${i ? '' : 'on'}">${DMS.icon('globe')}${esc(t)}</span>`).join('')}</div>
        <div class="ad"><i>‹</i><i>›</i><div class="u">${DMS.icon('lock')}<span></span></div></div>
        <div class="vp"><div class="pg">${IMGSLOT(p.img, 'pic', '待放真实网页截图')}</div>${p.mark ? `<div class="mk"><b>${esc(p.markLabel || '')}</b></div>` : ''}</div>`, e);
      const mk = w.querySelector('.mk'); if (mk) { const m = p.mark; Object.assign(mk.style, { left: m[0] * 100 + '%', top: m[1] * 100 + '%', width: m[2] * 100 + '%', height: m[3] * 100 + '%' }); }
      return { w, u: w.querySelector('.u span'), pg: w.querySelector('.pg'), vp: w.querySelector('.vp'), mk };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.55); s.w.style.opacity = clamp(q * 3).toFixed(3); s.w.style.transform = `translateY(${lerp(8, 0, E.outExpo(q)).toFixed(2)}cqh) scale(${lerp(0.92, 1, E.outExpo(q)).toFixed(3)})`;
      const u = [...String(p.url || '')]; s.u.textContent = u.slice(0, Math.floor(prog(lt, 0.35, Math.max(0.4, u.length / 30)) * u.length)).join('');
      const sc = p.scroll == null ? 0.3 : p.scroll, st = 0.45 + Math.max(0.4, u.length / 30);
      const over = Math.max(0, s.pg.offsetHeight - s.vp.clientHeight);   // 截图比窗口高出多少，scroll 是滚到这段的几成
      s.pg.style.transform = `translateY(${(-sc * over * E.inOutCubic(prog(lt, st + 0.2, 1.2))).toFixed(1)}px)`;
      if (s.mk) { const mq = prog(lt, st + 1.5, 0.5); s.mk.style.opacity = clamp(mq * 3).toFixed(3); s.mk.style.transform = `scale(${lerp(1.15, 1, E.outBack(mq, 1.2)).toFixed(3)})`; }
    },
    sfx(p) { const u = String(p.url || '').length, st = 0.45 + Math.max(0.4, u / 30); return [{ at: 0, kind: 'card', gain: 0.35 }, { at: 0.35, kind: 'typing', gain: 0.3 }, { at: st + 0.2, kind: 'whoosh-soft', gain: 0.3 }].concat(p.mark ? [{ at: st + 1.5, kind: 'marker', gain: 0.4 }] : []); },
  };
})();
