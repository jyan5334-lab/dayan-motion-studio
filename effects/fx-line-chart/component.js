/* 增长折线（fx-line-chart）—— v1.12 补齐分类「02 数据 · 报表」
   什么时候用：讲增长、趋势、走势（"三个月涨了 5 倍""用户数一路涨"）：坐标网格淡入，折线一笔画出，面积渐变跟着填充，关键点亮起并弹出数值标签，峰值处挂一个标注
   字段：data:[数值…]；labels:[横轴标签…]；unit 单位；peak 标注文字（挂在最大值上）；color；source 出处小字；drawAt / drawDur */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-line-chart'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-line-chart'); if (p.color) e.style.setProperty('--lc', p.color);
      const d = p.data || [1, 2, 3], n = d.length, mx = Math.max(...d) * 1.12, mn = Math.min(0, ...d);
      const X = i => 6 + i * 88 / Math.max(1, n - 1), Y = v => 86 - (v - mn) / (mx - mn) * 76;
      const pts = d.map((v, i) => [X(i), Y(v)]);
      let path = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; path += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
      const grid = [0, 1, 2, 3].map(i => `<line x1="4" x2="96" y1="${10 + i * 25.3}" y2="${10 + i * 25.3}"/>`).join('');
      const svg = el('div', 'pl', `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="lcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lc)" stop-opacity=".45"/><stop offset="1" stop-color="var(--lc)" stop-opacity="0"/></linearGradient></defs>
        <g class="gr">${grid}</g><path class="ar" d="${path} L${pts[n - 1][0]} 86 L${pts[0][0]} 86 Z" fill="url(#lcg)"/><path class="ln" d="${path}" pathLength="1"/></svg>`, e);
      const dots = pts.map((q, i) => { const o = el('div', 'dt', `<i></i><b>${esc(d[i])}${esc(p.unit || '')}</b>`, e); o.style.left = q[0] + '%'; o.style.top = q[1] + '%'; return o; });
      const labs = el('div', 'xl', (p.labels || []).map((t, i) => `<span style="left:${X(i)}%">${esc(t)}</span>`).join(''), e);
      const im = d.indexOf(Math.max(...d));
      const pk = p.peak ? el('div', 'pk', `<span>${esc(p.peak)}</span>`, e) : null;
      if (pk) { pk.style.left = pts[im][0] + '%'; pk.style.top = pts[im][1] + '%'; if (pts[im][0] > 70) pk.classList.add('l'); }
      const src = el('div', 'src', esc(p.source || ''), e);
      return { svg, ln: svg.querySelector('.ln'), ar: svg.querySelector('.ar'), gr: svg.querySelector('.gr'), dots, labs, pk, src, n, X };
    },
    update(e, lt, p, s) {
      const da = p.drawAt == null ? 0.4 : p.drawAt, dd = p.drawDur == null ? 1.6 : p.drawDur;
      s.gr.style.opacity = (0.9 * E.outCubic(prog(lt, 0, 0.5))).toFixed(3); s.labs.style.opacity = prog(lt, 0.1, 0.5).toFixed(3);
      const k = E.inOutCubic(prog(lt, da, dd));
      s.ln.style.clipPath = `inset(-20% ${((1 - k) * 100).toFixed(2)}% -20% -5%)`;
      s.ar.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`;
      s.dots.forEach((o, i) => { const at = da + dd * (i / Math.max(1, s.n - 1)) * 0.98, q = prog(lt, at, 0.4);
        o.style.opacity = clamp(q * 3).toFixed(3); o.style.transform = `translate(-50%,-50%) scale(${lerp(0.2, 1, sp(q)).toFixed(3)})`; });
      if (s.pk) { const q = prog(lt, da + dd + 0.1, 0.5); s.pk.style.opacity = clamp(q * 3).toFixed(3); s.pk.style.setProperty('--k', sp(q).toFixed(3)); }
      s.src.style.opacity = prog(lt, 0.4, 0.5).toFixed(3);
    },
    sfx(p) { const da = p.drawAt == null ? 0.4 : p.drawAt, dd = p.drawDur == null ? 1.6 : p.drawDur, n = (p.data || []).length, o = [{ at: da, kind: 'draw', gain: 0.4 }];
      for (let i = 0; i < n; i++) o.push({ at: da + dd * i / Math.max(1, n - 1) * 0.98, kind: 'tick', gain: 0.2 });
      if (p.peak) o.push({ at: da + dd + 0.1, kind: 'pop-big', gain: 0.45 }); return o; },
  };
})();
