/* 吊牌标注（fx-tag-callout）—— v1.12 补齐分类「11 浮窗 · 画中画」
   什么时候用：给画面里的某个东西"挂个牌子"（产品名 / 价格 / 型号 / "官方正品"）：一根细线从指定点甩出，一张带打孔和条形码的吊牌晃两下停住
   字段：x, y 挂点（0–1，在框内）；title 主字；sub 副字；price 价格（可选）；code 条码下的编号；side left/right 吊牌朝向 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-tag-callout'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-tag-callout', 's-' + (p.side || 'right'));
      const x = (p.x == null ? 0.2 : p.x) * 100, y = (p.y == null ? 0.2 : p.y) * 100;
      const dot = el('i', 'dt', '', e); dot.style.left = x + '%'; dot.style.top = y + '%';
      let bars = ''; for (let i = 0; i < 38; i++) { const w = [1, 1, 2, 1, 3, 1, 2][(i * 7 + 3) % 7]; bars += `<u style="flex:${w}"></u>${i % 3 ? '' : '<s></s>'}`; }
      const tg = el('div', 'tg', `<i class="hole"></i><div class="bd"><b>${esc(p.title || '')}</b><small>${esc(p.sub || '')}</small>${p.price ? `<em>${esc(p.price)}</em>` : ''}<div class="bc">${bars}</div><code>${esc(p.code || '')}</code></div>`, e);
      tg.style.left = x + '%'; tg.style.top = y + '%';
      const sv = el('div', 'str', '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" d=""/></svg>', e);
      return { tg, path: sv.querySelector('path'), x, y };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0.15, 0.6), sw = Math.sin(lt * 7) * Math.exp(-Math.max(0, lt - 0.4) * 2.6) * 14;
      s.tg.style.opacity = clamp(q * 4).toFixed(3); s.tg.style.transform = `rotate(${(lerp(-60, 0, E.outBack(q, 1.6)) + (q >= 1 ? sw : 0)).toFixed(2)}deg)`;
      s.path.setAttribute('d', `M${s.x} ${s.y} q 0 0 0 0`); s.path.style.strokeDasharray = `${clamp(q * 2).toFixed(3)} 1`;
    },
    sfx() { return [{ at: 0.1, kind: 'whip', gain: 0.35 }, { at: 0.55, kind: 'paper', gain: 0.4 }]; },
  };
})();
