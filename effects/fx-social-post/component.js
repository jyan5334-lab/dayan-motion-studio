/* 社交帖子卡（fx-social-post）—— v1.12 补齐分类「05 引用 · 社媒」
   什么时候用：引用某条帖子、微博、推文、朋友圈、官方账号发言：帖子卡滑入，头像昵称认证，正文逐行出现，真实配图宫格展开，点赞 / 评论 / 转发数字滚动上涨
   字段：avatar 头像（真实图片）；name 昵称；handle 账号；verified 认证；time；text 正文；hl 高亮词；imgs:[真实配图…]（0–4 张）；likes / comments / shares 数字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实图片槽：有 img 就放图（新闻配图 / 官方海报 / 真实截图，必须真实来源）；没有就显示"待放真实图片"占位，不生成图 */
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实图片')}</span></div>`;

  const fmt = v => v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(Math.round(v));
  C['fx-social-post'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-social-post');
      const imgs = p.imgs || [];
      const c = el('div', 'cd', `<div class="hd">${p.avatar ? `<img class="av" src="${esc(p.avatar)}">` : `<i class="av">${esc(String(p.name || '?').slice(0, 1))}</i>`}<div><b>${esc(p.name || '')}${p.verified ? '<u>✓</u>' : ''}</b><small>${esc(p.handle || '')} · ${esc(p.time || '')}</small></div></div>
        <div class="tx">${DMS.hl(p.text || '', p.hl)}</div>${imgs.length ? `<div class="gd n${Math.min(4, imgs.length)}">${imgs.slice(0, 4).map(s => IMGSLOT(s, 'g', '真实配图')).join('')}</div>` : ''}
        <div class="ft"><span>${DMS.icon('heart')}<b data-v="${p.likes || 0}">0</b></span><span>${DMS.icon('chat')}<b data-v="${p.comments || 0}">0</b></span><span>${DMS.icon('link')}<b data-v="${p.shares || 0}">0</b></span></div>`, e);
      return { c, tx: c.querySelector('.tx'), gs: [...c.querySelectorAll('.g')], nums: [...c.querySelectorAll('.ft b')], heart: c.querySelector('.ft span') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.55); s.c.style.opacity = clamp(q * 3).toFixed(3); s.c.style.transform = `translateY(${lerp(8, 0, E.outExpo(q)).toFixed(2)}cqh) scale(${lerp(0.94, 1, E.outExpo(q)).toFixed(3)})`;
      s.tx.style.clipPath = `inset(0 0 ${((1 - E.outCubic(prog(lt, 0.4, 0.7))) * 100).toFixed(1)}% 0)`;
      s.gs.forEach((g, i) => { const gq = prog(lt, 0.9 + i * 0.12, 0.4); g.style.opacity = clamp(gq * 3).toFixed(3); g.style.transform = `scale(${lerp(0.8, 1, sp(gq)).toFixed(3)})`; });
      s.nums.forEach((b, i) => { const v = +b.dataset.v, k = E.outExpo(prog(lt, 1.4 + i * 0.15, 1.4)); b.textContent = fmt(v * k); });
      const hq = prog(lt, 1.4, 0.4); s.heart.style.setProperty('--hk', hq.toFixed(3));
    },
    sfx() { return [{ at: 0, kind: 'notify-soft', gain: 0.4 }, { at: 0.9, kind: 'pop-soft', gain: 0.3 }, { at: 1.4, kind: 'pop', gain: 0.35 }, { at: 1.5, kind: 'roll', gain: 0.25 }]; },
  };
})();
