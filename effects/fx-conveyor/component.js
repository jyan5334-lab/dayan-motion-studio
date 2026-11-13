/* 流水线传送带（fx-conveyor）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：一条片子按"工序 / 站点 / 流程"一站一站往前走（剪辑流水线、生产线、闯关）时，放在 globals 里跨场景常驻：
             画面底部一条传送带，场景推移（push 转场）时皮带和滚轮同步向左滚动，像镜头一路跟着往右走；
             下面一排站点导航，当前站亮起、进度线跟着走到当前站。精灵（fx-play-sprite）可以站在皮带上。
   用法：box 铺满 [0,0,1,1]；pans:[{t 绝对时间, dur, d 移动多少屏宽}] 和场景 push 转场对齐；steps:[{t 绝对时间, i 当前站}]。
   标准：时间的纯函数（只由全片时间 t 决定）、跨场景连续、不压内容区（只占画面底部 13%）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NR = 14;
  function offsetAt(pans, t) {          // 累计滚动量（单位：屏宽），推移段内 smooth 缓动
    let o = 0;
    for (const p of pans || []) o += (p.d == null ? 1 : p.d) * E.smooth(prog(t, p.t, p.dur || 0.6));
    return o;
  }
  function stepAt(steps, t) {
    let cur = -1, prev = -1, t0 = -1e9;
    for (const s of steps || []) if (t >= s.t) { prev = cur; cur = s.i; t0 = s.t; }
    return { cur, prev, k: E.smooth(prog(t, t0, 0.5)) };
  }
  C['fx-conveyor'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-conveyor');
      const belt = el('div', 'belt', '<div class="top"></div><div class="tread"></div><div class="glow"></div>', e);
      const rl = el('div', 'rollers', '', e), rollers = [];
      for (let i = 0; i < NR; i++) { const r = el('i', '', '<b></b>', rl); r.style.left = ((i + 0.5) / NR * 100) + '%'; rollers.push(r); }
      const nav = el('div', 'nav', '<div class="ln"><u></u></div>', e);
      const st = (p.stations || []).map((o, i) => { const d = typeof o === 'string' ? { t: o } : o;
        const n = el('div', 'st' + (d.end ? ' end' : ''), `<i>${d.end ? DMS.icon('play') : String(i + 1)}</i><span>${esc(d.t)}</span>`, nav); return n; });
      return { belt, tread: belt.querySelector('.tread'), glow: belt.querySelector('.glow'), rollers, nav, st, fill: nav.querySelector('.ln u') };
    },
    update(e, lt, p, s, L, t) {
      const W = e.clientWidth || 1920;
      const off = offsetAt(p.pans, t) * W;
      const k = E.outExpo(prog(lt, 0, 0.7));
      e.style.setProperty('--in', k.toFixed(3));
      s.tread.style.backgroundPositionX = (-off).toFixed(1) + 'px';
      s.glow.style.backgroundPositionX = (-off * 0.5).toFixed(1) + 'px';
      const rr = (e.clientHeight || 1080) * 0.012;
      s.rollers.forEach(r => { r.style.transform = `translate(-50%, -50%) rotate(${(off / rr * 57.3 % 360).toFixed(1)}deg)`; });
      // 推移时皮带亮一下（速度感）
      let v = 0; for (const pn of p.pans || []) { const q = prog(t, pn.t, pn.dur || 0.6); if (q > 0 && q < 1) v = Math.max(v, Math.sin(q * Math.PI)); }
      e.style.setProperty('--v', v.toFixed(3));
      const { cur, prev, k: sk } = stepAt(p.steps, t), n = s.st.length;
      s.st.forEach((node, i) => {
        const on = i === cur ? sk : (i === prev ? 1 - sk : 0), done = i < cur ? 1 : 0;
        node.style.setProperty('--on', on.toFixed(3)); node.style.setProperty('--done', done);
        node.style.transform = `scale(${(1 + on * 0.16).toFixed(3)})`;
      });
      const fx = n > 1 ? lerp(Math.max(prev, 0), Math.max(cur, 0), sk) / (n - 1) : 0;
      s.fill.style.transform = `scaleX(${(cur < 0 ? 0 : fx).toFixed(4)})`;
    },
    sfx() { return []; },
  };
})();
