# edit.json 规格（schema: dayan-edit/1）

`edit.json` 是一期片子的全部剪辑决定。助手写它，`dms.py build` 把它编译成可预览、可渲染的工程。所有时间都是**母版时钟**（剪掉口误之后的 master.mp4 的秒数）。

```jsonc
{
  "schema": "dayan-edit/1",
  "title": "Claude做动画夯爆了",
  "canvas": {"w": 1920, "h": 1080, "fps": 60},        // 横屏 1920x1080；竖屏 1080x1920；4:3 用 1440x1080
  "theme": "film-warm",                                 // 全片主题，单个场景可用 scene.theme 覆盖
  "brand": {"name": "小明说AI", "wall": ["小明说AI", "XIAOMING · AI LAB"], "mark": "明"},   // 使用者自己的品牌（开工第 4 题）：文字墙两行、角标、名牌都用它
  "signature": {"enabled": false, "name": "小明说AI", "pos": "tl"},   // 角标署名，默认关闭；要时 enabled 改 true，位置 tl/tr/bl/br
  "master": "work/master.mp4",                          // 剪好的口播母版（人物画面 + 人声）
  "words": "work/words.json",                           // 字级时间码（asr / cut 生成），用于 cue 对齐
  "duration": 81.55,                                    // 可省略，默认等于母版时长

  "presenter": {
    "face": "auto",                                     // auto = OpenCV 人脸轨迹；或 {"cx":0.5,"cy":0.36,"h":0.26}
    "fullFit": null,                                    // 竖拍放横屏默认 contain（居中竖条+模糊铺底）；强制 "cover" 裁满
    "windowTitle": "大琰DAYAN · 口播",                  // window 形态的标题栏文字
    "scrimColor": "8,10,22",                            // side 状态遮罩的颜色（RGB），默认深海军蓝黑
    "matte": false, "personFront": false,               // 抠像（需 onnxruntime）；personFront=全屏时人物压在 MG 前面（巨字在人身后）
    "keys": [                                           // 人物窗关键帧：只写目标状态，运行时从当前真实位置平滑过渡
      {"t": 0, "state": "full", "pos": "c"},
      {"t": 4.15, "state": "card", "pos": "r", "dur": 0.75},
      {"cue": "四五分钟", "lead": -0.3, "state": "circle", "pos": "br"},   // 也可以按关键词触发
      {"cue": "两个优势", "state": "side", "pos": "r", "dur": 0.75},       // 侧移：整幅人物推到右侧 + 左侧遮罩（见下）
      {"t": 21.35, "state": "hidden", "dur": 0.4}
    ]
  },

  "media": {                                            // B-roll：视频会被抽成帧序列，图片直接复制
    "rec":  {"src": "录屏.mp4", "fps": 30, "from": 12.0, "to": 40.0, "crop": [0, 0.03, 1, 0.5]},
    "shot": {"src": "截图.png"},
    "self": {"src": "work/master.mp4", "clock": "master"}   // 母版本身后半段就是录屏：用同一时钟播放
  },

  "subtitles": {
    "style": "clean",                                   // clean 白字描边 / pill 黑胶囊 / bold 超粗描边
    "burn": "ass",                                      // ass = 渲染后用 ASS 烧录（可编辑，另导出 SRT）；html = 画进动画层
    "cuesFile": "work/subs.json",                       // dms.py subs 对齐好的字幕；缺省时按字级时间码自动断句
    "highlight": ["夯爆了", "一句话"],                  // 染色关键词
    "hide": [[75.1, 81.6]],                             // 这些区间不显示字幕
    "font": null, "size": null, "hlColor": "#FFC24B"
  },

  "music": {"mode": "none"},                            // 默认不配背景音乐（用户要求）
  //        {"mode": "track", "path": "我的配乐.mp3", "offset": 12.5, "volume": 0.3}   用户明确要配乐时才写
  //        {"mode": "generate", "bpm": 120, "range": [0, 6.0], "fadeOut": 0.5, "volume": 0.55}   片头 solo 卡点配乐：只在 range 里出声
  "motionBlur": true, "lift": true, "sheen": true,      // 动效质感总开关（默认全开，见下文"动效质感"）
  "sfxVolume": 0.85, "sfxSeed": 11, "denoise": false,
  "sfx": [{"t": 12.3, "kind": "impact", "gain": 0.6}],  // 额外手动音效（组件自带的不用写）
  "camera": [{"t": 30, "zoom": 1.06, "x": 0, "y": 0, "dur": 1.2}],   // 场景层整体推拉（不影响人物与字幕）
  "globals": [ /* 跨场景常驻层，如章节导航 nav：{"c":"nav","at":0,"box":"side-l","props":{...}} */ ],

  "scenes": [
    {
      "id": "s02-prompt", "t0": 4.25, "t1": 13.25,      // 场景首尾相接，不留空档
      "energy": 1,                                      // 配乐能量 0–3（0 只有铺底 … 3 全编制）
      "look": "a-blue",                                 // 章节外观预设：一键换主题 + 背景（b-film a-blue b-paper d-neon a-violet a-lime d-hud a-thumbs c-wall c-wall-gold a-red），也可写 {"name":"d-neon","text":"SKILL"}；写了 theme/bg 就以手写为准
      "theme": "dark-tech",                             // 可选：本场景换主题
      "transition": {"type": "push-left", "dur": 0.6},  // 进入本场景的转场
      "transitionSfx": "whoosh",                        // 可选：覆盖默认转场音效；false 关闭
      "say": "本段口播原文（给人看的备注）",
      "bg": [{"c": "bg-wall", "props": {"skin": "gold"}}],
      "layers": [
        {"c": "title", "cue": "宣传片", "lead": -0.5, "share": "hero",   // share：与相邻场景同名层做元素承接（配合 morph 转场）   // cue：说到这个词时出现；lead 提前量（秒）；nth 第几次出现
         "box": [0.05, 0.17, 0.56, 0.2],                // 归一化 x,y,w,h；或预设名 left/right/center/top-left…
         "props": {"text": "让它给自己做宣传片", "hl": "宣传片", "size": 78},
         "out": 12.8, "exit": "fade",                   // 可选：提前退场
         "enter": "rise", "enterDur": 0.55, "z": 3, "rotate": 0, "float": 0,
         "sfx": [{"at": 0, "kind": "whoosh"}]           // 可选：覆盖组件默认音效；false 静音
        }
      ]
    },
    {"id": "s08-outro", "template": "cta-outro", "t0": 75.1, "t1": 81.55,   // 调用 内置动效
     "presenter": false,                                // 不改动人物窗
     "pin": {"bye": {"cue": "下期再见", "lead": -0.35}}, // 把内置动效锚点钉到口播关键词
     "slots": {"ask": "大家敬请期待！", "bye": "我们下期再见", "next": "下期：自动剪辑口播"}}
  ]
}
```

## 人物窗状态

`full` 全屏 · `side` 侧移 · `card` / `story` 侧边卡片 · `circle` / `circle-big` 圆窗 · `pip` 圆角小方窗 · `window` 软件窗口 · `cutout` 抠像站位 · `hidden` 隐藏。

**`side`（侧移 + 讲解底板）**（用户定稿）：人物画面和全屏时**完全一样**（不缩放、不羽化、不额外加模糊），干净地整体平移到一侧；让出的一侧放一块**半透明讲解底板**（不铺满半屏，透明度约 50%，能隐约看到背景），前景元素放在底板上。参数：`pos: "r"|"l"`（人物去哪边，默认 r）、`faceX`（脸最终的横向位置，默认横屏 0.70 / 0.30）、`scrimBox`（底板位置 `[x,y,w,h]`，默认 `[0.025,0.06,0.52,0.8]`，人物在左时自动镜像）、`scrimAlpha`（底板不透明度，默认 0.5）、`scrim`（0 = 不要底板）。横拍素材整幅平移，底板压在画面上、右边缘自动停在人物左侧；竖拍素材是全屏时那条竖幅整体移过去，底板在竖幅下面。人物在右时前景放左侧 `x 0.04–0.54`，人物在左时镜像到 `x 0.46–0.96`。

## 画幅差异（16:9 / 4:3 / 9:16）

- 画布：16:9 = 1920×1080，**4:3 = 1440×1080**（与 16:9 同高、窄 480），9:16 = 1080×1920，3:4 = 1080×1440（以 1080P 为例）。
- `box` 写预设名（`left` `upper` `demo` `quote` …）时按画幅自动换位置；写数组时是归一化坐标，**换画幅要重排**，不能直接照搬 16:9 的数组。
- 4:3 用横屏预设，但演示区 `demo` / `quote` 自动换成加宽版（`narrow`）；全屏的竖拍人物居中竖条只占 0.29–0.71，左右两侧的大字/卡片要放在这两条里（大字字号比 16:9 小约 1/3）。
- 竖屏：人物素材是竖拍时 `full` 正好铺满；圆窗默认右上；字幕区在画面 75% 以下，内容不要压过去。
- **侧推讲解在三种画幅下的样子**：16:9 横拍素材 = 整幅右移 + 左侧渐变遮罩；16:9 / 4:3 竖拍素材 = 右侧圆角人物卡（约 82% 画面高）+ 左侧演示区；**9:16 / 3:4 = 人物裁成上方宽幅圆角卡（0.04–0.375），下面是结论 + 演示区（0.385–0.74）**。叠卡会按演示区的宽高自动缩放，不会溢出。

## 转场

写在**进入**的那个场景上：`"transition": {"type": "...", "dur": 0.6, ...参数}`。

| type | 效果 | 适合 | 参数 |
|---|---|---|---|
| `cut` | 硬切 | 节奏点、口播短停 | — |
| `fade` | 叠化 | 情绪收束 | — |
| `push-left` `push-right` `push-up` `slide-up` | 整屏推移 / 新画面上滑盖住 | 同话题推进（默认首选） | — |
| `zoom-in` `zoom-out` | 推近 / 拉远 | 进入细节 / 回到全局 | — |
| `whip` `flash` | 甩镜 / 白闪 | 情绪爆点 | — |
| `line` | 荧光线闪切 | 进入录屏 | — |
| `iris` | 从人物位置圆形展开 | 结尾 | — |
| `wipe-diag` | 斜向擦除，旧画面轻微后退 | 换章节、换论点 | — |
| `split` | 从中线向两侧拉开 | 揭晓、对比结果 | — |
| `rect` | 圆角矩形从中心放大 | 进入一张卡 / 一个窗口 | — |
| `blinds` | 百叶窗 | 列举、清单切换 | — |
| `text-mask` | 新画面从一个大字的镂空里放大冲出 | 章节开头、品牌时刻 | `text`（默认 "DAYAN"，≤ 6 字） |
| `morph` | 元素承接：同名 `share` 层从旧位置平滑变到新位置，其余叠化 | 同一个对象跨两段口播（最高级的连续性） | 两个场景各有一层写同一个 `share` |
| `page` `page-back` | 翻书：旧页以左边为书脊带透视翻走（越翻越暗），新页在下面由暗变亮、内容等旧页翻过才浮现；`page-back` 新页从左边翻回来盖住旧页 | 口播说到"翻页 / 翻书 / 换一页"，或连续几个话题快速切换（"翻来翻去"连用：page → page-back） | 新页里的元素 `at` 可以比本段 t0 早 0.2–0.3s，翻完就已经在场 |

- 每个转场都自带音效（`transitionSfx` 可覆盖，`false` 关闭）。
- 一条片子用 2–3 种转场为主，`morph` / `text-mask` 是重点时刻，不要每段都用。
- `morph` 找不到同名 `share` 层时退化为叠化，不报错。

## 动效质感（默认开启）

- **运动模糊**：引擎按每帧实际位移沿运动方向加拖影（约等于 180° 快门），静止时为 0；承接主体只留 35%。整片关闭：`"motionBlur": false`。
- **落地投影**：卡片类组件（cards compare window phone doc chat logo media quote bubble namecard progress checklist）入场时带大投影浮起、落定时收小。单层关闭 `"lift": false`，整片 `"lift": false`。
- **弹性落定**：卡片类组件不写 `enter` 时默认 `settle`（上浮 + 轻微回弹）。其它组件仍默认 `rise`。
- **光泽扫过**：卡片落定后一道斜向高光扫过一次，只落在元素自身形状上。单层 `"sheen": false` / `true`，整片 `"sheen": false`。

## 时间写法

- `at`：绝对秒数（母版时钟）。
- `cue` + `lead` + `nth`：按关键词对齐（推荐）。在本场景时间窗内找，找不到时退到全文第一次出现。
- 组件内部的相对时间（`items[].at`、`winnerAt`、`strikeAt`、`toAt`、`submitAt`…）也可以写成 `cue`：`items` 里每项可带 `cue`；`xxxAt` 可写成 `xxxCue`（如 `winnerCue`、`strikeCue`、`toCue`、`submitCue`）。
- `dms.py words 工作目录 关键词…` 随时查词的时间。

## 版位预设（box）

横屏：`full center wide left right left-narrow right-narrow top top-left top-right bottom-left bottom-right side-l side-r`
竖屏：`full center wide top upper lower left right top-left top-right side-l side-r`
也可直接写 `[x, y, w, h]`（0–1）。人物窗在右侧时内容放 `[0.05, …, 0.56, …]`；人物在右下圆窗时内容不要超过 x+w > 0.82 且 y+h > 0.6。

## 主题

`dark-tech`（深色科技，青/蓝/琥珀）· `film-warm`（暗调胶片，橙，宋体标题）· `neon-lime`（黑 + 荧光绿）· `comic-pop`（漫画，白卡黑描边）· `paper-swiss`（米白纸张，蓝）· `hud-blue`（深蓝 HUD）· `violet-dream`（紫色梦幻，黄）
