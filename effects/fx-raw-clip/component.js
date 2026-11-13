/* 口播原片（fx-raw-clip）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"一条没剪过的口播原片""满是口误""交给 AI 之前"：灰色的视频文件卡，声波在跳，口误气泡一个个冒出来；
             到 glowAt（被施法 / 交给 AI 的那一刻）整张卡由灰变彩、描边流光、气泡蒸发成火花。
   标准：时间的纯函数（声波高度只由 lt 决定）、有入场和落定、带音效、三种画幅都放得下（卡片按 box 宽高自适应）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NB = 56;
  C['fx-raw-clip'] = {
    enter: 'none',
    build(e, p, L) {
      e.classList.add('fx-raw-clip');
      const card = el('div', 'card', `<div class="rim"></div><div class="thumb"><div class="tint"></div>
          <svg class="who" viewBox="0 0 200 160" preserveAspectRatio="xMidYMax meet"><circle cx="100" cy="62" r="30"/><path d="M38 160 C40 116 66 100 100 100 C134 100 160 116 162 160 Z"/></svg>
          <div class="rec"><i></i>REC</div><div class="dur">${esc(p.dur || '01:30')}</div>
          <div class="play">${DMS.icon('play')}</div><div class="wave"></div></div>
        <div class="foot">${DMS.icon('video')}<b>${esc(p.name || '口播原片.mp4')}</b><span>${esc(p.meta || '未剪辑 · 90 秒')}</span><em class="ok">${esc(p.okText || '已接手')}</em></div>`, e);
      const wave = card.querySelector('.wave'), bars = [];
      for (let i = 0; i < NB; i++) bars.push(el('i', '', '', wave));
      const bubbles = (p.bubbles || [{ t: 'the the 不对' }, { t: '嗯……这个' }, { t: '重来重来' }]).map((o, i) => {
        const d = typeof o === 'string' ? { t: o } : o;
        const pos = d.pos || [[0.02, 0.06], [0.64, 0.02], [0.34, -0.08]][i % 3];
        const b = el('div', 'bub', `<span>${esc(d.t)}</span>`, e);
        b.style.left = (pos[0] * 100) + '%'; b.style.top = (pos[1] * 100) + '%';
        return { el: b, at: d.at == null ? 0.6 + i * 0.6 : d.at, rot: [-6, 5, -3][i % 3] };
      });
      const sparks = [];
      for (let i = 0; i < 18; i++) sparks.push(el('i', 'spk', '', e));
      return { card, bars, bubbles, sparks, rim: card.querySelector('.rim'), tint: card.querySelector('.tint'), ok: card.querySelector('.ok') };
    },
    update(e, lt, p, s) {
      const ga = p.glowAt == null ? 3.2 : p.glowAt, ca = p.chargeAt == null ? ga - 0.7 : p.chargeAt;
      const k = prog(lt, 0, 0.8);
      const g = E.outCubic(prog(lt, ga, 0.7));                      // 由灰变彩
      const ch = lt >= ca && lt < ga ? prog(lt, ca, ga - ca) : 0;     // 蓄力：轻微抖动 + 橙色描边渐强
      const jx = ch ? Math.sin(lt * 71) * ch * 0.35 : 0, jy = ch ? Math.cos(lt * 63) * ch * 0.3 : 0;
      const pop = lt >= ga ? E.spring(prog(lt, ga, 0.6), 0.35, 14) : 0;
      const sc = lerp(0.94, 1, E.outExpo(k)) * (1 + (lt >= ga ? Math.sin(Math.min(1, (lt - ga) / 0.5) * Math.PI) * 0.045 : 0));
      s.card.style.opacity = clamp(k * 1.6).toFixed(3);
      s.card.style.transform = `translate(${jx.toFixed(2)}cqmin, ${(lerp(3, 0, E.outExpo(k)) + jy).toFixed(2)}cqmin) scale(${sc.toFixed(4)})`;
      s.card.style.filter = `grayscale(${(1 - g).toFixed(3)}) brightness(${lerp(0.82, 1, g).toFixed(3)})`;
      s.card.style.setProperty('--glow', (g * 0.9 + ch * 0.5).toFixed(3));
      s.tint.style.opacity = g.toFixed(3);
      s.rim.style.setProperty('--ang', ((lt - ga) * 160).toFixed(1) + 'deg');
      s.rim.style.opacity = Math.max(ch * 0.7, g).toFixed(3);
      s.ok.style.opacity = clamp((lt - ga - 0.35) * 4).toFixed(3);
      s.ok.style.transform = `scale(${lerp(0.6, 1, E.spring(prog(lt, ga + 0.35, 0.5), 0.5, 12)).toFixed(3)})`;
      // 声波：灰的时候乱跳（口误），变彩后变得规整、有节奏
      for (let i = 0; i < NB; i++) {
        const raw = 0.22 + 0.78 * Math.abs(Math.sin(i * 1.73 + lt * 7.3) * Math.sin(i * 0.37 + lt * 3.1 + 1.1));
        const tidy = 0.3 + 0.55 * Math.pow(Math.abs(Math.sin(i * 0.21 + lt * 4.2)), 1.6);
        const h = lerp(raw, tidy, g) * clamp((lt - 0.15) * 3);
        s.bars[i].style.transform = `scaleY(${h.toFixed(3)})`;
      }
      s.bubbles.forEach((b, i) => {
        const q = prog(lt, b.at, 0.45), sp = E.spring(q, 0.45, 13);
        const gone = lt >= ga ? E.inCubic(prog(lt, ga + i * 0.06, 0.32)) : 0;
        const wob = Math.sin(lt * 5 + i * 2) * 1.6;
        b.el.style.opacity = (lt < b.at ? 0 : clamp(q * 3) * (1 - gone)).toFixed(3);
        b.el.style.transform = `translateY(${(lerp(2.5, 0, E.outCubic(q)) - gone * 3).toFixed(2)}cqmin) rotate(${(b.rot + wob * (1 - gone)).toFixed(2)}deg) scale(${(lerp(0.4, 1, sp) * (1 - gone * 0.6)).toFixed(4)})`;
      });
      // 火花：气泡蒸发、文件被点亮时向四周散开
      s.sparks.forEach((sp, i) => {
        const a = i / s.sparks.length * Math.PI * 2 + 0.3, q = prog(lt, ga + (i % 3) * 0.04, 0.75);
        const r = lerp(8, 44 + (i % 4) * 6, E.outCubic(q));
        sp.style.opacity = (q > 0 && q < 1 ? (1 - q) : 0).toFixed(3);
        sp.style.transform = `translate(${(Math.cos(a) * r * 1.35).toFixed(2)}cqmin, ${(Math.sin(a) * r * 0.8).toFixed(2)}cqmin) scale(${lerp(1.3, 0.3, q).toFixed(3)})`;
      });
      void pop;
    },
    sfx(p) {
      const ga = p.glowAt == null ? 3.2 : p.glowAt;
      const out = [{ at: 0, kind: 'card', gain: 0.35 }];
      (p.bubbles || [0, 1, 2]).forEach((o, i) => out.push({ at: (o && o.at != null) ? o.at : 0.6 + i * 0.6, kind: 'bubble', gain: 0.5 }));
      out.push({ at: ga, kind: 'zap', gain: 0.55 }, { at: ga + 0.05, kind: 'confetti', gain: 0.3 }, { at: ga + 0.35, kind: 'tick-ok', gain: 0.4 });
      return out;
    },
  };
})();
