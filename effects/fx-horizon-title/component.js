/* 电影感地平线片头（fx-horizon-title）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：片头 solo / 品牌时刻 / 发布感开场：黑底宽银幕，一道发光的弧形地平线从下方缓缓升起推近，微尘漂浮，衬线大字从虚到实浮现
   标准（SKILL.md「动效不够时」）：有入场和落定（地平线升起 → 标题落定）、带音效（低频铺底 + 升起）、
   16:9 / 4:3 / 9:16 都排得下（尺寸用 cqw/cqh/cqmin）、时间的纯函数（微尘用固定种子）、只放使用者自己的品牌文字。
   镜头语言参考：电影感产品发布片（宽银幕黑边、微距弧面、慢推、克制的衬线字），不搬任何品牌的标志和素材。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TINTS = { gold: ['#FFB54A', '#FF7A1A', '#3A1604'], blue: ['#8EC5FF', '#3D7BFF', '#05101F'], ember: ['#FF8A5B', '#E2402A', '#2A0703'] };
  C['fx-horizon-title'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-horizon-title');
      const t = TINTS[p.tint] || TINTS.gold;
      e.style.setProperty('--hz1', t[0]); e.style.setProperty('--hz2', t[1]); e.style.setProperty('--hz3', t[2]);
      const sky = el('div', 'sky', '', e);
      const glow = el('div', 'glow', '', e);
      const orb = el('div', 'orb', '<i class="surf"></i><i class="rim"></i>', e);
      const rnd = DMS.rand ? DMS.rand(p.seed || 17) : (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      const dust = Array.from({ length: p.dust == null ? 46 : p.dust }, () => {
        const d = el('i', 'dust', '', e); const o = { x: rnd(), y: 0.2 + rnd() * 0.6, s: 0.25 + rnd() * 0.9, v: 0.004 + rnd() * 0.012, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.6 };
        d.style.width = d.style.height = (o.s * 0.42).toFixed(3) + 'cqmin'; return { d, o };
      });
      const title = el('div', 'tt', `<b>${esc(p.title || '')}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`, e);
      const bars = p.letterbox === false ? null : [el('i', 'bar top', '', e), el('i', 'bar bot', '', e)];
      const grain = el('i', 'grain', '', e);
      return { sky, glow, orb, dust, title, b: title.querySelector('b'), sm: title.querySelector('small'), bars, grain };
    },
    update(e, lt, p, s, L, t) {
      const D = p.dur || 2.0;                                       // 这一镜的时长：地平线在这段时间里升起推近
      const k = clamp(lt / D), q = E.outCubic(k);
      // 地平线：从画面下方缓缓升起，同时轻推近（镜头慢慢贴近星球边缘）
      const rise = lerp(p.from == null ? 0.86 : p.from, p.to == null ? 0.64 : p.to, E.inOutCubic(k));
      s.orb.style.top = (rise * 100).toFixed(3) + '%';
      s.orb.style.transform = `translateX(-50%) scale(${lerp(1.0, 1.22, q).toFixed(4)})`;
      const lit = clamp(lt / 0.6);
      s.orb.style.opacity = lit.toFixed(3);
      s.glow.style.top = (rise * 100 - 14).toFixed(3) + '%';
      s.glow.style.opacity = (lit * (0.75 + 0.25 * Math.sin(lt * 2.2))).toFixed(3);
      s.sky.style.opacity = (0.4 + 0.6 * q).toFixed(3);
      // 微尘：固定种子，慢慢上飘、闪烁
      s.dust.forEach(({ d, o }) => {
        const y = o.y - o.v * lt * 4, x = o.x + Math.sin(lt * 0.6 + o.ph) * 0.006;
        d.style.left = (x * 100).toFixed(3) + '%'; d.style.top = (((y % 1) + 1) % 1 * 100 * rise).toFixed(3) + '%';
        d.style.opacity = (o.a * lit * (0.6 + 0.4 * Math.sin(lt * 3 + o.ph))).toFixed(3);
      });
      // 标题：字距从松到紧、从虚到实、轻微上浮落定
      const ta = p.titleAt == null ? 0.45 : p.titleAt, tk = prog(lt, ta, 1.1), tq = E.outCubic(tk);
      s.b.style.opacity = clamp(tk * 1.6).toFixed(3);
      s.b.style.letterSpacing = lerp(0.42, 0.06, tq).toFixed(3) + 'em';
      s.b.style.filter = `blur(${lerp(14, 0, E.outQuart(tk)).toFixed(2)}px)`;
      s.title.style.transform = `translate(-50%, -50%) translateY(${lerp(2.2, 0, tq).toFixed(3)}cqh)`;
      if (s.sm) { const sk = prog(lt, ta + 0.55, 0.7); s.sm.style.opacity = (clamp(sk * 1.8) * 0.8).toFixed(3); s.sm.style.letterSpacing = lerp(0.9, 0.5, E.outCubic(sk)).toFixed(3) + 'em'; }
      // 宽银幕黑边：开场就在，片尾（出场前）快速收起，给后面的快剪让出整屏
      if (s.bars) {
        const out = p.barsOut == null ? null : prog(lt, p.barsOut, 0.25);
        const h = (p.barH == null ? 12 : p.barH) * (out == null ? 1 : 1 - E.inCubic(out));
        s.bars.forEach(b => { b.style.height = h.toFixed(3) + '%'; });
      }
      // 胶片颗粒：按帧换位置（确定性）
      const f = Math.floor(t * 24);
      s.grain.style.backgroundPosition = `${(f * 37) % 200}px ${(f * 91) % 200}px`;
    },
    sfx: p => [{ at: 0, kind: 'air', gain: 0.5 }, { at: (p.titleAt == null ? 0.45 : p.titleAt), kind: 'rise', gain: 0.45 }],
  };
})();
