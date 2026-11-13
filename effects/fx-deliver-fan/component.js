/* 交付文件发牌（fx-deliver-fan）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"交付什么""不只成片，工程也给你""导出字幕 / 分轨 / 工程文件"：一叠牌放在中间，交付的文件一张张发出去，
             沿弧线飞到扇形位置落定（每张牌是一种文件：格式色标 + 名称 + 说明），最后挑起其中一张、打上标签。
   标准：时间的纯函数、发牌有弧线和落定、每张牌带发牌声、按 box 自适应（竖屏扇形收窄、牌变小）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF = [{ fmt: 'MP4', t: '成片', d: '60 帧 · 带字幕', c: '#FF8A2A' }, { fmt: 'XML', t: 'Premiere / 达芬奇', d: '每段带标记点', c: '#8E7CFF' },
    { fmt: '剪映', t: '剪映工程', d: '导入就能改', c: '#2CE0C0' }, { fmt: 'SRT', t: '字幕', d: 'SRT + ASS', c: '#FFC24B' },
    { fmt: 'WAV', t: '分轨', d: '人声 / 音效 / 配乐', c: '#4DA3FF' }, { fmt: 'HTML', t: '动画工程', d: '能拖动预览', c: '#FF5C7A' }];
  C['fx-deliver-fan'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-deliver-fan');
      const its = (p.items || DEF).map((d, i) => {
        const c = el('div', 'cd', `<div class="in" style="--c:${d.c || '#FF8A2A'}"><div class="fm">${esc(d.fmt)}</div><div class="ic">${DMS.icon(d.icon || 'doc')}</div><b>${esc(d.t)}</b><span>${esc(d.d || '')}</span><i class="pin">${esc(p.pickText || '可继续编辑')}</i></div>`, e);
        return { d, c, at: d.at == null ? 0.35 + i * 0.22 : d.at };
      });
      for (let i = 0; i < 3; i++) el('div', 'deck', '', e).style.setProperty('--k', i);
      return { its, decks: [...e.querySelectorAll('.deck')] };
    },
    update(e, lt, p, s) {
      const W = e.clientWidth || 1, H = e.clientHeight || 1, n = s.its.length;
      const tall = H > W * 1.05;
      const ch = Math.min(H * (tall ? 0.42 : 0.62), W * (tall ? 0.4 : 0.22)), cw = ch * 0.7;
      const spread = tall ? 64 : 70; let R = tall ? H * 1.1 : H * 1.9;
      R = Math.min(R, (W / 2 - cw * 0.62) / Math.sin(spread / 2 * Math.PI / 180));
      const pivX = W / 2, pivY = H * (tall ? 0.42 : 0.36) + R;          // 扇形的圆心在画面下方
      const deckX = W / 2, deckY = H - ch * 0.08;
      const pk = p.pick == null ? -1 : p.pick, pa = p.pickAt == null ? (s.its.length ? s.its[n - 1].at + 0.6 : 1) : p.pickAt;
      const pq = E.spring(prog(lt, pa, 0.55), 0.5, 11);
      s.its.forEach((it, i) => {
        const ang = n === 1 ? 0 : -spread / 2 + spread * i / (n - 1), a = ang * Math.PI / 180;
        const tx = pivX + Math.sin(a) * R, ty = pivY - Math.cos(a) * R;
        const q = prog(lt, it.at, 0.5), k = E.outCubic(q);
        const x = lerp(deckX, tx, k), y = lerp(deckY, ty, k) - Math.sin(q * Math.PI) * H * 0.12;
        let rot = lerp(-4, ang, E.outBack(q, 1.2)), sc = lerp(0.86, 1, k), lift = 0;
        if (i === pk) { lift = pq; sc *= 1 + pq * 0.12; }
        const ly = -lift * ch * 0.14;
        it.c.style.width = cw.toFixed(1) + 'px'; it.c.style.height = ch.toFixed(1) + 'px';
        it.c.style.fontSize = (ch * 0.075).toFixed(1) + 'px';
        it.c.style.opacity = (lt < it.at ? 0 : 1).toFixed(3);
        it.c.style.zIndex = String(i === pk && lift > 0 ? 50 : 10 + i);
        it.c.style.transform = `translate(${(x - cw / 2).toFixed(1)}px, ${(y - ch / 2 + ly).toFixed(1)}px) rotate(${(rot * (1 - lift * 0.6)).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        it.c.style.setProperty('--pin', i === pk ? clamp(lift * 2).toFixed(3) : '0');
        it.c.style.setProperty('--sh', (q > 0 && q < 1 ? 1 : 0.5 + lift * 0.5).toFixed(3));
      });
      const left = s.its.filter(it => lt < it.at).length, dk = E.outExpo(prog(lt, 0, 0.4));
      s.decks.forEach((d, i) => {
        d.style.width = cw.toFixed(1) + 'px'; d.style.height = ch.toFixed(1) + 'px';
        const vis = i < Math.min(3, left) ? 1 : 0;
        d.style.opacity = (vis * dk).toFixed(3);
        d.style.transform = `translate(${(deckX - cw / 2 + i * 3).toFixed(1)}px, ${(deckY - ch / 2 - i * 4 + lerp(30, 0, dk)).toFixed(1)}px) rotate(-4deg) scale(0.86)`;
      });
    },
    sfx(p) {
      const its = p.items || DEF, out = [{ at: 0, kind: 'stack', gain: 0.35 }];
      its.forEach((d, i) => out.push({ at: d.at == null ? 0.35 + i * 0.22 : d.at, kind: 'card', gain: 0.5 }));
      if (p.pick != null) { const n = its.length, last = its[n - 1].at == null ? 0.35 + (n - 1) * 0.22 : its[n - 1].at; out.push({ at: p.pickAt == null ? last + 0.6 : p.pickAt, kind: 'pop-big', gain: 0.45 }); }
      return out;
    },
  };
})();
