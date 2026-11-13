/* 分镜翻牌（fx-storyboard）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"说到什么，画面就出什么""口播里的词变成分镜""语义 → 画面"：几张字卡排成一排，念到哪个词，
             那张字卡就翻过来变成一格分镜，分镜里立刻演对应的画面（steps 步骤条依次点亮 / number 数字滚动 / compare 前后对比滑块 / check 清单打勾）。
   标准：时间的纯函数、翻牌有透视和回弹、每格自带音效、按 box 自适应（竖屏自动竖排）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FLIP = 0.62;
  function body(it, host) {
    const k = it.kind || 'steps';
    if (k === 'steps') {
      const st = it.steps || ['01', '02', '03'];
      host.innerHTML = `<div class="steps">${st.map((s, i) => `<div class="nd"><i>${i + 1}</i><span>${esc(s)}</span></div>${i < st.length - 1 ? '<b class="ln"><u></u></b>' : ''}`).join('')}</div>`;
      return { nds: [...host.querySelectorAll('.nd')], lns: [...host.querySelectorAll('.ln u')] };
    }
    if (k === 'number') {
      host.innerHTML = `<div class="num"><b>0</b><span>${esc(it.unit || '')}</span></div><div class="nlab">${esc(it.sub || '')}</div>`;
      return { b: host.querySelector('.num b') };
    }
    if (k === 'compare') {
      host.innerHTML = `<div class="cmp"><div class="a"><small>${esc(it.before || '以前')}</small><b>${esc(it.beforeT || '手动剪')}</b></div><div class="z"><small>${esc(it.after || '现在')}</small><b>${esc(it.afterT || 'AI 自己剪')}</b></div><i class="bar"></i></div>`;
      return { z: host.querySelector('.z'), bar: host.querySelector('.bar') };
    }
    host.innerHTML = `<div class="chk">${(it.items || ['字幕', '音效', '转场']).map(t => `<div><i>${DMS.icon('check')}</i><span>${esc(t)}</span></div>`).join('')}</div>`;
    return { rows: [...host.querySelectorAll('.chk > div')] };
  }
  function play(it, S, u) {   // u = 翻完后经过的秒数
    const k = it.kind || 'steps';
    if (k === 'steps') {
      S.nds.forEach((n, i) => { const q = prog(u, 0.1 + i * 0.32, 0.3); n.style.setProperty('--on', q.toFixed(3)); n.style.transform = `scale(${lerp(0.85, 1, E.spring(q, 0.45, 13)).toFixed(3)})`; });
      S.lns.forEach((l, i) => { l.style.transform = `scaleX(${E.outCubic(prog(u, 0.25 + i * 0.32, 0.25)).toFixed(3)})`; });
    } else if (k === 'number') {
      const v = it.value == null ? 129 : it.value, q = E.outExpo(prog(u, 0.05, 0.9));
      S.b.textContent = String(Math.round(v * q));
      S.b.style.transform = `translateY(${lerp(0.25, 0, E.outCubic(prog(u, 0, 0.4))).toFixed(3)}em)`;
    } else if (k === 'compare') {
      const q = E.inOutCubic(prog(u, 0.2, 0.75));
      S.z.style.clipPath = `inset(0 0 0 ${((1 - q) * 100).toFixed(2)}%)`;
      S.bar.style.left = ((1 - q) * 100).toFixed(2) + '%';
      S.bar.style.opacity = (q > 0 && q < 1 ? 1 : 0).toFixed(3);
    } else {
      S.rows.forEach((r, i) => r.style.setProperty('--on', prog(u, 0.1 + i * 0.25, 0.25).toFixed(3)));
    }
  }
  C['fx-storyboard'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-storyboard');
      const items = (p.items || []).map((o, i) => {
        const slot = el('div', 'slot', '', e);
        const card = el('div', 'flip', `<div class="front"><div class="chip"><b>${esc(o.key)}</b><small>${esc(o.tc || '')}</small></div></div>
          <div class="back"><div class="hd"><span class="no">镜 ${String(o.no || i + 1).padStart(2, '0')}</span><span class="say">念到「<em>${esc(o.key)}</em>」</span></div><div class="bd"></div><div class="ft">${esc(o.label || '')}</div></div>`, slot);
        const S = body(o, card.querySelector('.bd'));
        return { o, slot, card, S, at: o.at == null ? 0.8 + i * 1.1 : o.at, inAt: o.inAt == null ? i * 0.1 : o.inAt };
      });
      return { items };
    },
    update(e, lt, p, s) {
      const n = s.items.length;
      const wide = e.clientWidth >= e.clientHeight * 1.2;
      s.items.forEach((it, i) => {
        const q = prog(lt, it.inAt, 0.5), sp = E.spring(q, 0.5, 12);
        const f = prog(lt, it.at, FLIP), fk = E.inOutCubic(f), fs = f >= 1 ? 1 : 0;
        const gap = 3;
        if (wide) { const w = (100 - gap * (n - 1)) / n; it.slot.style.cssText = `left:${(i * (w + gap)).toFixed(2)}%;top:0;width:${w.toFixed(2)}%;height:100%`; }
        else { const h = (100 - gap * (n - 1)) / n; it.slot.style.cssText = `left:0;top:${(i * (h + gap)).toFixed(2)}%;width:100%;height:${h.toFixed(2)}%`; }
        it.slot.style.opacity = clamp(q * 3).toFixed(3);
        const bump = Math.sin(fk * Math.PI) * 0.08;
        it.card.style.transform = `translateY(${lerp(5, 0, E.outExpo(q)).toFixed(2)}cqmin) rotateY(${(fk * 180).toFixed(2)}deg) scale(${(lerp(0.6, 1, sp) * (1 + bump)).toFixed(4)})`;
        it.card.style.setProperty('--lit', (f > 0 ? clamp(1 - (lt - it.at - FLIP) * 1.4) : 0).toFixed(3));
        void fs;
        play(it.o, it.S, lt - it.at - FLIP * 0.7);
      });
    },
    sfx(p) {
      const out = [];
      (p.items || []).forEach((o, i) => {
        const at = o.at == null ? 0.8 + i * 1.1 : o.at;
        out.push({ at: o.inAt == null ? i * 0.1 : o.inAt, kind: 'pop-soft', gain: 0.3 }, { at, kind: 'card', gain: 0.55 }, { at: at + FLIP * 0.6, kind: 'paper', gain: 0.35 });
        const k = o.kind || 'steps';
        if (k === 'number') out.push({ at: at + 0.45, kind: 'roll', gain: 0.4 });
        else if (k === 'compare') out.push({ at: at + 0.65, kind: 'swoosh-soft', gain: 0.4 });
        else out.push({ at: at + 0.55, kind: 'tick', gain: 0.3 }, { at: at + 0.87, kind: 'tick', gain: 0.3 }, { at: at + 1.19, kind: 'tick-ok', gain: 0.35 });
      });
      return out;
    },
  };
})();
