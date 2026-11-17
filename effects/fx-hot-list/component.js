/* 热搜榜（fx-hot-list）—— v1.12 补齐分类「05 引用 · 社媒」
   什么时候用：讲"大家都在讨论什么""冲上热搜"：一块热搜榜面板，前几名逐条刷出（排名、话题、热度、新 / 热 / 爆标签），然后选中某一条放大展开，带真实配图
   字段：platform 榜单名；items:[{t 话题, heat 热度, tag 新/热/爆, img 真实配图（可选）}]；focus 展开第几条；focusAt */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放图（新闻配图 / 官方海报 / 真实截图，必须真实来源）；没有就显示"待放真实图片"占位，不生成图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实图片')}</span></div>`;

  const TC = { '爆': '#FF2D45', '热': '#FF7A1A', '新': '#2F9BFF' };
  C['fx-hot-list'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-hot-list');
      const pn = el('div', 'pn', `<div class="hd">${DMS.icon('fire')}<b>${esc(p.platform || '热搜榜')}</b><span>实时</span></div>`, e);
      const rows = (p.items || []).map((o, i) => { const r = el('div', 'r', `<em class="${i < 3 ? 'k' + i : ''}">${i + 1}</em><span>${esc(o.t)}</span>${o.tag ? `<i style="background:${TC[o.tag] || '#888'}">${esc(o.tag)}</i>` : ''}<b>${esc(o.heat || '')}</b>
        ${i === p.focus ? `<div class="ex">${IMGSLOT(o.img, 'pic', '话题配图 · 真实图片')}</div>` : ''}`, pn); return r; });
      return { pn, rows };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.pn.style.opacity = clamp(q * 3).toFixed(3); s.pn.style.transform = `translateY(${lerp(5, 0, E.outExpo(q)).toFixed(2)}cqh)`;
      const fa = p.focusAt == null ? 2.6 : p.focusAt, fk = E.inOutCubic(prog(lt, fa, 0.6));
      s.rows.forEach((r, i) => { const q2 = prog(lt, 0.3 + i * 0.16, 0.4);
        r.style.opacity = (clamp(q2 * 3) * (i === p.focus ? 1 : 1 - fk * 0.55)).toFixed(3); r.style.transform = `translateX(${lerp(-4, 0, E.outExpo(q2)).toFixed(2)}cqw)`;
        if (i === p.focus) { r.style.setProperty('--fk', fk.toFixed(3)); const ex = r.querySelector('.ex'); if (ex) ex.style.height = `calc(${fk.toFixed(3)} * 30cqh)`; } });
    },
    sfx(p) { return [{ at: 0, kind: 'card', gain: 0.35 }].concat((p.items || []).map((o, i) => ({ at: 0.3 + i * 0.16, kind: 'tick', gain: 0.22 }))).concat(p.focus != null ? [{ at: p.focusAt == null ? 2.6 : p.focusAt, kind: 'pop-big', gain: 0.4 }] : []); },
  };
})();
