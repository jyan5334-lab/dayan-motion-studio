/* 品牌落版（fx-end-brand）—— v1.12 补齐分类「07 收尾 · CTA」
   什么时候用：整条片子的最后一个画面：品牌标识在中心亮起，品牌名逐字出现，一句 slogan 跟进，光线扫过，四周粒子慢慢散开，停 1–2 秒
   字段：mark 标识字（或 img 真实 logo）；name 品牌名；slogan；color */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-end-brand'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-end-brand'); if (p.color) e.style.setProperty('--bc', p.color);
      const mk = el('div', 'mk', p.img ? `<img src="${esc(p.img)}">` : `<b>${esc(p.mark || '琰')}</b>`, e);
      const nm = el('div', 'nm', [...String(p.name || '')].map(c => `<i>${esc(c)}</i>`).join(''), e);
      const sl = el('div', 'sl', esc(p.slogan || ''), e);
      const sw = el('div', 'sw', '', e);
      const pt = []; for (let i = 0; i < 24; i++) pt.push(el('u', 'pt', '', e));
      return { mk, cs: [...nm.children], sl, sw, pt };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.7); s.mk.style.opacity = clamp(q * 3).toFixed(3); s.mk.style.transform = `scale(${lerp(0.4, 1, E.outBack(q, 1.3)).toFixed(3)}) rotate(${lerp(-90, 0, E.outExpo(q)).toFixed(1)}deg)`;
      s.mk.style.setProperty('--g', (0.5 + 0.5 * Math.sin(lt * 2)).toFixed(3));
      s.cs.forEach((c, i) => { const q2 = prog(lt, 0.5 + i * 0.05, 0.4); c.style.opacity = clamp(q2 * 3).toFixed(3); c.style.transform = `translateY(${lerp(0.5, 0, E.outExpo(q2)).toFixed(3)}em)`; c.style.filter = `blur(${lerp(6, 0, q2).toFixed(2)}px)`; });
      const sq = prog(lt, 0.5 + s.cs.length * 0.05 + 0.2, 0.6); s.sl.style.opacity = (0.8 * clamp(sq * 2)).toFixed(3); s.sl.style.letterSpacing = lerp(0.8, 0.4, E.outExpo(sq)).toFixed(3) + 'em';
      const w = prog(lt, 1.2, 0.9); s.sw.style.transform = `translateX(${lerp(-60, 160, E.inOutCubic(w)).toFixed(1)}%) skewX(-20deg)`; s.sw.style.opacity = w > 0 && w < 1 ? 1 : 0;
      s.pt.forEach((x, i) => { const a = i / 24 * Math.PI * 2 + i, u = Math.max(0, lt - 0.3), r = 10 + u * (6 + (i % 5) * 2);
        x.style.opacity = (clamp(u * 2) * clamp(1 - u / 4) * 0.8).toFixed(3); x.style.transform = `translate(${(Math.cos(a) * r).toFixed(2)}cqw, ${(Math.sin(a) * r * 0.7).toFixed(2)}cqh)`; });
    },
    sfx() { return [{ at: 0, kind: 'rise', gain: 0.35 }, { at: 0.6, kind: 'impact', gain: 0.5 }, { at: 1.2, kind: 'ding', gain: 0.35 }]; },
  };
})();
