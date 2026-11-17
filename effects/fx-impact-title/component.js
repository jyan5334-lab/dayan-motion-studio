/* 冲击标题（fx-impact-title）—— v1.12 补齐分类「01 开场 · 标识」
   什么时候用：开场一句狠话、结论砸下（"甩了几条街""直接封神"）：放射速度线收拢，标题从镜头前砸到画面上，碎屑飞散，整屏一震
   字段：text 标题；hl 高亮词；sub 副标题；color 速度线颜色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-impact-title'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-impact-title'); if (p.color) e.style.setProperty('--lc', p.color);
      const rays = el('div', 'rays', '', e), R = [];
      for (let i = 0; i < 28; i++) { const r = el('i', '', '', rays); r.style.transform = `rotate(${(i / 28 * 360 + (i * 37 % 9)).toFixed(1)}deg)`; R.push(r); }
      const t = el('div', 't', DMS.hl(p.text || '一句话，剪完整条口播', p.hl), e);
      const sub = el('div', 'sub', esc(p.sub || ''), e);
      const bits = []; for (let i = 0; i < 16; i++) bits.push(el('i', 'bit', '', e));
      if (L && L.def) DMS.shake((L.def.at || 0) + 0.32, 12, 0.35);
      return { R, t, sub, bits };
    },
    update(e, lt, p, s) {
      const rq = prog(lt, 0, 0.4);
      s.R.forEach((r, i) => { r.style.opacity = (rq < 1 ? (0.25 + (i % 3) * 0.25) * (1 - prog(lt, 0.3, 0.3)) : 0).toFixed(3);
        r.style.setProperty('--len', lerp(60, 8, E.inCubic(rq)).toFixed(1) + 'cqmax'); });
      const q = prog(lt, 0.12, 0.22), k = E.inQuad(q);
      s.t.style.opacity = clamp(q * 5).toFixed(3);
      s.t.style.transform = `scale(${(lerp(3.2, 1, k) * (1 + (lt > 0.34 ? Math.exp(-(lt - 0.34) * 9) * Math.sin((lt - 0.34) * 30) * 0.04 : 0))).toFixed(4)})`;
      s.t.style.filter = `blur(${lerp(10, 0, k).toFixed(2)}px)`;
      s.bits.forEach((b, i) => { const u = lt - 0.34; const a = i / 16 * Math.PI * 2 + 0.3;
        const r = u > 0 ? 18 + u * (60 + (i % 4) * 12) : 0, y = u > 0 ? u * u * 50 : 0;
        b.style.opacity = (u > 0 ? clamp(1 - u * 1.4) : 0).toFixed(3);
        b.style.transform = `translate(${(Math.cos(a) * r).toFixed(1)}cqw, ${(Math.sin(a) * r * 0.5 + y).toFixed(1)}cqh) rotate(${(u * 400 * (i % 2 ? 1 : -1)).toFixed(0)}deg)`; });
      const sq = prog(lt, 0.55, 0.5); s.sub.style.opacity = clamp(sq * 2).toFixed(3); s.sub.style.letterSpacing = lerp(0.7, 0.32, E.outExpo(sq)).toFixed(3) + 'em';
    },
    sfx() { return [{ at: 0, kind: 'rise', gain: 0.35 }, { at: 0.34, kind: 'impact', gain: 0.8 }]; },
  };
})();
