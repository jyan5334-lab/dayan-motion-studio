/* 全景收束（fx-station-strip）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：一路讲完几个步骤 / 站点后的"总结""全部打包""回到全局"：镜头从最后一站拉远，露出整条流水线（每站一块彩色站牌），
             然后所有站牌向中心收拢、合成一张卡并闪白——下一层（如开源仓库卡、品牌卡）正好从这里接上。
   标准：时间的纯函数、拉远用 smooth 缓动、收拢有加速和闪光、自带拉远 / 收拢音效、横竖自适应（竖屏两列）。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF = [{ t: '听', icon: 'mic', bg: '#F3EEE3', fg: '#1C2340' }, { t: '剪', icon: 'x', bg: '#E2343E', fg: '#fff' }, { t: '编', icon: 'layers', bg: '#2B2E38', fg: '#FFE2B8' },
    { t: '演', icon: 'user', bg: '#2F6BFF', fg: '#fff' }, { t: '声', icon: 'mic', bg: '#3A1C9E', fg: '#E9DBFF' }, { t: '查', icon: 'eye', bg: '#0F2A8A', fg: '#BFE3FF' }, { t: '出片', icon: 'play', bg: '#FF8A2A', fg: '#1A0E02', end: true }];
  C['fx-station-strip'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-station-strip');
      const wrap = el('div', 'wrap', '', e);
      const tiles = (p.stations || DEF).map((d, i) => {
        const x = el('div', 'tl' + (d.end ? ' end' : ''), `<small>${d.end ? 'FINISH' : 'STATION ' + String(i + 1).padStart(2, '0')}</small><i>${DMS.icon(d.icon || 'spark')}</i><b>${esc(d.t)}</b>`, wrap);
        x.style.setProperty('--bg', d.bg || '#2B2E38'); x.style.setProperty('--fg', d.fg || '#fff');
        return x;
      });
      const rail = el('div', 'rail', '', wrap);
      const flash = el('div', 'flash', '', e);
      return { wrap, tiles, rail, flash };
    },
    update(e, lt, p, s) {
      const W = e.clientWidth || 1, H = e.clientHeight || 1, n = s.tiles.length;
      const tall = H > W;
      const cols = tall ? 2 : n, rows = Math.ceil(n / cols);
      const gap = Math.min(W, H) * 0.025;
      const tw = Math.min((W * 0.96 - gap * (cols - 1)) / cols, (H * 0.8 - gap * (rows - 1)) / rows / 1.25), th = tw * 1.25;
      const totW = cols * tw + (cols - 1) * gap, totH = rows * th + (rows - 1) * gap;
      const ox = (W - totW) / 2, oy = (H - totH) / 2;
      const za = p.zoomAt == null ? 0 : p.zoomAt, zd = p.zoomDur == null ? 1.1 : p.zoomDur;
      const ca = p.collapseAt == null ? za + zd + 0.7 : p.collapseAt;
      // 拉远：从最后一块站牌的特写拉到全景
      const zk = E.smooth(prog(lt, za, zd));
      const last = n - 1, lx = ox + (last % cols) * (tw + gap) + tw / 2, ly = oy + Math.floor(last / cols) * (th + gap) + th / 2;
      const z0 = p.from == null ? 2.4 : p.from, sc = lerp(z0, 1, zk);
      const cx = lerp(lx, W / 2, zk), cy = lerp(ly, H / 2, zk);
      s.wrap.style.transform = `translate(${(W / 2 - cx * sc).toFixed(1)}px, ${(H / 2 - cy * sc).toFixed(1)}px) scale(${sc.toFixed(4)})`;
      s.wrap.style.filter = `blur(${(Math.sin(zk * Math.PI) * 2.2).toFixed(2)}px)`;
      const ck = prog(lt, ca, 0.55), cc = E.inCubic(ck);
      s.tiles.forEach((tl, i) => {
        const x = ox + (i % cols) * (tw + gap), y = oy + Math.floor(i / cols) * (th + gap);
        const dx = (W / 2 - (x + tw / 2)) * cc, dy = (H / 2 - (y + th / 2)) * cc;
        const q = prog(lt, za + i * 0.035, 0.3);
        tl.style.left = x.toFixed(1) + 'px'; tl.style.top = y.toFixed(1) + 'px'; tl.style.width = tw.toFixed(1) + 'px'; tl.style.height = th.toFixed(1) + 'px';
        tl.style.fontSize = (tw * 0.1).toFixed(1) + 'px';
        const pin = i === last ? 1 : E.spring(q, 0.5, 12);
        tl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${((i - (n - 1) / 2) * 6 * cc).toFixed(2)}deg) scale(${(lerp(1, 0.55, cc) * lerp(0.82, 1, pin)).toFixed(4)})`;
        tl.style.opacity = ((i === last ? 1 : clamp(q * 4)) * (1 - prog(lt, ca + 0.4, 0.15))).toFixed(3);
      });
      s.rail.style.left = ox.toFixed(1) + 'px'; s.rail.style.width = totW.toFixed(1) + 'px'; s.rail.style.top = (oy + totH + gap * 0.9).toFixed(1) + 'px';
      s.rail.style.opacity = (tall ? 0 : clamp(zk * 2) * (1 - cc)).toFixed(3);
      const fq = prog(lt, ca + 0.45, 0.45);
      s.flash.style.opacity = (fq > 0 && fq < 1 ? Math.pow(1 - fq, 2) : 0).toFixed(3);
      s.flash.style.transform = `translate(-50%, -50%) scale(${lerp(0.2, 2.4, E.outCubic(fq)).toFixed(3)})`;
    },
    sfx(p) {
      const za = p.zoomAt == null ? 0 : p.zoomAt, zd = p.zoomDur == null ? 1.1 : p.zoomDur, ca = p.collapseAt == null ? za + zd + 0.7 : p.collapseAt;
      return [{ at: za, kind: 'zoom-out', gain: 0.5 }, { at: ca, kind: 'shrink', gain: 0.5 }, { at: ca + 0.45, kind: 'impact', gain: 0.55 }];
    },
  };
})();
