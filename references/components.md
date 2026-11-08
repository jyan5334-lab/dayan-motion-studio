# 组件库（引擎内置 45 个）

所有组件都是"时间的纯函数"：任意跳帧、往返拖动结果一致。每个组件自带入场动作和接触点音效。`props` 里的文字都支持 `hl`（高亮词）。

通用层字段：`share`（跨场景元素承接，配合 `morph` 转场）、`lift` / `sheen`（落地投影 / 光泽扫过，卡片类默认开）、`enter`（不写时卡片类默认 `settle` 弹性落定，其余 `rise`）。运动模糊由引擎按位移自动加。

## 文字与标注
| 组件 | 用途 | 主要 props |
|---|---|---|
| `title` | 大标题（逐字升起 / 上浮 / 擦出 / 砸入 / 打字） | `text` `hl` `sub` `eyebrow` `size` `align` `reveal: chars/rise/mask/slam/type` `style: heavy/serif/outline/glow/3d/marker/block` `underline` `color` |
| `stamp` | 印章 / 斜贴纸砸下 + 冲击环 + 微震 | `text` `sub` `style: box/tape/round/sticker` `rotate` `size` `color` `shake` |
| `strike` | 划掉 → 改写盖章 | `from` `to` `mark: line/x` `layout: inline/stack` `strikeAt/strikeCue` `toAt/toCue` `size` |
| `type` | 输入框 / 终端逐字打出 → 发送 | `text` `label` `icon` `boxStyle: input/terminal/plain` `size`（字号 px） `cps` `typeAt` `submitAt/submitCue` `strikeAt` |
| `chips` | 胶囊 / 玻璃按钮逐个弹出或逐个点亮 | `items:[{t, icon, tone, sub, at|cue}]` `dir: row/col/wrap` `style: glass/solid/tag/sticker/neon` `reveal: pop/light` `align` `size` |
| `equation` | A = B 分立人物两侧 | `left` `op` `right` `size` |
| `tags` | 人物两侧术语雨（左右交替） | `left:[…]` `right:[…]` `style: glow/solid/sticker` `stagger` |
| `chapter` | 章节号（#2 巨号 / No.04 眉标 / 横条） | `no` `title` `sub` `style: giant/eyebrow/bar` |
| `nav` | 常驻章节导航（侧栏 / 顶栏），当前项平滑移动 | `items` `steps:[{t, i}]`（t 为绝对时间） `style: side/top` |
| `namecard` | 名牌巨字 + 账号 | `name` `handle` `icon` `style: big/small` |
| `bubble` | 云朵 / 评论 / 对话气泡 | `text` `sub` `icon` `style: speech/cloud/comment/thought` `tail` |
| `echo` | 描边字重复堆叠（出发喽~ ×3） | `text` `rows` `size` |
| `quote` | 引用卡左右交错 | `items:[{t, who, at}]` |

## 数据与关系
| 组件 | 用途 | 主要 props |
|---|---|---|
| `number` | 巨号数字滚动定格 | `value` `from` `decimals` `prefix` `suffix` `unit` `label` `sub` `text`（定格后显示的文字，如 "4–5"） `size` `dur` `style: plain/card/glass` |
| `gauge` | 仪表盘 / 圆环百分比 | `value` `max` `label` `suffix` `style: arc/ring` |
| `bars` | 条形对比，可收缩 | `items:[{label, value, to, toAt, unit, note, tone}]` `title` `unit` |
| `compare` | 对比卡 + 胜者高亮 | `items:[{title, body, tag, big, icon, tone}]` `op: vs/→/=` `winner` `winnerAt/winnerCue` |
| `checklist` | 日志式清单（✓ ⚠ ✗ ↑） | `items:[{t, state: ok/warn/x/todo/up, note, at|cue}]` `title` `style: log/plain` |
| `flow` | 流程步骤 + 连线 | `steps:[{t, icon, sub, tone, at|cue}]` `dir: row/col` `active:[{t,i}]` `highlightLast` |
| `timeline` | 时间线 | `items:[{date, t, current, at}]` |
| `nodes` | 中心 + 卫星 + 流动光点 | `center:{t, sub, icon}` `items:[{t, sub, icon, ang, r, at|cue}]` `orbit` `dashed` `flow` |
| `stacks` | 记忆堆叠 / 积累 | `items:[{label, icon, h0, h1, growAt, growDur, tone}]` |
| `grid` | 网格填满 + 高亮筛选 + 计数 | `count` `cols` `images` `style: tiles/dots/square` `highlight:[idx]` `highlightAt` `counter` `total` `label` |
| `cards` | 卡片阵（扇形 / 横排 / 堆叠 / 散落） | `items:[{img, title, body, tag}]` `layout: fan/row/stack/scatter` |
| `panel-stack` | 叠卡讲解：卡片逐张叠放（新卡在前、旧卡后退变暗），卡内 图标块 → 分支连线 → 要点行 | `cards:[{title, sub, icon|logo, items:[{icon, t, d, at|cue}], at|cue}]` `style: ornate（深蓝金边，默认）/glass/clean` `stagger` `itemStagger`；嵌套 `cue` 都按本层时间解析 |
| `demo-zone` | 演示区：一拍一拍换演示（侧推讲解左侧），新拍前推、旧拍后退淡出 | `beats:[{c: 组件名, props, at|cue, box?:[x,y,w,h]（相对演示区，省略按组件给默认）}]` `swap: depth/slide` `plate`（暗场，默认开） `cards`（简写：只放一组叠卡）；拍内的 cue 按这一拍的时间解析 |
| `glow-quote` | 发光引用：一句结论逐字亮起 + 柔光呼吸，适合压在侧边遮罩上 | `text` `hl` `font: light/tech（得意黑）/heavy` `size` `align` `quote:false`（不要引号） `per`（每字间隔） |

## 界面与媒体
| 组件 | 用途 | 主要 props |
|---|---|---|
| `window` | 软件 / 浏览器窗口：真录屏或截图；局部放大、光标点击、便签、圈选；`sim:true` 标"界面示意" | `seq`/`image` `title` `badge` `chrome: mac/browser/none` `dark` `zoom:[{at,x,y,s,dur}]` `cursor:[{at,x,y,click}]` `callouts:[{at,x,y,text,out}]` `highlight:[{at,box,label}]` `sim` |
| `phone` | 手机：通知角标跳涨 / 消息列表 / 录音波形 / 截图 | `mode: list/record` `title` `badge:{from,to,at,dur,max}` `items:[{who,t,icon,at}]` `image`/`seq` |
| `doc` | 文档：逐行高亮 + 批注 + 字数计数 | `title` `tag` `text:[…]`/`lines` `highlights:[{line, at, tone, note}]` `counter:{from,to,max,at,dur,label}` `typing` |
| `chat` | 对话回放（AI 先打点再出字） | `msgs:[{who: me/ai, t, at|cue, think}]` `title` `icon` `dark` |
| `progress` | 任务进度 + 确认弹窗 + 完成 | `title` `from` `to` `at` `dur` `steps` `dialog:{at, pressAt, title, text}` `done:{at, text}` |
| `media` | 素材卡（截图 / 录屏帧 / 照片） | `src`/`seq` `fit` `frame: card/glass/polaroid/none` `radius` `tilt` `kenburns` `caption` |
| `logo` | 品牌字卡 / 玻璃 Logo / 金属大字 | `text` `sub` `src` `icon` `style: glass/solid/metal` |
| `sticker` | 图标 / emoji 贴纸 | `icon` `text` `style: round/plain/hl` `rotate` `bob` |
| `mark` | 圈选 / 下划线 / 荧光笔 | `style: box/circle/under/marker` `label` `dur` |
| `arrow` | 指引箭头 | `from:[x,y]` `to:[x,y]` `curve` `label` |
| `dayan` | 嵌入大琰DAYAN 动效库原卡（334 条），逐帧 seek | `id` `text:{槽位:文案}` `props` `brand` `wall` |

## 特效
`confetti`（彩纸）· `burst`（速度线 + 冲击环）

## 背景（放在 scene.bg）
`bg-wall` 品牌文字墙，版式与 DAYAN 动效库一致，两行字取 edit.json 的 `brand.wall`（使用者自己的品牌；`props.text` 可单独覆盖）（skin：pop gold acid song chrome lime obsidian platinum abyss hollow satin lacquer frost porcelain jade mist，默认 platinum；light 亮底款用原貌；speed 速度倍数；text 覆盖两行文字；push 入场推镜）。**标准（用户定稿）**：只写 skin，其余用默认——主标识特粗黑体 + 实心中性灰（mainColor #ECEDEF、mainOp 0.2；mainStyle:'skin' 改回皮肤配色），副行皮肤配色、subFade 1.35；行高 lh 1.32×字号、字组空隙 gap 1.6em、水平 tilt 0°；各行错位起步，第一帧上下行交叉、无竖向空缝；整面墙柔焦 blur 5px、亮度 k 1.55（墙字仍可读）；rows 不填自动铺满；前景背后不加局部柔焦。layout:'library' 回到动效库原版（k 0.55、−5° 倾斜、原间距、无柔焦）。场景可选 `depth:true` 打开前景局部柔焦（默认关闭，用户没要求不要开）· `bg-thumbs` 倾斜作品墙（images 或自动色块）· `bg-burst` 漫画放射（c1/c2/rays/cloud）· `bg-grid` 透视网格（color）· `bg-hud` HUD 边框 · `bg-paper` 纸张（tone: cream/white/kraft/dark；ruled；dots）· `bg-solid` · `bg-watermark` 章节斜体巨字 · `bg-glow` 柔光色团 · `bg-film` 胶片颗粒 · `bg-stars` 星点

## 图标
`icon` 字段可写内置线性图标名：check x warn arrow up down star heart plus bolt doc folder clock user bot link chart gift play search lock spark chat globe code cpu cloud fire crown eye mic video money key layers target calendar book bulb；也可直接写 emoji 或图片路径。

## 动效库（effects/）
剪辑时现做的新动效存在技能的 `effects/` 里，`build` 自动加载，按 id 当组件用（`{"c": "fx-before-after", ...}`）。`dms.py effect list` 列出，`effect new` 新建骨架，`effect check` 三画幅出样张。标准和流程见 SKILL.md「动效不够时」。

| 动效 | 用途 | 主要 props |
|---|---|---|
| `fx-before-after` | 前后对比滑块：一张卡上分割线扫过，旧状态（灰）被新状态（亮）替换，换完亮一下 | `before:{label,t,sub,icon}` `after:{…}` `revealAt/revealCue`（落在说出"现在"的字） `revealDur` |
| `fx-editor-timeline` | 剪辑工程时间线：剪辑软件窗口（预览 + 画面/动效/字幕/音效/配乐五轨），轨道逐条铺开、播放头走动；光标按口播点中片段改字、换音乐，预览字幕同步变 | `title` `tag` `caption` `tracks:[{name,icon,tone,clips:[{x,w,t}]}]` `edits:[{track,clip,to,note,caption,at|cue}]` |
| `fx-cta-buttons` | 三连按钮：点赞/收藏/关注三颗圆按钮按口播逐个按下，图标变实心填色、冲击环、+1 上飘 | `items:[{kind:like/save/follow,t,color,at|cue}]` `caption` `dir` |
| `fx-repo-card` | 开源仓库卡：代码仓库卡片带透视浮起，标签和文件列表逐行出现，"开源"印章砸下带震屏 | `owner` `name` `desc` `tags:[{t,at|cue}]` `files` `stampAt/stampCue` |
| `fx-play-sprite` | 播放键小精灵（原创吉祥物）：按关键帧路径跑、跳、翻跟斗、滚、点击、踩、放技能（光束 + 火花）、蓄力旋转、挥手、鞠躬；挤压拉伸、落地缓冲、拖影、影子、速度线、点击冲击环都自带。**放在 `globals` 里跨场景常驻**，转场时不跟着画面切走 | `path:[{t,x,y,act,h,dir,target}]` `size` `color` `trail` `shadow` |
| `fx-horizon-title` | 电影感地平线片头：黑底宽银幕，暗色星体的发光弧边从下方升起推近，微尘漂浮、胶片颗粒，衬线大字字距由松到紧、从虚到实浮现；黑边可在出场前收起 | `title` `sub` `tint: gold/blue/ember` `dur` `from/to` `titleAt` `letterbox` `barH` `barsOut` |
| `fx-comment-pick` | 评论区挑选：评论区面板，提问置顶，评论逐条滑入，按口播逐条被选中（角上标"示例"，不冒充真实用户） | `title` `question` `comments:[{who,t,at}]` `picks` `pickAt/pickCue` `pickStagger` |

## 写新组件
在 `engine/components-*.js` 或内置动效的 `components.js` 里：
```js
DMS.components['my-thing'] = {
  enter: 'rise',                       // 外层入场：rise/settle/pop/drop/slide-l/slide-r/zoom/slam/fade/wipe/none
  build(el, props, L) { /* 只建一次 DOM，返回状态 */ return {}; },
  update(el, lt, props, state, L, t) { /* lt=本层已出现秒数，t=全片时间；只用 t 计算，不用真实时间和随机数 */ },
  sfx(props) { return [{at: 0, kind: 'pop', gain: 0.5}]; }   // 相对本层 at 的音效事件
};
```
