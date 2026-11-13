/* 音效台（fx-sound-desk）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：讲"每个动作都有音效""音效卡在动作的接触点上""混音 / 响度标准"：上面一排动作（弹出、甩镜、印章、打勾……）摆在时间轴上，
             一段段音效波形从上方掉下来，正好落在每个动作的接触点，落地时动作亮起、标出音效名；右边响度表指针摆动后停在目标值（默认 −15 LUFS）。
   标准：时间的纯函数、落地有弹性、每次落地自带对应音效、横竖版式自适应。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TONES = ['#FFC24B', '#4DA3FF', '#FF5C7A', '#2CE0C0', '#B38CFF', '#FF9A3C'];
  function wavePath(seed) {
    const r = DMS.rand(seed * 977 + 13); let d = 'M0 20';
    for (let i = 1; i <= 40; i++) { const env = Math.sin(i / 40 * Math.PI) ** 0.7; const a = (0.25 + r() * 0.75) * 17 * env; d += ` L${(i * 2.5).toFixed(1)} ${(20 + (i % 2 ? -a : a)).toFixed(1)}`; }
    return d;
  }
  C['fx-sound-desk'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-sound-desk');
      const hits = (p.hits || []).map((o, i) => Object.assign({ tone: TONES[i % TONES.length], at: 0.5 + i * 0.55 }, o));
      const desk = el('div', 'desk', `<div class="lab">${esc(p.title || '动作 × 音效 · 接触点对齐')}</div><div class="acts"></div><div class="axis"></div><div class="lane"><span>${esc(p.laneText || '音效轨')}</span></div>`, e);
      const acts = desk.querySelector('.acts'), lane = desk.querySelector('.lane'), axis = desk.querySelector('.axis');
      const n = hits.length;
      const H = hits.map((h, i) => {
        const x = (n === 1 ? 50 : 10 + i * 80 / (n - 1));
        const a = el('div', 'act', `<i>${DMS.icon(h.icon || 'spark')}</i><b>${esc(h.t)}</b>`, acts); a.style.left = x + '%'; a.style.setProperty('--tone', h.tone);
        const dl = el('div', 'drop', '', axis); dl.style.left = x + '%';
        const blob = el('div', 'blob', `<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="${wavePath(i + 1)}"/></svg><small>${esc(h.name || h.kind || '')}</small>`, lane);
        blob.style.left = x + '%'; blob.style.setProperty('--tone', h.tone);
        return { h, a, blob, dl };
      });
      const meter = el('div', 'meter', `<svg viewBox="0 0 200 120"><path class="trk" d="M20 110 A80 80 0 0 1 180 110"/><path class="ok" d=""/><g class="tks"></g><line class="ndl" x1="100" y1="110" x2="100" y2="42"/><circle class="hub" cx="100" cy="110" r="7"/></svg>
        <div class="rd"><b>−∞</b><span>LUFS</span></div><div class="pass">${DMS.icon('check')}<span>${esc(p.passText || '平台响度标准')}</span></div>`, e);
      const lo = p.min == null ? -36 : p.min, hi = p.max == null ? 0 : p.max, tg = p.target == null ? -15 : p.target;
      const ang = v => Math.PI * (1 - (v - lo) / (hi - lo));
      const tks = meter.querySelector('.tks');
      for (let v = lo; v <= hi; v += 6) { const a = ang(v), c = Math.cos(a), s2 = Math.sin(a);
        tks.insertAdjacentHTML('beforeend', `<line x1="${(100 + c * 70).toFixed(1)}" y1="${(110 - s2 * 70).toFixed(1)}" x2="${(100 + c * 80).toFixed(1)}" y2="${(110 - s2 * 80).toFixed(1)}"/><text x="${(100 + c * 58).toFixed(1)}" y="${(114 - s2 * 58).toFixed(1)}">${v}</text>`); }
      const a0 = ang(tg - 2), a1 = ang(tg + 2);
      meter.querySelector('.ok').setAttribute('d', `M${(100 + Math.cos(a0) * 80).toFixed(1)} ${(110 - Math.sin(a0) * 80).toFixed(1)} A80 80 0 0 1 ${(100 + Math.cos(a1) * 80).toFixed(1)} ${(110 - Math.sin(a1) * 80).toFixed(1)}`);
      return { H, desk, meter, ndl: meter.querySelector('.ndl'), rd: meter.querySelector('.rd b'), pass: meter.querySelector('.pass'), lo, hi, tg, ang };
    },
    update(e, lt, p, s) {
      const wide = e.clientWidth >= e.clientHeight * 1.25;
      e.classList.toggle('tall', !wide);
      const k = E.outExpo(prog(lt, 0, 0.6));
      s.desk.style.opacity = clamp(k * 2).toFixed(3);
      s.desk.style.transform = `translateY(${lerp(4, 0, k).toFixed(2)}cqmin)`;
      s.H.forEach(({ h, a, blob, dl }, i) => {
        const ai = prog(lt, 0.15 + i * 0.08, 0.4);
        a.style.opacity = clamp(ai * 3).toFixed(3);
        const land = h.at, fall = prog(lt, land - 0.42, 0.42);
        const y = lt < land ? lerp(-260, 0, E.inQuad(fall)) : -Math.abs(Math.sin(prog(lt, land, 0.35) * Math.PI)) * 18 * (1 - prog(lt, land, 0.35));
        const sq = lt >= land ? 1 - Math.sin(prog(lt, land, 0.22) * Math.PI) * 0.25 : 1;
        blob.style.opacity = (lt < land - 0.42 ? 0 : 1).toFixed(3);
        blob.style.transform = `translate(-50%, ${y.toFixed(1)}%) scale(${(2 - sq).toFixed(3)}, ${sq.toFixed(3)})`;
        const hit = lt >= land ? clamp(1 - (lt - land) * 2.2) : 0, on = lt >= land ? 1 : 0;
        a.style.setProperty('--on', on); a.style.setProperty('--hit', hit.toFixed(3));
        a.style.transform = `translateX(-50%) scale(${(1 + hit * 0.18).toFixed(3)})`;
        dl.style.opacity = (lt >= land - 0.42 ? 0.25 + hit * 0.75 : 0.1).toFixed(3);
      });
      // 响度表：先随音效乱跳，meterAt 之后摆动收敛到目标值
      const ma = p.meterAt == null ? 2.6 : p.meterAt;
      const mk = E.outExpo(prog(lt, 0.2, 0.7));
      s.meter.style.opacity = clamp(mk * 2).toFixed(3);
      s.meter.style.transform = `translateY(${lerp(4, 0, mk).toFixed(2)}cqmin)`;
      let v;
      if (lt < ma) v = lerp(s.lo, -20, clamp(lt / ma)) + Math.sin(lt * 9.1) * 4 + Math.sin(lt * 23) * 2;
      else { const u = lt - ma; v = s.tg + Math.exp(-u * 3.2) * Math.cos(u * 11) * 5; }
      v = Math.max(s.lo, Math.min(s.hi, v));
      const a = s.ang(v);
      s.ndl.setAttribute('x2', (100 + Math.cos(a) * 68).toFixed(2)); s.ndl.setAttribute('y2', (110 - Math.sin(a) * 68).toFixed(2));
      s.rd.textContent = (lt < 0.25 ? '−∞' : (v < 0 ? '−' : '') + Math.abs(lt >= ma + 0.9 ? s.tg : v).toFixed(1));
      const pq = prog(lt, ma + 0.8, 0.45);
      s.pass.style.opacity = clamp(pq * 3).toFixed(3);
      s.pass.style.transform = `scale(${lerp(0.6, 1, E.spring(pq, 0.5, 12)).toFixed(3)})`;
      s.meter.style.setProperty('--ok', pq.toFixed(3));
    },
    sfx(p) {
      const out = [{ at: 0, kind: 'swoosh-in', gain: 0.35 }];
      (p.hits || []).forEach((h, i) => out.push({ at: h.at == null ? 0.5 + i * 0.55 : h.at, kind: h.kind || 'pop', gain: 0.6 }));
      out.push({ at: (p.meterAt == null ? 2.6 : p.meterAt) + 0.8, kind: 'success', gain: 0.45 });
      return out;
    },
  };
})();
