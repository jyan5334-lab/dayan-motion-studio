/* =====================================================================
   大琰DAYAN · Motion Studio — 时间轴运行时 core.js
   一切画面都是时间 t 的纯函数：DMS.renderAt(t) 可任意跳帧、往返寻帧一致。
   结构：stage > [bg 场景层] [world 相机层: 场景内容] [presenter 人物层] [fg 前景层] [subs 字幕] [hud]
   ===================================================================== */
(function () {
  'use strict';
  const DMS = (window.DMS = window.DMS || {});
  DMS.version = '1.0.0';
  DMS.components = DMS.components || {};
  const C = DMS.components;

  /* ---------------- 数学与缓动 ---------------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, t0, d) => (d <= 0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / d));
  const E = {
    linear: k => k,
    inQuad: k => k * k,
    inCubic: k => k * k * k,
    outQuad: k => 1 - (1 - k) * (1 - k),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inOutExpo: k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
    outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
    inBack: (k, s = 1.70158) => (s + 1) * k * k * k - s * k * k,
    /* 小幅超调后刹停：用于贴纸、标签、印章落位 */
    spring: (k, z = 0.42, w = 13) => (k >= 1 ? 1 : 1 - Math.exp(-z * w * k) * Math.cos(w * Math.sqrt(1 - z * z) * k)),
    /* 端点速度为零的平滑曲线：用于人物窗、相机、大空间迁移 */
    smooth: k => k * k * k * (k * (k * 6 - 15) + 10),
  };
  DMS.ease = E; DMS.clamp = clamp; DMS.lerp = lerp; DMS.prog = prog;

  /* 确定性随机：同一 seed 每次结果相同 */
  DMS.rand = function (seed) {
    let s = (seed >>> 0) || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  };
  DMS.hash = function (str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  DMS.esc = esc;
  /* 高亮：text 中出现 hl（字符串或数组）的部分包成 <em> */
  DMS.hl = function (text, hl, cls = 'hl') {
    let out = esc(text);
    const arr = (Array.isArray(hl) ? hl : hl ? [hl] : []).filter(Boolean).sort((a, b) => b.length - a.length);
    arr.forEach(w => { out = out.split(esc(w)).join(`<em class="${cls}">${esc(w)}</em>`); });
    return out;
  };
  DMS.el = function (tag, cls, html, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------------- 版式预设（归一化 x,y,w,h） ---------------- */
  DMS.BOXES = {
    landscape: {
      full: [0, 0, 1, 1], center: [0.12, 0.14, 0.76, 0.64], wide: [0.06, 0.12, 0.88, 0.70],
      left: [0.05, 0.13, 0.50, 0.66], right: [0.45, 0.13, 0.50, 0.66],
      'left-narrow': [0.05, 0.16, 0.38, 0.60], 'right-narrow': [0.57, 0.16, 0.38, 0.60],
      top: [0.06, 0.06, 0.88, 0.26], 'top-left': [0.05, 0.06, 0.46, 0.30], 'top-right': [0.49, 0.06, 0.46, 0.30],
      'bottom-left': [0.05, 0.56, 0.46, 0.26], 'bottom-right': [0.49, 0.56, 0.46, 0.26],
      'side-l': [0.04, 0.12, 0.24, 0.66], 'side-r': [0.72, 0.12, 0.24, 0.66],
      demo: [0.04, 0.05, 0.5, 0.66], quote: [0.05, 0.72, 0.48, 0.13],          // 侧推讲解：演示区 / 结论（人物在右）
    },
    portrait: {
      full: [0, 0, 1, 1], center: [0.07, 0.24, 0.86, 0.40], wide: [0.05, 0.20, 0.90, 0.46],
      top: [0.07, 0.08, 0.86, 0.22], upper: [0.07, 0.10, 0.86, 0.34], lower: [0.07, 0.50, 0.86, 0.26],
      left: [0.06, 0.20, 0.52, 0.40], right: [0.42, 0.20, 0.52, 0.40],
      'top-left': [0.06, 0.07, 0.50, 0.18], 'top-right': [0.44, 0.07, 0.50, 0.18],
      'side-l': [0.05, 0.22, 0.30, 0.42], 'side-r': [0.65, 0.22, 0.30, 0.42],
      demo: [0.05, 0.44, 0.9, 0.3], quote: [0.06, 0.385, 0.88, 0.05],      // 侧推讲解：人物卡在上（0.04–0.375），结论、演示区在下，避开字幕区（0.75 以下）
    },
    narrow: {   // 4:3 等偏窄的横屏：在 landscape 基础上覆盖这几项
      demo: [0.03, 0.05, 0.535, 0.66], quote: [0.035, 0.72, 0.52, 0.13],
    },
  };

  /* ---------------- 舞台 ---------------- */
  let TL = null, W = 1920, H = 1080, FPS = 60, ORIENT = 'landscape';
  let stage, bgLayer, depthLayer, world, presLayer, fgLayer, subsLayer, hudLayer;
  const scenes = [];            // {def, root, bg, content, layers:[{def, el, inner, comp}]}
  const globals = [];           // 跨场景的常驻层（导航条、角标）
  let shakeImpulses = [];
  const pending = [];

  DMS.W = () => W; DMS.H = () => H; DMS.orient = () => ORIENT; DMS.fps = () => FPS;

  function boxOf(spec) {
    if (!spec) return DMS.BOXES[ORIENT].center;
    if (Array.isArray(spec)) return spec;
    if (ORIENT === 'landscape' && W / H < 1.5 && DMS.BOXES.narrow[spec]) return DMS.BOXES.narrow[spec];
    return DMS.BOXES[ORIENT][spec] || DMS.BOXES.landscape[spec] || DMS.BOXES[ORIENT].center;
  }
  DMS.boxOf = boxOf;
  function placeBox(el, b) {
    el.style.left = b[0] * W + 'px'; el.style.top = b[1] * H + 'px';
    el.style.width = b[2] * W + 'px'; el.style.height = b[3] * H + 'px';
  }

  /* 震动：印章、巨字砸下时加入冲击；位移只作用在 world 与背景，不动字幕 */
  DMS.shake = function (at, amp = 14, dur = 0.38) { shakeImpulses.push({ at, amp, dur }); };
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const s of shakeImpulses) {
      const k = (t - s.at) / s.dur;
      if (k < 0 || k > 1) continue;
      const a = s.amp * Math.pow(1 - k, 2);
      x += a * Math.sin(t * 91.7 + s.at * 13); y += a * Math.cos(t * 77.3 + s.at * 7);
    }
    return [x, y];
  }

  /* ---------------- 层：入场/退场包装 ---------------- */
  const ENTER = {
    pop: k => ({ s: lerp(0.6, 1, E.spring(k)), o: clamp(k * 3) }),
    rise: k => ({ y: lerp(46, 0, E.outExpo(k)), o: clamp(k * 2.2), b: lerp(10, 0, E.outQuart(k)) }),
    drop: k => ({ y: lerp(-60, 0, E.spring(k, 0.5, 12)), o: clamp(k * 3) }),
    'slide-l': k => ({ x: lerp(-120, 0, E.outExpo(k)), o: clamp(k * 2.5) }),
    'slide-r': k => ({ x: lerp(120, 0, E.outExpo(k)), o: clamp(k * 2.5) }),
    'slide-u': k => ({ y: lerp(120, 0, E.outExpo(k)), o: clamp(k * 2.5) }),
    zoom: k => ({ s: lerp(1.35, 1, E.outExpo(k)), o: clamp(k * 2), b: lerp(14, 0, E.outQuart(k)) }),
    slam: k => ({ s: lerp(2.3, 1, E.outBack(clamp(k * 1.6), 1.2)), o: clamp(k * 5) }),
    fade: k => ({ o: E.outQuad(k) }),
    settle: k => ({ y: lerp(40, 0, E.spring(k, 0.56, 11)), s: lerp(0.94, 1, E.spring(k, 0.52, 12)), o: clamp(k * 2.6), b: lerp(8, 0, E.outQuart(k)) }),   // 卡片类默认：上浮 + 轻微回弹落定
    wipe: k => ({ clip: E.outExpo(k) }),
    none: () => ({}),
  };
  const EXIT = {
    fade: k => ({ o: 1 - k }),
    shrink: k => ({ s: lerp(1, 0.82, E.inQuad(k)), o: 1 - k }),
    'slide-l': k => ({ x: lerp(0, -140, E.inQuad(k)), o: 1 - k }),
    'slide-r': k => ({ x: lerp(0, 140, E.inQuad(k)), o: 1 - k }),
    up: k => ({ y: lerp(0, -60, E.inQuad(k)), o: 1 - k }),
    blur: k => ({ o: 1 - k, b: 16 * k, s: lerp(1, 1.08, k) }),
    none: () => ({}),
  };
  /* 运动模糊：按每帧实际位移（px/秒）沿运动方向模糊，静止时为 0。用 SVG 高斯模糊的 x/y 分量实现方向性 */
  let mbSvg = null, mbN = 0;
  function mbFilter(el, bx, by) {
    if (bx + by < 0.35) return '';
    if (!mbSvg) { mbSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); mbSvg.setAttribute('width', 0); mbSvg.setAttribute('height', 0); mbSvg.style.position = 'absolute'; stage.appendChild(mbSvg); }
    if (!el._mb) {
      const id = 'mb' + (++mbN); const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      f.setAttribute('id', id); f.setAttribute('x', '-25%'); f.setAttribute('y', '-25%'); f.setAttribute('width', '150%'); f.setAttribute('height', '150%'); f.setAttribute('color-interpolation-filters', 'sRGB');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur'); f.appendChild(g); mbSvg.appendChild(f); el._mb = { id, g };
    }
    el._mb.g.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
    return `url(#${el._mb.id}) `;
  }
  /* 光泽扫过：卡片落定后一道斜向高光扫过一次，只落在元素自身的形状上（SVG 滤镜按 SourceAlpha 裁切） */
  const SHEEN_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2=".35"><stop offset=".33" stop-color="#fff" stop-opacity="0"/><stop offset=".61" stop-color="#fff" stop-opacity=".30"/><stop offset=".88" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>');
  function sheenFilter(el, k) {
    if (!(k > 0 && k < 1)) return '';
    if (!mbSvg) mbFilter(el, 0, 1);   // 借用同一个 svg 容器
    if (!el._sh) {
      const id = 'sh' + (++mbN), N = 'http://www.w3.org/2000/svg', f = document.createElementNS(N, 'filter');
      f.setAttribute('id', id); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', '1'); f.setAttribute('height', '1'); f.setAttribute('color-interpolation-filters', 'sRGB');
      const im = document.createElementNS(N, 'feImage'); im.setAttribute('href', SHEEN_IMG); im.setAttribute('preserveAspectRatio', 'none'); im.setAttribute('result', 'g');
      const c = document.createElementNS(N, 'feComposite'); c.setAttribute('in', 'g'); c.setAttribute('in2', 'SourceAlpha'); c.setAttribute('operator', 'in'); c.setAttribute('result', 'm');
      const b = document.createElementNS(N, 'feBlend'); b.setAttribute('in', 'm'); b.setAttribute('in2', 'SourceGraphic'); b.setAttribute('mode', 'screen');
      f.append(im, c, b); mbSvg.appendChild(f); el._sh = { id, im };
    }
    const w = el.offsetWidth || 400, h = el.offsetHeight || 300, bw = Math.max(160, w * 0.42);
    const im = el._sh.im; im.setAttribute('x', lerp(-bw - h * 0.4, w + h * 0.1, E.inOutCubic(k)).toFixed(1)); im.setAttribute('y', 0); im.setAttribute('width', (bw + h * 0.35).toFixed(1)); im.setAttribute('height', h);
    return `url(#${el._sh.id}) `;
  }
  const MB = 0.0042;   // 模糊强度：px/秒 → 模糊半径（约等于 180° 快门拖影的 1/4）
  function motionBlur(el, cur, prev, fps) {
    if (!prev || TL.motionBlur === false) return '';
    const vx = ((cur.x || 0) - (prev.x || 0)) * fps, vy = ((cur.y || 0) - (prev.y || 0)) * fps;
    const vs = ((cur.s == null ? 1 : cur.s) - (prev.s == null ? 1 : prev.s)) * fps;   // 缩放速度 → 各向同性的少量模糊
    const r = Math.min(4, Math.abs(vs) * 1.6);
    return mbFilter(el, Math.min(9, Math.abs(vx) * MB) + r, Math.min(9, Math.abs(vy) * MB) + r);
  }

  function applyWrap(el, st) {
    const x = st.x || 0, y = st.y || 0, s = st.s == null ? 1 : st.s, r = st.r || 0;
    el.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;
    el.style.opacity = st.o == null ? 1 : st.o;
    el.style.filter = ((st._mb || '') + (st.b ? `blur(${st.b.toFixed(2)}px) ` : '') + (st._sh || '')).trim();
    el.style.clipPath = st.clip == null ? '' : `inset(0 ${((1 - st.clip) * 100).toFixed(2)}% 0 0)`;
  }

  /* ---------------- 构建 ---------------- */
  function buildLayer(def, parent, sceneDef) {
    const comp = C[def.c];
    const wrap = DMS.el('div', 'dms-layer ' + (def.cls || ''), null, parent);
    wrap.dataset.c = def.c;
    placeBox(wrap, boxOf(def.box));
    if (def.z != null) wrap.style.zIndex = def.z;
    if (def.rotate) wrap.style.rotate = def.rotate + 'deg';
    const inner = DMS.el('div', 'dms-inner', null, wrap);
    const L = { def, el: wrap, inner, comp, at: def.at || 0, out: def.out, scene: sceneDef };
    if (!comp) { inner.innerHTML = `<div class="dms-missing">未知组件 ${esc(def.c)}</div>`; return L; }
    try { L.state = comp.build(inner, def.props || {}, L) || {}; } catch (e) { inner.innerHTML = `<div class="dms-missing">${esc(def.c)}: ${esc(e.message)}</div>`; console.error(e); }
    return L;
  }

  function buildScene(def, idx) {
    const root = DMS.el('div', 'dms-scene', null, world);
    root.dataset.id = def.id || 'scene' + idx;
    if (def.theme) root.dataset.theme = def.theme;
    const bg = DMS.el('div', 'dms-scene-bg', null, bgLayer);
    if (def.theme) bg.dataset.theme = def.theme;
    const S = { def, root, bg, layers: [], bgLayers: [], halos: [] };
    // 景深层（可选）：前景文字背后的局部柔焦，默认不开；文字墙本身整面柔焦由 bg-wall 的 blur 负责
    const bgs = (Array.isArray(def.bg) ? def.bg : def.bg ? [def.bg] : []).map(b => typeof b === 'string' ? { c: b } : b);
    const wallBg = bgs.find(b => b.c === 'bg-wall');
    const dz = def.depth === undefined ? (TL.depth === undefined ? null : TL.depth) : def.depth;   // 默认关闭；需要时 scene.depth:true 或 TL.depth:true 打开
    if (dz) S.depth = Object.assign({ blur: 9, dim: 0.55, gap: 70 }, dz === true ? {} : dz);
    (Array.isArray(def.bg) ? def.bg : def.bg ? [def.bg] : []).forEach(b => {
      const bdef = typeof b === 'string' ? { c: b } : b;
      S.bgLayers.push(buildLayer(Object.assign({ box: 'full', enter: 'none' }, bdef), bg, def));
    });
    (def.layers || []).forEach(l => S.layers.push(buildLayer(l, root, def)));
    return S;
  }

  DMS.load = function (timeline) {
    TL = timeline;
    W = TL.canvas.w; H = TL.canvas.h; FPS = TL.canvas.fps || 60;
    ORIENT = H > W ? 'portrait' : 'landscape';
    document.documentElement.style.setProperty('--W', W + 'px');
    document.documentElement.style.setProperty('--H', H + 'px');
    document.documentElement.dataset.theme = TL.theme || 'dark-tech';
    document.documentElement.dataset.orient = ORIENT;
    stage = document.getElementById('stage');
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    stage.innerHTML = '';
    bgLayer = DMS.el('div', 'dms-bg', null, stage);
    depthLayer = DMS.el('div', 'dms-depth', null, stage);
    world = DMS.el('div', 'dms-world', null, stage);
    presLayer = DMS.el('div', 'dms-presenter-layer', null, stage);
    fgLayer = DMS.el('div', 'dms-fg', null, stage);
    subsLayer = DMS.el('div', 'dms-subs', null, stage);
    hudLayer = DMS.el('div', 'dms-hud', null, stage);
    shakeImpulses = [];
    scenes.length = 0; globals.length = 0;
    (TL.scenes || []).forEach((s, i) => scenes.push(buildScene(s, i)));
    (TL.globals || []).forEach(g => globals.push(buildLayer(g, fgLayer, null)));
    DMS.presenter.init(TL.presenter || null, presLayer);
    DMS.subs.init(TL.subtitles || null, subsLayer);
    if (TL.signature && TL.signature.enabled !== false) buildSignature(TL.signature);
    fitPreview();
    return DMS;
  };

  function buildSignature(sig) {
    const e = DMS.el('div', 'dms-signature', `<span class="mk">${esc(sig.mark || (TL.brand && TL.brand.mark) || (sig.name || (TL.brand && TL.brand.name) || '·').slice(0, 1))}</span><span>${esc(sig.name || (TL.brand && TL.brand.name) || '')}</span>`, hudLayer);
    e.dataset.pos = sig.pos || 'tl';
    DMS._sig = e;
  }

  /* ---------------- 场景时间与转场 ---------------- */
  const TRANS = {
    /* 每个函数返回 {inc, out}：inc=入场场景状态, out=出场场景状态；p 为 0..1 */
    cut: p => ({ inc: { o: p >= 0.5 ? 1 : 0 }, out: { o: p >= 0.5 ? 0 : 1 } }),
    fade: p => ({ inc: { o: E.inOutCubic(p) }, out: { o: 1 - E.inOutCubic(p) } }),
    'push-left': p => { const k = E.inOutExpo(p); return { inc: { x: (1 - k) * W }, out: { x: -k * W } }; },
    'push-right': p => { const k = E.inOutExpo(p); return { inc: { x: -(1 - k) * W }, out: { x: k * W } }; },
    'push-up': p => { const k = E.inOutExpo(p); return { inc: { y: (1 - k) * H }, out: { y: -k * H } }; },
    'zoom-in': p => { const k = E.inOutCubic(p); return { inc: { s: lerp(1.3, 1, k), o: clamp(k * 1.6), b: (1 - k) * 18 }, out: { s: lerp(1, 0.86, k), o: 1 - k, b: k * 10 } }; },
    'zoom-out': p => { const k = E.inOutCubic(p); return { inc: { s: lerp(0.8, 1, k), o: clamp(k * 1.6) }, out: { s: lerp(1, 1.35, k), o: 1 - k, b: k * 16 } }; },
    whip: p => { const k = E.inOutExpo(p); return { inc: { x: (1 - k) * W * 0.6, b: Math.sin(Math.PI * p) * 26, o: clamp(p * 3) }, out: { x: -k * W * 0.6, b: Math.sin(Math.PI * p) * 26, o: clamp((1 - p) * 3) } }; },
    flash: p => ({ inc: { o: p >= 0.5 ? 1 : 0 }, out: { o: p >= 0.5 ? 0 : 1 }, flash: Math.sin(Math.PI * p) }),
    line: p => ({ inc: { o: p >= 0.55 ? 1 : 0 }, out: { o: p >= 0.45 ? 0 : 1 }, line: p }),
    iris: p => ({ inc: { iris: E.inOutCubic(p) }, out: {} }),
    'slide-up': p => { const k = E.outExpo(p); return { inc: { y: (1 - k) * H * 0.35, o: clamp(p * 2.5) }, out: { o: 1 - clamp(p * 2) } }; },
    /* ---- 遮罩转场：新画面从形状里长出来，旧画面原地不动（略微后退） ---- */
    /* 遮罩类转场：新画面按形状露出；旧画面的前景（hole*，只作用在内容层）挖掉同一块，旧元素不会压在新背景上 */
    'wipe-diag': p => { const k = E.inOutExpo(p), a = lerp(-40, 140, k); return { inc: { clip: `polygon(0 0, ${a}% 0, ${a - 40}% 100%, 0 100%)` }, out: { holeClip: `polygon(${a}% 0, 100% 0, 100% 100%, ${a - 40}% 100%)` } }; },
    split: p => { const k = E.inOutExpo(p), a = (1 - k) * 50, b = 100 - a; return { inc: { clip: `inset(0 ${a.toFixed(2)}% 0 ${a.toFixed(2)}%)` }, out: { b: k * 6, holeClip: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${a}% 0, ${a}% 100%, ${b}% 100%, ${b}% 0, ${a}% 0)` } }; },
    rect: p => { const k = E.inOutCubic(p), a = (1 - k) * 46, b = 100 - a; return { inc: { clip: `inset(${a.toFixed(2)}% ${a.toFixed(2)}% round ${(lerp(48, 0, k)).toFixed(1)}px)`, s: lerp(1.06, 1, k) }, out: { o: 1 - clamp((k - 0.6) * 2.5), holeClip: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${a}% ${a}%, ${a}% ${b}%, ${b}% ${b}%, ${b}% ${a}%, ${a}% ${a}%)` } }; },
    blinds: p => { const k = E.inOutCubic(p); const w = (k * 100).toFixed(2); return { inc: { mask: `repeating-linear-gradient(90deg,#000 0,#000 ${w}%,transparent ${w}%,transparent 100%)`, maskSize: `${(W / 8).toFixed(1)}px 100%` }, out: { holeMask: { image: `repeating-linear-gradient(90deg,transparent 0,transparent ${w}%,#000 ${w}%,#000 100%)`, size: `${(W / 8).toFixed(1)}px 100%`, repeat: 'repeat' } } }; },
    'text-mask': (p, tin) => {           // 透过一个巨字看到新画面：字从正常大小放大到铺满，最后整屏淡入
      const k = E.inOutCubic(p), txt = (tin && tin.text) || '●';
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 400'><text x='500' y='300' text-anchor='middle' font-family='Noto Sans CJK SC,PingFang SC,Microsoft YaHei,sans-serif' font-weight='900' font-size='300'>${esc(txt)}</text></svg>`;
      const sc = lerp(0.9, 26, Math.pow(k, 2.2)), full = clamp((k - 0.72) / 0.28);
      const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, sz = `${(W * 0.62 * sc).toFixed(0)}px auto`;
      return { inc: { mask: `${url}, linear-gradient(rgba(0,0,0,${full.toFixed(3)}),rgba(0,0,0,${full.toFixed(3)}))`, maskSize: `${sz}, 100% 100%`, maskPos: 'center' },
               out: { b: k * 4, o: 1 - full, holeMask: { image: `linear-gradient(#000,#000), ${url}`, size: `100% 100%, ${sz}`, pos: 'center', repeat: 'no-repeat', composite: 'exclude' } } };
    },
    /* ---- 元素承接：两段里 share 相同的元素从旧位置变到新位置，其余内容交叉淡化 ---- */
    morph: p => ({ inc: { morph: E.inOutCubic(p) }, out: { morph: E.inOutCubic(p) } }),
    /* ---- 翻书：旧页以左边为书脊掀起翻走（越翻越暗），新页在下面由暗变亮；page-back 反向翻回来（"翻来翻去"连用） ---- */
    /* 背景层和内容层分属两层，旧页的底挡不住新页的字：翻走时新页内容在旧页快翻平时才浮现（ro 只作用于内容层），翻回时旧页内容先退掉 */
    page: p => { const k = E.inOutCubic(p);
      return { inc: { br: lerp(0.5, 1, clamp(k * 1.25)), s: lerp(0.965, 1, k), ro: clamp((k - 0.74) / 0.26) },
               out: { ry: lerp(0, -92, k), org: 'left center', br: lerp(1, 0.62, k), z: 6, o: 1 - clamp((k - 0.9) * 10) } }; },
    'page-back': p => { const k = E.inOutCubic(p);
      return { inc: { ry: lerp(-92, 0, k), org: 'left center', br: lerp(0.62, 1, k), z: 6, o: clamp(k * 10) },
               out: { br: lerp(1, 0.5, clamp(k * 1.25)), s: lerp(1, 0.965, k), ro: 1 - clamp(k / 0.3) } }; },
  };
  DMS.transitions = TRANS;

  function sceneWindow(i) {
    const d = scenes[i].def; const nx = scenes[i + 1];
    const tin = d.transition || { type: i === 0 ? 'cut' : 'fade', dur: 0.5 };
    const tType = typeof tin === 'string' ? tin : tin.type;
    const tParams = typeof tin === 'string' ? {} : tin;
    const tDur = typeof tin === 'string' ? 0.5 : (tin.dur == null ? 0.5 : tin.dur);
    let outType = null, outDur = 0, outParams = {};
    if (nx) { const n = nx.def.transition || { type: 'fade', dur: 0.5 }; outType = typeof n === 'string' ? n : n.type; outDur = typeof n === 'string' ? 0.5 : (n.dur == null ? 0.5 : n.dur); outParams = typeof n === 'string' ? {} : n; }
    return { t0: d.t0, t1: d.t1, tType, tDur, tParams, outType, outDur, outParams };
  }

  function stateFor(i, t) {
    /* 场景 i 在 t 的状态：转场以 t0 为中心对称（t0 - dur/2 .. t0 + dur/2） */
    const w = sceneWindow(i);
    const a0 = w.t0 - w.tDur / 2, a1 = w.t0 + w.tDur / 2;
    const b0 = w.t1 - w.outDur / 2, b1 = w.t1 + w.outDur / 2;
    if (t < (i === 0 ? -1e9 : a0) || t >= (scenes[i + 1] ? b1 : 1e9)) return null;
    let st = {};
    if (i > 0 && t < a1 && w.tDur > 0) {
      const f = TRANS[w.tType] || TRANS.fade; const r = f(prog(t, a0, w.tDur), w.tParams); st = Object.assign({}, r.inc); st._fx = r; st._role = 'in';
    } else if (scenes[i + 1] && t >= b0 && w.outDur > 0) {
      const f = TRANS[w.outType] || TRANS.fade; const r = f(prog(t, b0, w.outDur), w.outParams); st = Object.assign({}, r.out); st._fx = r; st._role = 'out';
    }
    return st;
  }

  function applyScene(S, st, sx, sy) {
    const x = (st.x || 0) + sx, y = (st.y || 0) + sy, s = st.s == null ? 1 : st.s;
    const tf = `translate(${x}px,${y}px) scale(${s})` + (st.ry ? ` perspective(${(W * 2.4).toFixed(0)}px) rotateY(${st.ry.toFixed(2)}deg)` : '');
    const flt = (st.b ? `blur(${st.b.toFixed(1)}px) ` : '') + (st.br != null && st.br < 0.999 ? `brightness(${st.br.toFixed(3)})` : '');
    for (const el of [S.root, S.bg]) {
      el.style.display = 'block';
      el.style.transform = tf;
      el.style.transformOrigin = st.org || '';
      el.style.zIndex = st.z != null ? st.z : '';
      el.style.opacity = (st.o == null ? 1 : st.o) * (el === S.root && st.ro != null ? st.ro : 1);
      el.style.filter = flt.trim();
      if (st.iris != null && st.iris < 1) {
        const c = DMS.presenter.center();
        el.style.clipPath = `circle(${(st.iris * Math.hypot(W, H)).toFixed(1)}px at ${c[0]}px ${c[1]}px)`;
      } else el.style.clipPath = (el === S.root && st.holeClip) || st.clip || '';
      const hm = el === S.root && st.holeMask;
      el.style.webkitMaskImage = el.style.maskImage = hm ? hm.image : (st.mask || '');
      el.style.webkitMaskSize = el.style.maskSize = hm ? (hm.size || '100% 100%') : st.mask ? (st.maskSize || '100% 100%') : '';
      el.style.webkitMaskPosition = el.style.maskPosition = hm ? (hm.pos || '0 0') : st.mask ? (st.maskPos || '0 0') : '';
      el.style.webkitMaskRepeat = el.style.maskRepeat = hm ? (hm.repeat || 'no-repeat') : st.mask ? (st.maskPos ? 'no-repeat' : 'repeat') : '';
      el.style.maskComposite = hm && hm.composite ? hm.composite : '';
      el.style.webkitMaskComposite = hm && hm.composite ? 'xor' : '';
    }
    if (st.morph != null) S.bg.style.opacity = st._role === 'in' ? clamp(st.morph * 1.4) : 1;   // 背景交叉淡化（新背景盖在旧背景上）
  }

  /* 元素承接（morph）：给转场两侧的层打标记，updateLayer 里按标记移动/淡化 */
  let heirsDone = false;
  function markHeirs() {   // 承接层（静态算一次，和渲染顺序无关）：从承接开始就"已经在场"，不再播自己的入场
    heirsDone = true;
    for (let i = 1; i < scenes.length; i++) {
      const w = sceneWindow(i); if (w.tType !== 'morph') continue;
      const names = new Set(scenes[i - 1].layers.map(L => L.def.share).filter(Boolean));
      scenes[i].layers.forEach(L => { if (L.def.share && names.has(L.def.share)) L._heir = { a0: w.t0 - w.tDur / 2 }; });
    }
  }
  const NOSHIFT = new Set(['window', 'media', 'phone', 'doc', 'chat', 'progress']);   // 这些组件内部是连续画面/按 cue 推进，不平移内部时间
  function prepMorph(t) {
    if (!heirsDone) markHeirs();
    scenes.forEach(S => S.layers.forEach(L => { L._mk = null; }));
    for (let i = 1; i < scenes.length; i++) {
      const w = sceneWindow(i); if (w.tType !== 'morph') continue;
      const a0 = w.t0 - w.tDur / 2, a1 = w.t0 + w.tDur / 2; if (t < a0 || t >= a1) continue;
      const k = E.inOutCubic(prog(t, a0, w.tDur)); const A = scenes[i - 1], B = scenes[i];
      const share = {}; A.layers.forEach(L => { if (L.def.share) share[L.def.share] = L; });
      A.layers.forEach(L => { L._mk = L.def.share && B.layers.some(M => M.def.share === L.def.share) ? { hide: true } : { fade: 1 - clamp(k * 1.8) }; });
      B.layers.forEach(L => {
        const from = L.def.share && share[L.def.share];
        L._mk = from ? { k, kAt: tt => E.inOutCubic(prog(tt, a0, w.tDur)), from: boxOf(from.def.box), to: boxOf(L.def.box) } : { fade: clamp((k - 0.35) / 0.65) };
      });
    }
  }

  /* 相机：world 层的推拉摇移（场景内容），关键帧之间平滑插值 */
  function cameraAt(t) {
    const ks = (TL.camera || []);
    let cur = { zoom: 1, x: 0, y: 0 };
    for (const k of ks) {
      if (t < k.t) break;
      const d = k.dur == null ? 0.8 : k.dur; const p = E.smooth(prog(t, k.t, d));
      cur = { zoom: lerp(cur.zoom, k.zoom == null ? 1 : k.zoom, p), x: lerp(cur.x, k.x || 0, p), y: lerp(cur.y, k.y || 0, p) };
    }
    return cur;
  }

  function wrapState(L, t) {
    const d = L.def, at = d.at || 0, lt = t - at;
    const enterDur = d.enterDur == null ? 0.55 : d.enterDur;
    let st = {};
    const en = ENTER[d.enter || (L.comp && L.comp.enter) || (LIFT.has(d.c) ? 'settle' : 'rise')] || ENTER.rise;
    if (lt < enterDur && !L._heir) st = en(prog(lt, 0, enterDur));
    if (d.out != null && t >= d.out) {
      const ex = EXIT[d.exit || 'fade'] || EXIT.fade;
      const k = prog(t, d.out, d.exitDur == null ? 0.4 : d.exitDur);
      const s2 = ex(E.inOutCubic(k));
      st = Object.assign({}, st, s2, { o: (st.o == null ? 1 : st.o) * (s2.o == null ? 1 : s2.o) });
    }
    if (d.float) { const a = d.float; st.y = (st.y || 0) + Math.sin(t * 1.3 + at) * a; }
    const mk = L._mk;
    if (mk && mk.from) {                 // 元素承接：从旧位置 FLIP 到自己的位置（等比缩放 + 中心平移），不做自身入场
      const f = mk.from, g = mk.to, q = mk.kAt ? mk.kAt(t) : mk.k;
      const sc = lerp(Math.sqrt((f[2] * f[3]) / (g[2] * g[3])), 1, q);
      st = { x: ((f[0] + f[2] / 2) - (g[0] + g[2] / 2)) * W * (1 - q), y: ((f[1] + f[3] / 2) - (g[1] + g[3] / 2)) * H * (1 - q), s: sc };
    }
    if (mk && mk.fade != null) st.o = (st.o == null ? 1 : st.o) * mk.fade;
    return st;
  }
  const LIFT = new Set(['cards', 'compare', 'window', 'phone', 'doc', 'chat', 'logo', 'media', 'quote', 'bubble', 'namecard', 'progress', 'checklist']);
  function updateLayer(L, t, sceneLocal) {
    const d = L.def;
    const at = d.at || 0;
    const lt = t - at;
    const vis = (lt >= -0.0001 || (L._heir && t >= L._heir.a0)) && (d.out == null || t < d.out + (d.exitDur == null ? 0.4 : d.exitDur));
    L.el.style.display = vis ? 'block' : 'none';
    if (!vis) return;
    const mk = L._mk;
    if (mk && mk.hide) { L.el.style.display = 'none'; return; }
    const st = wrapState(L, t);
    const pv = wrapState(L, t - 1 / FPS);
    if (mk && mk.from) { const q = 0.35; ['x', 'y'].forEach(k => { pv[k] = (st[k] || 0) + ((pv[k] || 0) - (st[k] || 0)) * q; }); }   // 承接主体是眼睛追着看的，只留少量拖影
    st._mb = motionBlur(L.el, st, pv, FPS);
    // 落地投影：卡片类元素入场时带着大投影浮起，落定时收小
    const enterDur = d.enterDur == null ? 0.55 : d.enterDur;
    if ((d.sheen || (d.sheen !== false && LIFT.has(d.c))) && TL.sheen !== false && !L._heir) {
      const s0 = enterDur * 0.7; st._mb = (st._mb || '') + sheenFilter(L.el, (lt - s0) / 0.75);
    }
    if ((d.lift || (d.lift !== false && LIFT.has(d.c))) && lt < enterDur + 0.25 && TL.lift !== false && !L._heir) {
      const k = E.outCubic(prog(lt, 0, enterDur + 0.25));
      st._sh = `drop-shadow(0 ${lerp(34, 10, k).toFixed(1)}px ${lerp(46, 18, k).toFixed(1)}px rgba(0,0,0,${(0.42 * (1 - k * 0.6)).toFixed(3)}))`;
    }
    applyWrap(L.el, st);
    if (L.comp && L.comp.update) {
      const ltc = L._heir && !NOSHIFT.has(d.c) ? lt + 1.5 : (L._heir ? Math.max(lt, 0) : lt);   // 文字类承接层：内部时间整体后移 1.5s（已显示完整），全程连续不回跳
      try { L.comp.update(L.inner, ltc, d.props || {}, L.state || {}, L, t); } catch (e) { console.error(d.c, e); }
    }
  }

  /* ---------------- 景深层：前景文字背后的羽化磨砂 ----------------
     每帧量出前景里"看得见的文字"的屏幕位置，相近的并成一团，每团垫一块边缘羽化的磨砂（模糊 + 压暗墙字）。
     墙在远处依旧清楚，靠近前景的墙字退到后面；跟随元素的出现、消失、转场位移同步变化。 */
  const _rg = typeof document !== 'undefined' ? document.createRange() : null;
  function visOpacity(el, stop) {
    let o = 1;
    for (let e = el; e && e !== stop.parentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= parseFloat(cs.opacity); if (o < 0.04) return 0;
    }
    return o;
  }
  function textRects(L, ox, oy, sc) {
    const out = [];
    if (!L.el || L.el.style.display === 'none') return out;
    const tw = document.createTreeWalker(L.inner, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const o = visOpacity(n.parentElement, L.el); if (!o) continue;
      _rg.selectNodeContents(n);
      for (const r of _rg.getClientRects()) {
        if (r.width < 2 || r.height < 2) continue;
        out.push({ x0: (r.left - ox) / sc, y0: (r.top - oy) / sc, x1: (r.right - ox) / sc, y1: (r.bottom - oy) / sc, o });
      }
    }
    return out;
  }
  function clusterRects(rs, gap) {
    const cs = [];
    for (const r of rs) cs.push(Object.assign({}, r));
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < cs.length && !merged; i++) for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i], b = cs[j];
        if (a.x0 - gap < b.x1 && b.x0 - gap < a.x1 && a.y0 - gap * 0.6 < b.y1 && b.y0 - gap * 0.6 < a.y1) {
          cs[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), o: Math.max(a.o, b.o) };
          cs.splice(j, 1); merged = true; break;
        }
      }
    }
    return cs;
  }
  function updateDepth(S) {
    if (!S.depth) return;
    let cl = [];
    if (S.root.style.display !== 'none') {
      const sr = stage.getBoundingClientRect(), sc = sr.width / W || 1;
      const rs = [];
      S.layers.forEach(L => { if (L.def.depth !== false) textRects(L, sr.left, sr.top, sc).forEach(r => rs.push(r)); });
      cl = clusterRects(rs, S.depth.gap);
      S.bgLayers.forEach(L => { if (L.comp && L.comp.depth && L.el.style.display !== 'none') { try { L.comp.depth(L.inner, L.state || {}, cl, S.depth, { sr, sc }); } catch (e) { console.error(e); } } });
    } else S.bgLayers.forEach(L => { if (L.comp && L.comp.depth) L.comp.depth(L.inner, L.state || {}, [], S.depth, null); });
  }
  DMS.depthMask = function (el, cl, info, D) {
    /* 把舞台坐标的文字团换成 el 的本地坐标，拼成"羽化胶囊"遮罩（一串圆形渐变的并集） */
    if (!cl.length || !info) return 'none';
    const r = el.getBoundingClientRect(), k = (r.width / el.offsetWidth) || 1;
    const g = [];
    cl.forEach(c => {
      const x0 = (c.x0 * info.sc + info.sr.left - r.left) / k, x1 = (c.x1 * info.sc + info.sr.left - r.left) / k;
      const y0 = (c.y0 * info.sc + info.sr.top - r.top) / k, y1 = (c.y1 * info.sc + info.sr.top - r.top) / k;
      const h = y1 - y0, pad = Math.max(D.pad || 0, Math.min(190, h * 0.8 + 56));
      const R = h / 2 + pad, solid = ((h / 2 + pad * 0.18) / R * 100).toFixed(1), cy = ((y0 + y1) / 2).toFixed(1);
      const a = Math.min(1, c.o).toFixed(3);
      const n = Math.max(1, Math.ceil((x1 - x0 - h) / (h * 0.6)) + 1);
      for (let i = 0; i < n; i++) {
        const cx = n === 1 ? (x0 + x1) / 2 : x0 + h / 2 + (x1 - x0 - h) * i / (n - 1);
        g.push(`radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy}px, rgba(0,0,0,${a}) ${solid}%, transparent 100%)`);
      }
    });
    return g.join(',');
  };

  /* ---------------- 主渲染 ---------------- */
  let lastT = 0;
  DMS.renderAt = function (t) {
    lastT = t;
    pending.length = 0;
    const [sx, sy] = shakeAt(t);
    const cam = cameraAt(t);
    world.style.transform = `translate(${cam.x * W}px,${cam.y * H}px) scale(${cam.zoom})`;
    let flash = 0, line = -1;
    prepMorph(t);
    scenes.forEach((S, i) => {
      const st = stateFor(i, t);
      if (!st) { S.root.style.display = 'none'; S.bg.style.display = 'none'; return; }
      applyScene(S, st, sx, sy);
      if (st.x || st.y) { const p = stateFor(i, t - 1 / FPS) || {}; const f = motionBlur(S.root, st, p, FPS); if (f) { S.root.style.filter = (f + S.root.style.filter).trim(); S.bg.style.filter = (motionBlur(S.bg, st, p, FPS) + S.bg.style.filter).trim(); } }
      if (st._fx && st._fx.flash != null) flash = Math.max(flash, st._fx.flash);
      if (st._fx && st._fx.line != null) line = st._fx.line;
      S.bgLayers.forEach(L => updateLayer(L, t, t - S.def.t0));
      S.layers.forEach(L => updateLayer(L, t, t - S.def.t0));
    });
    globals.forEach(L => updateLayer(L, t, t));
    scenes.forEach(S => updateDepth(S));
    DMS.presenter.update(t, sx, sy);
    DMS.subs.update(t);
    drawFlash(flash, line);
    return Promise.all(pending.slice());
  };
  DMS.wait = p => { if (p && p.then) pending.push(p); };
  DMS.now = () => lastT;

  let flashEl, lineEl;
  function drawFlash(f, line) {
    if (!flashEl) { flashEl = DMS.el('div', 'dms-flash', null, hudLayer); lineEl = DMS.el('div', 'dms-linefx', null, hudLayer); }
    flashEl.style.opacity = f.toFixed(3);
    if (line >= 0) {
      lineEl.style.display = 'block';
      const k = line < 0.5 ? E.outExpo(line * 2) : 1 - E.inQuad((line - 0.5) * 2);
      lineEl.style.transform = `scaleX(${k.toFixed(3)})`; lineEl.style.opacity = 1;
      bgLayer.style.background = line > 0.2 && line < 0.8 ? '#000' : '';
    } else { lineEl.style.display = 'none'; bgLayer.style.background = ''; }
  }

  /* ---------------- 音效事件收集 ---------------- */
  DMS.collectSfx = function () {
    const cues = [];
    const add = (arr, base, src) => (arr || []).forEach(c => cues.push(Object.assign({}, c, { t: +((c.abs ? 0 : base) + (c.at || 0)).toFixed(3), src })));
    const visit = (L) => {
      const d = L.def; if (d.sfx === false) return;
      const comp = L.comp;
      if (Array.isArray(d.sfx)) add(d.sfx, d.at || 0, d.c);
      else if (comp && comp.sfx) add(comp.sfx(d.props || {}, d), d.at || 0, d.c);
      else if (comp && comp.enterSfx !== null && (d.enter || comp.enter || 'rise') !== 'none') add([{ at: 0, kind: comp.enterSfx || 'pop', gain: 0.5 }], d.at || 0, d.c);
    };
    scenes.forEach((S, i) => {
      S.layers.forEach(visit); S.bgLayers.forEach(L => { if (Array.isArray(L.def.sfx)) visit(L); });
      if (i > 0) {
        const w = sceneWindow(i);
        const map = { 'push-left': 'whoosh', 'push-right': 'whoosh', 'push-up': 'whoosh', 'zoom-in': 'swoosh-in', 'zoom-out': 'swoosh-out', whip: 'whip', flash: 'impact', line: 'zap', iris: 'swoosh-in', fade: 'air', 'slide-up': 'swoosh-in', cut: null,
          'wipe-diag': 'whoosh', split: 'swoosh-in', rect: 'swoosh-in', blinds: 'whoosh-soft', 'text-mask': 'rise', morph: 'whoosh-soft', page: 'paper', 'page-back': 'paper' };
        const k = S.def.transitionSfx === false ? null : (S.def.transitionSfx || map[w.tType]);
        if (k) cues.push({ t: +(w.t0 - w.tDur / 2).toFixed(3), kind: k, gain: 0.55, src: 'transition:' + w.tType, dur: w.tDur });
      }
    });
    globals.forEach(visit);
    (TL.sfx || []).forEach(c => cues.push(Object.assign({ gain: 0.6 }, c, { src: 'timeline' })));
    DMS.presenter.sfxCues().forEach(c => cues.push(c));
    return cues.sort((a, b) => a.t - b.t);
  };

  /* 预览缩放：浏览器里打开 index.html 时自动缩放到窗口 */
  function fitPreview() {
    if (/[?&]alpha=1/.test(location.search)) { document.documentElement.classList.add('alpha'); document.body.classList.add('alpha'); }   // 透明动效层：只留动画元素
    if (/[?&]render=1/.test(location.search)) { document.body.classList.add('render'); const v = document.getElementById('viewport'); v.style.width = W + 'px'; v.style.height = H + 'px'; return; }
    const f = () => { const s = Math.min(innerWidth / W, (innerHeight - 64) / H); stage.style.transform = `scale(${s})`; stage.style.transformOrigin = '0 0'; document.getElementById('viewport').style.height = H * s + 'px'; document.getElementById('viewport').style.width = W * s + 'px'; };
    addEventListener('resize', f); f();
  }
})();
