/* 人物背后嵌入文字（fx-depth-word）—— v1.17.7 升级
   什么时候用：开场钩子、关键重点、数字/关键词强调：在抠像人物后方嵌入巨字、标题、数字或关键词（配合 scene.personFront: true），
   支持直接出现（mode:"pop"）或横向滚动（mode:"scroll"），停留后平滑消失。
   字段：
     word   文字内容（数字 / 巨字 / 关键词 / 短标题，自动按字数调字号）
     mode   "pop"（默认，砸入/淡出）| "scroll"（在人物后方横向滚动穿过后消失）
     pos    "center"（居中在人物正后方）| "left"（默认，偏左）| "right"（偏右）
     dir    scroll 方向："left"（从右往左，默认）| "right"（从左往右）
     speed  scroll 速度（cqw/s，默认 36）
     y      垂直位置百分比（0–100，默认 48）
     color  字色（默认 #F4F2EE）
     hold   可选：停留秒数后自动淡出消失（不写则跟图层 out 退场）
     side   可选：[{t, hl}] 旁边两行辅助小标题；sideAt 出现时刻
     tilt   倾角（pop 模式默认 -3，pos:"center" 默认 0） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  C['fx-depth-word'] = {
    enter: 'none',
    build(e, p, L) {
      const mode = p.mode || 'pop';
      const pos = p.pos || (mode === 'scroll' ? 'center' : 'left');
      e.classList.add('fx-depth-word', 'm-' + mode, 'p-' + pos);
      const txt = String(p.word == null ? '急' : p.word);
      const len = Math.max(1, txt.length);
      const w = el('div', 'w', '', e);
      if (p.color) w.style.setProperty('--wc', p.color);
      if (p.y != null) w.style.top = p.y + '%';
      /* 按字数自适应字号：1–2 字超大巨字，3–6 字关键词，更长自动收小避免裁切 */
      const fz = p.size || (len <= 1 ? 'min(82cqh, 52cqw)' : len <= 2 ? 'min(74cqh, 42cqw)' : len <= 4 ? 'min(48cqh, 24cqw)' : len <= 8 ? 'min(32cqh, 15cqw)' : 'min(24cqh, 11cqw)');
      w.style.setProperty('--fz', fz);
      if (mode === 'scroll') {
        const rep = p.repeat || 3;
        const unit = `<b>${esc(txt)}</b>`;
        w.innerHTML = `<div class="track">${new Array(rep).fill(unit).join('<span class="dot">·</span>')}</div>`;
      } else {
        w.innerHTML = `<b>${esc(txt)}</b>`;
      }
      const side = el('div', 'sd', (p.side || []).map(o => `<div class="${o.hl ? 'hl' : ''}">${esc(o.t)}</div>`).join(''), e);
      if (mode === 'pop' && L && L.def && p.shake !== false) DMS.shake((L.def.at || 0) + 0.12, 7, 0.28);
      return { w, mode, pos, track: w.querySelector('.track'), rows: [...side.children] };
    },
    update(e, lt, p, s) {
      const hold = p.hold;
      const outFade = hold != null ? (1 - E.outCubic(prog(lt, hold, 0.42))) : 1;
      if (s.mode === 'scroll') {
        const fin = E.outCubic(prog(lt, 0, 0.35));
        const op = clamp(fin * outFade);
        const dir = p.dir === 'right' ? 1 : -1;
        const spd = p.speed == null ? 34 : p.speed;
        const startX = dir < 0 ? 18 : -48;
        const x = startX + dir * lt * spd;
        s.w.style.opacity = op.toFixed(3);
        s.w.style.filter = `blur(${lerp(8, 0, fin).toFixed(2)}px)`;
        if (s.track) s.track.style.transform = `translateX(${x.toFixed(2)}cqw)`;
      } else {
        const q = prog(lt, 0, 0.32), k = E.outExpo(q);
        const tilt = p.tilt == null ? (s.pos === 'center' ? 0 : -3) : p.tilt;
        const blur = lerp(14, 0, k) + (1 - outFade) * 10;
        s.w.style.opacity = (clamp(q * 4) * outFade).toFixed(3);
        s.w.style.filter = `blur(${blur.toFixed(2)}px)`;
        s.w.style.transform = `translateY(${(Math.sin(lt * 0.9) * 0.6).toFixed(2)}cqh) rotate(${(tilt + lerp(-5, 0, k)).toFixed(2)}deg) scale(${(lerp(1.42, 1, k) + Math.max(0, lt - 0.3) * 0.012).toFixed(4)})`;
      }
      const sa = p.sideAt == null ? 0.6 : p.sideAt;
      s.rows.forEach((r, i) => {
        const u = prog(lt, sa + i * 0.14, 0.45);
        r.style.opacity = (clamp(u * 3) * outFade).toFixed(3);
        r.style.transform = `translateX(${lerp(4, 0, E.outExpo(u)).toFixed(2)}cqw)`;
        r.style.clipPath = `inset(0 ${((1 - E.outCubic(u)) * 100).toFixed(1)}% 0 0)`;
      });
    },
    sfx(p) {
      const ev = [{ at: 0.05, kind: p.mode === 'scroll' ? 'swoosh-in' : 'impact', gain: p.mode === 'scroll' ? 0.45 : 0.68 }];
      if (p.side && p.side.length) ev.push({ at: (p.sideAt == null ? 0.6 : p.sideAt), kind: 'swoosh-soft', gain: 0.35 });
      if (p.hold != null) ev.push({ at: p.hold, kind: 'swoosh-out', gain: 0.28 });
      return ev;
    },
  };
})();
