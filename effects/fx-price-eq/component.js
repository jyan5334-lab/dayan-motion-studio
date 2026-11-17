/* 价格等式（fx-price-eq）—— v1.12 补齐分类「03 对比 · 论证」
   什么时候用：算账、拆价格、讲"其实只花了多少"（"¥199 − ¥159 = ¥40"）：两个价格依次弹出，运算符落下，等号后面一张锯齿小票砸下显示结果，下方补一行换算
   字段：a / b 两个数（带单位字符串）；op 运算符（− + × ÷）；result 结果；note 换算说明；hlB 第二个数用高亮色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-price-eq'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-price-eq');
      const row = el('div', 'row', `<b class="a">${esc(p.a || '')}</b><i class="op">${esc(p.op || '−')}</i><b class="b${p.hlB ? ' hl' : ''}">${esc(p.b || '')}</b><i class="eq">=</i>
        <div class="rc"><span>${esc(p.result || '')}</span><u></u></div>`, e);
      const note = el('div', 'nt', esc(p.note || ''), e);
      if (L && L.def) DMS.shake((L.def.at || 0) + 1.2, 7, 0.3);
      return { parts: [...row.children], note };
    },
    update(e, lt, p, s) {
      const ts = [0, 0.3, 0.45, 0.75, 1.0];
      s.parts.forEach((x, i) => { const q = prog(lt, ts[i], i === 4 ? 0.3 : 0.45);
        x.style.opacity = clamp(q * 4).toFixed(3);
        if (i === 4) x.style.transform = `translateY(${lerp(-40, 0, E.inQuad(q)).toFixed(1)}cqh) rotate(${lerp(-12, -3, E.outBack(q)).toFixed(1)}deg) scale(${(1 + (lt > 1.3 ? Math.exp(-(lt - 1.3) * 8) * Math.sin((lt - 1.3) * 26) * 0.05 : 0)).toFixed(4)})`;
        else if (i % 2) x.style.transform = `translateY(${lerp(-6, 0, E.outBack(q, 2)).toFixed(2)}cqh) scale(${lerp(0.4, 1, sp(q)).toFixed(3)})`;
        else x.style.transform = `translateY(${lerp(5, 0, E.outExpo(q)).toFixed(2)}cqh)`; });
      const nq = prog(lt, 1.5, 0.5); s.note.style.opacity = clamp(nq * 2).toFixed(3); s.note.style.transform = `translateY(${lerp(2, 0, E.outExpo(nq)).toFixed(2)}cqh)`;
    },
    sfx() { return [{ at: 0, kind: 'pop', gain: 0.4 }, { at: 0.45, kind: 'pop', gain: 0.4 }, { at: 1.3, kind: 'stamp', gain: 0.6 }, { at: 1.5, kind: 'ding', gain: 0.3 }]; },
  };
})();
