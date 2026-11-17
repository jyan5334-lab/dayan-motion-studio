/* 人物名字条（fx-name-strip）—— v1.12 补齐分类「06 人物 · 字幕」
   什么时候用：人物第一次出场、介绍嘉宾或讲师（"讲师 · 某某老师""《××》原创团队"）：色条从左擦出，名字大字压上，身份小字跟进，侧边可放真实 logo，离场时反向擦除
   字段：name 名字；title 身份；logo 真实 logo 图（可选）；color 色条；out 由层的 out 控制 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-name-strip'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-name-strip'); if (p.color) e.style.setProperty('--nc', p.color);
      const bar = el('div', 'bar', '', e);
      const t = el('div', 'tx', `${p.logo ? `<img src="${esc(p.logo)}">` : ''}<div><b>${esc(p.name || '')}</b><span>${esc(p.title || '')}</span></div>`, e);
      return { bar, t, b: t.querySelector('b'), sp: t.querySelector('span') };
    },
    update(e, lt, p, s) {
      e.style.fontSize = Math.min(e.clientHeight * 0.36, e.clientWidth * 0.08).toFixed(1) + 'px';
      const q = E.outExpo(prog(lt, 0, 0.5)); s.bar.style.transform = `scaleX(${q.toFixed(3)})`;
      const nq = prog(lt, 0.2, 0.5); s.b.style.clipPath = `inset(0 ${((1 - E.outExpo(nq)) * 100).toFixed(1)}% 0 0)`;
      const tq = prog(lt, 0.45, 0.5); s.sp.style.opacity = clamp(tq * 2).toFixed(3); s.sp.style.transform = `translateY(${lerp(.4, 0, E.outExpo(tq)).toFixed(2)}em)`;
    },
    sfx() { return [{ at: 0, kind: 'swoosh-in', gain: 0.35 }, { at: 0.45, kind: 'tick', gain: 0.25 }]; },
  };
})();
