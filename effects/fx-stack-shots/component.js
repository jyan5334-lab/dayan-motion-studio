/* 截图叠放展开（fx-stack-shots）—— v1.12 补齐分类「11 浮窗 · 画中画」
   什么时候用："我试了好几个工具 / 做了好几版"：几张真实截图先叠成一摞落下，再像扑克牌一样扇形展开，最后一张（或指定那张）抽出放大
   字段：imgs:[真实截图…]（2–6 张）；labels:[每张小标签]；pick 最后抽出的序号（默认最后一张，-1 不抽） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放真实截图 / 照片；没有就显示占位，绝不生成假图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-stack-shots'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-stack-shots');
      const ims = p.imgs && p.imgs.length ? p.imgs.slice(0, 6) : ['', '', ''];
      const cs = ims.map((s, i) => el('div', 'c', `${IMGSLOT(s, 'pic', '真实截图')}${p.labels && p.labels[i] ? `<b>${esc(p.labels[i])}</b>` : ''}`, e));
      return { cs };
    },
    update(e, lt, p, s) {
      const n = s.cs.length, pk = p.pick == null ? n - 1 : p.pick;
      s.cs.forEach((c, i) => { const dq = prog(lt, i * 0.1, 0.45), d = E.outBack(dq, 1.2), f = E.inOutCubic(prog(lt, 0.4 + n * 0.1, 0.8)), u = (i - (n - 1) / 2);
        const pq = pk === i ? E.outBack(prog(lt, 1.5 + n * 0.1, 0.6), 1.2) : 0;
        const x = u * 22 * f * (1 - pq), y = lerp(-30, 0, d) + Math.abs(u) * 3 * f * (1 - pq) - pq * 4, r = lerp((i % 2 ? 4 : -4), u * 7, f) * (1 - pq), sc = 1 + pq * 0.28;
        c.style.opacity = clamp(dq * 4).toFixed(3); c.style.transform = `translate(${x.toFixed(2)}cqw, ${y.toFixed(2)}cqh) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(3)})`; c.style.zIndex = pk === i && pq > 0 ? 20 : i;
        c.style.filter = pk >= 0 && pq > 0.01 && pk !== i ? `brightness(${(1 - 0.5 * pq).toFixed(3)})` : ''; });
      if (pk >= 0) { const pq = E.outBack(prog(lt, 1.5 + n * 0.1, 0.6), 1.2); s.cs.forEach((c, i) => { if (i !== pk) c.style.filter = `brightness(${(1 - 0.45 * clamp(pq)).toFixed(3)}) blur(${(clamp(pq) * 2).toFixed(1)}px)`; }); }
    },
    sfx(p) { const n = Math.min(6, (p.imgs || ['', '', '']).length || 3); return Array.from({ length: n }, (_, i) => ({ at: i * 0.1, kind: 'card', gain: 0.3 })).concat([{ at: 0.4 + n * 0.1, kind: 'stack', gain: 0.4 }]).concat(p.pick === -1 ? [] : [{ at: 1.5 + n * 0.1, kind: 'pop-big', gain: 0.4 }]); },
  };
})();
