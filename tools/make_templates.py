"""生成内置 内置动效（合同 + 实现 + 示例 + 说明）。修改内置动效请改本文件后重新运行。"""
import json
from pathlib import Path
T = Path(__file__).resolve().parents[1] / 'templates'
FPS = 60
ACC = ["safe-area", "cjk-font-render", "continuous-motion-windows", "handoff-continuity", "full-mp4-decode", "audio-and-caption-review"]
def F(s): return int(round(s * FPS))
ANCH = {'cta-outro': [{'id': 'ask', 'atFrame': 60, 'desc': '提问气泡出现'}, {'id': 'bye', 'atFrame': 144, 'desc': '道别页转入'}, {'id': 'next', 'atFrame': 204, 'desc': '下期预告出现'}], 'hook-opener': [{'id': 'title', 'atFrame': 9, 'desc': '结论巨字砸下'}, {'id': 'proof', 'atFrame': 156, 'desc': '证据页转入'}], 'compare-verdict': [{'id': 'winner', 'atFrame': 204, 'desc': '胜者揭晓'}], 'chapter-card': [{'id': 'no', 'atFrame': 6, 'desc': '章节号砸下'}], 'term-explainer': [{'id': 'center', 'atFrame': 12, 'desc': '中心概念出现'}]}
def write(tid, title, use, slots, scenes_c, windows, holds, presenter, handoffs, camera, impl, example, readme, theme='dark-tech', layers=None):
    d = T / tid; d.mkdir(parents=True, exist_ok=True)
    dur = scenes_c[-1][2]
    c = {"schema": "dayan-motion/1", "templateId": tid, "version": "1.0.0", "status": "candidate", "engine": "dayan-html", "title": title, "use": use, "theme": theme,
         "author": "大琰DAYAN", "composition": {"id": tid, "width": 1920, "height": 1080, "fps": FPS, "durationInFrames": F(dur), "layout": "landscape"},
         "inputSlots": slots,
         "layers": layers or [{"id": "world", "role": "background", "z": 0}, {"id": "presenter", "role": "presenter", "z": 1}, {"id": "content", "role": "content", "z": 2}, {"id": "type", "role": "typography", "z": 3}, {"id": "subs", "role": "captions", "z": 8}],
         "scenes": [{"id": i, "role": r, "startFrame": F(a), "endFrame": F(b), "entryState": en, "exitState": ex, "maxHoldFrames": mh} for i, r, a, b, en, ex, mh in [(s[0], s[3], s[1], s[2], s[4], s[5], s[6]) for s in scenes_c]],
         "motionWindows": [{"id": i, "sceneId": sc, "startFrame": F(a), "endFrame": F(b), "kind": k, "protected": True} for i, sc, a, b, k in windows],
         "holds": [{"atFrame": F(a), "maxFrames": F(m), "minusFrames": F(n)} for a, m, n in holds],
         "cameraStates": [{"id": i, "startFrame": F(a), "endFrame": F(b), "target": tg, "scale": sc} for i, a, b, tg, sc in camera],
         "presenterStates": [{"atFrame": F(k["t"]), "state": k["state"], "pos": k.get("pos", "auto")} for k in presenter],
         "handoffs": [{"from": a, "to": b, "atFrame": F(t)} for a, b, t in handoffs],
         "anchors": ANCH.get(tid, []), "assets": [], "acceptance": ACC}
    old = d / 'template.motion.json'
    if old.exists():   # 保留手动设置的代表帧时间点
        prev = json.loads(old.read_text(encoding='utf-8'))
        for k in ('previewAt',):
            if k in prev and k not in c: c[k] = prev[k]
    (d / 'template.motion.json').write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8')
    impl['presenter'] = presenter
    (d / 'scene.json').write_text(json.dumps(impl, ensure_ascii=False, indent=1), encoding='utf-8')
    (d / 'example.payload.json').write_text(json.dumps(example, ensure_ascii=False, indent=1), encoding='utf-8')
    (d / 'README.md').write_text(readme.strip() + '\n', encoding='utf-8')

# 1 钩子开场 ---------------------------------------------------------------
write('hook-opener', '钩子开场：结论巨字 + 证据数字', '片头前 3–8 秒：先甩结论，再用一个数字或作品墙证明（对应参考片 A1 开场“打通了！→81”、风格 C“逐字稿工作流→X 万”）',
 [{"id": "title", "type": "text", "required": True, "maxLen": 10, "desc": "结论巨字，≤10 字，口播第一句的核心"},
  {"id": "highlight", "type": "text", "required": False, "default": "", "maxLen": 10, "desc": "标题里要染色的词"},
  {"id": "tag", "type": "text", "required": False, "default": "", "maxLen": 10, "desc": "斜贴的小标签（如 ONE PROMPT / 开诚布公）"},
  {"id": "number", "type": "number", "required": True, "desc": "证据数字"},
  {"id": "decimals", "type": "number", "required": False, "default": 0},
  {"id": "unit", "type": "text", "required": False, "default": "", "maxLen": 6},
  {"id": "label", "type": "text", "required": False, "default": "", "maxLen": 16, "desc": "数字上方小字"},
  {"id": "sub", "type": "text", "required": False, "default": "", "maxLen": 22, "desc": "数字下方一句话"}],
 [("hook", 0, 2.6, "claim", "presenter-full", "title-stamped", 120), ("proof", 2.6, 6.0, "evidence", "title-stamped", "number-settled", 360)],
 [("title-slam", "hook", 0.15, 0.75, "impact"), ("tag-stamp", "hook", 1.1, 1.65, "impact"), ("wall-push", "proof", 2.6, 3.2, "transition"), ("number-count", "proof", 2.9, 4.3, "count"), ("sub-rise", "proof", 4.2, 4.9, "text-reveal")],
 [(2.0, 2.0, 0.6), (5.5, 6.0, 0.4)],
 [{"t": 0, "state": "full"}, {"t": 2.45, "state": "circle", "pos": "br", "dur": 0.6}],
 [("hook.title", "proof.number", 2.6), ("hook.presenter", "proof.presenter-circle", 2.45)],
 [("hook-wide", 0, 2.6, "title", 1.0), ("proof-push", 2.6, 6.0, "number", 1.0)],
 {"scenes": [
   {"id": "hook", "t0": 0, "t1": 2.6, "energy": 2, "layers": [
     {"c": "title", "at": 0.15, "box": [0.05, 0.12, 0.62, 0.42], "props": {"text": "{{title}}", "hl": "{{highlight}}", "reveal": "slam", "size": 150, "style": "heavy"}},
     {"c": "stamp", "at": 1.1, "box": [0.06, 0.52, 0.34, 0.2], "props": {"text": "{{tag}}", "style": "tape", "rotate": -6, "size": 54, "shake": 8}}]},
   {"id": "proof", "t0": 2.6, "t1": 6.0, "energy": 2, "transition": {"type": "zoom-in", "dur": 0.6},
    "bg": [{"c": "bg-thumbs", "props": {"dur": 6, "from": 1.22, "to": 1.0, "dim": 0.5}}],
    "layers": [{"c": "number", "at": 2.85, "box": [0.06, 0.2, 0.6, 0.5], "props": {"value": "{{number}}", "decimals": "{{decimals}}", "unit": "{{unit}}", "label": "{{label}}", "sub": "{{sub}}", "size": 230, "dur": 1.2}}]}]},
 {"title": "打通了！", "highlight": "打通", "tag": "ONE PROMPT", "number": 81, "unit": "种风格", "label": "一句话做出来的", "sub": "每一种都能直接用"},
 """
# hook-opener · 钩子开场
**什么时候用**：口播第一句就是结论/成绩/反差时（"打通了""一句话做出来""万粉了"）。前 2.6 秒真人全屏 + 结论巨字砸下，随后作品墙推入、数字滚动定格，人物缩到右下圆窗。
**槽位**：title（≤10 字）· highlight · tag · number · decimals · unit · label · sub
**时间**：自然 6 秒；口播更长时只在"标题落定后"和"数字定格后"两个停留点加时间，砸字与数字滚动保持原速。
**调用**：`{"template":"hook-opener","t0":0,"t1":7.2,"slots":{...}}`
""")

# 2 章节页 ---------------------------------------------------------------
write('chapter-card', '章节页：#N 巨号 + 标题', '换章节 / 第二个兴奋点 / 第 N 步（对应 A1「#2 第二个兴奋点」、风格 C 章节铭牌）',
 [{"id": "no", "type": "text", "required": True, "maxLen": 6, "desc": "#2 / 02 / STEP 3"},
  {"id": "title", "type": "text", "required": True, "maxLen": 12}, {"id": "sub", "type": "text", "required": False, "default": "", "maxLen": 28},
  {"id": "c1", "type": "color", "required": False, "default": "#0A1C66"}, {"id": "c2", "type": "color", "required": False, "default": "#0D2380"}],
 [("chapter", 0, 2.4, "chapter-title", "any", "chapter-settled", 240)],
 [("no-slam", "chapter", 0.1, 0.5, "impact"), ("title-in", "chapter", 0.25, 1.0, "text-reveal")],
 [(1.3, 4.0, 0.4)],
 [{"t": 0, "state": "circle", "pos": "tr", "dur": 0.55}],
 [],
 [("chapter-hold", 0, 2.4, "no", 1.0)],
 {"scenes": [{"id": "chapter", "t0": 0, "t1": 2.4, "energy": 2, "transition": {"type": "push-left", "dur": 0.55},
   "bg": [{"c": "bg-burst", "props": {"c1": "{{c1}}", "c2": "{{c2}}", "rays": 18, "spin": 4, "halftone": False}}],
   "layers": [{"c": "chapter", "at": 0.1, "box": [0.06, 0.07, 0.7, 0.3], "props": {"no": "{{no}}", "title": "{{title}}", "sub": "{{sub}}", "style": "giant"}}]}]},
 {"no": "#2", "title": "第二个兴奋点", "sub": "EXCITING THING NO.2"},
 """
# chapter-card · 章节页
**什么时候用**：口播说"第二个…""接下来…""第 N 步"。巨号砸下、标题横移入场，人物收到右上圆窗；后续内容可以直接在这一页上继续叠加（章节号常驻左上）。
**槽位**：no · title · sub · c1/c2（放射底双色）
**时间**：自然 2.4 秒，可在 1.3 秒处最多加 4 秒停留，承载"本章第一句话"。
""", theme='hud-blue')

# 3 对比裁决 ---------------------------------------------------------------
write('compare-verdict', '对比裁决：A/B(/C) 逐张入场 → 胜者高亮', '两三个方案/工具/前后对比，最后点名胜者（对应 B2「GPT 裸跑 / GPT+skill / Opus 裸跑」、FOR ME → FOR YOU）',
 [{"id": "title", "type": "text", "required": True, "maxLen": 16}, {"id": "eyebrow", "type": "text", "required": False, "default": "COMPARE", "maxLen": 20},
  {"id": "items", "type": "list", "required": True, "minItems": 2, "maxItems": 3, "desc": "[{title, body, tag, big}]"},
  {"id": "winner", "type": "number", "required": False, "default": 1, "desc": "胜者序号（从 0 开始）"}, {"id": "op", "type": "text", "required": False, "default": "vs", "maxLen": 3}],
 [("compare", 0, 6.0, "comparison", "title", "winner-highlighted", 360)],
 [("title-in", "compare", 0.1, 0.9, "text-reveal"), ("cards-in", "compare", 0.9, 2.6, "build"), ("winner", "compare", 3.4, 4.1, "impact")],
 [(3.0, 6.0, 0.5), (5.0, 6.0, 0.6)],
 [{"t": 0, "state": "circle", "pos": "bl", "size": 0.22, "dur": 0.55}],
 [("compare.cards", "compare.winner", 3.4)],
 [("compare-wide", 0, 6.0, "items", 1.0)],
 {"scenes": [{"id": "compare", "t0": 0, "t1": 6.0, "energy": 2, "transition": {"type": "zoom-in", "dur": 0.55}, "bg": [{"c": "bg-wall", "props": {"skin": "platinum"}}],
   "layers": [{"c": "title", "at": 0.1, "box": [0.06, 0.06, 0.88, 0.2], "props": {"text": "{{title}}", "eyebrow": "{{eyebrow}}", "size": 78, "align": "center"}},
              {"c": "compare", "at": 0.9, "box": [0.06, 0.3, 0.88, 0.5], "props": {"items": "{{items}}", "op": "{{op}}", "winner": "{{winner}}", "winnerAt": 2.5, "stagger": 0.55}}]}]},
 {"title": "同一句话，三种结果", "items": [{"tag": "A", "title": "GPT 裸跑", "body": "像 PPT，能看但不会动"}, {"tag": "B", "title": "GPT + Skill", "body": "有版式，镜头还是硬"}, {"tag": "C", "title": "Opus 5.5", "body": "背景会动，镜头连贯", "big": "一次成型"}], "winner": 2},
 """
# compare-verdict · 对比裁决
**什么时候用**：口播在比较（"区别在哪""甩几条街""以前 vs 现在"）。卡片逐张飞入，说到胜者时高亮放大、其余变暗。
**时间**：自然 6 秒。口播更长时，时间优先加在"胜者揭晓前"（3.0 秒处，最多 +6 秒），让观众先看完每张卡；揭晓动作保持原速。
**槽位**：title · eyebrow · items(2–3) · winner · op
""")

# 4 术语讲解 ---------------------------------------------------------------
write('term-explainer', '术语讲解：章节水印 + 中心概念 + 卫星节点', '讲一个概念/名词由哪几部分组成（对应 D1的 Context/Harness 页、风格 C3 知识网络）',
 [{"id": "term", "type": "text", "required": True, "maxLen": 18, "desc": "术语（英文或中文）"}, {"id": "sub", "type": "text", "required": False, "default": "", "maxLen": 12},
  {"id": "items", "type": "list", "required": True, "minItems": 3, "maxItems": 6, "desc": "[{t, sub, icon}] 组成部分"},
  {"id": "watermark", "type": "text", "required": False, "default": "", "maxLen": 20}],
 [("term", 0, 7.0, "concept-map", "watermark", "network-settled", 600)],
 [("center-pop", "term", 0.2, 0.8, "enter"), ("satellites", "term", 0.8, 3.2, "build"), ("flow", "term", 3.2, 4.0, "act")],
 [(4.2, 10.0, 0.8)],
 [{"t": 0, "state": "pip", "pos": "bl", "size": 0.24, "dur": 0.55}],
 [("term.center", "term.satellites", 0.8)],
 [("term-wide", 0, 7.0, "center", 1.0)],
 {"scenes": [{"id": "term", "t0": 0, "t1": 7.0, "energy": 2, "transition": {"type": "push-left", "dur": 0.6},
   "bg": [{"c": "bg-watermark", "props": {"text": "{{watermark}}", "op": 0.07}}, {"c": "bg-glow"}],
   "layers": [{"c": "nodes", "at": 0.2, "box": [0.2, 0.08, 0.72, 0.76], "props": {"center": {"t": "{{term}}", "sub": "{{sub}}"}, "items": "{{items}}", "orbit": True, "stagger": 0.42}}]}]},
 {"term": "Agent", "sub": "智能体", "watermark": "Agent", "items": [{"t": "大模型", "icon": "cpu"}, {"t": "工具", "icon": "key"}, {"t": "记忆", "icon": "layers"}, {"t": "规划", "icon": "target"}, {"t": "执行", "icon": "bolt"}]},
 """
# term-explainer · 术语讲解
**什么时候用**：解释一个名词由哪些部分组成、或一个中心连着很多东西。中心概念弹出 → 组成部分沿连线飞出 → 光点在线上流动；背景是当前术语的斜体巨字水印，人物在左下圆角小窗。
**语义对齐**：items 里每项可写 `"cue":"工具"`，构建时自动对齐到说出这个词的时刻（提前 0.12 秒）。
""")

# 5 结尾 CTA ---------------------------------------------------------------
write('cta-outro', '结尾：关注点赞收藏 + 道别 + 下期预告', '片尾 5–10 秒（对应 A1 紫色放射 CTA → 黄色放射道别）。三个锚点可钉到口播关键词：ask / bye / next',
 [{"id": "ask", "type": "text", "required": False, "default": "觉得有用就点个关注吧", "maxLen": 18},
  {"id": "bye", "type": "text", "required": False, "default": "谢谢大家 · 下期再见", "maxLen": 14},
  {"id": "next", "type": "text", "required": False, "default": "", "maxLen": 18, "desc": "下期预告，空则不显示"}],
 [("ask", 0, 2.4, "call-to-action", "any", "buttons-shown", 360), ("bye", 2.4, 5.0, "farewell", "buttons-shown", "signed", 360)],
 [("buttons", "ask", 0.2, 1.3, "build"), ("bubble", "ask", 1.0, 1.6, "enter"), ("bye-in", "bye", 2.4, 3.1, "transition"), ("next-in", "bye", 3.4, 3.9, "enter")],
 [(1.8, 6.0, 0.6), (3.2, 4.0, 0.0), (4.2, 4.0, 0.0)],
 [{"t": 0, "state": "circle", "pos": "bl", "dur": 0.6}, {"t": 2.3, "state": "circle-big", "dur": 0.7}],
 [("ask.presenter", "bye.presenter-big", 2.3), ("ask.buttons", "bye.title", 2.4)],
 [("ask", 0, 2.4, "buttons", 1.0), ("bye", 2.4, 5.0, "presenter", 1.0)],
 {"scenes": [
   {"id": "ask", "t0": 0, "t1": 2.4, "energy": 2, "transition": {"type": "iris", "dur": 0.7}, "bg": [{"c": "bg-burst", "props": {"c1": "#6A2CF0", "c2": "#7E45FF", "cloud": True}}],
    "layers": [{"c": "chips", "at": 0.2, "box": [0.2, 0.08, 0.6, 0.14], "props": {"align": "center", "style": "sticker", "size": 40, "items": [{"t": "+ 关注"}, {"t": "♥ 点赞", "tone": "warn"}, {"t": "★ 收藏", "tone": "hl"}], "stagger": 0.3}},
               {"c": "bubble", "at": 1.0, "box": [0.22, 0.34, 0.56, 0.26], "props": {"text": "{{ask}}", "style": "cloud"}}]},
   {"id": "bye", "t0": 2.4, "t1": 5.0, "energy": 1, "transition": {"type": "zoom-in", "dur": 0.6}, "bg": [{"c": "bg-burst", "props": {"c1": "#F5A300", "c2": "#FFC21A", "cloud": True}}],
    "layers": [{"c": "title", "at": 2.6, "box": [0.15, 0.56, 0.7, 0.14], "props": {"text": "{{bye}}", "align": "center", "size": 70, "color": "#111", "reveal": "chars"}},
               {"c": "confetti", "at": 2.55, "box": "full", "props": {"x": 0.5, "y": 0.3, "count": 70}},
               {"c": "chips", "at": 3.4, "box": [0.2, 0.72, 0.6, 0.1], "props": {"align": "center", "style": "solid", "size": 34, "items": [{"t": "{{next}}", "icon": "play", "tone": "dark"}]}}]}]},
 {"ask": "大家敬请期待", "bye": "我们下期再见", "next": "下期：自动剪辑口播"},
 """
# cta-outro · 结尾
**什么时候用**：口播出现"关注/点赞/收藏/下期/再见"。紫色放射 + 云朵，三个按钮逐个弹出、问句气泡；说"下期再见"时人物放大到中央，换暖黄放射底，彩纸收尾，再出下期预告。
**锚点**：ask（提问气泡）· bye（道别标题）· next（下期预告）。在 edit 里钉到关键词：
`{"template":"cta-outro","t0":75.1,"t1":81.55,"pin":{"bye":{"cue":"下期再见"},"next":{"cue":"下期我给大家"}},"slots":{...}}`
内置动效只在停留点（1.8s / 3.2s / 4.2s）伸缩，让道别与预告正好落在说出这几个字的时候；按钮弹出、转场等动作保持原速。
**没有真人画面时**：加 `"presenter": false`，内置动效不改动人物窗。
""", theme='violet-dream')
print('templates ok')
