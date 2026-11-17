/* 类比关系图（fx-analogy-map）—— v1.12 补齐分类「04 流程 · 关系」
   什么时候用：用打比方讲清楚生意模式、上下游关系（"模型厂商 → 培训课 → 你"）：白色节点卡一张张弹出，折线箭头沿路径画过去，节点下挂红 / 绿状态行，旁边弹价格徽章；跟着口播一步步亮
   字段：nodes:[{id, t 名称, icon, sub 状态行, tone bad/good, big 大卡, x, y 中心位置(0–1), at}]；links:[{from, to, at, dash}]；badges:[{node, t, at}] */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-analogy-map'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-analogy-map');
      const svg = el('div', 'sv', '<svg><defs><marker id="am" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="rgba(255,255,255,.75)"/></marker></defs></svg>', e).firstChild;
      const nodes = {};
      (p.nodes || []).forEach(n => { const d = el('div', 'nd' + (n.big ? ' big' : ''), `<div class="hd"><i>${DMS.icon(n.icon || 'spark')}</i><b>${esc(n.t)}</b></div>${n.sub ? `<div class="sb ${n.tone || ''}">${n.tone === 'bad' ? '⊗' : n.tone === 'good' ? '✓' : '·'} ${esc(n.sub)}</div>` : ''}`, e);
        d.style.left = (n.x * 100) + '%'; d.style.top = (n.y * 100) + '%'; nodes[n.id] = { n, d }; });
      const links = (p.links || []).map(l => { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', l.dash ? 'dash' : ''); path.setAttribute('pathLength', '1'); path.setAttribute('marker-end', 'url(#am)'); svg.appendChild(path); return { l, path }; });
      const badges = (p.badges || []).map(b => { const d = el('div', 'bd', esc(b.t), e); const nd = nodes[b.node]; if (nd) { d.style.left = `calc(${nd.n.x * 100}% + 1px)`; d.style.top = (nd.n.y * 100) + '%'; } return { b, d, nd }; });
      return { svg, nodes, links, badges, sized: 0 };
    },
    update(e, lt, p, s) {
      const W = e.clientWidth, H = e.clientHeight;
      if (W && s.sized !== W * 7 + H) {
        s.sized = W * 7 + H; s.svg.setAttribute('viewBox', `0 0 ${W} ${H}`); s.svg.setAttribute('width', W); s.svg.setAttribute('height', H);
        s.links.forEach(({ l, path }) => { const a = s.nodes[l.from], b = s.nodes[l.to]; if (!a || !b) return;
          const ra = a.d.getBoundingClientRect(), rb = b.d.getBoundingClientRect(), sc = (e.getBoundingClientRect().width / W) || 1;
          const aw = ra.width / sc / 2, ah = ra.height / sc / 2, bw = rb.width / sc / 2, bh = rb.height / sc / 2;
          const ax = a.n.x * W, ay = a.n.y * H, bx = b.n.x * W, by = b.n.y * H;
          let d;
          if (Math.abs(ay - by) < 4) d = `M${ax + (bx > ax ? aw : -aw)} ${ay} L${bx + (bx > ax ? -bw - 6 : bw + 6)} ${by}`;
          else if (Math.abs(ax - bx) < 4) d = `M${ax} ${ay + (by > ay ? ah : -ah)} L${bx} ${by + (by > ay ? -bh - 6 : bh + 6)}`;
          else { const sx = ax + (bx > ax ? aw : -aw), mx = bx; d = `M${sx} ${ay} L${mx} ${ay} L${mx} ${by + (by > ay ? -bh - 6 : bh + 6)}`; }
          path.setAttribute('d', d); });
      }
      Object.values(s.nodes).forEach(({ n, d }) => { const q = prog(lt, n.at || 0, 0.5); d.style.opacity = clamp(q * 3).toFixed(3);
        d.style.transform = `translate(-50%,-50%) translateY(${lerp(3, 0, E.outExpo(q)).toFixed(2)}cqh) scale(${lerp(0.7, 1, sp(q)).toFixed(3)})`;
        const sb = d.querySelector('.sb'); if (sb) { const q2 = prog(lt, (n.at || 0) + 0.35, 0.35); sb.style.opacity = clamp(q2 * 3).toFixed(3); sb.style.transform = `translateX(${lerp(-10, 0, E.outExpo(q2)).toFixed(1)}%)`; } });
      s.links.forEach(({ l, path }) => { const q = E.inOutCubic(prog(lt, l.at || 0, 0.5)); path.style.strokeDasharray = l.dash ? (q < 1 ? `${q} 1` : '0.015 0.012') : `${q} 1`; path.style.opacity = q > 0 ? 1 : 0; });
      s.badges.forEach(({ b, d }) => { const q = prog(lt, b.at || 0, 0.4); d.style.opacity = clamp(q * 3).toFixed(3); d.style.transform = `translate(0,-50%) scale(${lerp(0.3, 1, sp(q, 0.4, 14)).toFixed(3)})`; });
    },
    sfx(p) { return (p.nodes || []).map(n => ({ at: n.at || 0, kind: 'pop', gain: 0.4 })).concat((p.links || []).map(l => ({ at: l.at || 0, kind: 'draw', gain: 0.22 }))).concat((p.badges || []).map(b => ({ at: b.at || 0, kind: 'ding', gain: 0.35 }))); },
  };
})();
