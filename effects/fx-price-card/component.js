/* 会员卡价签（fx-price-card）—— v1.12 补齐分类「02 数据 · 报表」
   什么时候用：讲价格、套餐、会员、积分（"送一张 99 块的会员卡""500 积分"）：一张实体感的会员卡带厚度和高光翻转落定，数字滚动，侧边挂一枚带条形码的吊牌晃动
   字段：title 卡名；value 大数；unit 单位（积分/次/天）；price 价格；brand 卡面小字；tag 吊牌文字；color 卡色 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-price-card'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-price-card'); if (p.color) e.style.setProperty('--cc', p.color);
      const card = el('div', 'cd', `<div class="hd">${DMS.icon('star')}<span>${esc(p.title || '会员月卡')}</span></div><div class="v"><b>0</b><i>${esc(p.unit || '')}</i></div>
        <div class="ft"><small>${esc(p.brand || '')}</small><em>${esc(p.price || '')}</em></div><span class="gl"></span>`, e);
      const tag = el('div', 'tg', `<svg class="str" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 4 C30 40 60 36 100 20"/></svg><div class="tb"><i></i><div class="bc">${Array.from({ length: 22 }, (_, i) => `<u style="width:${1 + (i * 7 % 4)}px"></u>`).join('')}</div><span>${esc(p.tag || '')}</span></div>`, e);
      return { card, b: card.querySelector('.v b'), gl: card.querySelector('.gl'), tag, tb: tag.querySelector('.tb') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.75), k = E.outBack(q, 1.3);
      s.card.style.opacity = clamp(q * 4).toFixed(3);
      s.card.style.transform = `perspective(1400px) rotateX(${lerp(55, 8, k).toFixed(1)}deg) rotateZ(${lerp(-18, -4, k).toFixed(1)}deg) translateY(${lerp(-20, 0, E.outExpo(q)).toFixed(1)}cqh)`;
      s.b.textContent = Math.round((p.value || 0) * E.outExpo(prog(lt, 0.35, 1))).toString();
      const g = prog(lt, 0.9, 0.8); s.gl.style.transform = `translateX(${lerp(-120, 220, E.inOutCubic(g)).toFixed(1)}%) skewX(-20deg)`;
      const tq = prog(lt, 0.6, 0.6), u = Math.max(0, lt - 0.6);
      s.tag.style.opacity = clamp(tq * 3).toFixed(3);
      s.tb.style.transform = `rotate(${(lerp(-40, 0, E.outCubic(tq)) + Math.sin(u * 4.5) * 9 * Math.exp(-u * 0.9)).toFixed(2)}deg)`;
    },
    sfx() { return [{ at: 0.05, kind: 'card', gain: 0.5 }, { at: 0.55, kind: 'thud', gain: 0.4 }, { at: 0.35, kind: 'roll', gain: 0.3 }, { at: 0.65, kind: 'paper', gain: 0.35 }]; },
  };
})();
