# 范例：《Claude vs Codex 动画实测》edit.json 生成器（16:9 1080P60，纯录屏口播，人物全程 hidden）
# 每段：按口播语义挑主画面（录屏窗口放大 / 清单 / 对比 / 数字 / 流程 / 进度 / 印章…），T("关键词") 取说出那个词的时间，元素卡在字上。
# 注：最终 edit.json 里的 "cover" 封面文案是生成后另外加的。
import json, re
import os
WD = os.path.dirname(os.path.abspath(__file__))   # 工作目录：work/words.json、work/master.mp4 放在这里（先跑 asr / cut / subs）
words = json.load(open(f'{WD}/work/words.json'))['words']
TXT = ''.join(w['w'] for w in words)
IDX = []
for i, w in enumerate(words):
    IDX += [i] * len(w['w'])

def T(kw, after=0.0):
    """口播里关键词第一次出现（after 之后）的开始时间（母版时钟）"""
    p = 0
    while True:
        k = TXT.find(kw, p)
        if k < 0: raise SystemExit(f'找不到关键词：{kw} after {after}')
        t = words[IDX[k]]['s']
        if t >= after: return round(t, 2)
        p = k + 1

WALL = lambda skin='platinum': [{"c": "bg-wall", "props": {"skin": skin}}]
DARK = [{"c": "bg-solid", "props": {"color": "#050507"}}]
REC_BOX = [0.035, 0.1, 0.6, 0.64]          # 全屏录屏窗（16:9 内容）
ANIM_R = 0.5 * 1920 / (0.75 * 1080)          # 动画裁切画面宽高比 ≈ 1.185
def abox(x, y, h):                          # 动画窗：按裁切比例给宽度（含 6% 标题栏）
    return [x, y, round(h * 1080 * ANIM_R / 1.07 / 1920, 4), h]
sc = []
def S(**k): sc.append(k); return k

# ======================= 片头 solo（0–10.2s，120 BPM，一小节 2s）=======================
S(id="m0-horizon", t0=0, t1=2.0, energy=0, say="（片头 solo · 电影感开场）", bg=DARK, layers=[
  {"c": "fx-horizon-title", "at": 0, "box": [0, 0, 1, 1], "props": {"title": "大琰DAYAN-AI", "sub": "Claude vs Codex · 动画实测", "tint": "gold", "dur": 1.3, "titleAt": 0.2, "from": 0.95, "to": 0.7, "barsOut": 1.72}}])
S(id="m1-same", t0=2.0, t1=4.0, energy=3, transition={"type": "flash", "dur": 0.16}, transitionSfx="impact", bg=WALL('gold'), layers=[
  {"c": "window", "at": 1.8, "box": abox(0.06, 0.1, 0.7), "props": {"chrome": "mac", "dark": True, "title": "鹈鹕的海边日落骑行", "badge": "Opus 5.5", "seq": "@sun", "fit": "cover"}},
  {"c": "title", "at": 2.3, "box": [0.58, 0.24, 0.38, 0.22], "props": {"eyebrow": "同一句提示词", "text": "纯代码动画", "hl": "代码", "reveal": "slam", "size": 96}},
  {"c": "chips", "at": 3.0, "box": [0.58, 0.5, 0.38, 0.1], "props": {"style": "solid", "size": 36, "items": [{"t": "不是视频模型", "icon": "code", "tone": "accent"}]}}])
S(id="m2-ten", t0=4.0, t1=6.0, energy=3, transition={"type": "split", "dur": 0.4}, bg=WALL('obsidian'), layers=[
  {"c": "number", "at": 4.3, "box": [0.05, 0.16, 0.46, 0.56], "props": {"value": 10, "from": 1, "unit": "倍", "label": "响应速度", "size": 340, "dur": 0.4, "align": "center"}},
  {"c": "stamp", "at": 5.05, "box": [0.56, 0.26, 0.38, 0.28], "props": {"text": "夯爆了", "style": "box", "rotate": -7, "size": 140, "tone": "accent", "shake": 12}}])
S(id="m3-vs", t0=6.0, t1=8.0, energy=3, transition={"type": "rect", "dur": 0.4}, bg=WALL('acid'), layers=[
  {"c": "compare", "at": 5.95, "box": [0.1, 0.14, 0.8, 0.6], "props": {"op": "vs", "items": [
     {"title": "Codex", "body": "日常 · 综合 · 性价比", "tag": "用了半年", "icon": "code"},
     {"title": "Claude", "body": "复杂 · 要快 · 动画", "tag": "用了两周", "icon": "spark"}]}}])
S(id="m4-title", t0=8.0, t1=10.2, energy=3, transition={"type": "text-mask", "dur": 0.5, "text": "VS"}, bg=[{"c": "bg-burst", "props": {"c1": "#15161C", "c2": "#24262F"}}], layers=[
  {"c": "burst", "at": 8.8, "box": [0.1, 0.18, 0.8, 0.6], "props": {"lines": 40, "dur": 0.6}},
  {"c": "title", "at": 8.8, "box": [0.04, 0.3, 0.92, 0.32], "props": {"text": "Claude vs Codex", "hl": "Claude", "reveal": "slam", "size": 150, "align": "center", "shake": 14, "sub": "半年 vs 两周 · 真实使用体验", "subAt": 0.35}}])
SPRITE = [
 {"t": 0.9, "x": 0.5, "y": 0.78, "act": "pop"}, {"t": 1.3, "x": 0.5, "y": 0.78, "act": "pop"}, {"t": 1.75, "x": 0.5, "y": 0.78, "act": "wave"},
 {"t": 2.35, "x": 0.3, "y": 0.105, "act": "jump", "h": 0.3}, {"t": 2.8, "x": 0.4, "y": 0.105, "act": "run"},
 {"t": 3.25, "x": 0.4, "y": 0.105, "act": "click", "target": [0.66, 0.55]},
 {"t": 4.05, "x": 0.12, "y": 0.8, "act": "flip", "h": 0.4}, {"t": 4.5, "x": 0.5, "y": 0.8, "act": "roll"},
 {"t": 4.85, "x": 0.75, "y": 0.2, "act": "jump", "h": 0.2}, {"t": 5.05, "x": 0.75, "y": 0.2, "act": "stomp", "target": [0.75, 0.4]},
 {"t": 5.6, "x": 0.75, "y": 0.2, "act": "cast", "target": [0.28, 0.4]},
 {"t": 6.25, "x": 0.3, "y": 0.13, "act": "flip", "h": 0.25}, {"t": 6.8, "x": 0.3, "y": 0.13, "act": "stomp", "target": [0.3, 0.3]},
 {"t": 7.15, "x": 0.7, "y": 0.13, "act": "jump", "h": 0.15}, {"t": 7.45, "x": 0.7, "y": 0.13, "act": "stomp", "target": [0.7, 0.3]},
 {"t": 8.1, "x": 0.5, "y": 0.84, "act": "jump", "h": 0.25}, {"t": 8.75, "x": 0.5, "y": 0.84, "act": "charge"},
 {"t": 9.2, "x": 0.88, "y": 0.28, "act": "jump", "h": 0.15, "dir": -1}, {"t": 9.55, "x": 0.88, "y": 0.28, "act": "wave", "dir": -1},
 {"t": 9.85, "x": 0.88, "y": 0.28, "act": "bow", "dir": -1}, {"t": 10.05, "x": 0.88, "y": 0.28, "act": "exit", "dir": -1}]

# ======================= 正片 =======================
# 1 开场：半年 vs 两周
t_hi = 10.2
S(id="s01-hello", t0=10.2, t1=22.15, energy=2, transition={"type": "flash", "dur": 0.2}, transitionSfx="impact",
  say="嘿朋友们大家好 / 我用了快半年的 Codex，以及用了两周的 Claude", bg=WALL(), layers=[
  {"c": "title", "at": 10.3, "out": 13.2, "box": [0.1, 0.3, 0.8, 0.3], "props": {"eyebrow": "大琰DAYAN-AI", "text": "嘿，朋友们", "hl": "朋友们", "size": 130, "align": "center", "reveal": "chars"}},
  {"c": "compare", "at": T('半年') - 0.5, "box": [0.08, 0.12, 0.84, 0.62], "props": {"op": "vs", "items": [
     {"title": "Codex", "body": "OpenAI · GPT", "tag": "用了快半年", "big": "半年", "icon": "code"},
     {"title": "Claude", "body": "Anthropic", "tag": "用了两周", "big": "两周", "icon": "spark", "at": round(T('两周') - T('半年') + 0.3, 2)}]}},
  {"c": "chips", "at": T('open') - 0.1, "box": [0.08, 0.76, 0.4, 0.07], "props": {"style": "tag", "size": 28, "items": [{"t": "GPT = OpenAI Codex", "icon": "code"}]}}])
S(id="s02-topic", t0=22.15, t1=25.0, energy=2, transition={"type": "text-mask", "dur": 0.7, "text": "动画"}, look="b-film",
  say="关于动画制作的一个经验小分享", layers=[
  {"c": "title", "at": 22.3, "box": [0.06, 0.26, 0.88, 0.36], "props": {"eyebrow": "经验小分享", "text": "动画制作实测", "hl": "动画", "reveal": "slam", "size": 150, "align": "center", "style": "serif"}}])

# 2 录屏：同一句提示词 · 中等推理
S(id="s03-screen", t0=25.0, t1=34.95, energy=1, transition={"type": "line", "dur": 0.5},
  say="我们先来看一看屏幕上的动画 / 两个提示词一模一样 / 这个文件也是这个动画", bg=WALL(), layers=[
  {"c": "window", "share": "rec", "at": 25.05, "box": REC_BOX, "props": {"chrome": "browser", "title": "Claude · 实测录屏", "badge": "实拍", "seq": "@rec", "fit": "cover",
     "zoom": [{"at": 0.3, "x": 0.5, "y": 0.5, "s": 1.0, "dur": 0.1},
              {"at": round(T('提示词') - 25.05 - 0.3, 2), "x": 0.2, "y": 0.55, "s": 1.9, "dur": 1.0},
              {"at": round(T('这个文件') - 25.05, 2), "x": 0.28, "y": 0.3, "s": 1.7, "dur": 0.9}],
     "highlight": [{"at": round(T('一模一样') - 25.05 - 0.2, 2), "box": [0.3, 0.44, 0.2, 0.05], "label": "同一句提示词", "out": round(T('这个文件') - 25.05 - 0.2, 2)}]}},
  {"c": "title", "at": T('提示词') - 0.2, "box": [0.665, 0.2, 0.31, 0.3], "props": {"eyebrow": "测试条件", "text": "提示词", "hl": "提示词", "size": 84, "sub": "两次一模一样", "subAt": round(T('一模一样') - T('提示词'), 2)}},
  {"c": "chips", "at": T('这个文件') - 0.1, "box": [0.665, 0.56, 0.31, 0.2], "props": {"dir": "col", "style": "glass", "size": 32, "items": [
     {"t": "帮我制作一个鹈鹕骑自行车的动画", "icon": "chat", "at": 0}]}}])
S(id="s04-model", t0=34.95, t1=42.0, energy=1, transition={"type": "morph", "dur": 0.7},
  say="这个动画选择的模型是 Opus 5.5 / 推理强度是中等", bg=WALL(), layers=[
  {"c": "window", "share": "rec", "at": 34.95, "box": REC_BOX, "props": {"chrome": "browser", "title": "Claude · 实测录屏", "badge": "实拍", "seq": "@rec", "fit": "cover",
     "zoom": [{"at": 0.0, "x": 0.3, "y": 0.35, "s": 1.25, "dur": 0.6}, {"at": round(T('五点五') - 34.95 - 0.4, 2), "x": 0.72, "y": 0.78, "s": 1.9, "dur": 1.0}],
     "highlight": [{"at": round(T('中等', 36) - 34.95 - 0.15, 2), "box": [0.665, 0.875, 0.1, 0.04], "label": "Opus 5.5 · Medium"}]}},
  {"c": "chips", "at": 37.1, "box": [0.665, 0.2, 0.31, 0.4], "props": {"dir": "col", "style": "glass", "size": 40, "items": [
     {"t": "Opus 5.5", "icon": "cpu", "sub": "模型", "at": 0},
     {"t": "中等", "icon": "layers", "sub": "推理强度", "tone": "accent", "at": round(T('中等', 36) - 37.1, 2)}]}}])
S(id="s05-wow", t0=42.0, t1=52.7, energy=2, transition={"type": "push-left", "dur": 0.55}, look="a-blue",
  say="做出来的效果，说实话，单这个中等推理强度都可以夯爆了 / 比 Codex GPT 强太多了", layers=[
  {"c": "window", "share": "anim", "at": 41.9, "box": abox(0.035, 0.075, 0.74), "props": {"chrome": "mac", "title": "鹈鹕骑自行车 · 中等推理", "badge": "Medium", "seq": "@anim", "fit": "cover"}},
  {"c": "title", "at": T('说实话') - 0.15, "out": T('都可以') - 0.2, "box": [0.66, 0.24, 0.32, 0.26], "props": {"eyebrow": "做出来的效果", "text": "说实话", "size": 90, "sub": "单是中等推理强度", "subAt": round(T('中等推理') - T('说实话'), 2)}},
  {"c": "stamp", "at": T('都可以') + 0.55, "box": [0.66, 0.18, 0.3, 0.24], "props": {"text": "夯爆了", "style": "box", "rotate": -6, "size": 120, "tone": "accent", "shake": 10}},
  {"c": "chips", "at": T('简单来说') - 0.1, "box": [0.66, 0.5, 0.31, 0.22], "props": {"dir": "col", "style": "glass", "size": 34, "items": [
     {"t": "比 Codex GPT", "icon": "code", "at": 0}, {"t": "强太多了", "icon": "up", "tone": "accent", "at": round(T('强太多') - T('简单来说'), 2)}]}}])
S(id="s06-check", t0=52.7, t1=66.0, energy=2, transition={"type": "morph", "dur": 0.7}, look="wall-jade",
  say="逻辑性、物理性、动效合理性都符合 / 挑不出毛病 / 无非美观程度可能缺少点感觉", layers=[
  {"c": "window", "share": "anim", "at": 52.6, "box": abox(0.035, 0.075, 0.74), "props": {"chrome": "mac", "title": "鹈鹕骑自行车 · 中等推理", "badge": "Medium", "seq": "@anim", "fit": "cover"}},
  {"c": "checklist", "at": T('逻辑') - 0.5, "box": [0.66, 0.12, 0.32, 0.6], "props": {"title": "逐项检查", "style": "log", "items": [
     {"t": "逻辑性", "state": "ok", "at": 0.45}, {"t": "物理性", "state": "ok", "at": round(T('物理') - T('逻辑') + 0.4, 2)},
     {"t": "动效合理性", "state": "ok", "at": round(T('合理') - T('逻辑') + 0.4, 2)},
     {"t": "美观程度", "state": "warn", "note": "缺少点感觉", "at": round(T('美观') - T('逻辑') + 0.3, 2)}]}},
  {"c": "stamp", "at": T('挑不出') + 0.2, "out": T('美观') - 0.3, "box": [0.3, 0.6, 0.3, 0.16], "props": {"text": "挑不出毛病", "style": "tape", "rotate": -5, "size": 64, "tone": "accent"}}])

# 3 高推理：完全不一样
S(id="s07-high", t0=66.0, t1=80.0, energy=2, transition={"type": "wipe-diag", "dur": 0.6}, look={"name": "d-neon", "text": "HIGH"},
  say="下面这个同样是 Opus 5.5 / 推理强度变成高 / 同一句提示词 / 效果完全不一样", layers=[
  {"c": "strike", "at": T('下面这个') - 0.2, "box": [0.05, 0.2, 0.42, 0.34], "out": T('效果', 73) - 0.4, "props": {"from": "推理强度 · 中等", "to": "推理强度 · 高", "strikeAt": round(T('变成高') - T('下面这个') + 0.2, 2), "toAt": round(T('变成高') - T('下面这个') + 0.6, 2), "size": 64, "layout": "stack"}},
  {"c": "chips", "at": T('同一句') - 0.15, "box": [0.05, 0.58, 0.42, 0.1], "out": T('效果', 73) - 0.4, "props": {"style": "glass", "size": 34, "items": [{"t": "同一句提示词", "icon": "chat"}]}},
  {"c": "chips", "at": T('五点五', 64) - 0.15, "box": [0.05, 0.7, 0.42, 0.08], "out": T('效果', 73) - 0.4, "props": {"style": "tag", "size": 30, "items": [{"t": "模型不变", "icon": "cpu"}]}},
  {"c": "fx-before-after", "at": T('效果', 73) - 0.3, "box": [0.04, 0.22, 0.44, 0.44], "props": {"before": {"label": "中等推理", "t": "白天乡间小路"}, "after": {"label": "高推理", "t": "海边日落骑行"}, "revealAt": round(T('完全不一样') - T('效果', 73) + 0.55, 2), "revealDur": 0.5}},
  {"c": "window", "share": "anim", "at": 66.1, "box": abox(0.5, 0.075, 0.74), "props": {"chrome": "mac", "dark": True, "title": "同一句提示词 · 高推理", "badge": "High", "seq": "@anim", "fit": "cover"}}])
S(id="s08-detail", t0=80.0, t1=91.2, energy=2, transition={"type": "morph", "dur": 0.75}, look="a-violet",
  say="海上的倒影 / 波浪的波纹 / 还有小鸟 / 全是动画画出来的，不是视频生成模型", layers=[
  {"c": "window", "share": "anim", "at": 80.0, "box": abox(0.2, 0.06, 0.78), "props": {"chrome": "mac", "dark": True, "title": "同一句提示词 · 高推理", "badge": "High", "seq": "@anim", "fit": "cover",
     "zoom": [{"at": round(T('倒影') - 80 - 0.3, 2), "x": 0.75, "y": 0.62, "s": 1.7, "dur": 0.9},
              {"at": round(T('波纹') - 80 - 0.4, 2), "x": 0.35, "y": 0.66, "s": 1.6, "dur": 0.8},
              {"at": round(T('小鸟') - 80 - 0.3, 2), "x": 0.3, "y": 0.24, "s": 1.8, "dur": 0.8},
              {"at": round(T('当然') - 80, 2), "x": 0.5, "y": 0.5, "s": 1.0, "dur": 0.9}],
     "callouts": [{"at": round(T('倒影') - 80 + 0.4, 2), "x": 0.72, "y": 0.55, "text": "海上的倒影", "out": round(T('波纹') - 80 - 0.4, 2)},
                  {"at": round(T('波纹') - 80 + 0.3, 2), "x": 0.4, "y": 0.6, "text": "波浪的波纹", "out": round(T('小鸟') - 80 - 0.4, 2)},
                  {"at": round(T('小鸟') - 80 + 0.4, 2), "x": 0.32, "y": 0.25, "text": "还有小鸟", "out": round(T('当然') - 80, 2)}]}},
  {"c": "stamp", "at": T('视频生成') - 0.1, "box": [0.03, 0.5, 0.3, 0.2], "props": {"text": "纯代码动画", "sub": "不是视频生成模型", "style": "box", "rotate": -6, "size": 64, "tone": "accent", "shake": 8}}])
S(id="s09-bell", t0=91.2, t1=101.15, energy=3, transition={"type": "morph", "dur": 0.6}, look="b-film",
  say="还有个铃铛，铃铛一按 / 它戴着眼镜 / 整个氛围非常炫酷 / 太夯了，真的夯爆了 / 夯到爆", layers=[
  {"c": "window", "share": "anim", "at": 91.2, "box": abox(0.035, 0.075, 0.74), "props": {"chrome": "mac", "dark": True, "title": "同一句提示词 · 高推理", "badge": "High", "seq": "@anim", "fit": "cover",
     "zoom": [{"at": round(T('铃铛') - 91.2 - 0.2, 2), "x": 0.45, "y": 0.95, "s": 1.6, "dur": 0.8},
              {"at": round(T('眼镜') - 91.2 - 0.4, 2), "x": 0.56, "y": 0.3, "s": 1.9, "dur": 0.8},
              {"at": round(T('氛围') - 91.2, 2), "x": 0.5, "y": 0.5, "s": 1.0, "dur": 1.0}],
     "cursor": [{"at": round(T('铃铛') - 91.2, 2), "x": 0.6, "y": 0.75}, {"at": round(T('一按') - 91.2 + 0.1, 2), "x": 0.42, "y": 0.93, "click": True, "dur": 0.6}],
     "callouts": [{"at": round(T('眼镜') - 91.2 + 0.3, 2), "x": 0.4, "y": 0.22, "text": "还戴着眼镜", "out": round(T('氛围') - 91.2, 2)}]}},
  {"c": "title", "at": T('氛围') - 0.1, "out": T('太憨') - 0.25, "box": [0.66, 0.26, 0.32, 0.26], "props": {"eyebrow": "整个氛围", "text": "非常炫酷", "hl": "炫酷", "size": 92}},
  {"c": "burst", "at": T('夯爆') - 0.1, "box": [0.6, 0.12, 0.4, 0.6], "props": {"lines": 32, "dur": 0.6}},
  {"c": "title", "at": T('夯爆') - 0.15, "box": [0.64, 0.2, 0.34, 0.3], "props": {"text": "夯爆了！", "hl": "夯爆", "reveal": "slam", "size": 128, "shake": 14}},
  {"c": "stamp", "at": T('就是', 97) + 0.4, "box": [0.68, 0.52, 0.28, 0.18], "props": {"text": "夯到爆", "style": "tape", "rotate": -7, "size": 76, "tone": "accent"}},
  {"c": "confetti", "at": T('就是', 97) + 0.4, "box": [0, 0, 1, 0.8], "props": {}}])
S(id="s10-speed", t0=101.15, t1=111.4, energy=2, transition={"type": "morph", "dur": 0.6}, look="wall-chrome",
  say="再把速度提起来 / 完全无可挑剔 / 找不出任何问题", layers=[
  {"c": "window", "share": "anim", "at": 101.15, "box": abox(0.035, 0.075, 0.74), "props": {"chrome": "mac", "dark": True, "title": "同一句提示词 · 高推理", "badge": "High", "seq": "@anim", "fit": "cover",
     "zoom": [{"at": 0.1, "x": 0.56, "y": 0.9, "s": 1.5, "dur": 0.7}, {"at": 2.6, "x": 0.5, "y": 0.5, "s": 1.0, "dur": 1.0}],
     "highlight": [{"at": 0.6, "box": [0.48, 0.9, 0.16, 0.06], "label": "速度提起来", "out": 2.6}]}},
  {"c": "chips", "at": T('速度') - 0.1, "out": T('无无') - 0.2, "box": [0.66, 0.3, 0.3, 0.1], "props": {"style": "solid", "size": 40, "items": [{"t": "速度提起来", "icon": "bolt", "tone": "accent"}]}},
  {"c": "title", "at": T('无无') + 0.1, "box": [0.64, 0.22, 0.34, 0.3], "props": {"eyebrow": "加速之后", "text": "无可挑剔", "hl": "无可挑剔", "reveal": "slam", "size": 100, "style": "serif"}},
  {"c": "chips", "at": T('找不出') - 0.1, "box": [0.64, 0.56, 0.34, 0.1], "props": {"style": "solid", "size": 34, "items": [{"t": "找不出任何问题", "icon": "check", "tone": "accent"}]}}])
S(id="s11-god", t0=111.4, t1=120.65, energy=3, transition={"type": "push-left", "dur": 0.55}, look="c-wall-gold",
  say="在动画生成能力上 / Claude 真的是动画生成界 / 古希腊神一样的存在", layers=[
  {"c": "logo", "at": T('动画生成能力') - 0.3, "box": [0.36, 0.1, 0.28, 0.2], "props": {"text": "Claude", "sub": "动画生成能力", "icon": "spark", "style": "glass"}},
  {"c": "chips", "at": T('不得不说', 113) - 0.1, "out": T('古希腊') - 0.3, "box": [0.3, 0.44, 0.4, 0.08], "props": {"style": "glass", "size": 34, "align": "center", "items": [{"t": "小测试的结论", "icon": "target"}]}},
  {"c": "title", "at": T('古希腊') - 0.2, "box": [0.06, 0.34, 0.88, 0.3], "props": {"eyebrow": "古希腊级别", "text": "动画界之神", "hl": "神", "reveal": "slam", "size": 108, "align": "center", "style": "serif", "shake": 10}},
  {"c": "sticker", "at": T('古希腊') + 0.5, "box": [0.78, 0.22, 0.12, 0.16], "props": {"icon": "crown", "style": "round", "rotate": 12, "bob": True}}])

# 4 使用体验：反应速度
S(id="s12-chapter", t0=120.65, t1=127.1, energy=2, transition={"type": "text-mask", "dur": 0.75, "text": "VS"}, look="a-violet",
  say="根据我用了半年的 Codex 和两周的 Claude 来说", layers=[
  {"c": "chapter", "at": 120.8, "box": [0.06, 0.1, 0.5, 0.2], "props": {"no": "02", "title": "使用体验", "sub": "半年 vs 两周", "style": "eyebrow"}},
  {"c": "compare", "at": T('半年', 120) - 0.4, "box": [0.1, 0.32, 0.8, 0.44], "props": {"op": "vs", "items": [
     {"title": "Codex", "tag": "半年", "icon": "code", "body": "OpenAI"}, {"title": "Claude", "tag": "两周", "icon": "spark", "body": "Anthropic", "at": round(T('两周', 120) - T('半年', 120) + 0.4, 2)}]}},
  {"c": "chips", "at": T('来说', 125) - 0.1, "box": [0.3, 0.78, 0.4, 0.07], "props": {"style": "tag", "size": 28, "align": "center", "items": [{"t": "我的真实使用体验", "icon": "user"}]}}])
S(id="s13-slow", t0=127.1, t1=134.75, energy=2, transition={"type": "push-left", "dur": 0.55}, look="d-hud",
  say="反应程度上 / Codex 可能要先思考中、思考中 / 然后可能还会断线", layers=[
  {"c": "title", "at": 127.2, "box": [0.05, 0.12, 0.4, 0.22], "props": {"eyebrow": "对比 01", "text": "反应速度", "hl": "速度", "size": 92}},
  {"c": "chat", "at": T('正常来说') - 0.4, "box": [0.5, 0.1, 0.45, 0.66], "props": {"title": "Codex", "icon": "code", "dark": True, "msgs": [
     {"who": "me", "t": "帮我改一个小问题", "at": 0.2},
     {"who": "ai", "t": "思考中… 思考中…", "think": 3.0, "at": round(T('思考中') - T('正常来说') + 0.4, 2)}]}},
  {"c": "stamp", "at": T('断线') - 0.05, "box": [0.08, 0.44, 0.34, 0.2], "props": {"text": "断线了", "style": "box", "rotate": -8, "size": 92, "tone": "red", "shake": 10}}])
S(id="s14-wait", t0=134.75, t1=147.2, energy=2, transition={"type": "push-left", "dur": 0.55}, look="wall-obsidian",
  say="很小的任务一拖半小时、一个小时 / 改个小问题三十分钟一小时起步 / 相信大家都经历过", layers=[
  {"c": "progress", "at": 134.85, "out": T('三十分钟') - 0.3, "box": [0.06, 0.2, 0.88, 0.42], "props": {"title": "Codex · 修改一个小问题", "icon": "code", "dark": True, "from": 0, "to": 12, "at": 0.4, "dur": 5.5, "steps": ["思考中", "思考中", "还在思考…"]}},
  {"c": "number", "at": T('三十分钟') - 0.15, "box": [0.06, 0.12, 0.56, 0.58], "props": {"value": 30, "from": 0, "unit": "分钟起步", "label": "改个小代码", "sub": "一个小时也很常见", "size": 300, "dur": 0.9}},
  {"c": "bubble", "at": T('相信') - 0.1, "box": [0.62, 0.3, 0.34, 0.22], "props": {"text": "用 Codex 都经历过吧", "style": "comment", "icon": "chat"}}])
S(id="s15-fast", t0=147.2, t1=161.05, energy=2, transition={"type": "push-left", "dur": 0.55}, look="a-blue",
  say="最近一两周用 Claude / 口播剪辑、生成动画、做什么事 / 任务给它，三五分钟", layers=[
  {"c": "title", "at": 147.3, "out": T('无论是') - 0.2, "box": [0.05, 0.12, 0.5, 0.22], "props": {"eyebrow": "对比 01 · 反应速度", "text": "换成 Claude", "hl": "Claude", "size": 92}},
  {"c": "checklist", "at": T('无论是') - 0.4, "box": [0.05, 0.38, 0.42, 0.4], "props": {"style": "log", "items": [
     {"t": "口播剪辑", "state": "ok", "at": 0.6}, {"t": "生成动画", "state": "ok", "at": round(T('生成一个动画') - T('无论是') + 0.3, 2)},
     {"t": "做什么都行", "state": "ok", "at": round(T('什么事情') - T('无论是') + 0.2, 2)}]}},
  {"c": "number", "at": T('三五分钟') - 0.2, "box": [0.5, 0.18, 0.46, 0.56], "props": {"value": 5, "from": 0, "text": "3–5", "unit": "分钟", "label": "任务交给它", "size": 280, "dur": 0.6, "align": "center"}}])
S(id="s16-ten", t0=161.05, t1=175.9, energy=3, transition={"type": "flash", "dur": 0.2}, transitionSfx="impact", look="a-lime",
  say="十倍 / 响应非常快 / 官方账号还是中转站都没得说 / 毕竟是万亿市值", layers=[
  {"c": "number", "at": 161.1, "out": T('无论我') - 0.3, "box": [0.1, 0.1, 0.8, 0.62], "props": {"value": 10, "from": 1, "unit": "倍", "label": "十倍 · 非常快", "size": 420, "dur": 0.5, "align": "center"}},
  {"c": "bars", "at": T('无论我') - 0.2, "box": [0.05, 0.14, 0.5, 0.5], "props": {"title": "改一个小任务要多久", "unit": "分钟", "items": [
     {"label": "Codex", "value": 30, "note": "30 分钟起步"}, {"label": "Claude", "value": 4, "note": "3–5 分钟", "tone": "accent"}]}},
  {"c": "chips", "at": T('官方') - 0.1, "box": [0.6, 0.16, 0.36, 0.3], "props": {"dir": "col", "style": "glass", "size": 36, "items": [
     {"t": "官方账号", "icon": "check", "at": 0}, {"t": "中转站", "icon": "check", "at": round(T('中转站') - T('官方'), 2)}, {"t": "响应速度没得说", "icon": "bolt", "tone": "accent", "at": round(T('没得说') - T('官方') - 0.4, 2)}]}},
  {"c": "number", "at": T('万亿') - 0.2, "box": [0.6, 0.5, 0.36, 0.26], "props": {"value": 1, "text": "万亿", "unit": "市值", "label": "有一定道理", "size": 120, "dur": 0.4}}])

# 5 KYC 提醒
S(id="s17-kyc", t0=175.9, t1=195.55, energy=2, transition={"type": "wipe-diag", "dur": 0.6}, look="a-red",
  say="注意：它会跳 KYC 认证 / 我两三个账号都跳了 / 护照 + 人脸识别后过了 / 中转很稳定", layers=[
  {"c": "stamp", "at": T('注意') - 0.1, "out": T('通过') - 0.3, "box": [0.06, 0.12, 0.4, 0.2], "props": {"text": "注意", "sub": "会跳 KYC 认证", "style": "box", "rotate": -5, "size": 96, "tone": "accent", "shake": 8}},
  {"c": "bubble", "at": T('当然', 180) - 0.1, "out": T('两个三个') - 0.3, "box": [0.08, 0.42, 0.34, 0.2], "props": {"text": "我自己也遇到了", "style": "comment", "icon": "user"}},
  {"c": "number", "at": T('两个三个') - 0.15, "box": [0.06, 0.4, 0.36, 0.36], "props": {"value": 3, "from": 0, "text": "2–3", "unit": "个账号", "label": "都跳了 KYC", "size": 180, "dur": 0.5}},
  {"c": "flow", "at": T('通过') - 0.4, "box": [0.48, 0.14, 0.48, 0.64], "props": {"dir": "col", "size": 40, "highlightLast": True, "steps": [
     {"t": "跳 KYC", "icon": "warn", "at": 0.2}, {"t": "护照", "icon": "doc", "at": round(T('护照') - T('通过') + 0.4, 2)},
     {"t": "人脸识别", "icon": "eye", "at": round(T('人脸') - T('通过') + 0.4, 2)}, {"t": "通过 · 没问题", "icon": "check", "at": round(T('过了') - T('通过') + 0.4, 2)}]}},
  {"c": "chips", "at": T('中转很稳定') - 0.4, "box": [0.06, 0.78, 0.4, 0.07], "props": {"style": "solid", "size": 30, "items": [{"t": "中转很稳定", "icon": "check", "tone": "accent"}]}}])

# 6 Codex 的优势
S(id="s18-codex", t0=195.55, t1=215.1, energy=2, transition={"type": "push-left", "dur": 0.55}, look="b-paper",
  say="Codex 官方和中转都在用 / 适合日常性、综合性 / 代码开发、开发业务、做 PPT / 比国内大模型强很多 / Agent 调教得好", layers=[
  {"c": "logo", "at": 195.65, "out": T('所以说', 199) - 0.3, "box": [0.12, 0.2, 0.4, 0.2], "props": {"text": "Codex", "sub": "OpenAI", "icon": "code", "style": "glass"}},
  {"c": "chips", "at": T('官方账号', 195) - 0.1, "out": T('所以说', 199) - 0.3, "box": [0.12, 0.46, 0.4, 0.08], "props": {"style": "glass", "size": 32, "items": [{"t": "官方账号", "icon": "check"}, {"t": "中转", "icon": "check", "at": round(T('中转', 197) - T('官方账号', 195), 2)}]}},
  {"c": "panel-stack", "at": T('所以说', 199) - 0.2, "box": [0.05, 0.08, 0.56, 0.74], "props": {"style": "ornate", "cards": [{"title": "Codex 适合什么", "sub": "官方账号 + 中转都在用", "icon": "code", "items": [
     {"icon": "layers", "t": "日常性 · 综合性", "d": "大部分日常任务", "at": round(T('日常性') - T('所以说', 199) + 0.2, 2)},
     {"icon": "code", "t": "代码开发", "d": "开发业务", "at": round(T('代码开发') - T('所以说', 199) + 0.2, 2)},
     {"icon": "doc", "t": "做个 PPT", "d": "办公文档", "at": round(T('ppt') - T('所以说', 199) - 0.1, 2)},
     {"icon": "up", "t": "比国内大模型强很多", "d": "Agent 调教得好", "at": round(T('国内') - T('所以说', 199) + 0.2, 2)}]}]}},
  {"c": "glow-quote", "at": T('毕竟人家') - 0.1, "box": [0.64, 0.3, 0.33, 0.3], "props": {"text": "Agent 调教得比较好", "hl": "Agent", "font": "tech", "size": 50}}])
S(id="s19-price", t0=215.1, t1=230.3, energy=2, transition={"type": "push-left", "dur": 0.55}, bg=WALL('gold'),
  say="GPT-6.1 Sol 这个 Codex / 是 GPT-6 Astra 五分之一的成本 / 每个月能做非常多的任务", layers=[
  {"c": "logo", "at": 215.2, "box": [0.05, 0.1, 0.4, 0.18], "props": {"text": "GPT-6.1 Sol", "sub": "Codex", "icon": "code", "style": "glass"}},
  {"c": "logo", "at": 217.2, "out": T('五分之一') + 0.5, "box": [0.52, 0.2, 0.4, 0.18], "props": {"text": "vs GPT-6 Astra", "sub": "旗舰模型", "icon": "cpu", "style": "glass"}},
  {"c": "number", "at": T('五分之一') - 0.2, "box": [0.05, 0.32, 0.42, 0.46], "props": {"value": 5, "from": 1, "text": "1/5", "unit": "成本", "label": "对比 GPT-6 Astra", "size": 240, "dur": 0.5}},
  {"c": "bars", "at": T('五分之一') + 0.7, "box": [0.52, 0.16, 0.44, 0.42], "props": {"title": "使用成本", "items": [
     {"label": "GPT-6 Astra", "value": 100}, {"label": "GPT-6.1 Sol", "value": 20, "tone": "accent", "note": "五分之一"}]}},
  {"c": "chips", "at": T('非常非常多') - 0.3, "box": [0.52, 0.64, 0.44, 0.1], "props": {"style": "solid", "size": 32, "items": [{"t": "每个月能做非常多任务", "icon": "bolt", "tone": "accent"}]}}])
S(id="s20-cache", t0=230.3, t1=244.85, energy=2, transition={"type": "push-left", "dur": 0.55}, look="d-hud",
  say="命中缓存以后输出价格很低 / 反复做代码开发、做文档 / 使用成本非常低 / 综合性能和性价比最高", layers=[
  {"c": "flow", "at": 230.4, "box": [0.05, 0.12, 0.9, 0.26], "props": {"dir": "row", "size": 38, "highlightLast": True, "steps": [
     {"t": "反复代码开发", "icon": "code", "at": round(T('代码开发', 233) - 230.4, 2)}, {"t": "做某个文档", "icon": "doc", "at": round(T('文档') - 230.4, 2)},
     {"t": "命中缓存", "icon": "target", "at": round(T('命中了') - 230.4, 2)}, {"t": "成本非常低", "icon": "down", "at": round(T('非常低') - 230.4 - 0.3, 2)}]}},
  {"c": "chips", "at": T('输出价格') - 0.2, "out": T('性价比') - 0.4, "box": [0.05, 0.44, 0.5, 0.1], "props": {"style": "glass", "size": 34, "items": [{"t": "命中缓存 → 输出价格很低", "icon": "money"}]}},
  {"c": "title", "at": T('性价比') - 0.3, "box": [0.3, 0.52, 0.66, 0.26], "props": {"eyebrow": "综合性能 · 性价比", "text": "最高的 Codex", "hl": "最高", "reveal": "slam", "size": 100, "align": "right"}}])

# 7 Claude 的“缺点”与结论
S(id="s21-token", t0=244.85, t1=253.65, energy=2, transition={"type": "wipe-diag", "dur": 0.6}, look="b-film",
  say="Claude 的优势：完成得太过于完美 / 最终导致比较浪费 Token", layers=[
  {"c": "logo", "at": 245.0, "out": T('完美', 247) - 0.5, "box": [0.1, 0.22, 0.4, 0.2], "props": {"text": "Claude", "sub": "它的优势是…", "icon": "spark", "style": "glass"}},
  {"c": "chips", "at": T('完成的任务') - 0.1, "out": T('完美', 247) - 0.4, "box": [0.1, 0.5, 0.4, 0.08], "props": {"style": "glass", "size": 32, "items": [{"t": "任务完成度拉满", "icon": "check"}]}},
  {"c": "title", "at": T('完美', 247) - 0.3, "box": [0.05, 0.16, 0.5, 0.36], "props": {"eyebrow": "Claude 的优势", "text": "太过于完美", "hl": "完美", "size": 110, "style": "serif"}},
  {"c": "sticker", "at": T('最终') - 0.2, "box": [0.66, 0.2, 0.22, 0.3], "props": {"icon": "fire", "text": "Token", "style": "round", "rotate": 8, "bob": True}},
  {"c": "stamp", "at": T('浪费') - 0.1, "box": [0.1, 0.56, 0.36, 0.18], "props": {"text": "费 Token", "style": "tape", "rotate": -6, "size": 80, "tone": "red"}}])
S(id="s22-verdict", t0=253.65, t1=266.6, energy=2, transition={"type": "wipe-diag", "dur": 0.6}, look="c-wall-gold",
  say="综上所述 / 复杂的、要快速解决的、比较急的问题丢给 Claude / 日常工作交给 Codex", layers=[
  {"c": "title", "at": 253.7, "box": [0.06, 0.06, 0.88, 0.16], "props": {"eyebrow": "综上所述", "text": "怎么分工？", "hl": "分工", "size": 76, "align": "center"}},
  {"c": "chips", "at": T('复杂') - 0.1, "out": T('日常', 262) - 0.3, "box": [0.08, 0.2, 0.84, 0.07], "props": {"style": "tag", "size": 28, "items": [{"t": "复杂的", "at": 0}, {"t": "要快速解决的", "at": round(T('快速') - T('复杂'), 2)}, {"t": "比较急的", "at": round(T('比较急') - T('复杂'), 2)}]}},
  {"c": "compare", "at": T('复杂') - 0.3, "box": [0.08, 0.3, 0.84, 0.48], "props": {"op": "vs", "items": [
     {"title": "丢给 Claude", "body": "复杂 · 要快 · 比较急", "tag": "输出非常完美", "icon": "spark", "tone": "accent"},
     {"title": "交给 Codex", "body": "日常工作 · 性价比", "tag": "正常做就行", "icon": "code", "at": round(T('日常', 262) - T('复杂') + 0.3, 2)}]}},
  {"c": "stamp", "at": T('完全没有') - 0.1, "box": [0.12, 0.7, 0.3, 0.14], "props": {"text": "完全没问题", "style": "tape", "rotate": -5, "size": 54, "tone": "accent"}}])

# 8 结尾
S(id="s23-outro", t0=266.6, t1=277.0, energy=3, transition={"type": "iris", "dur": 0.7}, look="a-red",
  say="经验分享就到这里 / 点赞关注加收藏，一键三连 / 我是大琰，下期再见", layers=[
  {"c": "chips", "at": 266.75, "out": T('就到这里') - 0.3, "box": [0.25, 0.4, 0.5, 0.1], "props": {"style": "glass", "size": 40, "align": "center", "items": [{"t": "我的使用经验", "icon": "bulb"}]}},
  {"c": "title", "at": T('就到这里') - 0.2, "out": T('点赞') - 0.6, "box": [0.06, 0.28, 0.88, 0.3], "props": {"eyebrow": "今天的分享", "text": "就到这里", "size": 120, "align": "center"}},
  {"c": "fx-cta-buttons", "at": T('点赞') - 0.6, "out": T('我是大') - 0.2, "box": [0.1, 0.18, 0.8, 0.5], "props": {"caption": "一键三连", "items": [
     {"kind": "like", "t": "点赞", "at": 0.6}, {"kind": "follow", "t": "关注", "at": round(T('关注', 270) - T('点赞') + 0.6, 2)}, {"kind": "save", "t": "收藏", "at": round(T('收藏', 270) - T('点赞') + 0.6, 2)}]}},
  {"c": "namecard", "at": T('我是大') - 0.1, "box": [0.1, 0.24, 0.8, 0.3], "props": {"name": "大琰DAYAN", "handle": "我们下期再见", "style": "big"}}])

E = {"schema": "dayan-edit/1", "title": "Claude vs Codex 动画实测",
  "canvas": {"w": 1920, "h": 1080, "fps": 60}, "theme": "film-warm",
  "signature": {"name": "大琰DAYAN", "pos": "tl", "enabled": False},
  "brand": {"name": "大琰DAYAN", "wall": ["大琰DAYAN-AI", "DAYAN · AI STUDIO"], "mark": "琰"},
  "master": "work/master.mp4", "words": "work/words.json",
  "presenter": {"fps": 1, "face": {"cx": 0.5, "cy": 0.36, "h": 0.26}, "keys": [{"t": 0, "state": "hidden"}]},
  "media": {
    "rec": {"src": "work/master.mp4", "clock": "master", "fps": 30, "from": 24.5, "to": 42.5},
    "anim": {"src": "work/master.mp4", "clock": "master", "fps": 30, "from": 41.5, "to": 111.6, "crop": [0.5, 0.05, 0.5, 0.75]},
    "sun": {"src": "work/master.mp4", "fps": 30, "from": 92.0, "to": 95.0, "crop": [0.5, 0.05, 0.5, 0.75]}},
  "subtitles": {"style": "clean", "burn": "html", "cuesFile": "work/subs.json", "pop": True,
    "highlight": ["Codex", "Claude", "提示词", "Opus 5.5", "中等", "夯爆了", "强太多了", "倒影", "小鸟", "视频生成模型", "炫酷", "无可挑剔", "古希腊", "断线", "三十分钟", "三五分钟", "十倍", "万亿", "KYC", "人脸识别", "PPT", "Agent", "五分之一", "缓存", "性价比", "Token", "一键三连"],
    "hide": [[0, 10.2]]},
  "music": {"mode": "generate", "mood": "tech-pulse", "bpm": 120, "seed": 7, "range": [0, 10.05], "fadeOut": 0.45, "volume": 0.55},
  "globals": [{"c": "fx-play-sprite", "at": 0, "out": 10.15, "exitDur": 0.01, "box": [0, 0, 1, 1], "props": {"size": 16, "path": SPRITE}}],
  "motionBlur": True, "lift": True, "sheen": True,
  "scenes": sc}
json.dump(E, open(f'{WD}/edit.json', 'w'), ensure_ascii=False, indent=1)
print(len(sc), 'scenes; end', sc[-1]['t1'])
