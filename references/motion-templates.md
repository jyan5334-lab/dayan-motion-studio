# 内置动效：合同、调度参数与制作方法

内置动效是"可以反复调用的一段编舞"。它有自己的版本、合同和实现，可以**单独渲染成片段**，也可以**嵌进一期口播的时间轴**里，跟着口播关键词伸缩。

## 四层分工

| 层 | 负责 | 不负责 |
|---|---|---|
| 技能（dms.py） | 理解口播、选内置动效、绑定内容、对齐关键词、伸缩、校验、渲染、验收 | 写死某个内置动效的画面 |
| 合同 `template.motion.json` | 画布、时长、输入槽、场景、动作保护窗、停留点、锚点、镜头/人物状态、交接、资源、验收项 | 具体画面实现 |
| 实现 `scene.json`（+ 可选 `components.js` / `style.css`） | 场景、图层、组件、版位、时间、属性，用 `{{槽位}}` 引用输入 | 读取整期内容、擅自选片 |
| 本期内容（edit.json 里的一段） | 槽位取值、起止时间、锚点钉到哪个词 | 改动内置动效的运动语法 |

## 合同字段（schema: dayan-motion/1）

```jsonc
{
  "schema": "dayan-motion/1",
  "templateId": "cta-outro", "version": "1.0.0", "status": "candidate",   // experimental → candidate → stable
  "engine": "dayan-html", "title": "…", "use": "什么时候调用", "theme": "violet-dream", "author": "大琰DAYAN",
  "composition": {"id": "cta-outro", "width": 1920, "height": 1080, "fps": 60, "durationInFrames": 300, "layout": "landscape"},
  "inputSlots": [{"id": "bye", "type": "text", "required": false, "default": "谢谢大家", "maxLen": 14}],
        // type: text number list image video color icon bool object；list 要写 minItems/maxItems；text 建议写 maxLen
  "layers": [{"id": "world", "role": "background", "z": 0}, …],
  "scenes": [{"id": "ask", "role": "call-to-action", "startFrame": 0, "endFrame": 144, "entryState": "any", "exitState": "buttons-shown", "maxHoldFrames": 360}, …],
        // 场景首尾相接、覆盖全部时长
  "motionWindows": [{"id": "buttons", "sceneId": "ask", "startFrame": 12, "endFrame": 78, "kind": "build", "protected": true}, …],
        // 动作保护窗：准备→主动作→超调/刹停→收势 的完整区间；伸缩时绝不拉伸或压缩它
        // kind: text-reveal enter act handoff camera settle impact count build exit transition
  "holds": [{"atFrame": 108, "maxFrames": 360, "minusFrames": 36}, …],
        // 停留点：只有这里可以加时间（最多 maxFrames）或回收时间（最多 minusFrames）；不能落在受保护动作窗里
  "anchors": [{"id": "bye", "atFrame": 144, "desc": "道别页转入"}, …],
        // 锚点：可以被 edit 钉到口播关键词上的时刻
  "cameraStates": [{"id": "ask", "startFrame": 0, "endFrame": 144, "target": "buttons", "scale": 1.0}],
  "presenterStates": [{"atFrame": 0, "state": "circle", "pos": "bl"}, {"atFrame": 138, "state": "circle-big"}],
  "handoffs": [{"from": "ask.presenter", "to": "bye.presenter-big", "atFrame": 138}],
        // 对象交接：上一场的哪个对象交给下一场（没有交接的多场景内置动效会被警告"清空再开场"）
  "assets": [{"id": "fx", "path": "components.js", "type": "script", "required": true}],
  "acceptance": ["safe-area", "cjk-font-render", "continuous-motion-windows", "handoff-continuity", "full-mp4-decode", "audio-and-caption-review"]
}
```

## 调度参数（在 edit.json 里调用）

```jsonc
{"id": "s08-outro", "template": "cta-outro@1.0.0",   // 不写版本取最新
 "t0": 75.1, "t1": 81.55,                            // 占用的口播区间
 "slots": {"ask": "大家敬请期待！", "bye": "我们下期再见", "next": "下期：自动剪辑口播"},
 "pin": {"bye": {"cue": "下期再见", "lead": -0.35},  // 锚点钉到关键词（或直接写秒数）
         "next": {"cue": "下期我给大家", "lead": -0.1}},
 "presenter": false,                                 // 不让内置动效改动人物窗（没有真人画面时）
 "energy": 1, "transition": {"type": "iris", "dur": 0.7}, "theme": "violet-dream"}
```

**伸缩算法**：先按锚点顺序，把"锚点目标时间 − 自然时间"的差额分配给两个锚点之间的停留点（按 maxFrames 比例加时间，或按 minusFrames 回收）；最后一个锚点之后的剩余时长分给其后的停留点。受保护动作始终原速。回收不够时给出警告，不会偷偷压缩动作。

**单独渲染一个内置动效**：
```
python dms.py template render cta-outro templates/cta-outro/example.payload.json 输出目录
```
payload 里可加 `_duration`（秒）、`_theme`、`_music`（generate/none）。

## 做一个新内置动效（从参考片提炼）

1. **先写动作谱**，不要先写代码：主体是什么、准备动作、主动作、超调/刹停、配角让位、镜头路径、交接对象、声音落点。
2. 在 `templates/<id>/` 建 `scene.json`：用引擎组件拼场景，时间从 0 开始，文字全部换成 `{{槽位}}`。组件不够就在 `components.js` 里注册新组件（只能用时间 t 计算画面）。
3. 写 `template.motion.json`：场景帧区间要和 scene.json 一致；每个主动作登记 motionWindow；在"阅读停留"处放 holds；口播可能对齐的时刻放 anchors。
4. `python dms.py template validate <id>` —— 校验会交叉核对：槽位都被用到、没用未声明槽位、场景顺序与时长一致、组件存在、停留点不在保护窗里、验收项齐全。
5. `template render` 出样片，逐段看转场前/中/后连续帧，再把 status 从 experimental 提到 candidate；经过 2–3 期真实口播使用没有问题再标 stable。
6. 竖屏内置动效必须单独做 1080×1920 的布局（另一个 templateId 或版本），不能把横屏交换宽高。

## 内置内置动效

| templateId | 用途 | 锚点 |
|---|---|---|
| `hook-opener` | 开场：结论巨字砸下 → 作品墙推入 + 证据数字 | title / proof |
| `chapter-card` | 章节页：#N 巨号 + 标题，人物收到右上 | no |
| `compare-verdict` | 2–3 张对比卡逐张入场 → 胜者高亮 | winner |
| `term-explainer` | 术语讲解：章节水印 + 中心概念 + 卫星节点 | center |
| `cta-outro` | 结尾：关注点赞收藏 → 道别 → 下期预告 | ask / bye / next |
| `side-explainer` | 侧推讲解：人物侧移 + 侧边遮罩 + 叠卡要点 + 发光引用 | card2 / quote |

用户内置动效目录：设置环境变量 `DMS_TEMPLATE_PATHS`（多个目录用系统路径分隔符），技能会一起发现。

## 参考片匿名
从参考片做内置动效时，合同的 `use`、`source` 等字段和动作谱里只写风格代号（如「风格 C」「C2」）和画面/编排描述，不写博主名字、账号、视频标题、编号、粉丝数据或其自有产品名。

## 动效样张
- 内置动效不编号，用名称（钩子开场、章节页、对比裁决、术语讲解、侧推讲解、结尾）和 id 指代。
- 新内置动效校验通过后跑 `dms.py template gallery`：用 `example.payload.json` 渲染，从开场到收尾均匀截 12 帧拼成动效样张 `style_sheet.png`（也复制到 `templates/_sheets/<名称>.png`），代表帧存成 `preview.png`，并重拼单帧索引 `templates/_gallery.png`。`example.payload.json` 要写成能代表真实用法的内容，样张才看得出效果。
- 代表帧默认取时长的 80%；画面最完整的时刻不在这里时，在合同里写 `"previewAt": 秒数`。
- 合同 `composition.layout` 写明 `landscape`（仅横屏）/ `portrait`（仅竖屏）/ `any`（横竖通用）。
