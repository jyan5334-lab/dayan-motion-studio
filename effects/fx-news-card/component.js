/* 新闻卡（fx-news-card）—— v1.12 补齐分类「05 引用 · 社媒」
   什么时候用：讲最近的新闻、行业动态、官方公告（"某某刚刚发布……"）：一张新闻卡带真实配图倾斜滑入，配图缓慢推近，标题逐行出现、关键词划亮，底部来源和时间，角上挂"热点"标签
   字段：img 真实新闻配图（必须来自新闻页面 / 官方渠道，不能生成）；source 来源媒体；time 时间；title 标题；hl 高亮词；tag 角标；credit 底部出处小字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放图（新闻配图 / 官方海报 / 真实截图，必须真实来源）；没有就显示"待放真实图片"占位，不生成图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实图片')}</span></div>`;

  C['fx-news-card'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-news-card');
      const c = el('div', 'cd', `${IMGSLOT(p.img, 'pic', '新闻配图 · 真实图片')}<div class="bd"><div class="mt"><b>${esc(p.source || '')}</b><span>${esc(p.time || '')}</span></div>
        <div class="tt">${DMS.hl(p.title || '', p.hl)}</div></div>${p.tag ? `<div class="tg">${esc(p.tag)}</div>` : ''}`, e);
      el('div', 'cr', esc(p.credit || ''), e);
      return { c, pic: c.querySelector('.pic'), img: c.querySelector('img'), tt: c.querySelector('.tt'), tg: c.querySelector('.tg'), hl: c.querySelector('.tt .hl, .tt em') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.6), k = E.outExpo(q);
      s.c.style.opacity = clamp(q * 3).toFixed(3);
      s.c.style.transform = `perspective(1600px) rotateY(${lerp(-24, -4, k).toFixed(1)}deg) rotateZ(${lerp(4, 1.2, k).toFixed(2)}deg) translateX(${lerp(-12, 0, k).toFixed(2)}cqw)`;
      if (s.img) s.img.style.transform = `scale(${(1.12 - Math.min(lt, 6) * 0.015).toFixed(4)})`;
      const tq = prog(lt, 0.45, 0.6); s.tt.style.clipPath = `inset(0 0 ${((1 - E.outCubic(tq)) * 100).toFixed(1)}% 0)`;
      if (s.hl) s.hl.style.setProperty('--mk', E.outCubic(prog(lt, 1.2, 0.4)).toFixed(3));
      if (s.tg) { const g = prog(lt, 0.8, 0.4); s.tg.style.transform = `rotate(8deg) scale(${lerp(0, 1, sp(g, 0.4, 14)).toFixed(3)})`; }
      e.querySelector('.cr').style.opacity = prog(lt, 0.9, 0.5).toFixed(3);
    },
    sfx(p) { return [{ at: 0, kind: 'swoosh-in', gain: 0.4 }, { at: 0.45, kind: 'paper', gain: 0.3 }, { at: 0.8, kind: 'pop', gain: 0.35 }, { at: 1.2, kind: 'marker', gain: 0.3 }]; },
  };
})();
