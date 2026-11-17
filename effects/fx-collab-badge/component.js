/* 联名标识（fx-collab-badge）—— v1.12 补齐分类「01 开场 · 标识」
   什么时候用：官方合作、品牌联名、"××官方 × ××团队"开场：左右两个标识从两侧滑入，中间 × 旋转落定，扫光掠过，下方一行说明
   字段：a / b：{name 名称, img 真实 logo 图片（可选，必须用官方图）, color}；sub 说明；cross 中间符号（默认 ×） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  const side = o => `<div class="lg">${o.img ? `<img src="${esc(o.img)}">` : `<i style="background:${esc(o.color || 'var(--accent)')}">${esc(String(o.name || '').slice(0, 1))}</i>`}<b>${esc(o.name || '')}</b></div>`;
  C['fx-collab-badge'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-collab-badge');
      const row = el('div', 'row', `${side(p.a || {})}<em>${esc(p.cross || '×')}</em>${side(p.b || {})}<span class="sh"></span>`, e);
      const sub = el('div', 'sub', esc(p.sub || ''), e);
      const [a, b] = row.querySelectorAll('.lg');
      return { a, b, x: row.querySelector('em'), sh: row.querySelector('.sh'), sub };
    },
    update(e, lt, p, s) {
      const qa = prog(lt, 0, 0.55), qb = prog(lt, 0.08, 0.55), qx = prog(lt, 0.4, 0.5);
      s.a.style.transform = `translateX(${lerp(-30, 0, E.outExpo(qa)).toFixed(2)}cqw)`; s.a.style.opacity = clamp(qa * 3).toFixed(3);
      s.b.style.transform = `translateX(${lerp(30, 0, E.outExpo(qb)).toFixed(2)}cqw)`; s.b.style.opacity = clamp(qb * 3).toFixed(3);
      s.x.style.transform = `rotate(${lerp(-180, 0, E.outBack(qx, 1.4)).toFixed(1)}deg) scale(${lerp(0, 1, sp(qx)).toFixed(3)})`; s.x.style.opacity = clamp(qx * 3).toFixed(3);
      const sh = prog(lt, 0.85, 0.7); s.sh.style.transform = `translateX(${lerp(-120, 120, E.inOutCubic(sh)).toFixed(1)}%) skewX(-20deg)`; s.sh.style.opacity = sh > 0 && sh < 1 ? 1 : 0;
      const sq = prog(lt, 0.7, 0.5); s.sub.style.opacity = clamp(sq * 2).toFixed(3); s.sub.style.transform = `translateY(${lerp(2, 0, E.outExpo(sq)).toFixed(2)}cqh)`;
    },
    sfx() { return [{ at: 0, kind: 'whoosh-soft', gain: 0.35 }, { at: 0.4, kind: 'pop-big', gain: 0.4 }, { at: 0.85, kind: 'ding', gain: 0.3 }]; },
  };
})();
