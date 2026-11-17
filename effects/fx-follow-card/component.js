/* 关注名片（fx-follow-card）—— v1.12 补齐分类「07 收尾 · CTA」
   什么时候用：结尾引导关注账号：一张名片卡弹出（头像、账号名、一句介绍、作品数 / 粉丝数），光标移到"关注"按钮点下去，按钮变成"已关注"并冒出爱心
   字段：avatar 头像（真实图片，可选）；name；bio；stats:[{t, v}]；btn 按钮文字；done 点后文字；clickAt */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-follow-card'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-follow-card');
      const c = el('div', 'cd', `${p.avatar ? `<img class="av" src="${esc(p.avatar)}">` : `<i class="av">${esc(String(p.name || '?').slice(0, 1))}</i>`}<div class="md"><b>${esc(p.name || '')}</b><span>${esc(p.bio || '')}</span>
        <div class="st">${(p.stats || []).map(o => `<div><b>${esc(o.v)}</b><small>${esc(o.t)}</small></div>`).join('')}</div></div><div class="bt"><span class="a">${esc(p.btn || '+ 关注')}</span><span class="d">${esc(p.done || '已关注')}</span></div>
        <svg class="cur" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.6 L11.5 14 L18 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`, e);
      const hearts = []; for (let i = 0; i < 6; i++) hearts.push(el('i', 'ht', '♥', c));
      return { c, bt: c.querySelector('.bt'), cur: c.querySelector('.cur'), hearts };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.55); s.c.style.opacity = clamp(q * 3).toFixed(3); s.c.style.transform = `scale(${lerp(0.8, 1, E.outBack(q, 1.3)).toFixed(3)})`;
      const ca = p.clickAt == null ? 1.9 : p.clickAt, mv = E.inOutCubic(prog(lt, ca - 0.8, 0.75));
      s.cur.style.opacity = (lt > ca - 0.9 && lt < ca + 1.2 ? 1 : 0).toFixed(3);
      s.cur.style.left = `${lerp(60, 84, mv).toFixed(2)}%`; s.cur.style.top = `${lerp(110, 52, mv).toFixed(2)}%`;
      const pr = lt > ca && lt < ca + 0.15 ? 0.9 : 1; s.cur.style.transform = `scale(${pr})`;
      const dk = prog(lt, ca, 0.25); s.bt.style.setProperty('--d', dk.toFixed(3)); s.bt.style.transform = `scale(${(lt > ca && lt < ca + 0.15 ? 0.92 : 1)})`;
      s.hearts.forEach((h, i) => { const u = lt - ca - i * 0.05; h.style.opacity = (u > 0 && u < 0.9 ? 1 - u / 0.9 : 0).toFixed(3); h.style.transform = `translate(${((i - 2.5) * 1.6 * Math.max(0, u)).toFixed(2)}cqw, ${(-u * 18).toFixed(2)}cqh) scale(${(0.6 + Math.max(0, u) * 0.6).toFixed(3)})`; });
    },
    sfx(p) { const ca = p.clickAt == null ? 1.9 : p.clickAt; return [{ at: 0, kind: 'card', gain: 0.4 }, { at: ca, kind: 'click', gain: 0.5 }, { at: ca + 0.05, kind: 'success', gain: 0.4 }]; },
  };
})();
