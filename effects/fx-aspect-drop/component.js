/* 三画幅落地（fx-aspect-drop）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"成片出来了""横屏 / 4:3 / 竖屏都能出""一次出多个版本"：三块画面按真实比例依次从上方砸落、落地挤压回弹、扬起一圈灰，
             每块里都在播同一条片子（按各自画幅重排的版式），最后弹出帧率角标。
   标准：时间的纯函数、落地带冲击（震屏 + 音效）、按 box 自动排开（宽 box 横排、窄 box 叠排）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF = [{ r: 16 / 9, t: '16:9 横屏', sub: '1920×1080' }, { r: 4 / 3, t: '4:3', sub: '1440×1080' }, { r: 9 / 16, t: '9:16 竖屏', sub: '1080×1920' }];
  C['fx-aspect-drop'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-aspect-drop');
      const items = (p.items || DEF).map((d, i) => {
        const at = d.at == null ? 0.25 + i * 0.42 : d.at;
        const w = el('div', 'scr k' + (i % 3) + (d.r < 1 ? ' tall' : d.r < 1.5 ? ' mid' : ''), `<div class="vp"><div class="bg"></div><div class="pp"></div><div class="tt"><b>${esc(p.title || '大琰DAYAN')}</b><i></i><i></i></div>
          <div class="sp"></div><div class="cap">${esc(p.caption || '一句话，剪好一条口播')}</div><div class="pb"><u></u></div></div>
          <div class="lb"><b>${esc(d.t)}</b><span>${esc(d.sub || '')}</span></div><div class="dust"></div>`, e);
        if (L && L.def) DMS.shake((L.def.at || 0) + at, 7, 0.28);
        return { d, w, at, pb: w.querySelector('.pb u'), sp: w.querySelector('.sp'), dust: w.querySelector('.dust') };
      });
      const badge = el('div', 'badge', `<b>${esc(p.badge || '60')}</b><span>${esc(p.badgeSub || 'FPS')}</span>`, e);
      return { items, badge };
    },
    update(e, lt, p, s) {
      const W = e.clientWidth || 1, H = e.clientHeight || 1, n = s.items.length;
      const row = W / H > 1.15, gap = 0.04;
      // 排版：横排时三块同高、底边对齐；竖排时同宽叠放
      let geo = [];
      if (row) {
        const sumR = s.items.reduce((a, it) => a + it.d.r, 0);
        let h = Math.min((W * (0.96 - gap * (n - 1))) / sumR, H * 0.7);
        const tot = h * sumR + W * gap * (n - 1);
        let x = (W - tot) / 2;
        s.items.forEach(it => { const w = h * it.d.r; geo.push([x, H * 0.8 - h, w, h]); x += w + W * gap; });
      } else {
        let y = H * 0.02;
        const avail = H * 0.92 - H * gap * (n - 1) - n * H * 0.06;
        const sumInv = s.items.reduce((a, it) => a + 1 / it.d.r, 0);
        const w = Math.min(W * 0.9, avail / sumInv);
        s.items.forEach(it => { const h = w / it.d.r; geo.push([(W - w) / 2, y, w, h]); y += h + H * (gap + 0.06); });
      }
      s.items.forEach((it, i) => {
        const [x, y, w, h] = geo[i];
        const f = prog(lt, it.at - 0.32, 0.32), land = lt - it.at;
        let dy = lt < it.at ? lerp(-(y + h + 40), 0, E.inQuad(f)) : 0;
        let sx = 1, sy = 1;
        if (land >= 0 && land < 0.5) { const q = land / 0.5; const a = Math.exp(-q * 5) * Math.cos(q * 16); sy = 1 - a * 0.12; sx = 1 + a * 0.08; }
        it.w.style.left = x.toFixed(1) + 'px'; it.w.style.top = y.toFixed(1) + 'px'; it.w.style.width = w.toFixed(1) + 'px'; it.w.style.height = h.toFixed(1) + 'px';
        it.w.style.fontSize = (Math.min(W, H) * 0.052).toFixed(1) + 'px';
        it.w.style.opacity = (lt < it.at - 0.32 ? 0 : 1).toFixed(3);
        it.w.style.transform = `translateY(${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        const dq = prog(land, 0, 0.6);
        it.dust.style.opacity = (land >= 0 && dq < 1 ? (1 - dq) * 0.9 : 0).toFixed(3);
        it.dust.style.transform = `translateX(-50%) scaleX(${lerp(0.6, 1.5, E.outCubic(dq)).toFixed(3)})`;
        it.pb.style.transform = `scaleX(${clamp(Math.max(0, land) / 3.2).toFixed(4)})`;
        const u = Math.max(0, land - 0.2);
        it.sp.style.transform = `translateY(${(-Math.abs(Math.sin(u * 5.2)) * 55).toFixed(1)}%) rotate(${(Math.sin(u * 5.2) * 8).toFixed(1)}deg)`;
      });
      const last = s.items.length ? s.items[s.items.length - 1].at : 0, bq = prog(lt, last + 0.4, 0.5);
      s.badge.style.opacity = clamp(bq * 3).toFixed(3);
      s.badge.style.transform = `rotate(-8deg) scale(${lerp(2, 1, E.spring(bq, 0.45, 13)).toFixed(3)})`;
    },
    sfx(p) {
      const its = p.items || DEF, out = [];
      its.forEach((d, i) => { const at = d.at == null ? 0.25 + i * 0.42 : d.at; out.push({ at: at - 0.3, kind: 'whoosh-soft', gain: 0.35 }, { at, kind: 'thud', gain: 0.75 }); });
      const last = its.length ? (its[its.length - 1].at == null ? 0.25 + (its.length - 1) * 0.42 : its[its.length - 1].at) : 0;
      out.push({ at: last + 0.45, kind: 'stamp', gain: 0.5 });
      return out;
    },
  };
})();
