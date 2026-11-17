/* 结构树（fx-mind-tree）—— v1.12 补齐分类「04 流程 · 关系」
   什么时候用：讲一件事分几块、每块又包含什么（"这套课教 3 件事，每件 2–3 个要点"）：根节点在左，分支曲线向右生长，二级节点逐个展开，最后高亮一个重点分支
   字段：root 根；branches:[{t 分支, leaves:[叶子…]}]；focus 高亮第几个分支（可选）；color */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-mind-tree'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-mind-tree');
      const br = p.branches || [], n = br.length;
      const svg = el('div', 'sv', '<svg></svg>', e).firstChild;
      const root = el('div', 'rt', esc(p.root || ''), e); root.style.left = '0%'; root.style.top = '50%';
      const B = br.map((b, i) => { const y = (i + 0.5) / n; const d = el('div', 'bn' + (p.focus === i ? ' fo' : ''), esc(b.t), e); d.style.left = '34%'; d.style.top = (y * 100) + '%';
        const L = (b.leaves || []).map((t, j) => { const m = (b.leaves || []).length; const yy = y + ((j + 0.5) / m - 0.5) * (0.86 / n); const l = el('div', 'lf' + (p.focus === i ? ' fo' : ''), esc(t), e); l.style.left = '66%'; l.style.top = (yy * 100) + '%'; return { l, y: yy }; });
        return { b, d, y, L }; });
      return { svg, root, B, sized: 0 };
    },
    update(e, lt, p, s) {
      const W = e.clientWidth, H = e.clientHeight;
      if (W && s.sized !== W + H * 3) {
        s.sized = W + H * 3; s.svg.setAttribute('viewBox', `0 0 ${W} ${H}`); s.svg.innerHTML = '';
        const sc = (e.getBoundingClientRect().width / W) || 1, rw = s.root.getBoundingClientRect().width / sc;
        const mk = (x0, y0, x1, y1, cls) => { const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); const mx = (x0 + x1) / 2;
          pth.setAttribute('d', `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`); pth.setAttribute('pathLength', '1'); pth.setAttribute('class', cls); s.svg.appendChild(pth); return pth; };
        s.B.forEach(o => { const bw = o.d.getBoundingClientRect().width / sc;
          o.p = mk(rw, H / 2, 0.34 * W, o.y * H, p.focus === s.B.indexOf(o) ? 'fo' : '');
          o.L.forEach(l => { l.p = mk(0.34 * W + bw, o.y * H, 0.66 * W, l.y * H, p.focus === s.B.indexOf(o) ? 'fo' : ''); }); });
      }
      const rq = prog(lt, 0, 0.45); s.root.style.opacity = clamp(rq * 3).toFixed(3); s.root.style.transform = `translateY(-50%) scale(${lerp(0.6, 1, sp(rq)).toFixed(3)})`;
      s.B.forEach((o, i) => { const t0 = 0.35 + i * 0.4, q = prog(lt, t0 + 0.3, 0.4);
        if (o.p) o.p.style.strokeDasharray = `${E.inOutCubic(prog(lt, t0, 0.35))} 1`;
        o.d.style.opacity = clamp(q * 3).toFixed(3); o.d.style.transform = `translateY(-50%) scale(${lerp(0.6, 1, sp(q)).toFixed(3)})`;
        o.L.forEach((l, j) => { const t1 = 0.35 + s.B.length * 0.4 + 0.1 + (i * 3 + j) * 0.12, q2 = prog(lt, t1 + 0.25, 0.35);
          if (l.p) l.p.style.strokeDasharray = `${E.inOutCubic(prog(lt, t1, 0.3))} 1`;
          l.l.style.opacity = clamp(q2 * 3).toFixed(3); l.l.style.transform = `translateY(-50%) translateX(${lerp(2, 0, E.outExpo(q2)).toFixed(2)}cqw)`; }); });
      e.style.setProperty('--fk', prog(lt, 0.35 + s.B.length * 0.4 + 1.4, 0.4).toFixed(3));
    },
    sfx(p) { const n = (p.branches || []).length, o = [{ at: 0, kind: 'pop', gain: 0.4 }]; for (let i = 0; i < n; i++) o.push({ at: 0.65 + i * 0.4, kind: 'pop-soft', gain: 0.35 });
      if (p.focus != null) o.push({ at: 0.35 + n * 0.4 + 1.4, kind: 'ding', gain: 0.35 }); return o; },
  };
})();
