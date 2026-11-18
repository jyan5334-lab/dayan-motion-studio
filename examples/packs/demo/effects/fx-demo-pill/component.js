/* 标签胶囊（fx-demo-pill）—— 示例包自带动效：行业包里的动效 id 必须以 fx-<包名>- 开头 */
(function () {
  const DMS = window.DMS, C = DMS.components, el = DMS.el, E = DMS.ease, clamp = DMS.clamp, lerp = DMS.lerp, prog = DMS.prog;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  C['fx-demo-pill'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-demo-pill'); if (p.color) e.style.setProperty('--pc', p.color);
      const b = el('div', 'pl', `<i></i><span>${esc(p.text || '')}</span>`, e);
      return { b, dot: b.querySelector('i') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5);
      s.b.style.opacity = clamp(q * 3).toFixed(3);
      s.b.style.transform = `translateY(${lerp(30, 0, E.outBack(q, 1.4)).toFixed(2)}%) scale(${lerp(0.85, 1, E.outExpo(q)).toFixed(3)})`;
      s.dot.style.boxShadow = `0 0 ${(6 + 6 * Math.sin(lt * 4)).toFixed(1)}px var(--pc, #2CE0C0)`;
    },
    sfx() { return [{ at: 0, kind: 'pop', gain: 0.35 }]; },
  };
})();
