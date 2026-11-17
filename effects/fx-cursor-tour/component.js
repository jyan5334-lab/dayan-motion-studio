/* 光标导览（fx-cursor-tour）—— v1.12 补齐分类「09 界面演示」
   什么时候用：手把手讲一个界面"先点这里，再看这里"：一张真实截图上，光标依次移动到几个热点，每到一处出现放大圈和编号标注，讲到哪里亮哪里
   字段：img 真实截图；pts:[{x, y 0–1, t 标注, at 到达时刻}]；zoom 放大圈倍数（默认 1.8） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实截图槽：有 img 就放真实截图；没有就显示"待放真实截图"占位，绝不生成假界面图 */
  const CUR = '<svg class="cur" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.6 L11.5 14 L18 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-cursor-tour'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-cursor-tour');
      const w = el('div', 'w', `${IMGSLOT(p.img, 'pic', '待放真实界面截图')}${CUR}`, e);
      const pts = (p.pts || []).map((o, i) => { const d = el('div', 'hp', `<div class="lz">${p.img ? `<img src="${esc(p.img)}">` : ''}</div><b>${esc(o.t || String(i + 1))}</b>`, w); d.style.left = o.x * 100 + '%'; d.style.top = o.y * 100 + '%'; return d; });
      return { w, cur: w.querySelector('.cur'), pts };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.w.style.opacity = clamp(q * 3).toFixed(3); s.w.style.transform = `scale(${lerp(0.94, 1, E.outExpo(q)).toFixed(3)})`;
      const P = p.pts || []; let x = 0.5, y = 1.1;
      for (let i = 0; i < P.length; i++) { const a = P[i].at == null ? 0.8 + i * 1.2 : P[i].at, k = E.inOutCubic(prog(lt, a - 0.6, 0.6)); x = lerp(x, P[i].x, k); y = lerp(y, P[i].y, k); }
      s.cur.style.left = (x * 100).toFixed(2) + '%'; s.cur.style.top = (y * 100).toFixed(2) + '%';
      const z = p.zoom || 1.8;
      s.pts.forEach((d, i) => { const a = P[i].at == null ? 0.8 + i * 1.2 : P[i].at, nx = P[i + 1] ? (P[i + 1].at == null ? 0.8 + (i + 1) * 1.2 : P[i + 1].at) : 99;
        const on = prog(lt, a, 0.35), dim = lt > nx - 0.3 ? 0.55 : 1; d.style.opacity = (clamp(on * 3) * dim).toFixed(3); d.style.setProperty('--s', E.outBack(on, 1.3).toFixed(3));
        const lz = d.firstElementChild; lz.style.setProperty('--z', z); lz.style.setProperty('--px', P[i].x); lz.style.setProperty('--py', P[i].y); lz.style.opacity = lt > nx - 0.3 ? 0 : 1; });
    },
    sfx(p) { return (p.pts || []).map((o, i) => ({ at: o.at == null ? 0.8 + i * 1.2 : o.at, kind: 'click', gain: 0.4 })).concat([{ at: 0, kind: 'card', gain: 0.3 }]); },
  };
})();
