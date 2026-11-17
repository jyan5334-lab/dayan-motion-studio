/* 设置开关（fx-settings-toggle）—— v1.12 补齐分类「09 界面演示」
   什么时候用：讲"只要打开这个选项""这三个设置一定要改"：一个系统设置面板，几行设置项依次出现，开关一个个拨到开（变色），重点那一行高亮并带箭头标注
   字段：title 面板标题；items:[{t 名称, d 说明, on 最终是否打开, key true 为重点}]；note 重点标注文字 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-settings-toggle'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-settings-toggle');
      const w = el('div', 'w', `<div class="ti">${DMS.icon('key')}<b>${esc(p.title || '设置')}</b></div>`, e);
      const rs = (p.items || []).map(o => el('div', 'it' + (o.key ? ' key' : ''), `<div class="tx"><b>${esc(o.t)}</b><small>${esc(o.d || '')}</small></div><i class="sw"><u></u></i>${o.key && p.note ? `<em>${DMS.icon('arrow')}${esc(p.note)}</em>` : ''}`, w));
      return { w, rs };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.w.style.opacity = clamp(q * 3).toFixed(3); s.w.style.transform = `translateX(${lerp(-4, 0, E.outExpo(q)).toFixed(2)}cqw)`;
      const I = p.items || [];
      s.rs.forEach((r, i) => { const a = 0.3 + i * 0.16, q2 = prog(lt, a, 0.4); r.style.opacity = clamp(q2 * 3).toFixed(3); r.style.transform = `translateY(${lerp(3, 0, E.outExpo(q2)).toFixed(2)}cqh)`;
        const t = 0.9 + I.length * 0.16 + i * 0.35, k = I[i].on ? E.outBack(prog(lt, t, 0.3), 1.4) : 0; r.style.setProperty('--k', clamp(k).toFixed(3)); r.querySelector('u').style.transform = `translateX(${(k * 100).toFixed(1)}%)`;
        if (I[i].key) { const h = prog(lt, t + 0.3, 0.4); r.style.setProperty('--h', h.toFixed(3)); const em = r.querySelector('em'); if (em) { em.style.opacity = clamp(h * 3).toFixed(3); em.style.transform = `translateX(${lerp(3, 0, E.outBack(h, 1.4)).toFixed(2)}cqw)`; } } });
    },
    sfx(p) { const I = p.items || []; return [{ at: 0, kind: 'card', gain: 0.3 }].concat(I.map((o, i) => o.on ? { at: 0.9 + I.length * 0.16 + i * 0.35, kind: 'tick-ok', gain: 0.4 } : null).filter(Boolean)); },
  };
})();
