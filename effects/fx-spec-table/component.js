/* 参数对比表（fx-spec-table）—— v1.12 补齐分类「03 对比 · 论证」
   什么时候用：多维度比较两三个选项（价格、速度、画质、能不能商用）：表头落下，逐行展开，每行胜出的格子亮起，最后一列总结胜者盖章
   字段：cols:[选项名…]；rows:[{t 维度, v:[各选项的值…], win 胜出列序号}]；winner 最终胜者列序号；winText 盖章文字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-spec-table'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-spec-table');
      const cols = p.cols || [], rows = p.rows || [];
      e.style.setProperty('--nc', cols.length);
      const t = el('div', 'tb', `<div class="hr"><span></span>${cols.map((c, j) => `<b class="${j === p.winner ? 'w' : ''}">${esc(c)}</b>`).join('')}</div>` +
        rows.map(r => `<div class="r"><span>${esc(r.t)}</span>${(r.v || []).map((v, j) => `<i class="${j === r.win ? 'win' : ''}">${esc(v)}</i>`).join('')}</div>`).join(''), e);
      const stamp = p.winner != null ? el('div', 'sp', esc(p.winText || '推荐'), e) : null;
      if (stamp) stamp.style.left = `calc(22% + ${(p.winner + 0.5) / cols.length * 78}% )`;
      return { hr: t.querySelector('.hr'), rows: [...t.querySelectorAll('.r')], stamp };
    },
    update(e, lt, p, s) {
      const hq = prog(lt, 0, 0.45); s.hr.style.opacity = clamp(hq * 3).toFixed(3); s.hr.style.transform = `translateY(${lerp(-4, 0, E.outExpo(hq)).toFixed(2)}cqh)`;
      s.rows.forEach((r, i) => { const q = prog(lt, 0.4 + i * 0.4, 0.4); r.style.opacity = clamp(q * 3).toFixed(3); r.style.clipPath = `inset(0 ${((1 - E.outCubic(q)) * 100).toFixed(1)}% 0 0)`;
        r.style.setProperty('--wk', prog(lt, 0.65 + i * 0.4, 0.3).toFixed(3)); });
      if (s.stamp) { const q = prog(lt, 0.6 + s.rows.length * 0.4, 0.35); s.stamp.style.opacity = clamp(q * 4).toFixed(3); s.stamp.style.transform = `translate(-50%, 0) rotate(-12deg) scale(${lerp(2.2, 1, E.outBack(q, 1.6)).toFixed(3)})`; }
    },
    sfx(p) { const n = (p.rows || []).length, o = [{ at: 0, kind: 'card', gain: 0.35 }]; for (let i = 0; i < n; i++) o.push({ at: 0.65 + i * 0.4, kind: 'tick', gain: 0.3 });
      if (p.winner != null) o.push({ at: 0.6 + n * 0.4, kind: 'stamp', gain: 0.6 }); return o; },
  };
})();
