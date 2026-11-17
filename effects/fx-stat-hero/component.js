/* 数据大字（fx-stat-hero）—— v1.12 补齐分类「02 数据 · 报表」
   什么时候用：讲一个亮眼成绩（"累计播放 1260 万+""全网粉丝 30 万"）：大号数字滚到目标值、单位和 + 号弹出，下方说明和一枚次级数据胶囊；可叠第二个数据向上顶出
   字段：stats:[{v 数值, unit 单位（万/亿/%）, plus 是否带 +, label 说明, chip 次级数据}]（第二项起依次替换上一项，旧数据缩小上移）；every 每项间隔；color */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-stat-hero'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-stat-hero'); if (p.color) e.style.setProperty('--sc', p.color);
      const st = (p.stats || []).map(o => { const g = el('div', 'g', `<div class="n"><b>0</b><i>${esc(o.unit || '')}${o.plus ? '+' : ''}</i></div><div class="lb">${esc(o.label || '')}</div>${o.chip ? `<div class="ch">${esc(o.chip)}</div>` : ''}`, e);
        return { g, o, b: g.querySelector('b'), i: g.querySelector('.n i'), lb: g.querySelector('.lb'), ch: g.querySelector('.ch') }; });
      return { st };
    },
    update(e, lt, p, s) {
      const ev = p.every == null ? 2 : p.every;
      s.st.forEach((x, j) => { const t0 = j * ev, q = prog(lt, t0, 1.1), k = E.outExpo(q), nx = j + 1 < s.st.length ? prog(lt, (j + 1) * ev, 0.5) : 0;
        const v = x.o.v, dec = (String(v).split('.')[1] || '').length;
        x.b.textContent = (v * k).toFixed(dec);
        x.g.style.opacity = (lt < t0 ? 0 : clamp(prog(lt, t0, 0.2) * 4) * (1 - nx * 0.55)).toFixed(3);
        x.g.style.transform = `translateY(${(lerp(6, 0, E.outExpo(prog(lt, t0, 0.5))) - E.inOutCubic(nx) * 46).toFixed(2)}cqh) scale(${(1 - E.inOutCubic(nx) * 0.45).toFixed(3)})`;
        const uq = prog(lt, t0 + 0.7, 0.4); x.i.style.transform = `scale(${lerp(0, 1, sp(uq, 0.4, 14)).toFixed(3)})`;
        x.lb.style.opacity = prog(lt, t0 + 0.5, 0.4).toFixed(3);
        if (x.ch) { const cq = prog(lt, t0 + 0.8, 0.4); x.ch.style.opacity = clamp(cq * 3).toFixed(3); x.ch.style.transform = `translateY(${lerp(2, 0, E.outExpo(cq)).toFixed(2)}cqh)`; } });
    },
    sfx(p) { const ev = p.every == null ? 2 : p.every; return (p.stats || []).flatMap((o, j) => [{ at: j * ev, kind: 'roll', gain: 0.4 }, { at: j * ev + 0.7, kind: 'pop-big', gain: 0.45 }]); },
  };
})();
