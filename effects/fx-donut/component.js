/* 环形占比（fx-donut）—— v1.12 补齐分类「02 数据 · 报表」
   什么时候用：讲占比、份额、构成（"七成的人""成本里 60% 是人工"）：环形分段依次顺时针长出，中间数字滚到主占比，右侧图例逐条亮起
   字段：items:[{t 名称, v 数值, c 颜色}]；center 中间大字（默认第一项占比）；label 中间小字；unit；source */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  const PAL = ['var(--accent, #2CE0C0)', 'var(--hl, #FFC24B)', 'var(--accent2, #4DA3FF)', 'var(--warn, #FF3D6E)', 'var(--accent3, #8E7CFF)', '#9AA3B5'];
  C['fx-donut'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-donut');
      const it = (p.items || []).map((o, i) => Object.assign({ c: PAL[i % PAL.length] }, o)), sum = it.reduce((a, o) => a + o.v, 0) || 1;
      let acc = 0;
      const segs = it.map(o => { const a = acc / sum, b = (acc + o.v) / sum; acc += o.v; return { o, a, b }; });
      const ring = el('div', 'ring', `<svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="38"/>${segs.map(sg => `<circle class="sg" cx="50" cy="50" r="38" pathLength="1" style="stroke:${sg.o.c}"/>`).join('')}</svg>
        <div class="ct"><b>0</b><small>${esc(p.label || '')}</small></div>`, e);
      const leg = el('div', 'lg', segs.map(sg => `<div><i style="background:${sg.o.c}"></i><span>${esc(sg.o.t)}</span><b>${esc(Math.round(sg.o.v / sum * 100))}${esc(p.unit || '%')}</b></div>`).join(''), e);
      el('div', 'src', esc(p.source || ''), e);
      return { ring, segs, cs: [...ring.querySelectorAll('.sg')], ct: ring.querySelector('.ct b'), rows: [...leg.children], sum, it };
    },
    update(e, lt, p, s) {
      const rq = prog(lt, 0, 0.6); s.ring.style.transform = `rotate(${lerp(-40, 0, E.outExpo(rq)).toFixed(1)}deg) scale(${lerp(0.7, 1, sp(rq, 0.6)).toFixed(3)})`; s.ring.style.opacity = clamp(rq * 3).toFixed(3);
      s.segs.forEach((sg, i) => { const q = E.inOutCubic(prog(lt, 0.3 + i * 0.45, 0.6)), len = (sg.b - sg.a) * q;
        s.cs[i].style.strokeDasharray = `${Math.max(0, len - 0.006).toFixed(4)} 1`; s.cs[i].style.strokeDashoffset = (-sg.a).toFixed(4); });
      const main = p.center != null ? p.center : Math.round(s.it[0].v / s.sum * 100), cq = E.outExpo(prog(lt, 0.3, 1.2));
      s.ct.textContent = (typeof main === 'number' ? Math.round(main * cq) : main) + (typeof main === 'number' ? (p.unit || '%') : '');
      s.rows.forEach((r, i) => { const q = prog(lt, 0.45 + i * 0.45, 0.4); r.style.opacity = clamp(q * 3).toFixed(3); r.style.transform = `translateX(${lerp(3, 0, E.outExpo(q)).toFixed(2)}cqw)`; });
    },
    sfx(p) { return [{ at: 0, kind: 'swoosh-in', gain: 0.3 }].concat((p.items || []).map((o, i) => ({ at: 0.45 + i * 0.45, kind: 'pop-soft', gain: 0.35 }))).concat([{ at: 0.3, kind: 'roll', gain: 0.3 }]); },
  };
})();
