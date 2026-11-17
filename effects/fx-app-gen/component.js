/* AI 生成面板（fx-app-gen）—— v1.12 补齐分类「09 界面演示」
   什么时候用：演示"输入一句话 → AI 生成结果"：一个工具面板里提示词逐字打出，光标点"生成"，进度条跑满，结果格子依次翻出（放真实生成截图）
   字段：app 工具名；prompt 提示词；btn 按钮字；results:[真实结果截图…]（1–4 张，没有就占位）；genAt 点击时刻；genDur 生成时长 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  /* 真实截图槽：有 img 就放真实截图；没有就显示"待放真实截图"占位，绝不生成假界面图 */
  const CUR = '<svg class="cur" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.6 L11.5 14 L18 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const IMGSLOT = (src, cls, label) => src ? `<div class="${cls} im"><img src="${esc(src)}"></div>` : `<div class="${cls} ph"><span>${esc(label || '待放真实截图')}</span></div>`;

  C['fx-app-gen'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-app-gen');
      const rs = (p.results && p.results.length ? p.results : ['']).slice(0, 4);
      const w = el('div', 'w', `<div class="hd"><i></i><i></i><i></i><b>${esc(p.app || 'AI 工具')}</b></div>
        <div class="ip"><span class="tx"></span><i class="cr"></i><b class="bt">${DMS.icon('spark')}${esc(p.btn || '生成')}</b></div>
        <div class="pg"><i></i><span>0%</span></div>
        <div class="rs n${rs.length}">${rs.map(s => `<div class="r">${IMGSLOT(s, 'pic', '真实生成结果')}</div>`).join('')}</div>${CUR}`, e);
      return { w, tx: w.querySelector('.tx'), cr: w.querySelector('.cr'), bt: w.querySelector('.bt'), pg: w.querySelector('.pg'), pb: w.querySelector('.pg i'), pn: w.querySelector('.pg span'), rs: [...w.querySelectorAll('.r')], cur: w.querySelector('.cur') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.w.style.opacity = clamp(q * 3).toFixed(3); s.w.style.transform = `translateY(${lerp(6, 0, E.outExpo(q)).toFixed(2)}cqh) scale(${lerp(0.94, 1, E.outExpo(q)).toFixed(3)})`;
      const ga = p.genAt == null ? 1.9 : p.genAt, gd = p.genDur || 1.2, t = [...String(p.prompt || '')];
      s.tx.textContent = t.slice(0, Math.floor(clamp((lt - 0.3) / Math.max(0.3, ga - 0.9)) * t.length)).join('');
      s.cr.style.opacity = lt < ga && Math.floor(lt * 2.5) % 2 === 0 ? 1 : 0;
      const mv = E.inOutCubic(prog(lt, ga - 0.6, 0.55)); s.cur.style.opacity = lt > ga - 0.7 && lt < ga + 0.8 ? 1 : 0;
      s.cur.style.left = `${lerp(70, 88, mv).toFixed(2)}%`; s.cur.style.top = `${lerp(60, 17, mv).toFixed(2)}%`;
      s.bt.style.transform = `scale(${lt > ga && lt < ga + 0.14 ? 0.9 : 1})`;
      const g = prog(lt, ga + 0.1, gd); s.pg.style.opacity = g > 0 ? 1 : 0.25; s.pb.style.width = (E.inOutCubic(g) * 100).toFixed(1) + '%'; s.pn.textContent = Math.round(E.inOutCubic(g) * 100) + '%';
      s.rs.forEach((r, i) => { const q2 = prog(lt, ga + 0.1 + gd + i * 0.14, 0.45); r.style.opacity = (0.15 + 0.85 * clamp(q2 * 2)).toFixed(3); r.style.transform = `rotateY(${lerp(90, 0, E.outBack(q2, 1.2)).toFixed(1)}deg)`; r.style.filter = q2 >= 1 ? '' : `blur(${lerp(8, 0, q2).toFixed(1)}px)`; });
    },
    sfx(p) { const ga = p.genAt == null ? 1.9 : p.genAt, gd = p.genDur || 1.2, n = Math.min(4, (p.results || ['']).length || 1);
      return [{ at: 0, kind: 'card', gain: 0.35 }, { at: 0.3, kind: 'typing', gain: 0.3 }, { at: ga, kind: 'click', gain: 0.5 }, { at: ga + 0.1, kind: 'roll', gain: 0.25 }]
        .concat(Array.from({ length: n }, (_, i) => ({ at: ga + 0.1 + gd + i * 0.14, kind: 'pop', gain: 0.35 }))).concat([{ at: ga + 0.1 + gd + n * 0.14, kind: 'success', gain: 0.35 }]); },
  };
})();
