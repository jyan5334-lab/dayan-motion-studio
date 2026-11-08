/* 播放键小精灵（fx-play-sprite）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：片头 solo / 演示操作 / 品牌吉祥物：原创播放键小角色按关键帧路径跑、跳、翻跟斗、滚、点按钮、放技能，和画面里的元素互动
   用法：放在 edit.json 的 globals（跨场景常驻，转场时不跟着画面切走），box 铺满 [0,0,1,1]；
        props.path 是关键帧：{t 到达时刻（相对本层）, x, y（脚底位置，0–1）, act 这一段做什么, h 弧高, dir 朝向, target [x,y]（点击/施法的目标）}
        act：pop 出现 / idle 待机 / wave 挥手 / run 跑 / jump 跳 / flip 翻跟斗 / roll 滚 / click 点击 / stomp 踩 / cast 放技能 / charge 蓄力 / bow 鞠躬 / exit 消失
   标准：时间的纯函数（姿态只由 lt 决定）、动作自带音效、尺寸用 cqmin、原创角色（不像任何已有的吉祥物或商标）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const NS = 'http://www.w3.org/2000/svg';
  const AIR = new Set(['jump', 'flip']), MOVE = new Set(['run', 'jump', 'flip', 'roll']);
  const SVG = `<svg viewBox="-8 -8 116 116" class="body"><defs>
      <linearGradient id="spg" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" style="stop-color:var(--sp1)"/><stop offset=".55" style="stop-color:var(--sp2)"/><stop offset="1" style="stop-color:var(--sp3)"/></linearGradient>
      <radialGradient id="sph" cx="32%" cy="28%" r="58%"><stop offset="0" style="stop-color:#fff;stop-opacity:.62"/><stop offset=".55" style="stop-color:#fff;stop-opacity:.08"/><stop offset="1" style="stop-color:#fff;stop-opacity:0"/></radialGradient>
      <linearGradient id="spd" x1="0" y1="0" x2=".3" y2="1"><stop offset=".5" style="stop-color:#000;stop-opacity:0"/><stop offset="1" style="stop-color:#4A0F00;stop-opacity:.42"/></linearGradient>
      <radialGradient id="spk2" cx="38%" cy="30%" r="75%"><stop offset="0" style="stop-color:#FFFFFF"/><stop offset=".7" style="stop-color:#FFE6CF"/><stop offset="1" style="stop-color:#F5B98A"/></radialGradient>
      <radialGradient id="spa" cx="50%" cy="50%" r="50%"><stop offset="0" style="stop-color:var(--sp1);stop-opacity:.6"/><stop offset="1" style="stop-color:var(--sp1);stop-opacity:0"/></radialGradient></defs>
    <circle class="aura" cx="52" cy="54" r="46" fill="url(#spa)"/>
    <g class="legs"><line class="lb"/><line class="lf"/><ellipse class="fb" rx="8.5" ry="5.4"/><ellipse class="ff" rx="8.5" ry="5.4"/></g>
    <g class="rig"><line class="ab"/>
      <polygon class="tri" points="24,20 24,86 86,53"/>
      <polygon class="tri-d" points="24,20 24,86 86,53"/>
      <polygon class="tri-h" points="24,20 24,86 86,53"/>
      <ellipse class="spec" cx="31.5" cy="29" rx="7" ry="3.4" transform="rotate(-38 31.5 29)"/><circle class="spec2" cx="41" cy="24.5" r="1.8"/>
      <g class="face"><ellipse class="ew eye" cx="37.5" cy="47" rx="6.6" ry="8.2"/><ellipse class="ew eye" cx="53" cy="48.2" rx="6" ry="7.6"/>
        <circle class="ew hl" cx="39.8" cy="43.6" r="2.6"/><circle class="ew hl" cx="55.1" cy="45" r="2.3"/>
        <circle class="ew hl s" cx="35.6" cy="50.9" r="1.15"/><circle class="ew hl s" cx="51.2" cy="51.8" r="1.05"/>
        <path class="mo" d="M40.5 60 Q45.5 66.5 50.5 60 Q45.5 62.4 40.5 60 Z"/>
        <ellipse class="ck" cx="30.5" cy="58.5" rx="4" ry="2.3"/><ellipse class="ck" cx="59.5" cy="59" rx="3.4" ry="2.1"/></g>
      <line class="af"/><circle class="hb" r="6.6"/><circle class="hf" r="6.6"/></g></svg>`;
  function seg(path, lt) {
    let k = 0; while (k < path.length - 1 && lt >= path[k + 1].t) k++;
    return k;
  }
  function pose(p, path, lt) {
    const n = path.length;
    if (!n || lt < path[0].t - (path[0].act === 'pop' ? 0 : 1e9)) return null;
    let k = seg(path, lt), a = path[k], b = path[k + 1] || a;
    if (lt < path[0].t) { a = b = path[0]; }
    const span = Math.max(1e-3, b.t - a.t), u = b === a ? 1 : clamp((lt - a.t) / span), act = b === a ? (a.act === 'exit' ? 'exit' : 'idle') : b.act;
    const P = { x: a.x, y: a.y, rot: 0, sx: 1, sy: 1, dir: b.dir || a.dir || (b.x >= a.x ? 1 : -1), act, u, air: 0, legA: 0, legB: 0, armB: -20, armF: 20, aura: 0, blink: 0, tuck: 0, o: 1, scale: 1, beam: null, ripple: null, speed: 0 };
    if (MOVE.has(act)) {
      const e = act === 'run' || act === 'roll' ? E.inOutCubic(u) * 0.35 + u * 0.65 : u;
      P.x = lerp(a.x, b.x, e); P.y = lerp(a.y, b.y, e);
      if (AIR.has(act)) { const h = b.h == null ? 0.18 : b.h; P.air = 4 * h * u * (1 - u); P.y -= P.air; }
      P.speed = Math.hypot(b.x - a.x, b.y - a.y) / span;
    }
    const t = lt, s = (p.size || 15);
    if (act === 'idle' || act === 'wave' || act === 'bow') { P.sy = 1 + Math.sin(t * 5) * 0.025; P.sx = 2 - P.sy; P.armB = -18 - Math.sin(t * 3) * 6; P.armF = 18 + Math.sin(t * 3) * 6; }
    if (act === 'wave') { P.armF = 150 + Math.sin(t * 16) * 28; }
    if (act === 'bow') { P.rot = -28 * Math.sin(Math.PI * u) * P.dir; }
    if (act === 'pop') { const q = E.spring(u, 0.5, 10); P.scale = lerp(0.1, 1, q); P.o = clamp(u * 5); P.sy = lerp(1.25, 1, q); P.sx = lerp(0.8, 1, q); }
    if (act === 'exit') { P.scale = 1 - E.inCubic(clamp((lt - a.t) / 0.25)); P.o = P.scale; }
    if (act === 'run') { const ph = t * 15; P.legA = Math.sin(ph) * 38; P.legB = -P.legA; P.armB = -20 - Math.sin(ph) * 45; P.armF = 20 + Math.sin(ph) * 45; P.rot = 9 * P.dir; P.sy = 1 + Math.abs(Math.sin(ph)) * 0.05; P.y -= Math.abs(Math.sin(ph)) * 0.012; }
    if (act === 'jump') { const c = u < 0.12 ? 1 - u / 0.12 : 0; P.sy = u < 0.12 ? 1 - 0.2 * c : 1 + 0.12 * Math.sin(Math.PI * u); P.sx = 2 - P.sy; P.tuck = 0.5; P.armB = -120; P.armF = 125; }
    if (act === 'flip') { P.rot = 360 * E.inOutCubic(u) * P.dir; P.tuck = 1; P.armB = -60; P.armF = 60; }
    if (act === 'roll') { const dist = Math.abs(b.x - a.x) * u; P.rot = (dist / (s * 0.012)) * 57.3 * 0.55 * P.dir; P.tuck = 1; P.y -= 0.004; }
    if (act === 'click' || act === 'stomp') {
      const press = Math.sin(Math.PI * clamp((u - 0.35) / 0.35));
      if (act === 'click') { P.armF = lerp(30, 95, E.outCubic(clamp(u / 0.4))); P.sy = 1 - 0.12 * press; P.sx = 1 + 0.1 * press; }
      else { P.sy = 1 - 0.3 * press; P.sx = 1 + 0.25 * press; P.armB = -100; P.armF = 100; }
      if (u > 0.45) P.ripple = { x: (b.target || [P.x, P.y])[0], y: (b.target || [P.x, P.y])[1], k: clamp((u - 0.45) / 0.55) };
    }
    if (act === 'cast' || act === 'charge') {
      P.armB = -160; P.armF = 155 + Math.sin(t * 20) * 8; P.aura = act === 'charge' ? E.outCubic(u) : 0.55 + 0.45 * Math.sin(t * 12);
      if (act === 'charge') { P.rot = 720 * E.inCubic(u) * P.dir; P.y -= 0.05 * E.outCubic(u); P.sy = 1 + 0.08 * Math.sin(t * 30); }
      if (act === 'cast' && b.target) P.beam = { x: b.target[0], y: b.target[1], k: clamp((u - 0.2) / 0.7) };
    }
    if (P.tuck) { P.legA = lerp(P.legA, -50, P.tuck); P.legB = lerp(P.legB, 30, P.tuck); }
    // 落地压扁：跳/翻刚落下的 0.12s
    if (k > 0 && AIR.has(a.act) && lt - a.t < 0.14 && !AIR.has(act)) { const q = 1 - (lt - a.t) / 0.14; P.sy *= 1 - 0.22 * q; P.sx *= 1 + 0.18 * q; }
    P.blink = (Math.floor(t * 10) % 34 === 0) ? 1 : 0;
    return P;
  }
  function build1(host, cls) {
    const sp = el('div', 'spr ' + cls, SVG, host);
    const q = c => sp.querySelector(c);
    return { sp, rig: q('.rig'), legs: q('.legs'), lb: q('.lb'), lf: q('.lf'), fb: q('.fb'), ff: q('.ff'), ab: q('.ab'), af: q('.af'), hb: q('.hb'), hf: q('.hf'), aura: q('.aura'), face: q('.face'), ew: sp.querySelectorAll('.ew'), pu: sp.querySelectorAll('.pu') };
  }
  const rad = d => d * Math.PI / 180;
  function limb(line, cx, cy, ang, len, end) {
    const x = cx + Math.sin(rad(ang)) * len, y = cy + Math.cos(rad(ang)) * len;
    line.setAttribute('x1', cx); line.setAttribute('y1', cy); line.setAttribute('x2', x.toFixed(2)); line.setAttribute('y2', y.toFixed(2));
    if (end) { end.setAttribute('cx', x.toFixed(2)); end.setAttribute('cy', y.toFixed(2)); }
  }
  function apply(S, P, size, ghost) {
    if (!P) { S.sp.style.opacity = 0; return; }
    S.sp.style.left = (P.x * 100).toFixed(3) + '%'; S.sp.style.top = (P.y * 100).toFixed(3) + '%';
    S.sp.style.opacity = (P.o * (ghost || 1)).toFixed(3);
    S.sp.style.transform = `translate(-50%, -86%) scale(${(P.scale * P.dir).toFixed(4)}, ${P.scale.toFixed(4)})`;
    S.rig.setAttribute('transform', `rotate(${(P.rot * P.dir).toFixed(2)} 54 55) translate(54 92) scale(${P.sx.toFixed(4)} ${P.sy.toFixed(4)}) translate(-54 -92)`);
    S.legs.setAttribute('transform', P.rot ? `rotate(${(P.rot * P.dir).toFixed(2)} 54 55)` : '');
    limb(S.lb, 38, 82, P.legA, 13, S.fb); limb(S.lf, 56, 76, P.legB, 17, S.ff);
    S.fb.setAttribute('cx', (+S.fb.getAttribute('cx') + 2).toFixed(2)); S.ff.setAttribute('cx', (+S.ff.getAttribute('cx') + 2).toFixed(2));
    limb(S.ab, 22, 58, P.armB, 17, S.hb); limb(S.af, 70, 64, P.armF, 17, S.hf);
    S.aura.style.opacity = P.aura.toFixed(3); S.aura.setAttribute('r', (40 + 14 * P.aura).toFixed(1));
    S.ew.forEach(e => e.setAttribute('transform', P.blink ? `translate(0 ${e.getAttribute('cy')}) scale(1 .12) translate(0 ${-e.getAttribute('cy')})` : ''));
  }
  C['fx-play-sprite'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-play-sprite');
      e.style.setProperty('--sps', (p.size || 15) + 'cqmin');
      if (p.color) { e.style.setProperty('--sp1', p.color[0]); e.style.setProperty('--sp2', p.color[1]); if (p.color[2]) e.style.setProperty('--sp3', p.color[2]); }
      const fxsvg = document.createElementNS(NS, 'svg'); fxsvg.setAttribute('class', 'fxl'); fxsvg.setAttribute('viewBox', '0 0 1000 1000'); fxsvg.setAttribute('preserveAspectRatio', 'none');
      fxsvg.innerHTML = '<line class="beam" stroke-linecap="round"/><line class="beam2" stroke-linecap="round"/>' + Array.from({ length: 14 }, () => '<circle class="spk" r="5"/>').join('');
      e.appendChild(fxsvg);
      const ripple = el('i', 'rip', '', e), ripple2 = el('i', 'rip r2', '', e);
      const shadow = el('i', 'shd', '', e);
      const lines = el('div', 'spd', '<i></i><i></i><i></i>', e);
      const ghosts = (p.trail === false ? [] : [build1(e, 'ghost'), build1(e, 'ghost')]);
      const main = build1(e, 'main');
      return { main, ghosts, fxsvg, beam: fxsvg.querySelector('.beam'), beam2: fxsvg.querySelector('.beam2'), spk: [...fxsvg.querySelectorAll('.spk')], ripple, ripple2, shadow, lines, path: (p.path || []).slice().sort((a, b) => a.t - b.t) };
    },
    update(e, lt, p, s) {
      const P = pose(p, s.path, lt);
      apply(s.main, P, p.size);
      // 拖影：高速移动、翻滚时显示前几帧的残影
      s.ghosts.forEach((G, i) => {
        const dt = (i + 1) * 0.035, Q = pose(p, s.path, lt - dt);
        const fast = P && Q && (P.speed > 0.9 || P.act === 'flip' || P.act === 'charge' || P.act === 'roll');
        apply(G, fast ? Q : null, p.size, (i ? 0.14 : 0.28));
      });
      if (!P) { s.shadow.style.opacity = 0; s.lines.style.opacity = 0; s.beam.style.opacity = 0; s.beam2.style.opacity = 0; s.spk.forEach(c => c.style.opacity = 0); s.ripple.style.opacity = 0; s.ripple2.style.opacity = 0; return; }
      // 地面影子：离地越高越小越淡
      s.shadow.style.left = (P.x * 100).toFixed(3) + '%'; s.shadow.style.top = ((P.y + P.air) * 100).toFixed(3) + '%';
      const sh = clamp(1 - P.air * 5); s.shadow.style.opacity = (p.shadow === false ? 0 : 0.45 * sh * P.o).toFixed(3); s.shadow.style.transform = `translate(-50%, -50%) scale(${(0.5 + 0.5 * sh).toFixed(3)})`;
      // 速度线
      const fast = P.act === 'run' || P.act === 'roll' || (P.act === 'jump' && P.speed > 0.6);
      s.lines.style.opacity = (fast ? 0.8 : 0).toFixed(2); s.lines.style.left = (P.x * 100).toFixed(3) + '%'; s.lines.style.top = (P.y * 100).toFixed(3) + '%';
      s.lines.style.transform = `translate(${P.dir > 0 ? '-140%' : '40%'}, -120%) scaleX(${P.dir})`;
      [...s.lines.children].forEach((ln, i) => { ln.style.transform = `translateX(${(((lt * 9 + i * 0.37) % 1) * -60).toFixed(1)}%)`; });
      // 施法光束 + 火花
      const W = e.clientWidth || 1, H = e.clientHeight || 1, sz = (p.size || 15) / 100 * Math.min(W, H);
      if (P.beam && P.beam.k > 0) {
        const hx = P.x * 1000, hy = (P.y * H - sz * 0.95) / H * 1000, tx = P.beam.x * 1000, ty = P.beam.y * 1000, k = E.outCubic(P.beam.k);
        const ex = lerp(hx, tx, k), ey = lerp(hy, ty, k);
        [s.beam, s.beam2].forEach(b => { b.setAttribute('x1', hx); b.setAttribute('y1', hy); b.setAttribute('x2', ex.toFixed(1)); b.setAttribute('y2', ey.toFixed(1)); b.style.opacity = (0.9 * (1 - clamp((P.beam.k - 0.85) / 0.15))).toFixed(3); });
        s.spk.forEach((c, i) => { const f = ((i / s.spk.length) + lt * 1.7) % 1, j = Math.sin(i * 12.9898 + lt * 9) * 18; c.setAttribute('cx', (lerp(hx, ex, f) + j).toFixed(1)); c.setAttribute('cy', (lerp(hy, ey, f) - j * 0.6).toFixed(1)); c.style.opacity = (Math.sin(Math.PI * f) * 0.95).toFixed(3); });
      } else { s.beam.style.opacity = 0; s.beam2.style.opacity = 0; s.spk.forEach(c => c.style.opacity = 0); }
      // 点击 / 踩：落点冲击环
      if (P.ripple) {
        [s.ripple, s.ripple2].forEach((r, i) => { const k = clamp(P.ripple.k * (i ? 0.8 : 1)); r.style.left = (P.ripple.x * 100) + '%'; r.style.top = (P.ripple.y * 100) + '%'; r.style.opacity = ((1 - k) * 0.9).toFixed(3); r.style.transform = `translate(-50%, -50%) scale(${lerp(0.2, i ? 2.2 : 1.6, E.outCubic(k)).toFixed(3)})`; });
      } else { s.ripple.style.opacity = 0; s.ripple2.style.opacity = 0; }
    },
    sfx: p => {
      const K = { jump: 'swoosh-soft', flip: 'whoosh-soft', roll: 'roll', click: 'click', stomp: 'pop', cast: 'zap', charge: 'rise', pop: 'pop', wave: 'bubble', exit: 'pop-soft' };
      const path = (p.path || []).slice().sort((a, b) => a.t - b.t), out = [];
      path.forEach((b, i) => {
        const a = path[i - 1]; const st = a ? a.t : b.t;
        const kind = K[b.act]; if (!kind) return;
        const at = b.act === 'click' || b.act === 'stomp' ? st + (b.t - st) * 0.5 : st;
        out.push({ at, kind, gain: b.act === 'stomp' || b.act === 'charge' ? 0.6 : 0.42 });
        if ((b.act === 'jump' || b.act === 'flip') && path[i + 1] && !AIR.has(path[i + 1].act)) out.push({ at: b.t, kind: 'pop-soft', gain: 0.4 });
      });
      return out;
    },
  };
})();
