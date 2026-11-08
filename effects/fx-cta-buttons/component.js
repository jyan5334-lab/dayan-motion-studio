/* 三连按钮（fx-cta-buttons）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：说到点赞、收藏、关注时：三颗圆形按钮按口播逐个按下，图标填色点亮，带冲击环和 +1
   标准（SKILL.md「动效不够时」）：画面跟着口播的字走（items[].at/cue 落在说出"点赞/收藏/关注"那个字）、有入场和落定、带音效、
   16:9 / 4:3 / 9:16 都排得下（尺寸用 cqw/cqh）、时间的纯函数、不出现任何平台的商标。 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GLYPH = {   // 线框 → 实心两套，按下时切换
    like: '<path d="M12 20.5s-7.5-4.4-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1z"/>',
    save: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    follow: '<path d="M12 5v14M5 12h14"/>',
    done: '<path d="M5.5 12.5l4.2 4.2L18.5 7.8"/>',
  };
  const DEF = [{ kind: 'like', t: '点赞', color: '#FF3B5C' }, { kind: 'save', t: '收藏', color: '#FFC23D' }, { kind: 'follow', t: '关注', color: '#FF7A1A' }];
  const atOf = (o, i) => o.at == null ? 0.6 + i * 0.55 : o.at;
  C['fx-cta-buttons'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-cta-buttons');
      if (p.dir === 'col') e.classList.add('col');
      const row = el('div', 'row', '', e);
      const items = (p.items || DEF).map((o, i) => {
        const d = Object.assign({}, DEF[i] || DEF[0], o);
        const b = el('div', 'btn', `<div class="disc" style="--c:${d.color}"><i class="ring"></i><svg class="g0" viewBox="0 0 24 24">${GLYPH[d.kind] || GLYPH.like}</svg><svg class="g1 k-${d.kind}" viewBox="0 0 24 24">${d.kind === 'follow' ? GLYPH.done : (GLYPH[d.kind] || GLYPH.like)}</svg><em class="plus">${esc(d.plus || '+1')}</em></div><b>${esc(d.t)}</b>`, row);
        return { d, b, disc: b.querySelector('.disc'), ring: b.querySelector('.ring'), g0: b.querySelector('.g0'), g1: b.querySelector('.g1'), plus: b.querySelector('.plus'), lab: b.querySelector('b'), at: atOf(d, i), i };
      });
      const cap = p.caption ? el('div', 'cap', DMS.hl(p.caption, p.hl), e) : null;
      return { items, cap };
    },
    update(e, lt, p, s) {
      const n = s.items.length;
      s.items.forEach(x => {
        // 入场：按钮依次弹上来（比按下早 0.45s 以内，最早从 0 开始）
        const a = Math.max(0, Math.min(x.i * 0.09, x.at - 0.45)), k = prog(lt, a, 0.6), sp = E.spring(k, 0.5, 12);
        x.b.style.opacity = clamp(k * 3).toFixed(3);
        x.b.style.transform = `translateY(${lerp(6, 0, E.outExpo(k)).toFixed(2)}cqh) scale(${lerp(0.6, 1, sp).toFixed(4)})`;
        x.b.style.filter = `blur(${lerp(6, 0, E.outQuart(k)).toFixed(2)}px)`;
        // 按下：压扁 → 回弹，图标换成实心并填色，冲击环扩散，+1 上飘
        const pk = prog(lt, x.at, 0.5), on = lt >= x.at ? 1 : 0;
        const press = lt >= x.at - 0.08 && lt < x.at + 0.06 ? 0.86 : 1;
        const bounce = on ? E.spring(pk, 0.45, 14) : 1;
        x.disc.style.transform = `scale(${(press < 1 ? press : lerp(0.86, 1, bounce)).toFixed(4)})`;
        x.disc.classList.toggle('on', !!on);
        x.g1.style.opacity = on ? '1' : '0'; x.g0.style.opacity = on ? '0' : '1';
        x.g1.style.transform = `scale(${on ? lerp(0.4, 1, E.spring(pk, 0.5, 12)).toFixed(4) : 0.4})`;
        const rk = prog(lt, x.at, 0.6);
        x.ring.style.opacity = (on ? (1 - rk) : 0).toFixed(3);
        x.ring.style.transform = `scale(${lerp(0.9, 1.9, E.outExpo(rk)).toFixed(4)})`;
        const fk = prog(lt, x.at + 0.05, 0.9);
        x.plus.style.opacity = (on ? clamp(fk * 5) * (1 - clamp((fk - 0.6) / 0.4)) : 0).toFixed(3);
        x.plus.style.transform = `translate(-50%, ${lerp(0, -120, E.outCubic(fk)).toFixed(1)}%)`;
        x.lab.classList.toggle('on', !!on);
      });
      if (s.cap) {
        const last = s.items[n - 1], ck = prog(lt, last ? last.at + 0.25 : 1, 0.55);
        s.cap.style.opacity = clamp(ck * 2.5).toFixed(3);
        s.cap.style.transform = `translateY(${lerp(30, 0, E.outExpo(ck)).toFixed(1)}%)`;
      }
    },
    sfx: p => {
      const it = p.items || DEF, out = [{ at: 0, kind: 'pop-soft', gain: 0.35 }];
      it.forEach((o, i) => { const a = atOf(o, i); out.push({ at: a, kind: i === it.length - 1 ? 'pop-big' : 'pop', gain: 0.6 }, { at: a + 0.06, kind: 'tick-ok', gain: 0.35 }); });
      return out;
    },
  };
})();
