/* =====================================================================
   人物窗系统 presenter.js —— 同一个人物对象，在全屏 / 卡片 / 圆窗 / 窗口 / 抠像之间连续迁移
   关键帧只写"目标状态"，运行时从上一状态的真实位置平滑过渡（端点速度为零），
   中途被新关键帧打断时，从当时的中间状态接着走，不会跳回理想终点。
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp;
  let P = null, layer, box, img, cut, bar, ring, label, bdImg = null, keys = [], starts = [], srcW = 1920, srcH = 1080;
  let cutLayer = null, scrim = null, medCx = 0.5;
  const FIELDS = ['x', 'y', 'w', 'h', 'r', 'z', 'focus', 'border', 'shadow', 'bar', 'o', 'matte', 'ring', 'bd', 'scrim', 'fe', 'side', 'feBoth'];

  /* 状态预设 → 像素几何（x,y,w,h,r 圆角, z 放大, focus 0=画面中心 1=人脸, bar 标题栏, matte 抠像） */
  function preset(k) {
    const W = DMS.W(), H = DMS.H(), port = H > W;
    const s = k.state || 'full';
    const g = { x: 0, y: 0, w: W, h: H, r: 0, z: 1, focus: 0, border: 0, shadow: 0, bar: 0, o: 1, matte: 0, ring: 0, bd: 0, scrim: 0, fe: 0, side: 1, feBoth: 0 };
    const pos = k.pos || (port ? 'tr' : 'br');
    const corner = (d, dh) => {
      dh = dh || d;
      const mx = port ? W * 0.05 : W * 0.035, top = port ? H * 0.06 : H * 0.07, bottom = port ? H * 0.24 : H * 0.17;
      const m = { tl: [mx, top], tr: [W - d - mx, top], bl: [mx, H - dh - bottom], br: [W - d - mx, H - dh - bottom],
        l: [mx, (H - dh) / 2 - H * 0.04], r: [W - d - mx, (H - dh) / 2 - H * 0.04], c: [(W - d) / 2, (H - dh) / 2 - H * 0.04],
        t: [(W - d) / 2, top], b: [(W - d) / 2, H - dh - bottom] };
      return Array.isArray(pos) ? [pos[0] * W, pos[1] * H] : (m[pos] || m.br);
    };
    if (s === 'full') {
      g.z = k.zoom || 1; g.focus = k.focus == null ? 0.15 : k.focus;
      /* 源画面比例与画布差很多（竖拍放横屏）：默认"居中竖条 + 模糊铺底"，不硬裁掉头和手 */
      const mism = (srcW / srcH) / (W / H);
      const fit = k.fit || (P && P.fullFit) || (mism < 0.75 || mism > 1.33 ? 'contain' : 'cover');
      if (fit === 'contain') {
        const z = k.zoom || 1; const w = Math.min(W, H * (srcW / srcH) * z), h = Math.min(H, w * srcH / srcW);
        const pos = k.pos || 'c';
        const x = Array.isArray(pos) ? pos[0] * W : pos === 'l' ? W * 0.05 : pos === 'r' ? W - w - W * 0.05 : (W - w) / 2;
        Object.assign(g, { x, y: (H - h) / 2, w, h, z: 1, bd: 1, focus: 0.1 });
      }
    }
    else if (s === 'side') {
      /* 侧推讲解（用户定稿 2026-11-07）：
         · 横拍素材：参考风格 D3 —— 整幅人物画面推到一侧并轻推近，让出的一侧压一层由深到透的渐变遮罩（房间仍隐约可见）；
         · 竖拍素材：裁成一块大小适中、带圆角的人物卡放到一侧，上下不顶边，身后露出场景背景（品牌文字墙/动效背景）。 */
      const right = (k.pos || 'r') !== 'l';
      const mism = (srcW / srcH) / (W / H);
      const fit = k.fit || (P && P.fullFit) || (mism < 0.75 || mism > 1.33 ? 'contain' : 'cover');
      const sc = { side: right ? 1 : -1, salpha: k.scrimAlpha == null ? (P && P.scrimAlpha != null ? P.scrimAlpha : null) : k.scrimAlpha, smode: k.scrimMode || (P && P.scrimMode) || 'grad' };
      if (port) {
        /* 竖屏画布：人物裁成上方一块宽幅圆角卡（脸居中），下方是演示区；身后露出文字墙 */
        const w = W * (k.size || 0.86), h = H * 0.335, x = (W - w) / 2, y = H * 0.04;
        Object.assign(g, sc, { x, y, w, h, r: k.radius == null ? 36 : k.radius, z: k.zoom || 1, focus: 0.8, shadow: 1, bd: 0, scrim: 0, smode: 'panel' });
      } else if (fit === 'contain') {
        const h = (k.size || 0.82) * H, w = Math.min(W * 0.42, h * (k.aspect || Math.max(srcW / srcH, 0.6)));
        const mx = (port ? 0.06 : 0.065) * W;
        const x = Array.isArray(k.pos) ? k.pos[0] * W : right ? W - w - mx : mx;
        const y = Array.isArray(k.pos) ? k.pos[1] * H : port ? H * 0.06 : (H - h) / 2 - H * 0.015;
        Object.assign(g, sc, { x, y, w, h, r: k.radius == null ? 30 : k.radius, z: k.zoom || 1, focus: 0.6, shadow: 1, bd: 0, scrim: k.scrim == null ? 0 : k.scrim, smode: k.scrimMode || 'panel' });
      } else {
        const fx = k.faceX == null ? (right ? (port ? 0.62 : 0.70) : (port ? 0.38 : 0.30)) : k.faceX;
        const z = k.zoom || 1.08;
        let dx = (fx - (0.5 + (medCx - 0.5) * z)) * W;                     // 推近后脸的位置 → 目标位置
        dx = right ? clamp(dx, W * 0.08, W * 0.34) : clamp(dx, -W * 0.34, -W * 0.08);
        Object.assign(g, sc, { x: dx, z, focus: 0, bd: 1, fe: Math.abs(dx) * 0.9, scrim: k.scrim == null ? 1 : k.scrim, cover: 1 });   // 让出的缝隙羽化进模糊延展，再被渐变遮罩压住
      }
      const sb = k.scrimBox || (P && P.scrimBox) || [0.025, 0.06, 0.52, 0.8];
      g.sbox = right ? sb : [1 - sb[0] - sb[2], sb[1], sb[2], sb[3]];
    }
    else if (s === 'circle') {
      const d = (k.size || (port ? 0.34 : 0.255)) * (port ? W : H);
      const [x, y] = corner(d); Object.assign(g, { x, y, w: d, h: d, r: d / 2, z: k.zoom || 'auto', focus: 1, border: 5, shadow: 1, ring: k.ring ? 1 : 0 });
    } else if (s === 'circle-big') {
      const d = (k.size || (port ? 0.62 : 0.5)) * (port ? W : H);
      const p2 = Object.assign({}, k, { pos: k.pos || 'c' });
      const [x, y] = (function () { const kk = p2.pos; return Array.isArray(kk) ? [kk[0] * W, kk[1] * H] : [(W - d) / 2, port ? H * 0.16 : H * 0.1]; })();
      Object.assign(g, { x, y, w: d, h: d, r: d / 2, z: k.zoom || 'auto', focus: 1, border: 7, shadow: 1, ring: k.ring === false ? 0 : 1 });
    } else if (s === 'card' || s === 'story') {
      const big = s === 'story';
      let w, h;
      if (port) { w = W * (big ? 0.9 : 0.84); h = H * (big ? 0.5 : 0.38); }
      else { w = W * (big ? 0.36 : 0.30); h = H * (big ? 0.80 : 0.64); }
      const side = (k.pos || 'r');
      let x, y;
      if (Array.isArray(side)) { x = side[0] * W; y = side[1] * H; }
      else if (port) { x = (W - w) / 2; y = side === 'b' ? H * 0.46 : H * 0.07; }
      else { x = side === 'l' ? W * 0.055 : side === 'c' ? (W - w) / 2 : W - w - W * 0.055; y = (H - h) / 2 - H * 0.04; }
      Object.assign(g, { x, y, w, h, r: k.radius == null ? 28 : k.radius, z: k.zoom || 1.0, focus: 0.85, border: 3, shadow: 1 });
    } else if (s === 'pip') {
      const d = (k.size || (port ? 0.3 : 0.24)) * (port ? W : H);
      const [x, y] = corner(d); Object.assign(g, { x, y, w: d, h: d, r: k.radius == null ? d * 0.16 : k.radius, z: k.zoom || 'auto', focus: 1, border: 4, shadow: 1 });
    } else if (s === 'window') {
      const w = port ? W * 0.86 : W * (k.size || 0.44), h = port ? H * 0.36 : w * 0.62;
      const side = k.pos || 'l';
      const x = Array.isArray(side) ? side[0] * W : side === 'r' ? W - w - W * 0.05 : side === 'c' ? (W - w) / 2 : W * 0.05;
      const y = Array.isArray(side) ? side[1] * H : port ? H * 0.08 : (H - h) / 2 - H * 0.03;
      Object.assign(g, { x, y, w, h, r: 16, z: k.zoom || 1, focus: 0.7, border: 1, shadow: 1, bar: 1 });
    } else if (s === 'cutout') {
      /* 抠像站位：需要 matte 帧；整幅画面平移缩放，只显示人物。
         支持位置：bl（左下）、br（右下）、tr（右上）、l / r / c。
         不放大、不裁切：整幅原片按原比例装进去；可在连续关键帧间平滑缩小（如 scale 0.56 → 0.34）再翻页衔接圆窗 circle。 */
      const side = k.pos || 'bl';
      const isTop = side === 'tr' || side === 'tl';
      const corner2 = ['bl', 'br', 'tr', 'tl'].includes(side);
      const sc = k.scale || (isTop ? (port ? 0.34 : 0.42) : corner2 ? (port ? 0.4 : 0.56) : 0.82);
      const h = H * sc, w = h * srcW / srcH;
      const fcx = medCx == null ? 0.5 : medCx, mxc = W * (port ? 0.16 : 0.1);
      let x = (side === 'br' || side === 'tr' || side === 'r') ? (W - mxc) - fcx * w : side === 'c' ? (W - w) / 2 : mxc - fcx * w;
      if (side === 'br' || side === 'tr' || side === 'r') x = Math.max(x, W - w * 1.02); else if (side !== 'c') x = Math.min(x, w * 0.02);
      const y = isTop ? H * 0.025 : H - h;
      Object.assign(g, { x, y, w, h, r: 0, z: 1, focus: 0.15, matte: 1 });
    } else if (s === 'hidden') {
      Object.assign(g, { o: 0 });
      g._hidden = true;
    }
    if (k.box) { const b = k.box; Object.assign(g, { x: b[0] * W, y: b[1] * H, w: b[2] * W, h: b[3] * H }); }
    if (k.radius != null && s !== 'circle' && s !== 'circle-big') g.r = k.radius;
    if (k.border != null) g.border = k.border;
    g.state = s; g.title = k.title; g.label = k.label;
    return g;
  }

  function mix(a, b, p) {
    const o = {};
    FIELDS.forEach(f => { const av = a[f] === 'auto' ? autoZoom(a) : a[f], bv = b[f] === 'auto' ? autoZoom(b) : b[f]; o[f] = lerp(av, bv, p); });
    o.state = p < 0.5 ? a.state : b.state; o.title = b.title || a.title; o.label = b.label;
    o.sbox = b.sbox || a.sbox; o.salpha = b.state === 'side' ? b.salpha : a.salpha; o.cover = b.state === 'side' ? b.cover : a.cover; o.smode = b.state === 'side' ? b.smode : a.smode;
    o.from = a.state; o.to = b.state; o.p = p;
    return o;
  }
  /* 小窗自动放大：让脸高约占窗口 46% */
  function autoZoom(g) {
    const f = faceAt(DMS.now()); const base = Math.max(g.w / srcW, g.h / srcH);
    const faceH = f.h * srcH * base; if (!faceH) return 1.4;
    return clamp(((g.ff || 0.46) * g.h) / faceH, 1, 3.2);
  }
  function faceAt(t) {
    const f = (P && P.face) || { cx: 0.5, cy: 0.36, h: 0.28 };
    if (!Array.isArray(f)) return f;
    if (!f.length) return { cx: 0.5, cy: 0.36, h: 0.28 };
    let i = 0; while (i < f.length - 1 && f[i + 1].t <= t) i++;
    const a = f[i], b = f[Math.min(i + 1, f.length - 1)]; const k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t)) : 0;
    if (b.t - a.t > 1.5) { const q = E.smooth ? E.smooth(k) : k; return { cx: lerp(a.cx, b.cx, q), cy: lerp(a.cy, b.cy, q), h: lerp(a.h, b.h, q) }; }   // 断点（录屏段）：缓入缓出过去
    const p0 = f[Math.max(0, i - 1)], p3 = f[Math.min(f.length - 1, i + 2)];
    const cr = (x0, x1, x2, x3) => 0.5 * ((2 * x1) + (-x0 + x2) * k + (2 * x0 - 5 * x1 + 4 * x2 - x3) * k * k + (-x0 + 3 * x1 - 3 * x2 + x3) * k * k * k);   // Catmull-Rom：速度连续，不会一顿一顿
    return { cx: cr(p0.cx, a.cx, b.cx, p3.cx), cy: cr(p0.cy, a.cy, b.cy, p3.cy), h: cr(p0.h, a.h, b.h, p3.h) };
  }

  function targetGeom(k, from) {
    const to = preset(k);
    if (to._hidden && from && !from._hidden) {
      /* 人物短暂退场：保持原位与原尺寸原地淡出，避免退场瞬间被拉伸回全屏 */
      const keep = Object.assign({}, from, { o: 0, state: 'hidden', _hidden: true });
      return keep;
    }
    return to;
  }

  function geomAt(t) {
    if (!keys.length) return preset({ state: 'full' });
    let i = -1; for (let j = 0; j < keys.length; j++) if (keys[j].t <= t) i = j;
    if (i < 0) return preset(keys[0]);
    const k = keys[i]; const dur = k.dur == null ? 0.6 : k.dur;
    const rawFrom = starts[i]; const to = targetGeom(k, rawFrom);
    /* 从 hidden 返回画面：直接按目标版式就位并淡入，不从全屏变形缩放进来 */
    const from = (rawFrom && rawFrom._hidden && !to._hidden) ? Object.assign({}, to, { o: rawFrom.o, state: 'hidden', _hidden: true }) : rawFrom;
    const curve = E[k.ease || 'smooth'] || E.smooth;
    return mix(from, to, curve(prog(t, k.t, dur)));
  }

  DMS.presenter = {
    init(p, lay) {
      P = p; layer = lay; keys = []; starts = [];
      layer.innerHTML = '';
      if (!P) { layer.style.display = 'none'; return; }
      srcW = P.srcW || 1920; srcH = P.srcH || 1080;
      box = DMS.el('div', 'dms-pbox', null, layer);
      bar = DMS.el('div', 'dms-pbar', '<i></i><i></i><i></i><span></span>', box);
      const vp = DMS.el('div', 'dms-pview', null, box);
      img = DMS.el('img', 'dms-pimg', null, vp); img.decoding = 'sync';
      ring = DMS.el('div', 'dms-pring', null, layer);
      bdImg = DMS.el('img', 'dms-pbd', null, layer); layer.insertBefore(bdImg, box);
      label = DMS.el('div', 'dms-plabel', '', layer);
      if (P.matte) {
        cutLayer = document.querySelector('.dms-cut-layer') || DMS.el('div', 'dms-cut-layer', null, document.getElementById('stage'));
        cut = DMS.el('img', 'dms-pcut', null, cutLayer);
      }
      scrim = DMS.el('div', 'dms-pscrim', null, layer); layer.insertBefore(scrim, box);   // 底板在人物画面下面：永远不会盖到人
      if (Array.isArray(P.face) && P.face.length) { const xs = P.face.map(f => f.cx).sort((a, b) => a - b); medCx = xs[xs.length >> 1]; }
      else if (P.face && P.face.cx) medCx = P.face.cx;
      keys = (P.keys || [{ t: 0, state: 'full' }]).slice().sort((a, b) => a.t - b.t);
      /* 预计算每个关键帧起点的真实状态（可能是上一个过渡的中间态） */
      let cur = preset(keys[0]);
      keys.forEach((k, i) => {
        if (i === 0) { starts.push(preset(k)); cur = preset(k); return; }
        const prev = keys[i - 1]; const d = prev.dur == null ? 0.6 : prev.dur;
        const rawP0 = starts[i - 1]; const tgt = targetGeom(prev, rawP0);
        const p0 = (rawP0 && rawP0._hidden && !tgt._hidden) ? Object.assign({}, tgt, { o: rawP0.o, state: 'hidden', _hidden: true }) : rawP0;
        const curve = E[prev.ease || 'smooth'] || E.smooth;
        cur = mix(p0, tgt, curve(prog(k.t, prev.t, d)));
        if (tgt._hidden && prog(k.t, prev.t, d) >= 0.999) cur._hidden = true;
        starts.push(cur);
      });
    },
    center() { const g = geomAt(DMS.now()); return [g.x + g.w / 2, g.y + g.h / 2]; },
    geom: t => geomAt(t),
    sfxCues() {
      const out = [];
      keys.forEach((k, i) => {
        if (i === 0 || k.sfx === false) return;
        const a = keys[i - 1].state, b = k.state; if (a === b && !k.pos) return;
        if ((k.dur == null ? 0.6 : k.dur) < 0.05) return;
        out.push({ t: +k.t.toFixed(3), kind: b === 'full' ? 'swoosh-out' : 'swoosh-soft', gain: 0.32, src: 'presenter:' + a + '>' + b });
      });
      return out;
    },
    update(t, sx, sy) {
      if (!P) return;
      const W = DMS.W(), H = DMS.H();
      const g = geomAt(t);
      const settledFull = g.state === 'full' && g.from === 'full' || (g.to === 'full' && g.p >= 0.999) || (g.from === 'full' && g.p <= 0.001 && g.to === 'full');
      const sideish = g.state === 'side' || g.from === 'side' || g.to === 'side';
      const isFull = (g.state === 'full' || g.state === 'side') && g.matte < 0.01;
      layer.style.zIndex = isFull ? 1 : 6;
      layer.style.display = g.o <= 0.001 ? 'none' : 'block';
      layer.style.opacity = g.o;
      const shake = isFull ? [sx * 0.6, sy * 0.6] : [0, 0];
      box.style.left = (g.x + shake[0]) + 'px'; box.style.top = (g.y + shake[1]) + 'px';
      box.style.width = g.w + 'px'; box.style.height = g.h + 'px';
      box.style.borderRadius = g.r + 'px';
      /* 侧移时画面边缘羽化，和模糊延展无缝衔接；遮罩从让出的一侧压过来 */
      if (g.fe > 1) {
        const f = g.fe.toFixed(0);
        const m = g.feBoth > 0.5 ? `linear-gradient(90deg, transparent 0, #000 ${f}px, #000 calc(100% - ${f}px), transparent 100%)`
          : g.side > 0 ? `linear-gradient(90deg, transparent 0, #000 ${f}px)` : `linear-gradient(270deg, transparent 0, #000 ${f}px)`;
        box.style.webkitMaskImage = box.style.maskImage = m;
      } else box.style.webkitMaskImage = box.style.maskImage = '';
      if (scrim) {
        scrim.style.display = g.scrim > 0.005 ? 'block' : 'none';
        if (g.scrim > 0.005) {
          const tint = (P.scrimColor || '8,10,22'), q = E.outCubic(clamp(g.scrim));
          box.style.zIndex = 1;
          if (g.smode === 'panel') {   // 半透明讲解底板（可选）
            const bb = g.sbox || [0.025, 0.06, 0.52, 0.8], a = g.salpha == null ? 0.5 : g.salpha;
            scrim.className = 'dms-pscrim panel'; scrim.style.zIndex = g.cover ? 2 : 0;
            Object.assign(scrim.style, { left: bb[0] * W + 'px', top: bb[1] * H + 'px', width: bb[2] * W + 'px', height: bb[3] * H + 'px',
              background: `rgba(${tint},${a})`, opacity: q.toFixed(3), transform: `translateX(${((1 - q) * -40 * (g.side || 1)).toFixed(1)}px)` });
          } else {                     // 渐变遮罩（参考风格 D3）：让出的一侧最深，往人物方向渐渐透明
            const a = g.salpha == null ? 0.82 : g.salpha;
            scrim.className = 'dms-pscrim'; scrim.style.zIndex = 2;
            Object.assign(scrim.style, { left: 0, top: 0, width: W + 'px', height: H + 'px', transform: '', opacity: q.toFixed(3),
              background: `linear-gradient(${g.side > 0 ? 90 : 270}deg, rgba(${tint},${a}) 0%, rgba(${tint},${(a * 0.86).toFixed(3)}) 28%, rgba(${tint},${(a * 0.45).toFixed(3)}) 48%, rgba(${tint},0) 64%)` });
          }
        }
      }
      box.style.setProperty('--pb', g.border.toFixed(2) + 'px');
      box.style.boxShadow = g.shadow > 0.01 ? `0 ${(24 * g.shadow).toFixed(1)}px ${(60 * g.shadow).toFixed(1)}px rgba(0,0,0,${(0.42 * g.shadow).toFixed(3)}), 0 0 0 var(--pb) var(--p-border, rgba(255,255,255,.95))` : `0 0 0 var(--pb) var(--p-border, rgba(255,255,255,.95))`;
      const barH = 38 * g.bar;
      bar.style.height = barH + 'px'; bar.style.opacity = g.bar;
      bar.querySelector('span').textContent = g.title || (P.windowTitle || '');
      const vw = g.w, vh = g.h - barH;
      /* 裁切：焦点在画面中心与人脸之间插值 */
      const f = faceAt(t);
      const focusX = lerp(0.5, f.cx, g.focus), focusY = lerp(0.5, f.cy, g.focus);
      const z = g.z;
      const sc = Math.max(vw / srcW, vh / srcH) * z;
      const iw = srcW * sc, ih = srcH * sc;
      let left = vw / 2 - focusX * iw, top = vh / 2 - focusY * ih;
      left = clamp(left, vw - iw, 0); top = clamp(top, vh - ih, 0);
      img.style.width = iw + 'px'; img.style.height = ih + 'px';
      img.style.transform = `translate(${left}px,${top}px)`;
      img.parentNode.style.top = barH + 'px';
      img.style.opacity = 1 - g.matte;
      ring.style.display = g.ring > 0.01 ? 'block' : 'none';
      if (g.ring > 0.01) {
        const pad = 14;
        Object.assign(ring.style, { left: g.x - pad + 'px', top: g.y - pad + 'px', width: g.w + pad * 2 + 'px', height: g.h + pad * 2 + 'px', opacity: g.ring, transform: `rotate(${(t * 40) % 360}deg)` });
      }
      label.style.display = g.label ? 'block' : 'none';
      if (g.label) { label.textContent = g.label; label.style.left = g.x + 'px'; label.style.top = g.y + g.h + 14 + 'px'; label.style.width = g.w + 'px'; }
      /* 帧源：渲染时逐帧图片；预览时可用视频 */
      const fi = Math.max(0, Math.min((P.frameCount || 1e9) - 1, Math.round(t * (P.fps || DMS.fps()))));
      if (P.frames && g.o > 0.001) {
        const src = P.frames.replace(/%0(\d)d/, (m, n) => String(fi + 1).padStart(+n, '0'));
        if (img.getAttribute('src') !== src) { img.setAttribute('src', src); DMS.wait(img.decode().catch(() => { })); }
        if (bdImg) {
          const bdv = g.fe > 1 ? 1 : g.bd;   // 横拍侧移：一开始挪动就让模糊延展到位，缝里不闪出背景
          bdImg.style.display = bdv > 0.01 ? 'block' : 'none'; bdImg.style.opacity = bdv;

          if (bdv > 0.01 && bdImg.getAttribute('src') !== src) { bdImg.setAttribute('src', src); DMS.wait(bdImg.decode().catch(() => { })); }
        }
      }
      if (cut) {
        const pf = DMS.personFrontNow == null ? P.personFront : DMS.personFrontNow;
        const on = g.matte > 0.01 || (pf && isFull);
        box.style.visibility = g.matte > 0.99 ? 'hidden' : '';
        cutLayer.style.display = on && g.o > 0.001 ? 'block' : 'none';
        if (on) {
          const csrc = P.matte.replace(/%0(\d)d/, (m, n) => String(fi + 1).padStart(+n, '0'));
          cut.style.width = iw + 'px'; cut.style.height = ih + 'px';
          cut.style.transform = `translate(${g.x + left}px,${g.y + barH + top}px)`;
          cut.style.opacity = g.o;
          /* 角落抠像：原片朝画面内侧的边做柔和渐隐，避免硬切边；放右上角时底边也柔化 */
          const isCut = g.state === 'cutout' && g.matte > 0.5;
          const isTopCut = isCut && (g.y + g.h < H * 0.85);
          const cm = isCut ? ((g.x + g.w / 2 > W / 2) ? 'to right' : 'to left') : '';
          const mk = isTopCut ? `linear-gradient(${cm}, transparent 0, #000 10%), linear-gradient(to top, transparent 0, #000 14%)`
            : cm ? `linear-gradient(${cm}, transparent 0, #000 9%)` : '';
          if (cut.style.webkitMaskImage !== mk) {
            cut.style.webkitMaskImage = mk; cut.style.maskImage = mk;
            cut.style.webkitMaskComposite = isTopCut ? 'source-in' : '';
            cut.style.maskComposite = isTopCut ? 'intersect' : '';
          }
          if (cut.getAttribute('src') !== csrc) { cut.setAttribute('src', csrc); DMS.wait(cut.decode().catch(() => { })); }
        }
      }
    },
  };

  /* =====================================================================
     字幕 subs —— 稳定在安全区，关键词染色，句首轻微上浮
     ===================================================================== */
  let S = null, subsEl, lineEl, enEl, cur = -1;
  DMS.subs = {
    init(cfg, lay) {
      S = cfg; lay.innerHTML = '';
      const rendering = /[?&]render=1/.test(location.search);
      if (!S || !S.cues || S.enabled === false || (S.previewOnly && rendering)) { lay.style.display = 'none'; S = null; return; }
      lay.style.display = 'block';
      subsEl = DMS.el('div', 'dms-sub dms-sub-' + (S.style || 'clean'), null, lay);
      lineEl = DMS.el('div', 'zh', '', subsEl);
      enEl = DMS.el('div', 'en', '', subsEl);
      if (S.size) subsEl.style.setProperty('--sub-size', S.size + 'px');
      if (S.bottom != null) subsEl.style.bottom = S.bottom * DMS.H() + 'px';
      cur = -1;
    },
    update(t) {
      if (!S || !S.cues) return;
      let idx = -1;
      for (let i = 0; i < S.cues.length; i++) { const c = S.cues[i]; if (t >= c.s && t < c.e) { idx = i; break; } }
      const hiddenByScene = (S.hide || []).some(r => t >= r[0] && t < r[1]);
      if (idx < 0 || hiddenByScene) { subsEl.style.opacity = 0; cur = -1; return; }
      const c = S.cues[idx];
      if (idx !== cur) {
        lineEl.innerHTML = DMS.hl(c.t, c.hl || [], 'hl');
        enEl.textContent = c.en || ''; enEl.style.display = c.en ? 'block' : 'none';
        cur = idx;
      }
      const k = prog(t, c.s, 0.14);
      subsEl.style.opacity = E.outQuad(k);
      subsEl.style.transform = `translate(-50%, ${lerp(10, 0, E.outCubic(k))}px)`;
    },
  };
})();
