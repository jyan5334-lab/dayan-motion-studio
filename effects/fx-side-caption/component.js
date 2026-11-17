/* 人物旁标题（fx-side-caption）—— v1.12 补齐分类「06 人物 · 字幕」
   什么时候用：人物全屏说话时，在人物空出来的一侧压两行标题点题（"工具比人 / 还勤快"），第二行高亮；可配 layer.front 放在人物前面，或不加让它在人物身后
   字段：lines:[{t, hl}]；en 英文小字；align left/right；tone 高亮色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-side-caption'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-side-caption'); if (p.align === 'right') e.classList.add('r'); if (p.tone) e.style.setProperty('--tc', p.tone);
      const ls = (p.lines || []).map(o => el('div', 'ln' + (o.hl ? ' hl' : ''), esc(o.t), e));
      const en = p.en ? el('div', 'en', esc(p.en), e) : null;
      return { ls, en };
    },
    update(e, lt, p, s) {
      e.style.fontSize = Math.min(e.clientHeight / Math.max(2.6, s.ls.length * 1.25 + 0.5), e.clientWidth / 6.5).toFixed(1) + 'px';
      s.ls.forEach((l, i) => { const q = prog(lt, i * 0.18, 0.5); l.style.opacity = clamp(q * 3).toFixed(3);
        l.style.transform = `translateY(${lerp(0.4, 0, E.outExpo(q)).toFixed(3)}em)`; l.style.clipPath = `inset(${((1 - E.outExpo(q)) * 100).toFixed(1)}% 0 0 0)`; });
      if (s.en) { const q = prog(lt, 0.5, 0.5); s.en.style.opacity = (0.75 * clamp(q * 2)).toFixed(3); s.en.style.letterSpacing = lerp(0.5, 0.24, E.outExpo(q)).toFixed(3) + 'em'; }
    },
    sfx() { return [{ at: 0, kind: 'swoosh-soft', gain: 0.3 }, { at: 0.18, kind: 'pop-soft', gain: 0.3 }]; },
  };
})();
