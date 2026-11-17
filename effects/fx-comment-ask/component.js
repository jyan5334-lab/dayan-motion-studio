/* 评论区互动（fx-comment-ask）—— v1.12 补齐分类「07 收尾 · CTA」
   什么时候用：结尾引导留言（"想要的评论区扣 1""你会怎么选？A 还是 B"）：一个评论输入框打出引导语，下方几条"1"和回复气泡快速刷上来，数字计数跳涨
   字段：prompt 引导语；replies:[回复…]；count 最终计数；label 计数标签 */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (q, d, f) => E.spring(q, d == null ? 0.5 : d, f == null ? 12 : f);
  C['fx-comment-ask'] = {
    enter: 'none',
    build(e, p) {
      e.classList.add('fx-comment-ask');
      const ip = el('div', 'ip', `${DMS.icon('chat')}<span class="tx"></span><i class="cr"></i><b>发送</b>`, e);
      const ls = el('div', 'ls', '', e);
      const rs = (p.replies || []).map((r, i) => el('div', 'rp', `<i style="background:hsl(${(i * 67) % 360} 60% 55%)"></i><span>${esc(r)}</span>`, ls));
      const ct = el('div', 'ct', `<b>0</b><small>${esc(p.label || '条评论')}</small>`, e);
      return { tx: ip.querySelector('.tx'), cr: ip.querySelector('.cr'), rs, cb: ct.querySelector('b'), ip };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.45); s.ip.style.opacity = clamp(q * 3).toFixed(3); s.ip.style.transform = `translateY(${lerp(3, 0, E.outExpo(q)).toFixed(2)}cqh)`;
      const txt = [...String(p.prompt || '')], n = Math.floor(clamp((lt - 0.3) / Math.max(0.4, txt.length / 14)) * txt.length);
      s.tx.textContent = txt.slice(0, n).join(''); s.cr.style.opacity = (Math.floor(lt * 2.5) % 2 ? 0 : 1);
      const ra = 0.4 + txt.length / 14;
      s.rs.forEach((r, i) => { const q2 = prog(lt, ra + i * 0.22, 0.35); r.style.opacity = clamp(q2 * 3).toFixed(3); r.style.transform = `translateY(${lerp(4, 0, E.outBack(q2, 1.4)).toFixed(2)}cqh) scale(${lerp(0.7, 1, sp(q2)).toFixed(3)})`; });
      s.cb.textContent = Math.round((p.count || 0) * E.outExpo(prog(lt, ra, 1.6))).toLocaleString();
    },
    sfx(p) { const n = [...String(p.prompt || '')].length, ra = 0.4 + n / 14; return [{ at: 0.3, kind: 'typing', gain: 0.3 }].concat((p.replies || []).map((r, i) => ({ at: ra + i * 0.22, kind: 'bubble', gain: 0.3 }))).concat([{ at: ra, kind: 'roll', gain: 0.25 }]); },
  };
})();
