/* 排行条（fx-rank-bars）—— v1.12 补齐分类「02 数据 · 报表」
   什么时候用：讲排名、榜单、谁第一（"最常用的 5 个 AI 工具""播放量前五"）：横条从短到长依次长出，名次徽章翻出，第一名高亮并加冠，数值滚动
   字段：items:[{t 名称, v 数值, img 真实图标（可选）}]（按传入顺序，第一项为第一名）；unit；title 小标题；source */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-rank-bars'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-rank-bars');
      const it = p.items || [], mx = Math.max(...it.map(o => o.v), 1);
      if (p.title) el('div', 'ti', esc(p.title), e);
      const list = el('div', 'ls', '', e);
      const rows = it.map((o, i) => { const r = el('div', 'r' + (i === 0 ? ' top' : ''), `<em>${i + 1}</em><span class="nm">${o.img ? `<img src="${esc(o.img)}">` : ''}${esc(o.t)}</span><div class="tr"><u></u><b>0</b></div>`, list);
        return { r, u: r.querySelector('u'), b: r.querySelector('b'), em: r.querySelector('em'), f: o.v / mx, v: o.v }; });
      el('div', 'src', esc(p.source || ''), e);
      return { rows };
    },
    update(e, lt, p, s) {
      const n = s.rows.length;
      s.rows.forEach((o, i) => { const at = 0.15 + (n - 1 - i) * 0.22, q = prog(lt, at, 0.7), k = E.outExpo(q);
        o.r.style.opacity = clamp(prog(lt, i * 0.06, 0.3) * 3).toFixed(3);
        o.u.style.transform = `scaleX(${(o.f * k).toFixed(4)})`;
        o.b.textContent = Math.round(o.v * k).toLocaleString() + (p.unit || '');
        o.b.style.left = `calc(${(o.f * k * 100).toFixed(2)}% + 1.4cqw)`;
        o.em.style.transform = `rotateY(${lerp(90, 0, E.outBack(prog(lt, at, 0.4), 1.4)).toFixed(1)}deg)`;
        if (i === 0) o.r.style.setProperty('--glow', prog(lt, at + 0.6, 0.4).toFixed(3)); });
    },
    sfx(p) { const n = (p.items || []).length, o = []; for (let i = n - 1; i >= 0; i--) o.push({ at: 0.15 + (n - 1 - i) * 0.22, kind: i ? 'swoosh-soft' : 'success', gain: i ? 0.25 : 0.45 }); return o; },
  };
})();
