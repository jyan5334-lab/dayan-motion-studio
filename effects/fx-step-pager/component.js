/* 步骤进度条（fx-step-pager）—— v1.12 补齐分类「04 流程 · 关系」
   什么时候用：讲"从 A 到 B 要几步、现在走到第几步"（"从构思到成片 7 步"）：一排编号方块，亮到当前步，起点终点挂说明，进度线跟着推进；可按口播逐步推进
   字段：n 总步数；at:[每一步点亮的时刻…]（或 every 间隔）；start / end 两端说明；current 停在第几步（默认全部）；color */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-step-pager'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-step-pager'); if (p.color) e.style.setProperty('--pc', p.color);
      const n = p.n || 7;
      const row = el('div', 'rw', Array.from({ length: n }, (_, i) => `<div class="st"><b>${i + 1}</b></div>`).join(''), e);
      const tr = el('div', 'tr', `<span>${esc(p.start || '')}</span><div class="ln"><u></u></div><span>${esc(p.end || '')}</span>`, e);
      return { sts: [...row.children], u: tr.querySelector('u'), tr, n };
    },
    update(e, lt, p, s) {
      e.style.fontSize = (Math.min(e.clientHeight * 0.13, e.clientWidth * 0.035)).toFixed(1) + 'px';
      const cur = p.current == null ? s.n : p.current, ev = p.every == null ? 0.35 : p.every;
      const T = i => Array.isArray(p.at) ? (p.at[i] == null ? 1e9 : p.at[i]) : 0.3 + i * ev;
      const app = prog(lt, 0, 0.5); e.style.opacity = clamp(app * 3).toFixed(3);
      let lit = 0;
      s.sts.forEach((st, i) => { const q = i < cur ? prog(lt, T(i), 0.3) : 0; if (q > 0) lit = i + q;
        st.style.setProperty('--on', q.toFixed(3)); st.style.transform = `translateY(${(-Math.sin(q * Math.PI) * 1.4).toFixed(2)}cqh) scale(${(1 + Math.sin(q * Math.PI) * 0.12).toFixed(3)})`; });
      s.u.style.transform = `scaleX(${(lit / s.n).toFixed(4)})`;
      s.tr.style.opacity = prog(lt, 0.2, 0.4).toFixed(3);
    },
    sfx(p) { const n = p.n || 7, cur = p.current == null ? n : p.current, ev = p.every == null ? 0.35 : p.every, o = [];
      for (let i = 0; i < cur; i++) o.push({ at: Array.isArray(p.at) ? p.at[i] : 0.3 + i * ev, kind: i === cur - 1 ? 'tick-ok' : 'tick', gain: 0.35 }); return o.filter(x => x.at != null); },
  };
})();
