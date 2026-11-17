/* 天平称重（fx-scale-balance）—— v1.12 补齐分类「03 对比 · 论证」
   什么时候用：讲权衡、性价比、哪边更重（"花的钱 vs 得到的""时间 vs 质量"）：天平摆动，两边托盘依次放上砝码卡，横梁倾向更重的一边并晃动停稳
   字段：left / right：{t 名称, w 权重（数值，决定倾斜）, sub 说明}；verdict 结论（挂在下沉的一边） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-scale-balance'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-scale-balance');
      const L = p.left || {}, R = p.right || {};
      const st = el('div', 'st', `<div class="pole"></div><div class="base"></div><div class="beam"><i class="pv"></i>
        <div class="pan l"><span class="rope"></span><div class="tray"></div><div class="wt"><b>${esc(L.t || '')}</b><small>${esc(L.sub || '')}</small></div></div>
        <div class="pan r"><span class="rope"></span><div class="tray"></div><div class="wt"><b>${esc(R.t || '')}</b><small>${esc(R.sub || '')}</small></div></div></div>
        <div class="vd">${esc(p.verdict || '')}</div>`, e);
      return { beam: st.querySelector('.beam'), pans: [...st.querySelectorAll('.pan')], wts: [...st.querySelectorAll('.wt')], vd: st.querySelector('.vd'), L, R };
    },
    update(e, lt, p, s) {
      const wl = s.L.w || 1, wr = s.R.w || 1, tgt = Math.max(-14, Math.min(14, (wr - wl) / (wr + wl) * 24));
      const ql = prog(lt, 0.4, 0.4), qr = prog(lt, 1.0, 0.4);
      const u = Math.max(0, lt - 1.1);
      let ang = lt < 0.4 ? Math.sin(lt * 9) * 4 * (1 - lt / 0.4) : lt < 1.1 ? lerp(0, -10, E.outCubic(prog(lt, 0.4, 0.5))) * (wl / (wl + 1)) : tgt + (-(tgt + 6)) * Math.exp(-u * 3.2) * Math.cos(u * 9);
      s.beam.style.transform = `rotate(${ang.toFixed(2)}deg)`;
      s.pans.forEach(pn => pn.style.transform = `rotate(${(-ang).toFixed(2)}deg)`);
      [ql, qr].forEach((q, i) => { s.wts[i].style.opacity = clamp(q * 3).toFixed(3); s.wts[i].style.transform = `translateY(${lerp(-30, 0, E.outBounce ? E.outBounce(q) : E.outBack(q)).toFixed(1)}cqh)`; });
      const vq = prog(lt, 2.0, 0.5); s.vd.style.opacity = clamp(vq * 3).toFixed(3); s.vd.style.transform = `translateX(-50%) scale(${lerp(0.5, 1, sp(vq)).toFixed(3)})`;
      s.vd.style.left = tgt >= 0 ? '78%' : '22%';
    },
    sfx() { return [{ at: 0.4, kind: 'thud', gain: 0.45 }, { at: 1.0, kind: 'thud', gain: 0.6 }, { at: 1.2, kind: 'scratch', gain: 0.2 }, { at: 2.0, kind: 'ding', gain: 0.4 }]; },
  };
})();
