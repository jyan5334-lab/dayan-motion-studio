/* 终端命令（fx-terminal）—— v1.12 补齐分类「09 界面演示」
   什么时候用：讲到装技能 / 跑脚本 / 一行命令搞定（"只要一行命令"）：深色终端窗口，命令逐字打出，回车后输出一行行刷出，最后一行绿色 ✓ 完成
   字段：title 窗口标题；lines:[{cmd 命令} 或 {out 输出, ok true 时绿色}]；speed 打字速度（字/秒，默认 26） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-terminal'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-terminal');
      const w = el('div', 'w', `<div class="hd"><i></i><i></i><i></i><b>${esc(p.title || 'terminal')}</b></div><div class="bd"></div>`, e);
      const bd = w.querySelector('.bd'), sp2 = p.speed || 26; let t = 0.4; const rows = [];
      (p.lines || []).forEach(o => { const r = el('div', 'ln' + (o.cmd != null ? ' cmd' : '') + (o.ok ? ' ok' : ''), o.cmd != null ? '<em>❯</em><span></span>' : '<span></span>', bd);
        const txt = String(o.cmd != null ? o.cmd : o.out || ''), d = o.cmd != null ? txt.length / sp2 : 0.12; rows.push({ r, s: r.querySelector('span'), txt: [...txt], t0: t, d, cmd: o.cmd != null }); t += d + (o.cmd != null ? 0.3 : 0.18); });
      const cr = el('i', 'cr', '', bd);
      return { w, rows, cr };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.45); s.w.style.opacity = clamp(q * 3).toFixed(3); s.w.style.transform = `translateY(${lerp(5, 0, E.outExpo(q)).toFixed(2)}cqh)`;
      let last = null;
      s.rows.forEach(o => { const on = lt >= o.t0; o.r.style.display = on ? '' : 'none'; if (!on) return; last = o;
        o.s.textContent = o.cmd ? o.txt.slice(0, Math.floor(clamp((lt - o.t0) / Math.max(0.01, o.d)) * o.txt.length)).join('') : o.txt.join(''); });
      (last ? last.r : s.w.querySelector('.bd')).appendChild(s.cr); s.cr.style.opacity = Math.floor(lt * 2.5) % 2 ? 0 : 1;
    },
    sfx(p) { const sp2 = p.speed || 26; let t = 0.4; const o = []; (p.lines || []).forEach(l => { if (l.cmd != null) { o.push({ at: t, kind: 'typing', gain: 0.3 }); t += String(l.cmd).length / sp2 + 0.3; o.push({ at: t - 0.3, kind: 'click', gain: 0.3 }); } else { if (l.ok) o.push({ at: t, kind: 'success', gain: 0.4 }); t += 0.3; } }); return o; },
  };
})();
