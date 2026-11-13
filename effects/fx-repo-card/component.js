/* 开源仓库卡（fx-repo-card）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：说到开源、放到 GitHub/代码仓库、免费给大家用时：代码仓库卡片浮起，文件列表逐行出现，开源印章盖下
   标准（SKILL.md「动效不够时」）：画面跟着口播的字走（stampAt/stampCue、tags[].at/cue）、有入场和落定、带音效、
   16:9 / 4:3 / 9:16 都排得下、时间的纯函数；不画任何平台的商标，不编星标数。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF_FILES = [{ t: 'SKILL.md', d: '技能说明' }, { t: 'engine/', d: '动画引擎', dir: 1 }, { t: 'effects/', d: '动效库', dir: 1 }, { t: 'scripts/', d: '剪辑命令', dir: 1 }, { t: 'README.md', d: '使用文档' }];
  C['fx-repo-card'] = {
    enter: 'none',
    build(e, p, ctx, inst) {
      e.classList.add('fx-repo-card');
      if (p.stamp !== false && ctx && ctx.shake && inst) ctx.shake((inst.at || 0) + (p.stampAt == null ? 1.6 : p.stampAt) + 0.19, 8);
      const card = el('div', 'card', `<div class="hd">${DMS.icon('code')}<span class="nm"><em>${esc(p.owner || 'you')}</em> / <b>${esc(p.name || 'my-skill')}</b></span><span class="pub">${esc(p.visibility || 'Public')}</span></div>
        <div class="ds">${DMS.hl(p.desc || '', p.hl)}</div><div class="tags"></div><div class="files"></div>`, e);
      const tagsEl = card.querySelector('.tags'), filesEl = card.querySelector('.files');
      const tags = (p.tags || ['开源', '免费']).map((o, i) => { const d = typeof o === 'string' ? { t: o } : o; return { d, el: el('span', 'tag', esc(d.t), tagsEl), at: d.at == null ? 0.5 + i * 0.15 : d.at }; });
      const files = (p.files || DEF_FILES).map((o, i) => { const d = typeof o === 'string' ? { t: o } : o;
        return { el: el('div', 'f' + (d.dir || /\/$/.test(d.t) ? ' dir' : ''), `${DMS.icon(d.dir || /\/$/.test(d.t) ? 'folder' : 'doc')}<b>${esc(d.t)}</b><span>${esc(d.d || '')}</span>`, filesEl), at: d.at == null ? 0.55 + i * 0.12 : d.at }; });
      const stamp = p.stamp === false ? null : el('div', 'stamp', `<span>${esc((p.stamp && p.stamp.t) || '开源')}</span><small>${esc((p.stamp && p.stamp.sub) || 'OPEN SOURCE')}</small>`, e);
      return { card, tags, files, stamp };
    },
    update(e, lt, p, s) {
      const k = prog(lt, 0, 0.7), sp = E.spring(k, 0.6, 10);
      s.card.style.opacity = clamp(k * 2.2).toFixed(3);
      s.card.style.transform = `translateY(${lerp(6, 0, E.outExpo(k))}cqh) rotateX(${lerp(14, 0, E.outExpo(k)).toFixed(2)}deg) scale(${lerp(0.92, 1, sp).toFixed(4)})`;
      s.card.style.filter = `blur(${lerp(10, 0, E.outQuart(k)).toFixed(2)}px)`;
      s.tags.forEach(x => { const q = prog(lt, x.at, 0.45), sq = E.spring(q, 0.5, 12);
        x.el.style.opacity = clamp(q * 3).toFixed(3); x.el.style.transform = `scale(${lerp(0.5, 1, sq).toFixed(4)})`; });
      s.files.forEach(x => { const q = prog(lt, x.at, 0.45);
        x.el.style.opacity = clamp(q * 2.5).toFixed(3); x.el.style.transform = `translateX(${lerp(-4, 0, E.outExpo(q)).toFixed(2)}cqw)`; });
      if (s.stamp) {
        const sa = p.stampAt == null ? 1.6 : p.stampAt, q = prog(lt, sa, 0.42);
        const sc = lt < sa ? 2.6 : q < 0.45 ? lerp(2.6, 0.92, E.inCubic(q / 0.45)) : lerp(0.92, 1, E.spring((q - 0.45) / 0.55, 0.5, 14));
        s.stamp.style.opacity = (lt < sa ? 0 : clamp(q * 4)).toFixed(3);
        s.stamp.style.transform = `translate(-50%, -50%) rotate(-12deg) scale(${sc.toFixed(4)})`;
        s.stamp.style.setProperty('--ring', (lt >= sa + 0.19 ? clamp((lt - sa - 0.19) / 0.5) : 0).toFixed(3));
      }
    },
    sfx: p => { const sa = p.stampAt == null ? 1.6 : p.stampAt; const out = [{ at: 0, kind: 'card', gain: 0.45 }, { at: 0.55, kind: 'tick', gain: 0.25 }];
      if (p.stamp !== false) out.push({ at: sa + 0.19, kind: 'stamp', gain: 0.75 });
      return out; },
  };
})();
