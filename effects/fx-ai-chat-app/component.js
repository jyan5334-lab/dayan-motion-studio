/* AI 产品对话界面（fx-ai-chat-app）—— v1.13.3 新增「09 界面演示」
   什么时候用：口播里出现"跟 AI 说 / 把要求告诉它 / 提意见 / 截图发过去 / 它回我…"这类对话场景时，
   画面要像真的在用这个产品：Claude / ChatGPT / Codex / 豆包 / WorkBuddy / DeepSeek 的桌面端对话页（官方 logo、产品原生配色、
   侧边栏会话列表、底部输入框）。我的话先在输入框里逐字打出 → 点发送 → 气泡上屏；AI 先转圈思考再逐字回复；可以带截图附件。
   字段：brand 产品（claude / chatgpt / codex / doubao / workbuddy / deepseek）；title 窗口标题；model 模型标签；
         history:[侧边栏会话标题]；msgs:[{who: me/ai, t 文字, at 发出时刻（相对图层）, img 附件截图（真实图片）}]；
         label 角标（默认"界面示意"，真录屏请用 window 组件放真实视频）；logo 自定义 logo 图（默认用引擎自带的官方图标） */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const B = {
    claude:    { name: 'Claude',    logo: 'claude',     ph: '回复 Claude…',  bg: '#FAF9F5', side: '#F3F1EA', ink: '#1F1E1D', muted: '#7A7870', line: '#E6E3D9', me: '#EDEAE0', meInk: '#1F1E1D', acc: '#C96442', comp: '#FFFFFF', dark: 0 },
    chatgpt:   { name: 'ChatGPT',   logo: 'openai-ink', ph: '询问任何问题',   bg: '#FFFFFF', side: '#F9F9F9', ink: '#0D0D0D', muted: '#8F8F8F', line: '#ECECEC', me: '#F1F1F1', meInk: '#0D0D0D', acc: '#0D0D0D', comp: '#FFFFFF', dark: 0 },
    codex:     { name: 'Codex',     logo: 'codex',      ph: '描述一个任务…',  bg: '#111214', side: '#17181B', ink: '#ECECEC', muted: '#8A8A90', line: '#2A2B30', me: '#26272C', meInk: '#FFFFFF', acc: '#6E7BFF', comp: '#1A1B1F', dark: 1 },
    doubao:    { name: '豆包',       logo: 'doubao',     ph: '发消息…',       bg: '#FFFFFF', side: '#F5F6F8', ink: '#1A1A1A', muted: '#8C8C8C', line: '#ECEDEF', me: '#E6EEFF', meInk: '#1A1A1A', acc: '#3B6CFF', comp: '#FFFFFF', dark: 0 },
    workbuddy: { name: 'WorkBuddy', logo: 'workbuddy',  ph: '交代一个任务…',  bg: '#0F1513', side: '#141C19', ink: '#E9F2EE', muted: '#83958D', line: '#22302B', me: '#1E2B26', meInk: '#FFFFFF', acc: '#1FC48B', comp: '#151E1B', dark: 1 },
    deepseek:  { name: 'DeepSeek',  logo: 'deepseek',   ph: '给 DeepSeek 发送消息', bg: '#FFFFFF', side: '#F7F8FA', ink: '#1A1A1A', muted: '#8C8C8C', line: '#ECEDEF', me: '#EFF4FF', meInk: '#1A1A1A', acc: '#4D6BFE', comp: '#FFFFFF', dark: 0 },
  };
  const SEND = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CLIP = '<svg viewBox="0 0 24 24"><path d="M20 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.6 8.6a1.7 1.7 0 01-2.4-2.4l7.9-7.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const typeDur = m => Math.min(1.1, Math.max(0.45, [...String(m.t || '')].length * 0.07));

  C['fx-ai-chat-app'] = {
    enter: 'none',
    build(e, p) {
      const b = B[p.brand] || B.claude;
      e.classList.add('fx-ai-chat-app'); if (b.dark) e.classList.add('dk');
      [['--bg', b.bg], ['--side', b.side], ['--ink', b.ink], ['--muted', b.muted], ['--line', b.line], ['--me', b.me], ['--me-ink', b.meInk], ['--acc', b.acc], ['--comp', b.comp]].forEach(([k, v]) => e.style.setProperty(k, v));
      const logo = p.logo || `engine/logos/${b.logo}.svg`;
      const hist = (p.history && p.history.length ? p.history : ['新对话']).slice(0, 6);
      const msgs = (p.msgs || []).map(m => Object.assign({ who: 'me' }, m));
      const w = el('div', 'w', `
        <div class="tb"><i></i><i></i><i></i><span>${esc(p.title || b.name)}</span>${p.label === '' ? '' : `<em>${esc(p.label || '界面示意')}</em>`}</div>
        <div class="bd">
          <div class="sd"><div class="br"><img src="${esc(logo)}"><b>${esc(b.name)}</b></div><div class="nw">＋ 新对话</div>
            ${hist.map((h, i) => `<div class="hi${i === 0 ? ' on' : ''}">${esc(h)}</div>`).join('')}</div>
          <div class="mn">
            ${p.model ? `<div class="md">${esc(p.model)} <small>▾</small></div>` : ''}
            <div class="ms"><div class="ls">${msgs.map(m => m.who === 'ai'
              ? `<div class="m ai"><img class="av" src="${esc(logo)}"><div class="tx"><span class="dots"><i></i><i></i><i></i></span><span class="st"></span></div></div>`
              : `<div class="m me">${m.img ? `<div class="att"><img src="${esc(m.img)}"></div>` : ''}<div class="bb">${esc(m.t || '')}</div></div>`).join('')}</div></div>
            <div class="cp"><div class="chip"></div><div class="row"><span class="ct"></span><span class="ph">${esc(p.placeholder || b.ph)}</span><i class="cr"></i></div>
              <div class="tl"><span class="ic">${CLIP}</span><span class="sn">${SEND}</span></div></div>
          </div>
        </div>`, e);
      return { w, msgs, ms: w.querySelector('.ms'), ls: w.querySelector('.ls'), items: [...w.querySelectorAll('.m')], ct: w.querySelector('.ct'), ph: w.querySelector('.ph'),
               cr: w.querySelector('.cr'), sn: w.querySelector('.sn'), chip: w.querySelector('.chip') };
    },
    update(e, lt, p, s) {
      const q = prog(lt, 0, 0.5); s.w.style.opacity = clamp(q * 3).toFixed(3);
      s.w.style.transform = `translateY(${lerp(5, 0, E.outExpo(q)).toFixed(2)}cqh) scale(${lerp(0.95, 1, E.outExpo(q)).toFixed(3)})`;
      let typing = null, sentFlash = 0;
      s.msgs.forEach((m, i) => {
        const it = s.items[i], at = m.at == null ? 0.6 + i * 1.6 : m.at;
        if (m.who === 'me') {
          const t0 = Math.max(0.35, at - typeDur(m));
          if (lt >= t0 && lt < at) typing = { m, k: (lt - t0) / Math.max(0.01, at - t0) };
          if (lt >= at && lt < at + 0.25) sentFlash = 1 - (lt - at) / 0.25;
          const v = lt >= at; it.style.display = v ? '' : 'none';
          if (v) { const k = E.outBack(prog(lt, at, 0.35), 1.4); it.style.transform = `translateY(${lerp(3, 0, k).toFixed(2)}cqh) scale(${lerp(0.92, 1, k).toFixed(3)})`; it.style.opacity = clamp((lt - at) * 8).toFixed(3); }
        } else {
          const v = lt >= at; it.style.display = v ? '' : 'none'; if (!v) return;
          const th = m.think == null ? 0.7 : m.think, chars = [...String(m.t || '')];
          const n = Math.floor(clamp((lt - at - th) * 24 / Math.max(1, chars.length)) * chars.length);
          it.querySelector('.dots').style.display = lt < at + th ? '' : 'none';
          it.querySelector('.st').textContent = chars.slice(0, lt < at + th ? 0 : n).join('');
          it.style.opacity = clamp((lt - at) * 6).toFixed(3);
          it.querySelectorAll('.dots i').forEach((d, j) => { d.style.opacity = (0.35 + 0.65 * Math.max(0, Math.sin(lt * 8 - j * 0.9))).toFixed(2); });
        }
      });
      // 输入框：打字中显示逐字文字和附件；否则显示占位
      if (typing) {
        const ch = [...String(typing.m.t || '')]; s.ct.textContent = ch.slice(0, Math.ceil(typing.k * ch.length)).join(''); s.ph.style.display = 'none';
        s.chip.innerHTML = typing.m.img ? `<img src="${esc(typing.m.img)}"><b>截图.png</b>` : ''; s.chip.style.display = typing.m.img ? '' : 'none';
        s.cr.style.opacity = Math.floor(lt * 3) % 2 ? 0 : 1; s.sn.classList.add('on');
      } else { s.ct.textContent = ''; s.ph.style.display = ''; s.chip.style.display = 'none'; s.cr.style.opacity = 0; s.sn.classList.remove('on'); }
      s.sn.style.transform = `scale(${(1 - sentFlash * 0.25).toFixed(3)})`;
      // 消息多了自动往上滚：最新的一条始终贴着输入框上方
      const over = s.ls.scrollHeight - s.ms.clientHeight; s.ls.style.transform = `translateY(${over > 0 ? -over : 0}px)`;
    },
    sfx(p) {
      const out = [{ at: 0, kind: 'swoosh-in', gain: 0.35 }];
      (p.msgs || []).forEach((m, i) => { const at = m.at == null ? 0.6 + i * 1.6 : m.at;
        if ((m.who || 'me') === 'me') { const t0 = Math.max(0.35, at - typeDur(m)); out.push({ at: t0, kind: 'typing', gain: 0.22, dur: at - t0 }, { at, kind: 'pop', gain: 0.4 }); }
        else out.push({ at, kind: 'tick', gain: 0.25 }); });
      return out;
    },
  };
})();
