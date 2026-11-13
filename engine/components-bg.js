/* =====================================================================
   组件库 · 背景与环境族（环境层只给空间与连续性，不抢焦点）
   文字墙 / 作品墙 / 放射光 / 透视网格 / HUD 框 / 纸张 / 纯色渐变 / 巨字水印 / 柔光 / 胶片颗粒
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, esc = DMS.esc, el = DMS.el;
  const BG = (name, def) => { def.enter = 'none'; def.enterSfx = null; C[name] = def; };

  /* bg-wall（品牌文字墙）在 dayan-walls.js：原样沿用 DAYAN 动效库的两行字与 16 套皮肤 */

  /* ====== bg-thumbs：倾斜作品墙（证据蒙太奇），慢推进；无图时生成色块卡 ====== */
  BG('bg-thumbs', {
    build(e, p) {
      e.classList.add('b-thumbs');
      const plane = el('div', 'tp', '', e);
      plane.style.transform = `rotateX(${p.rx == null ? 18 : p.rx}deg) rotateY(${p.ry == null ? -22 : p.ry}deg) rotateZ(${p.rz == null ? 6 : p.rz}deg)`;
      const n = p.count || 60, cols = p.cols || 10, r = DMS.rand(n * 3 + 1);
      plane.style.setProperty('--cols', cols);
      const hues = p.hues || [262, 200, 330, 20, 150, 45, 0];
      const cells = Array.from({ length: n }, (_, i) => {
        const c = el('div', 'tc', '', plane); const img = p.images && p.images[i % p.images.length];
        if (img) c.style.backgroundImage = `url("${img}")`;
        else { const h = hues[Math.floor(r() * hues.length)]; c.style.background = `linear-gradient(${Math.floor(r() * 360)}deg,hsl(${h} 72% ${22 + r() * 20}%),hsl(${(h + 30) % 360} 80% ${40 + r() * 25}%))`; c.innerHTML = `<b style="width:${30 + r() * 50}%"></b><i style="width:${20 + r() * 40}%"></i>`; }
        return c;
      });
      return { plane, cells };
    },
    update(e, lt, p, s, L, t) {
      const k = E.outCubic(prog(lt, 0, p.dur || 6));
      s.plane.style.scale = lerp(p.from || 1.15, p.to || 1.0, k);
      s.plane.style.translate = `${lerp(0, p.pan == null ? -80 : p.pan, k)}px 0`;
      e.style.setProperty('--dim', p.dim == null ? 0.45 : p.dim);
    },
  });

  /* ====== bg-burst：漫画放射光 + 网点（红/紫/黄/蓝），缓慢旋转 ====== */
  BG('bg-burst', {
    build(e, p) {
      e.classList.add('b-burst');
      e.style.setProperty('--c1', p.c1 || '#E8304E'); e.style.setProperty('--c2', p.c2 || '#FF5A6E');
      e.style.setProperty('--rays', p.rays || 22);
      const r = el('div', 'br', '', e); if (p.halftone !== false) el('div', 'ht', '', e);
      if (p.cloud) el('div', 'cl', '', e);
      return { r };
    },
    update(e, lt, p, s, L, t) { s.r.style.transform = `translate(-50%,-50%) rotate(${t * (p.spin == null ? 6 : p.spin)}deg)`; },
  });

  /* ====== bg-grid：透视网格地面 + 地平线辉光（科技 / 未来感） ====== */
  BG('bg-grid', {
    build(e, p) { e.classList.add('b-grid'); if (p.color) e.style.setProperty('--g-c', p.color); el('div', 'floor', '', e); el('div', 'glow', '', e); return {}; },
    update(e, lt, p, s, L, t) { e.style.setProperty('--gy', ((t * (p.speed || 40)) % 80) + 'px'); },
  });

  /* ====== bg-hud：HUD 边框（四角括号 + 扫描线 + 角标） ====== */
  BG('bg-hud', {
    build(e, p) {
      e.classList.add('b-hud');
      ['tl', 'tr', 'bl', 'br'].forEach(c => el('i', 'cn ' + c, '', e));
      if (p.label) el('div', 'hl', esc(p.label), e);
      el('div', 'scan', '', e);
      return {};
    },
    update(e, lt, p, s, L, t) { e.style.setProperty('--scan', ((t * 0.18) % 1 * 100).toFixed(2) + '%'); const k = E.outExpo(prog(lt, 0, 0.8)); e.style.setProperty('--hk', k.toFixed(3)); },
  });

  /* ====== bg-paper：米白纸张（编辑台 / Swiss 风），可带颗粒与网格线 ====== */
  BG('bg-paper', { build(e, p) { e.classList.add('b-paper', 'pp-' + (p.tone || 'cream')); if (p.ruled) e.classList.add('ruled'); if (p.dots) e.classList.add('dots'); return {}; } });

  /* ====== bg-solid：纯色 / 渐变底 ====== */
  BG('bg-solid', { build(e, p) { e.classList.add('b-solid'); e.style.background = p.gradient || p.color || 'var(--bg)'; return {}; } });

  /* ====== bg-watermark：章节巨字水印（Context / Harness），斜体淡字慢移 ====== */
  BG('bg-watermark', {
    build(e, p) { e.classList.add('b-mark'); const w = el('div', 'wm', esc(p.text || ''), e); if (p.op != null) w.style.opacity = p.op; return { w }; },
    update(e, lt, p, s, L, t) { s.w.style.transform = `translate(${-t * 6 % 4000}px, -50%)`; },
  });

  /* ====== bg-glow：柔光色团缓慢漂移（品牌氛围 / 渐变空间） ====== */
  BG('bg-glow', {
    build(e, p) {
      e.classList.add('b-glow');
      const cs = p.colors || ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];
      return { bs: cs.map((c, i) => { const b = el('i', 'gb', '', e); b.style.background = c; return b; }) };
    },
    update(e, lt, p, s, L, t) { s.bs.forEach((b, i) => { const a = t * 0.12 + i * 2.1; b.style.transform = `translate(${Math.cos(a) * 18 + (i - 1) * 30}vw, ${Math.sin(a * 1.3) * 14}vh)`; }); },
  });

  /* ====== bg-film：暗调胶片颗粒 + 暗角（情绪 / 产品发布感） ====== */
  BG('bg-film', {
    build(e, p) { e.classList.add('b-film'); if (p.tone) e.dataset.tone = p.tone; el('div', 'gr', '', e); return { g: e.querySelector('.gr') }; },
    update(e, lt, p, s, L, t) { const f = Math.floor(t * 24) % 6; s.g.style.backgroundPosition = `${f * 37}px ${f * 53}px`; },
  });

  /* ====== bg-stars：星点 / 粒子空间（教育、梦幻） ====== */
  BG('bg-stars', {
    build(e, p) {
      e.classList.add('b-stars'); const r = DMS.rand(p.seed || 3);
      return { st: Array.from({ length: p.count || 70 }, () => { const s = el('i', 'sr', '', e); s.style.left = r() * 100 + '%'; s.style.top = r() * 100 + '%'; const z = 2 + r() * 4; s.style.width = s.style.height = z + 'px'; return { s, ph: r() * 6 }; }) };
    },
    update(e, lt, p, s, L, t) { s.st.forEach(x => { x.s.style.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + x.ph)); }); },
  });
})();
