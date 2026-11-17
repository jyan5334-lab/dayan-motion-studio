/* 真实海报墙（fx-poster-wall）—— v1.12 补齐分类「05 引用 · 社媒」
   什么时候用：讲某部作品 / 课程 / 产品（"这部片很多人刷到过""做它的团队"）：真实海报卡叠放展开，主海报推到前面，角上播放量，旁边依次挂类型标签和关键信息胶囊
   字段：posters:[真实海报图…]（必须是官方海报 / 截图）；plays 播放量；tags:[{t, icon}]；main 主海报序号；credit 出处小字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放图（新闻配图 / 官方海报 / 真实截图，必须真实来源）；没有就显示"待放真实图片"占位，不生成图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实图片')}</span></div>`;

  C['fx-poster-wall'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-poster-wall');
      const ps = (p.posters || ['']).map((src, i) => el('div', 'pc', `${IMGSLOT(src, 'pic', '真实海报')}${i === (p.main || 0) && p.plays ? `<div class="pl">${DMS.icon('play')}<b>${esc(p.plays)}</b></div>` : ''}`, e));
      const tags = (p.tags || []).map(t => el('div', 'tg', `${t.icon ? DMS.icon(t.icon) : '<i></i>'}${esc(t.t)}`, e));
      el('div', 'cr', esc(p.credit || ''), e);
      return { ps, tags };
    },
    update(e, lt, p, s) {
      const n = s.ps.length, mi = p.main || 0, dir = -1, spread = E.inOutCubic(prog(lt, 0.5, 0.7));
      s.ps.forEach((c, i) => { const q = prog(lt, i * 0.12, 0.5), off = (i - mi) * dir, isM = i === mi;
        c.style.opacity = clamp(q * 3).toFixed(3); c.style.zIndex = isM ? 10 : 5 - Math.abs(off);
        c.style.transform = `translateX(calc(-50% + ${(off * 16 * spread).toFixed(2)}cqw)) translateY(${lerp(8, 0, E.outExpo(q)).toFixed(2)}cqh) rotate(${(off * 6 * spread).toFixed(2)}deg) scale(${(isM ? lerp(0.9, 1.04, spread) : 0.86).toFixed(3)})`;
        c.style.filter = isM ? '' : `brightness(${lerp(1, 0.6, spread).toFixed(3)})`; });
      s.tags.forEach((t, i) => { const q = prog(lt, 1.2 + i * 0.3, 0.4); t.style.opacity = clamp(q * 3).toFixed(3); t.style.transform = `translateX(${lerp(-3, 0, E.outExpo(q)).toFixed(2)}cqw)`; });
      e.querySelector('.cr').style.opacity = prog(lt, 1, 0.5).toFixed(3);
    },
    sfx(p) { return [{ at: 0, kind: 'stack', gain: 0.4 }, { at: 0.5, kind: 'card', gain: 0.4 }].concat((p.tags || []).map((t, i) => ({ at: 1.2 + i * 0.3, kind: 'pop-soft', gain: 0.35 }))); },
  };
})();
