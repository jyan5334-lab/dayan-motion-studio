/* 系列目录（fx-series-list）—— v1.12 补齐分类「07 收尾 · CTA」
   什么时候用：结尾或片头交代"这是系列第几期、后面还有什么"：一列期数卡，已更新的打勾，当前这期高亮放大，未更新的灰着带锁
   字段：title 系列名；eps:[{t 标题, state done/now/lock}] */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-series-list'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-series-list');
      el('div', 'ti', esc(p.title || ''), e);
      const rs = (p.eps || []).map((o, i) => el('div', 'ep ' + (o.state || 'done'), `<em>${String(i + 1).padStart(2, '0')}</em><span>${esc(o.t)}</span><i>${o.state === 'lock' ? DMS.icon('lock') : o.state === 'now' ? DMS.icon('play') : DMS.icon('check')}</i>`, e));
      return { rs };
    },
    update(e, lt, p, s) {
      s.rs.forEach((r, i) => { const q = prog(lt, 0.2 + i * 0.18, 0.45); const now = r.classList.contains('now'), nk = now ? prog(lt, 0.4 + s.rs.length * 0.18, 0.5) : 0;
        r.style.opacity = clamp(q * 3).toFixed(3); r.style.transform = `translateX(${lerp(-4, 0, E.outExpo(q)).toFixed(2)}cqw) scale(${(1 + sp(nk) * 0.06).toFixed(3)})`; r.style.setProperty('--nk', nk.toFixed(3)); });
    },
    sfx(p) { const n = (p.eps || []).length; return (p.eps || []).map((o, i) => ({ at: 0.2 + i * 0.18, kind: 'tick', gain: 0.25 })).concat([{ at: 0.4 + n * 0.18, kind: 'pop-big', gain: 0.4 }]); },
  };
})();
