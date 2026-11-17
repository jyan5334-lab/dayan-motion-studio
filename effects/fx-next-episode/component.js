/* 下期预告（fx-next-episode）—— v1.12 补齐分类「07 收尾 · CTA」
   什么时候用：结尾预告下一期（"下期我让它自动做封面，想看扣 1"）：一张"NEXT"预告卡从下方推上来，标题打出，下方期数和日期胶囊，角上倒计时圈转满
   字段：label 角标（默认 NEXT EPISODE）；title 下期标题；ep 期数；date 日期 / 时间；img 下期画面（可选，真实截图）；count 倒计时秒数（默认 3） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-next-episode'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-next-episode');
      const c = el('div', 'cd', `${p.img ? `<div class="im"><img src="${esc(p.img)}"></div>` : '<div class="gl"></div>'}<div class="tx"><small>${esc(p.label || 'NEXT EPISODE')}</small><b>${esc(p.title || '')}</b>
        <div class="ch"><span>${esc(p.ep || '')}</span><span>${DMS.icon('clock')}${esc(p.date || '')}</span></div></div>
        <div class="cd2"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" class="t"/><circle cx="20" cy="20" r="16" class="f" pathLength="1"/></svg><b>3</b></div>`, e);
      return { c, b: c.querySelector('.tx b'), ch: c.querySelector('.ch'), f: c.querySelector('.f'), n: c.querySelector('.cd2 b') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.6); s.c.style.opacity = clamp(q * 3).toFixed(3); s.c.style.transform = `translateY(${lerp(20, 0, E.outExpo(q)).toFixed(2)}cqh) rotate(${lerp(3, 0, E.outExpo(q)).toFixed(2)}deg)`;
      s.b.style.clipPath = `inset(0 ${((1 - E.outCubic(prog(lt, 0.35, 0.6))) * 100).toFixed(1)}% 0 0)`;
      s.ch.style.opacity = prog(lt, 0.8, 0.4).toFixed(3);
      const cnt = p.count == null ? 3 : p.count, k = clamp((lt - 0.6) / cnt);
      s.f.style.strokeDasharray = `${k.toFixed(4)} 1`; s.n.textContent = String(Math.max(0, Math.ceil(cnt - Math.max(0, lt - 0.6))));
    },
    sfx(p) { const cnt = p.count == null ? 3 : p.count, o = [{ at: 0, kind: 'swoosh-in', gain: 0.4 }]; for (let i = 0; i < cnt; i++) o.push({ at: 0.6 + i, kind: 'tick', gain: 0.3 }); return o; },
  };
})();
