/* 剪辑工程时间线（fx-editor-timeline）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：说到工程文件、导进剪映/PR、还能改字幕改音乐时：一个剪辑软件时间线窗口，多轨素材排好，播放头走动，按口播逐个改动片段
   标准（SKILL.md「动效不够时」）：画面跟着口播的字走（edits[].at/cue 相对本层）、有入场和落定的质感、带音效、
   16:9 / 4:3 / 9:16 都排得下（尺寸用 cqw/cqh，不写死像素）、时间的纯函数（只用 lt/t，不用真实时间和 Math.random）、不出现任何人的品牌。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF_TRACKS = [
    { name: '画面', icon: 'video', tone: 'v', clips: [{ x: 0, w: 0.46, t: '口播 01' }, { x: 0.465, w: 0.535, t: '口播 02' }] },
    { name: '动效', icon: 'spark', tone: 'fx', clips: [{ x: 0.04, w: 0.12, t: '标题' }, { x: 0.2, w: 0.16, t: '数字' }, { x: 0.42, w: 0.14, t: '对比' }, { x: 0.62, w: 0.18, t: '流程' }, { x: 0.84, w: 0.13, t: '聊天' }] },
    { name: '字幕', icon: 'doc', tone: 'sub', clips: [{ x: 0, w: 0.2, t: '没错' }, { x: 0.205, w: 0.26, t: '全是 AI 做的' }, { x: 0.47, w: 0.25, t: '只说了一句' }, { x: 0.725, w: 0.275, t: '帮我剪辑好' }] },
    { name: '音效', icon: 'bolt', tone: 'sfx', clips: [{ x: 0.05, w: 0.03 }, { x: 0.21, w: 0.03 }, { x: 0.43, w: 0.03 }, { x: 0.63, w: 0.03 }, { x: 0.85, w: 0.03 }] },
    { name: '配乐', icon: 'mic', tone: 'bgm', clips: [{ x: 0, w: 1, t: '背景音乐 A', wave: 1 }] },
  ];
  function cueAt(o, i) { return o.at == null ? 1.6 + i * 1.1 : o.at; }
  C['fx-editor-timeline'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-editor-timeline');
      const tracks = p.tracks || DEF_TRACKS;
      const win = el('div', 'win', `<div class="bar"><i></i><i></i><i></i><span class="tt">${esc(p.title || '工程文件 · 可继续编辑')}</span>${p.tag ? `<span class="tg">${esc(p.tag)}</span>` : ''}</div>`, e);
      const mon = el('div', 'mon', `<div class="scr"><span class="who"></span><span class="cap">${esc(p.caption || '')}</span></div><div class="meta"><b>${esc(p.monTitle || '预览')}</b><span class="tc">00:00:00</span></div>`, win);
      const tl = el('div', 'tl', '', win);
      const ruler = el('div', 'ruler', Array.from({ length: 11 }, (_, i) => `<i style="left:${i * 10}%"><em>${String(i * 3).padStart(2, '0')}s</em></i>`).join(''), tl);
      const rows = tracks.map((tr, ti) => {
        const r = el('div', `row t-${tr.tone || 'v'}`, `<span class="hd">${DMS.icon(tr.icon || 'layers')}<b>${esc(tr.name)}</b></span><div class="lane"></div>`, tl);
        const lane = r.querySelector('.lane');
        const clips = (tr.clips || []).map((c, ci) => {
          const d = el('div', 'clip' + (c.wave ? ' wave' : '') + (c.t ? '' : ' dot'), `<span class="a">${esc(c.t || '')}</span><span class="b"></span>`, lane);
          d.style.left = (c.x * 100) + '%'; d.style.width = (c.w * 100) + '%';
          return { d, c, a: d.querySelector('.a'), b: d.querySelector('.b'), ti, ci };
        });
        return { r, lane, clips };
      });
      const head = el('div', 'head', '<i></i>', tl);
      const cur = el('div', 'cursor', '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.4-3.4-7.4L4 18z"/></svg>', tl);
      const edits = (p.edits || []).map((ed, i) => {
        const R = rows[ed.track] || rows[0]; const K = R.clips[ed.clip] || R.clips[0];
        if (K && ed.to) K.b.textContent = ed.to;
        const note = ed.note ? el('div', 'note', `${DMS.icon(ed.icon || 'check')}${esc(ed.note)}`, tl) : null;
        return { ed, K, R, at: cueAt(ed, i), note };
      });
      return { win, mon, tl, rows, head, cur, edits, tc: mon.querySelector('.tc'), cap: mon.querySelector('.cap') };
    },
    update(e, lt, p, s) {
      // 窗口入场：浮起 + 回弹落定
      const k = prog(lt, 0, 0.7), sp = E.spring(k, 0.6, 10);
      s.win.style.opacity = clamp(k * 2.2).toFixed(3);
      s.win.style.transform = `translateY(${lerp(5, 0, E.outExpo(k))}cqh) scale(${lerp(0.92, 1, sp).toFixed(4)})`;
      s.win.style.filter = `blur(${lerp(10, 0, E.outQuart(k)).toFixed(2)}px)`;
      // 轨道逐条铺开：片段从左往右长出来
      s.rows.forEach((R, ri) => {
        const a = 0.35 + ri * 0.12, rk = E.outExpo(prog(lt, a, 0.7));
        R.r.style.opacity = clamp(prog(lt, a, 0.3)).toFixed(3);
        R.clips.forEach((K, ci) => {
          const ck = E.outExpo(prog(lt, a + 0.05 + ci * 0.06, 0.55));
          K.d.style.transform = `scaleX(${ck.toFixed(4)})`; K.d.style.opacity = clamp(ck * 3).toFixed(3);
        });
      });
      // 播放头匀速走（落定后才走），时间码跟着跳
      const run = Math.max(0, lt - 1.0), ph = (run * (p.speed || 0.055)) % 1;
      const L0 = s.rows[0].lane, lx = s.rows[0].r.offsetLeft + L0.offsetLeft;
      s.head.style.left = (lx + ph * L0.offsetWidth).toFixed(1) + 'px'; s.head.style.opacity = clamp(prog(lt, 0.9, 0.3)).toFixed(3);
      const sec = ph * 30; s.tc.textContent = `00:00:${String(Math.floor(sec)).padStart(2, '0')}`;
      // 改动：光标移到片段 → 点一下 → 片段亮起，文字换成新内容，旁边弹出说明
      let cx = 62, cy = 120, click = 0, cap = p.caption || '';
      s.edits.forEach((X, i) => {
        if (!X.K) return;
        const lane = X.R.lane, d = X.K.d;
        const tx = (X.R.r.offsetLeft + lane.offsetLeft + d.offsetLeft + d.offsetWidth * Math.min(0.5, 0.35)) / s.tl.clientWidth * 100;
        const ty = (X.R.r.offsetTop + X.R.r.offsetHeight * 0.62) / s.tl.clientHeight * 100;
        const mv = E.inOutCubic(prog(lt, X.at - 0.55, 0.5));
        if (lt >= X.at - 0.55) { cx = lerp(cx, tx, mv); cy = lerp(cy, ty, mv); }
        const ck = prog(lt, X.at, 0.18); click = Math.max(click, lt >= X.at ? Math.sin(Math.PI * ck) : 0);
        const sw = E.inOutCubic(prog(lt, X.at + 0.08, 0.35));
        X.K.a.style.opacity = (1 - sw).toFixed(3); X.K.a.style.transform = `translateY(${(-sw * 40).toFixed(1)}%)`;
        X.K.b.style.opacity = sw.toFixed(3); X.K.b.style.transform = `translateY(${((1 - sw) * 40).toFixed(1)}%)`;
        const glow = lt >= X.at ? Math.exp(-(lt - X.at) * 1.6) : 0;
        d.style.setProperty('--hot', Math.max(sw > 0.5 ? 0.35 : 0, glow).toFixed(3));
        if (X.ed.caption && sw > 0.5) cap = X.ed.caption;
        if (X.note) {
          const nk = prog(lt, X.at + 0.12, 0.5), nsp = E.spring(nk, 0.55, 11);
          X.note.style.left = Math.min(78, tx + 2) + '%'; X.note.style.top = Math.max(0, ty - 22) + '%';
          X.note.style.opacity = clamp(nk * 3).toFixed(3);
          X.note.style.transform = `translateY(${lerp(30, 0, E.outExpo(nk)).toFixed(1)}%) scale(${lerp(0.8, 1, nsp).toFixed(4)})`;
        }
      });
      const show = s.edits.length ? clamp(prog(lt, s.edits[0].at - 0.9, 0.3)) : 0;
      s.cur.style.left = cx.toFixed(2) + '%'; s.cur.style.top = cy.toFixed(2) + '%'; s.cur.style.opacity = show.toFixed(3);
      s.cur.style.transform = `scale(${(1 - 0.22 * click).toFixed(3)})`;
      if (s.cap.textContent !== cap) s.cap.textContent = cap;
    },
    sfx: p => {
      const out = [{ at: 0, kind: 'card', gain: 0.45 }, { at: 0.4, kind: 'stack', gain: 0.3 }];
      (p.edits || []).forEach((ed, i) => { const a = cueAt(ed, i); out.push({ at: a, kind: 'click', gain: 0.55 }, { at: a + 0.15, kind: 'pop-soft', gain: 0.4 }); });
      return out;
    },
  };
})();
