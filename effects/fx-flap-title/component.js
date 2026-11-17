/* 翻牌标题（fx-flap-title）—— v1.12 补齐分类「01 开场 · 标识」
   什么时候用：开篇钩子、章节名、倒计时式揭晓：每个字像机场翻牌一样翻几轮后停在目标字，正式、有时间感
   字段：text 目标文字；sub 下方小字；flips 每格翻几轮（默认 4）；stagger 错峰；tone 牌面颜色 dark/light */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  const POOL = '剪辑口播字幕音效转场动画开源一句话流水线0123456789AIXYZ';
  C['fx-flap-title'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-flap-title'); if (p.tone === 'light') e.classList.add('lt');
      const chars = [...String(p.text || 'AI 剪辑')];
      const row = el('div', 'row', '', e);
      const cells = chars.map((ch, i) => { const c = el('div', 'cell' + (ch === ' ' ? ' sp' : ''), '<i class="t"></i><i class="b"></i><i class="f"></i>', row); return { c, ch, i }; });
      const sub = el('div', 'sub', esc(p.sub || ''), e);
      e.style.setProperty('--n', Math.max(3, chars.length));
      return { cells, sub, n: chars.length };
    },
    update(e, lt, p, s) {
      const fl = p.flips == null ? 4 : p.flips, stg = p.stagger == null ? 0.07 : p.stagger, step = 0.085;
      s.cells.forEach(({ c, ch, i }) => {
        const t0 = 0.1 + i * stg, k = (lt - t0) / step;
        const app = prog(lt, i * 0.05, 0.3);
        c.style.opacity = clamp(app * 3).toFixed(3);
        c.style.transform = `translateY(${lerp(3, 0, E.outExpo(app)).toFixed(2)}cqh)`;
        if (ch === ' ') return;
        const n = Math.floor(k), f = k - n;
        const done = n >= fl;
        const cur = done ? ch : (n < 0 ? ' ' : POOL[(i * 7 + n * 5) % POOL.length]);
        const nxt = done ? ch : (n + 1 >= fl ? ch : POOL[(i * 7 + (n + 1) * 5) % POOL.length]);
        c.querySelector('.t').textContent = done ? ch : nxt; c.querySelector('.b').textContent = cur;
        const fp = c.querySelector('.f'); fp.textContent = cur;
        fp.style.transform = done || n < 0 ? 'rotateX(-90deg)' : `rotateX(${(-f * 180).toFixed(1)}deg)`;
        fp.style.opacity = done || n < 0 ? 0 : 1;
        c.classList.toggle('land', done && k - fl < 2.2);
      });
      const sq = prog(lt, 0.1 + s.n * stg + fl * step, 0.5);
      s.sub.style.opacity = clamp(sq * 2).toFixed(3); s.sub.style.letterSpacing = lerp(0.6, 0.32, E.outExpo(sq)).toFixed(3) + 'em';
    },
    sfx(p) { const n = [...String(p.text || '')].length, fl = p.flips == null ? 4 : p.flips, out = [];
      for (let i = 0; i < fl * 2; i++) out.push({ at: 0.12 + i * 0.085 * 1.4, kind: 'tick', gain: 0.18 });
      out.push({ at: 0.1 + n * (p.stagger == null ? 0.07 : p.stagger) + fl * 0.085, kind: 'thud', gain: 0.45 }); return out; },
  };
})();
