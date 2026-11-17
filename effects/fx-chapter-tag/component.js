/* 章节议程标签（fx-chapter-tag）—— v1.12 补齐分类「06 人物 · 字幕」
   什么时候用：人物全屏讲话时，左上角挂一个双语章节标签和本段议程（"一站式搞定：剪辑 · 自动 / 音效 · 配好 / 封面 · 也出"）：标签胶囊滑入，议程一条条亮起，讲到哪条哪条最亮
   字段：en 英文章节名；cn 中文章节名；items:[{t 中文, en 英文, icon, at 亮起时刻}]；current 当前第几条（默认最后亮起的） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-chapter-tag'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-chapter-tag');
      const hd = el('div', 'hd', `<i></i><div><b>${esc(p.en || '')}</b><span>${esc(p.cn || '')}</span></div>`, e);
      const its = (p.items || []).map(o => el('div', 'it', `<i>${DMS.icon(o.icon || 'check')}</i><div><b>${esc(o.t)}</b><span>${esc(o.en || '')}</span></div>`, e));
      return { hd, its };
    },
    update(e, lt, p, s) {
      e.style.fontSize = Math.min(e.clientWidth * 0.06, e.clientHeight * 0.075).toFixed(1) + 'px';
      const q = prog(lt, 0, 0.5); s.hd.style.opacity = clamp(q * 3).toFixed(3); s.hd.style.clipPath = `inset(0 ${((1 - E.outExpo(q)) * 100).toFixed(1)}% 0 0 round 99px)`;
      const ats = (p.items || []).map((o, i) => o.at == null ? 0.6 + i * 0.8 : o.at);
      let cur = p.current; if (cur == null) { cur = -1; ats.forEach((a, i) => { if (lt >= a) cur = i; }); }
      s.its.forEach((it, i) => { const q2 = prog(lt, ats[i], 0.45); it.style.opacity = (clamp(q2 * 3) * (i === cur ? 1 : 0.55)).toFixed(3);
        it.style.transform = `translateX(${lerp(-1.4, 0, E.outExpo(q2)).toFixed(2)}em)`; it.classList.toggle('on', i === cur); });
    },
    sfx(p) { return [{ at: 0, kind: 'swoosh-soft', gain: 0.3 }].concat((p.items || []).map((o, i) => ({ at: o.at == null ? 0.6 + i * 0.8 : o.at, kind: 'tick', gain: 0.3 }))); },
  };
})();
