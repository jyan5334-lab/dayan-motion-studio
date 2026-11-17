/* 手机评论区（fx-phone-comments）—— v1.12 补齐分类「05 引用 · 社媒」
   什么时候用：讲"评论区天天有人问""大家在说什么"：一部手机，顶部是帖子标题，评论一条条从底部顶上来（头像、昵称、内容、点赞），最后高亮其中一条
   字段：title 帖子标题；comments:[{name, t 内容, likes}]；every 间隔；focus 高亮第几条；label 手机旁的标签（可选） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-phone-comments'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-phone-comments');
      const ph = el('div', 'ph', `<i class="nt"></i><div class="sc"><div class="pt">${esc(p.title || '')}</div><div class="ch">${DMS.icon('chat')} 评论</div><div class="ls"></div></div>`, e);
      const ls = ph.querySelector('.ls');
      const rows = (p.comments || []).map((c, i) => el('div', 'cm' + (i === p.focus ? ' fo' : ''), `<i>${esc(String(c.name || '?').slice(0, 1))}</i><div><small>${esc(c.name || '')}</small><span>${esc(c.t)}</span></div><b>${DMS.icon('heart')}${esc(c.likes || '')}</b>`, ls));
      return { ph, rows };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.6); s.ph.style.opacity = clamp(q * 3).toFixed(3); s.ph.style.transform = `translateY(${lerp(12, 0, E.outExpo(q)).toFixed(2)}cqh) rotate(${lerp(-4, 0, E.outExpo(q)).toFixed(2)}deg)`;
      const ev = p.every == null ? 0.7 : p.every;
      s.rows.forEach((r, i) => { const q2 = prog(lt, 0.6 + i * ev, 0.4); r.style.opacity = clamp(q2 * 3).toFixed(3); r.style.transform = `translateY(${lerp(5, 0, E.outBack(q2, 1.2)).toFixed(2)}cqh) scale(${lerp(0.9, 1, sp(q2)).toFixed(3)})`; });
      const fq = prog(lt, 0.6 + s.rows.length * ev + 0.2, 0.4); e.style.setProperty('--fk', fq.toFixed(3));
    },
    sfx(p) { const ev = p.every == null ? 0.7 : p.every; return [{ at: 0, kind: 'swoosh-in', gain: 0.35 }].concat((p.comments || []).map((c, i) => ({ at: 0.6 + i * ev, kind: 'receive', gain: 0.35 }))); },
  };
})();
