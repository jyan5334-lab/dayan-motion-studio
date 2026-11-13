# 动效目录（自动生成：`dms.py catalog`）

共 62 项：引擎组件 40 · 动效库 16 · 内置动效 6 · 大琰DAYAN 原卡 0。按语义分组；编排时先在对应分组里挑，找不到就 `dms.py catalog 关键词` 搜，再找不到才现做新动效（references/orchestration.md）。

调用写法：组件和动效库直接 `{"c": "<id>", …}`；内置动效在场景上写 `"template": "<id>"`。

（本机没有原卡库 `assets/dayan-library.html`：原卡不在目录里，放入后重新运行 `dms.py catalog`。）

**原卡（328 张）可以直接改来用**：卡里的文字、数字、价格、产品名都是样板。先 `dms.py card <卡号>` 看样张和卡里全部可见文字，再写 `{"c": "dayan", "box": "full", "props": {"id": "<卡号>", "replace": [["样板文字", "本期口播的内容"], …]}}`，每一条可见文字都换成本期内容（不要的换成 ""），换完再看一次样张。原卡是 1920×1080 横屏版式；原卡里的文字墙和署名会自动换成 edit.json 的 brand。

## 01 · 开场 / 标题 / 钩子

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `title` | title | 大标题（逐字升起 / 上浮 / 擦出 / 砸入 / 打字） | `text` `hl` `sub` `eyebrow` `size` `ebSize`（眉标字号） `subSize`（副标题字号） `align` `reve |
| 组件 | `chapter` | chapter | 章节号（#2 巨号 / No.04 眉标 / 横条） | `no` `title` `sub` `style: giant/eyebrow/bar` |
| 组件 | `echo` | echo | 描边字重复堆叠（出发喽~ ×3） | `text` `rows` `size` |
| 组件 | `logo` | logo | 品牌字卡 / 玻璃 Logo / 金属大字 | `text` `sub` `src` `icon` `style: glass/solid/metal` |
| 动效库 | `fx-horizon-title` | 电影感地平线片头 | 片头 solo / 品牌时刻 / 发布感开场：黑底宽银幕，一道发光的弧形地平线从下方缓缓升起推近，微尘漂浮，衬线大字从虚到实浮现 | title 衬线大字（用使用者自己的品牌/片名）；sub 小字英文/口号；tint: gold/blue/ember；dur 这一镜时长（地平线升起推近用时）； |
| 内置动效 | `chapter-card` |  |  |  |
| 内置动效 | `compare-verdict` |  |  |  |
| 内置动效 | `cta-outro` |  |  |  |
| 内置动效 | `hook-opener` |  |  |  |
| 内置动效 | `side-explainer` |  |  |  |
| 内置动效 | `term-explainer` |  |  |  |

## 02 · 数字 / 数据

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `number` | number | 巨号数字滚动定格 | `value` `from` `decimals` `prefix` `suffix` `unit` `label` `sub` `text`（定格后显示的文字 |
| 组件 | `gauge` | gauge | 仪表盘 / 圆环百分比 | `value` `max` `label` `suffix` `style: arc/ring` |
| 组件 | `bars` | bars | 条形对比，可收缩 | `items:[{label, value, to, toAt, unit, note, tone}]` `title` `unit` |
| 组件 | `stacks` | stacks | 记忆堆叠 / 积累 | `items:[{label, icon, h0, h1, growAt, growDur, tone}]` |
| 组件 | `grid` | grid | 网格填满 + 高亮筛选 + 计数 | `count` `cols` `images` `style: tiles/dots/square` `highlight:[idx]` `highlightA |

## 03 · 对比 / 反差

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `strike` | strike | 划掉 → 改写盖章 | `from` `to` `mark: line/x` `layout: inline/stack` `strikeAt/strikeCue` `toAt/toC |
| 组件 | `equation` | equation | A = B 分立人物两侧 | `left` `op` `right` `size` |
| 组件 | `compare` | compare | 对比卡 + 胜者高亮 | `items:[{title, body, tag, big, icon, tone}]` `op: vs/→/=` `winner` `winnerAt/wi |
| 动效库 | `fx-before-after` | 前后对比滑块 | 说到以前/现在、之前/之后、手动/自动这类前后反差时：一张卡上分割线扫过，旧状态被新状态替换 | before:{label,t,sub,icon} 旧状态；after:{label,t,sub,icon} 新状态；revealAt 或 revealCue（ |

## 04 · 流程 / 关系 / 清单

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `checklist` | checklist | 日志式清单（✓ ⚠ ✗ ↑） | `items:[{t, state: ok/warn/x/todo/up, note, at |
| 组件 | `flow` | flow | 流程步骤 + 连线 | `steps:[{t, icon, sub, tone, at |
| 组件 | `timeline` | timeline | 时间线 | `items:[{date, t, current, at}]` |
| 组件 | `nodes` | nodes | 中心 + 卫星 + 流动光点 | `center:{t, sub, icon}` `items:[{t, sub, icon, ang, r, at |
| 组件 | `panel-stack` | panel-stack | 叠卡讲解：卡片逐张叠放（新卡在前、旧卡后退变暗），卡内 图标块 → 分支连线 → 要点行 | `cards:[{title, sub, icon |
| 组件 | `progress` | progress | 任务进度 + 确认弹窗 + 完成 | `title` `from` `to` `at` `dur` `steps` `dialog:{at, pressAt, title, text}` `done |
| 动效库 | `fx-conveyor` | 流水线传送带 | 片子按工序 / 站点一站一站往前走（剪辑流水线、生产线、闯关）时放在 globals 常驻：底部传送带随场景推移同步滚动（像镜头一路跟拍），下方站点导航亮起当前 | stations:[{t, end}] 站名（end:true 终点）；pans:[{t 绝对时间, dur, d 移动几屏宽}] 和 push 转场对齐；st |
| 动效库 | `fx-director-scan` | 导演检查扫描 | 讲自动检查、帮你挑错、审片质检：分镜缩略图被扫描线扫过，有问题的格子亮红框标出问题，随后自动改正变绿勾，顶部建议数降到 0 | thumbs:[{title, sub, subtitle 底部字幕, person:false 不画人物, bg, issue 问题标签, fixTitle/ |
| 动效库 | `fx-sound-desk` | 音效台 | 讲每个动作都有音效、音效卡在动作接触点上、混音和响度标准：动作排在时间轴上，音效波形掉下来正好落在接触点，动作亮起；右边响度表指针收敛到 −15 LUFS | hits:[{t 动作名, icon, kind 音效种类（也是落地时播的音效）, name 波形上的音效名, tone 颜色, at/cue 落地时刻}]；m |
| 动效库 | `fx-station-strip` | 全景收束 | 一路讲完几个步骤 / 站点后的总结、全部打包、回到全局：从最后一站特写拉远露出整条流水线的站牌，再全部收拢到中心闪白，下一层（仓库卡、品牌卡）接上 | stations:[{t, icon, bg, fg, end}]（省略 = 听 剪 编 演 声 查 出片）；zoomAt / zoomDur 拉远；from  |
| 动效库 | `fx-storyboard` | 分镜翻牌 | 讲'说到什么画面就出什么'、口播的词变成分镜、语义对应画面：一排字卡，念到哪个词哪张就翻成一格分镜并立刻演出（步骤条 / 数字滚动 / 前后对比 / 清单打勾） | items:[{key 字卡上的词, tc 时间码, kind: steps/number/compare/check, at/cue 翻牌时刻, no 镜号, |
| 动效库 | `fx-word-tape` | 字卡听写 / 口误剪除 | 讲逐字听写、字级时间码（mode:listen：声波压成一排带时间码的字卡）；讲口误自动剪掉（mode:cut：口误字卡变红 → 碎裂 → 两边合拢，弹出剪掉几 | words:[{t,tc,bad}]；mode: listen/cut；listen：pressAt 声波压扁时刻、stagger 字卡间隔；cut：badAt |

## 05 · 引用 / 对话 / 社媒

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `bubble` | bubble | 云朵 / 评论 / 对话气泡 | `text` `sub` `icon` `style: speech/cloud/comment/thought` `tail` |
| 组件 | `quote` | quote | 引用卡左右交错 | `items:[{t, who, at}]` |
| 组件 | `glow-quote` | glow-quote | 发光引用：一句结论逐字亮起 + 柔光呼吸，适合压在侧边遮罩上 | `text` `hl` `font: light/tech（得意黑）/heavy` `size` `align` `quote:false`（不要引号） `pe |
| 组件 | `doc` | doc | 文档：逐行高亮 + 批注 + 字数计数 | `title` `tag` `text:[…]`/`lines` `highlights:[{line, at, tone, note}]` `counter: |
| 组件 | `chat` | chat | 对话回放（AI 先打点再出字） | `msgs:[{who: me/ai, t, at |
| 动效库 | `fx-comment-pick` | 评论区挑选 | 说到评论区告诉我、我挑几条评论来做时：评论区面板，提问置顶，评论逐条滑入，按口播逐条被选中 | title 默认"评论区"；question 置顶提问；comments:[{who,t,at/cue}]；picks 选中第几条（下标数组，省略=全部）；pi |

## 06 · 人物 / 名牌 / 字幕条

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `nav` | nav | 常驻章节导航（侧栏 / 顶栏），当前项平滑移动 | `items` `steps:[{t, i}]`（t 为绝对时间） `style: side/top` |
| 组件 | `namecard` | namecard | 名牌巨字 + 账号 | `name` `handle` `icon` `style: big/small` |

## 07 · 收尾 / CTA / 印章

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `stamp` | stamp | 印章 / 斜贴纸砸下 + 冲击环 + 微震 | `text` `sub` `style: box/tape/round/sticker` `rotate` `size` `color` `shake` |
| 动效库 | `fx-cta-buttons` | 三连按钮 | 说到点赞、收藏、关注时：三颗圆形按钮按口播逐个按下，图标填色点亮，带冲击环和 +1 | items:[{kind:like/save/follow,t 文字,color,plus,at/cue}]（省略=点赞/收藏/关注）；caption 按完后出 |

## 09 · 界面 / 手机 / 录屏

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `type` | type | 输入框 / 终端逐字打出 → 发送 | `text` `label` `icon` `boxStyle: input/terminal/plain` `size`（字号 px） `cps` `type |
| 组件 | `window` | window | 软件 / 浏览器窗口：真录屏或截图；局部放大、光标点击、便签、圈选；`sim:true` 标"界面示意" | `seq`/`image` `title` `badge` `chrome: mac/browser/none` `dark` `zoom:[{at,x,y,s |
| 组件 | `phone` | phone | 手机：通知角标跳涨 / 消息列表 / 录音波形 / 截图 | `mode: list/record` `title` `badge:{from,to,at,dur,max}` `items:[{who,t,icon,at} |
| 动效库 | `fx-editor-timeline` | 剪辑工程时间线 | 说到工程文件、导进剪映/PR、还能改字幕改音乐时：一个剪辑软件时间线窗口，多轨素材排好，播放头走动，按口播逐个改动片段 | title 窗口标题；tag 右上角标签；caption 预览画面里的字幕；tracks:[{name,icon,tone:v/fx/sub/sfx/bgm,c |
| 动效库 | `fx-repo-card` | 开源仓库卡 | 说到开源、放到 GitHub/代码仓库、免费给大家用时：代码仓库卡片浮起，文件列表逐行出现，开源印章盖下 | owner / name 仓库名；visibility 默认 Public；desc 一句介绍；tags:[{t,at/cue}]；files:[{t,d,di |

## 11 · 悬浮画中画 / 卡片 / 标注

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `cards` | cards | 卡片阵（扇形 / 横排 / 堆叠 / 散落） | `items:[{img, title, body, tag}]` `layout: fan/row/stack/scatter` |
| 组件 | `demo-zone` | demo-zone | 演示区：一拍一拍换演示（侧推讲解左侧），新拍前推、旧拍后退淡出 | `beats:[{c: 组件名, props, at |
| 组件 | `media` | media | 素材卡（截图 / 录屏帧 / 照片） | `src`/`seq` `fit` `frame: card/glass/polaroid/none` `radius` `tilt` `kenburns` ` |
| 组件 | `mark` | mark | 圈选 / 下划线 / 荧光笔 | `style: box/circle/under/marker` `label` `dur` |
| 组件 | `arrow` | arrow | 指引箭头 | `from:[x,y]` `to:[x,y]` `curve` `label` |
| 组件 | `dayan` | dayan | 嵌入大琰DAYAN 原卡（328 张），逐帧 seek；卡里的文字都是样板，用 `replace` 换成本期内容（先 `dms.py card <卡号>` 看样 | `id` `replace:[[原文,新文],…]` `text:{槽位:文案}` `props` `brand` `wall` |
| 动效库 | `fx-aspect-drop` | 三画幅落地 | 讲成片出来了、横屏 / 4:3 / 竖屏都能出、一次出多个版本：三块画面按真实比例依次砸落、挤压回弹扬灰，每块都在播按各自画幅重排的同一条片子，最后弹出帧率角标 | items:[{r 宽高比, t 名称, sub 分辨率, at 落地时刻}]（省略 = 16:9 / 4:3 / 9:16）；title / caption  |
| 动效库 | `fx-deliver-fan` | 交付文件发牌 | 讲交付什么、不只成片工程也给你、导出字幕 / 分轨 / 工程文件：一叠牌里一张张发出交付文件，沿弧线落成扇形，最后挑起一张打上标签 | items:[{fmt 格式色标文字, t 名称, d 说明, c 颜色, icon, at 发出时刻}]（省略 = 成片 / XML / 剪映 / SRT / |
| 动效库 | `fx-raw-clip` | 口播原片 | 讲一条没剪过、满是口误的口播原片，或'交给 AI 之前'的样子：灰色视频文件卡，声波乱跳，口误气泡冒出；被施法 / 交给 AI 时由灰变彩、流光描边、气泡蒸发 | name 文件名；meta 说明；dur 右上角时长；bubbles:[{t,at,pos:[x,y]}] 口误气泡（pos 相对本层 box）；chargeA |

## 12 · 风格质感 / 高亮 / 图标

| 来源 | id | 名称 | 用在 | 动作 / 参数 |
|---|---|---|---|---|
| 组件 | `chips` | chips | 胶囊 / 玻璃按钮逐个弹出或逐个点亮 | `items:[{t, icon, tone, sub, at |
| 组件 | `tags` | tags | 人物两侧术语雨（左右交替） | `left:[…]` `right:[…]` `style: glow/solid/sticker` `stagger` |
| 组件 | `sticker` | sticker | 图标 / emoji 贴纸 | `icon` `text` `style: round/plain/hl` `rotate` `bob` |
| 组件 | `confetti` | confetti | 彩纸（情绪爆点） |  |
| 组件 | `burst` | burst | 速度线 + 冲击环（砸字、爆点） |  |
| 动效库 | `fx-play-sprite` | 播放键小精灵 | 片头 solo / 演示操作 / 品牌吉祥物：原创播放键小角色按关键帧路径跑、跳、翻跟斗、滚、点按钮、放技能，和画面里的元素互动 | path:[{t,x,y,act,h,dir,target}]（t 相对本层；x/y 是脚底位置 0–1；act: pop idle wave run jump |
