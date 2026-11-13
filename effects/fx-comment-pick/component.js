/* 评论区挑选（fx-comment-pick）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：说到评论区告诉我、我挑几条评论来做时：评论区面板，提问置顶，评论逐条滑入，按口播逐条被选中
   标准（SKILL.md「动效不够时」）：画面跟着口播的字走（comments[].at/cue、pickAt/pickCue）、有入场和落定、带音效、
   16:9 / 4:3 / 9:16 都排得下、时间的纯函数；评论是示意（面板角上标"示例"），不冒充真实用户。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HUES = [205, 18, 280, 150, 340, 48];
  const NUM = ['①', '②', '③', '④', '⑤', '⑥'];
  C['fx-comment-pick'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-comment-pick');
      const card = el('div', 'card', `<div class="hd">${DMS.icon('chat')}<b>${esc(p.title || '评论区')}</b>${p.sample === false ? '' : `<span class="smp">${esc(p.sampleLabel || '示例')}</span>`}</div>
        ${p.question ? `<div class="pin"><span class="pl">${esc(p.pinLabel || '置顶提问')}</span><p>${DMS.hl(p.question, p.hl)}</p></div>` : ''}<div class="list"></div>
        <div class="input"><span>${esc(p.placeholder || '说说你的想法…')}</span><i>${DMS.icon('arrow')}</i></div>`, e);
      const list = card.querySelector('.list');
      const rows = (p.comments || []).map((o, i) => {
        const d = typeof o === 'string' ? { t: o } : o;
        const who = d.who || `评论 ${i + 1}`;
        const r = el('div', 'cm', `<i class="av" style="--h:${HUES[i % HUES.length]}">${esc(who.slice(-1))}</i><div class="tx"><em>${esc(who)}</em><p>${DMS.hl(d.t || '', d.hl)}</p></div><span class="pick">${DMS.icon('check')}<b>${esc(p.pickLabel || '选中')}</b></span><span class="no">${NUM[i] || i + 1}</span>`, list);
        return { r, at: d.at == null ? 0.6 + i * 0.35 : d.at, pick: r.querySelector('.pick'), no: r.querySelector('.no') };
      });
      const pickAt = p.pickAt == null ? 2.2 : p.pickAt, st = p.pickStagger == null ? 0.32 : p.pickStagger;
      const picks = (p.picks || rows.map((_, i) => i)).map((ix, j) => ({ R: rows[ix], at: pickAt + j * st, j })).filter(x => x.R);
      return { card, pin: card.querySelector('.pin'), input: card.querySelector('.input'), rows, picks };
    },
    update(e, lt, p, s) {
      const k = prog(lt, 0, 0.7), sp = E.spring(k, 0.6, 10);
      s.card.style.opacity = clamp(k * 2.2).toFixed(3);
      s.card.style.transform = `translateY(${lerp(6, 0, E.outExpo(k))}cqh) scale(${lerp(0.92, 1, sp).toFixed(4)})`;
      s.card.style.filter = `blur(${lerp(10, 0, E.outQuart(k)).toFixed(2)}px)`;
      if (s.pin) { const q = prog(lt, 0.25, 0.5); s.pin.style.opacity = clamp(q * 2.5).toFixed(3); s.pin.style.transform = `translateY(${lerp(20, 0, E.outExpo(q)).toFixed(1)}%)`; }
      s.rows.forEach(x => { const q = prog(lt, x.at, 0.5), sq = E.spring(q, 0.55, 11);
        x.r.style.opacity = clamp(q * 2.5).toFixed(3);
        x.r.style.transform = `translateX(${lerp(8, 0, E.outExpo(q)).toFixed(2)}cqw) scale(${lerp(0.96, 1, sq).toFixed(4)})`; });
      s.picks.forEach(x => { const q = prog(lt, x.at, 0.45), on = lt >= x.at;
        x.R.r.classList.toggle('on', on);
        x.R.pick.style.opacity = (on ? clamp(q * 3) : 0).toFixed(3);
        x.R.pick.style.transform = `scale(${on ? lerp(0.4, 1, E.spring(q, 0.5, 13)).toFixed(4) : 0.4})`;
        x.R.no.style.opacity = (on ? clamp(q * 3) : 0).toFixed(3);
        x.R.r.style.setProperty('--glow', (on ? Math.max(0.35, Math.exp(-(lt - x.at) * 2)) : 0).toFixed(3)); });
      // 没被选中的评论在开始挑之后淡一点，突出选中的
      if (s.picks.length) { const dim = clamp(prog(lt, s.picks[0].at, 0.5)); s.rows.forEach(x => { if (!x.r.classList.contains('on')) x.r.style.opacity = (parseFloat(x.r.style.opacity || 1) * (1 - 0.45 * dim)).toFixed(3); }); }
      const iq = prog(lt, 0.5, 0.5); s.input.style.opacity = clamp(iq * 2).toFixed(3);
    },
    sfx: p => {
      const out = [{ at: 0, kind: 'card', gain: 0.45 }];
      (p.comments || []).forEach((o, i) => out.push({ at: (o && o.at != null) ? o.at : 0.6 + i * 0.35, kind: 'bubble', gain: 0.35 }));
      const pa = p.pickAt == null ? 2.2 : p.pickAt, st = p.pickStagger == null ? 0.32 : p.pickStagger;
      (p.picks || (p.comments || []).map((_, i) => i)).forEach((_, j) => out.push({ at: pa + j * st, kind: 'tick-ok', gain: 0.55 }));
      return out;
    },
  };
})();
