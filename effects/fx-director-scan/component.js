/* 导演检查扫描（fx-director-scan）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"自动检查""帮你挑错""质检 / 审片"：一组分镜缩略图，扫描线从左扫到右，有问题的格子亮红框并标出问题（大字照抄字幕、画面静止……），
             到 fixAt 自动改正：格子内容换成改好的版本，红框变绿勾；顶部计数从 N 条建议降到 0。
   标准：时间的纯函数、扫描与标注同步、自带扫描 / 报警 / 打勾音效、横竖自适应（竖屏两列）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BGS = ['linear-gradient(160deg,#2B2F3B,#15171D)', 'linear-gradient(160deg,#2F6BFF,#1A44C8)', 'linear-gradient(160deg,#F3EEE3,#E4DCCB)', 'linear-gradient(160deg,#2E1660,#0E0820)', 'linear-gradient(160deg,#C8FF3D,#9FD81E)', 'linear-gradient(160deg,#0F2A8A,#061247)'];
  const DARKTXT = new Set([2, 4]);
  function frame(d, i, fixed) {
    const t = fixed && d.fixTitle ? d.fixTitle : d.title, sub = fixed && d.fixSub != null ? d.fixSub : d.sub;
    const mov = fixed && d.fixMove;
    return `<div class="tt">${esc(t || '')}</div>${sub ? `<div class="sb">${esc(sub)}</div>` : ''}${d.person === false ? '' : '<div class="pp"></div>'}
      ${mov ? '<div class="mv"><i></i><i></i><i></i></div>' : ''}${d.subtitle ? `<div class="cap">${esc(d.subtitle)}</div>` : ''}`;
  }
  C['fx-director-scan'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-director-scan');
      const th = p.thumbs || [];
      const hd = el('div', 'hd', `<span class="ic">${DMS.icon('eye')}</span><b>${esc(p.title || '导演检查')}</b><span class="cnt">建议 <em>0</em> 条</span>`, e);
      const grid = el('div', 'grid', '', e);
      const cells = th.map((d, i) => {
        const c = el('div', 'cell', `<div class="fr a" style="background:${d.bg || BGS[i % BGS.length]}">${frame(d, i, false)}</div>
          ${d.issue ? `<div class="fr b" style="background:${d.bg || BGS[i % BGS.length]}">${frame(d, i, true)}</div>` : ''}
          <div class="no">${String(i + 1).padStart(2, '0')}</div><div class="ok">${DMS.icon('check')}</div>
          ${d.issue ? `<div class="box"><span class="tg"><i>${DMS.icon('warn')}</i>${esc(d.issue)}</span><span class="tg g"><i>${DMS.icon('check')}</i>${esc(d.fixText || '已改正')}</span></div>` : ''}`, grid);
        if (DARKTXT.has(i % BGS.length) && !d.bg) c.classList.add('lt');
        return { d, c, b: c.querySelector('.fr.b'), box: c.querySelector('.box'), ok: c.querySelector('.ok') };
      });
      const scan = el('div', 'scan', '<i></i>', grid);
      return { hd, grid, cells, scan, cnt: hd.querySelector('.cnt em'), cntEl: hd.querySelector('.cnt') };
    },
    update(e, lt, p, s) {
      const tall = e.clientHeight > e.clientWidth * 1.1;
      const cols = tall ? 2 : Math.ceil(s.cells.length / 2), rows = Math.ceil(s.cells.length / cols);
      s.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; s.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      const sa = p.scanAt == null ? 0.5 : p.scanAt, sd = p.scanDur == null ? 1.6 : p.scanDur;
      const fa = p.fixAt == null ? sa + sd + 0.4 : p.fixAt, fs = p.fixStagger == null ? 0.35 : p.fixStagger;
      const k = E.outExpo(prog(lt, 0, 0.6));
      s.hd.style.opacity = clamp(k * 2).toFixed(3);
      const sk = prog(lt, sa, sd), sx = E.inOutCubic(sk);
      s.scan.style.left = (sx * 100).toFixed(2) + '%';
      s.scan.style.opacity = (sk > 0 && sk < 1 ? 1 : 0).toFixed(3);
      let open = 0, fi = 0;
      s.cells.forEach((c, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const q = prog(lt, 0.08 + (row * cols + col) * 0.06, 0.45);
        c.c.style.opacity = clamp(q * 3).toFixed(3);
        c.c.style.transform = `translateY(${lerp(3, 0, E.outExpo(q)).toFixed(2)}cqmin) scale(${lerp(0.9, 1, E.spring(q, 0.5, 12)).toFixed(4)})`;
        c.c.classList.toggle('bt', row === rows - 1 && rows > 1);
        const passAt = sa + sd * E.inOutCubic.inv((col + 0.55) / cols);
        const passed = lt >= passAt;
        if (c.d.issue) {
          const my = fa + fi * fs; fi++;
          const red = passed ? E.spring(prog(lt, passAt, 0.4), 0.45, 14) : 0, fixed = prog(lt, my, 0.45);
          if (passed && lt < my) open++;
          c.box.style.opacity = (passed ? 1 : 0).toFixed(3);
          c.box.style.transform = `scale(${lerp(1.12, 1, red).toFixed(4)})`;
          c.box.style.setProperty('--fix', fixed.toFixed(3));
          c.b.style.clipPath = `inset(0 ${((1 - E.inOutCubic(fixed)) * 100).toFixed(2)}% 0 0)`;
          if (passed && lt < my) c.c.style.transform += ` translateX(${(Math.sin(lt * 50) * 0.25 * clamp(1 - (lt - passAt) * 2.5)).toFixed(3)}cqmin)`;
          // 改好的格子里补上的动效：一排小方块依次跳动
          c.b.querySelectorAll('.mv i').forEach((m, j) => { const u = lt - my - j * 0.12; m.style.transform = `translateY(${(u > 0 ? -Math.abs(Math.sin(u * 6)) * 40 : 0).toFixed(1)}%)`; });
          c.ok.style.opacity = '0';
        } else {
          const oq = passed ? prog(lt, passAt, 0.3) : 0;
          c.ok.style.opacity = (oq * 0.9).toFixed(3);
          c.ok.style.transform = `scale(${lerp(0.4, 1, E.spring(oq, 0.5, 12)).toFixed(3)})`;
        }
      });
      s.cnt.textContent = String(open);
      s.cntEl.classList.toggle('bad', open > 0);
      s.cntEl.classList.toggle('done', lt >= sa + sd && open === 0);
    },
    sfx(p) {
      const sa = p.scanAt == null ? 0.5 : p.scanAt, sd = p.scanDur == null ? 1.6 : p.scanDur;
      const fa = p.fixAt == null ? sa + sd + 0.4 : p.fixAt, fs = p.fixStagger == null ? 0.35 : p.fixStagger;
      const th = p.thumbs || [], cols = Math.ceil(th.length / 2);
      const out = [{ at: 0, kind: 'card', gain: 0.35 }, { at: sa, kind: 'rise', gain: 0.35 }];
      let fi = 0;
      th.forEach((d, i) => {
        const col = i % cols, passAt = sa + sd * E.inOutCubic.inv((col + 0.55) / cols);
        if (d.issue) { out.push({ at: passAt, kind: 'alert', gain: 0.5 }, { at: fa + fi * fs + 0.2, kind: 'tick-ok', gain: 0.55 }); fi++; }
      });
      out.push({ at: fa + fi * fs + 0.3, kind: 'success', gain: 0.4 });
      return out;
    },
  };
  /* inOutCubic 的反函数：扫描线到达第几列的时刻 */
  if (!DMS.ease.inOutCubic.inv) DMS.ease.inOutCubic.inv = y => { y = clamp(y); return y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) * 4) / 2; };
})();
