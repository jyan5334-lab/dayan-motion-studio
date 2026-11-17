/* 故障闪切（fx-glitch-hit）—— v1.12 补齐分类「08 转场」
   什么时候用：话题突然转折、"但是！""翻车了"：0.5 秒内画面被横向切片错位、RGB 分离、反色闪两下，盖住切点，适合科技 / 翻车 / 反转
   字段：dur 时长（默认 0.5）；strength 0–1 强度；color 主色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-glitch-hit'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-glitch-hit');
      const sl = []; for (let i = 0; i < 14; i++) sl.push(el('div', 'sl', '', e));
      const rgb = el('div', 'rgb', '', e), fl = el('div', 'fl', '', e);
      return { sl, rgb, fl };
    },
    update(e, lt, p, s) {
      const d = p.dur || 0.5, st = p.strength == null ? 1 : p.strength, k = clamp(lt / d), env = Math.sin(Math.PI * k) * st;
      const seed = Math.floor(lt * 30);
      s.sl.forEach((x, i) => { const r = Math.sin((seed + 1) * (i + 3) * 12.9898) * 43758.5453, f = r - Math.floor(r);
        const on = f < 0.55 * env + 0.05 && k < 1;
        x.style.top = `${((Math.sin((seed + i) * 78.233) * 0.5 + 0.5) * 96).toFixed(2)}%`; x.style.height = `${(1 + f * 9).toFixed(2)}%`;
        x.style.opacity = on ? 1 : 0; x.style.transform = `translateX(${((f - 0.5) * 30 * env).toFixed(2)}%)`;
        x.style.backdropFilter = x.style.webkitBackdropFilter = `hue-rotate(${(f * 360).toFixed(0)}deg) ${f > 0.7 ? 'invert(1)' : 'saturate(3)'}`; });
      s.rgb.style.opacity = (env * 0.7).toFixed(3); s.rgb.style.transform = `translateX(${(Math.sin(lt * 90) * 1.2 * env).toFixed(2)}%)`;
      s.fl.style.opacity = ((seed % 5 === 0 && k > 0.1 && k < 0.9 ? 0.55 : 0) * st).toFixed(3);
    },
    sfx() { return [{ at: 0, kind: 'zap', gain: 0.55 }]; },
  };
})();
