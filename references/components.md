# 组件库（引擎内置 45 个）

所有组件都是"时间的纯函数"：任意跳帧、往返拖动结果一致。每个组件自带入场动作和接触点音效。`props` 里的文字都支持 `hl`（高亮词）。

通用层字段：`share`（跨场景元素承接，配合 `morph` 转场）、`lift` / `sheen`（落地投影 / 光泽扫过，卡片类默认开）、`enter`（不写时卡片类默认 `settle` 弹性落定，其余 `rise`）。运动模糊由引擎按位移自动加。

## 文字与标注
| 组件 | 用途 | 主要 props |
|---|---|---|
| `title` | 大标题（逐字升起 / 上浮 / 擦出 / 砸入 / 打字） | `text` `hl` `sub` `eyebrow` `size` `ebSize`（眉标字号） `subSize`（副标题字号） `align` `reveal: chars/rise/mask/slam/type` `style: heavy/serif/outline/glow/3d/marker/block` `underline` `color` |
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
| `dayan` | 嵌入大琰DAYAN 原卡（328 张），逐帧 seek；卡里的文字都是样板，用 `replace` 换成本期内容（先 `dms.py card <卡号>` 看样板文字） | `id` `replace:[[原文,新文],…]` `text:{槽位:文案}` `props` `brand` `wall` |

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
| `fx-raw-clip` | 口播原片：灰色视频文件卡，声波乱跳，口误气泡冒出；被施法 / 交给 AI 时由灰变彩、流光描边、气泡蒸发成火花 | `name` `meta` `dur` `bubbles:[{t,at,pos}]` `chargeAt` `glowAt` `okText` |
| `fx-word-tape` | 字卡听写 / 口误剪除：`listen` 声波压成一排带时间码的字卡、播放头扫过；`cut` 口误卡变红 → 碎裂（碎片带重力）→ 两边合拢、弹出剪掉几秒。两段接着用画面连续 | `words:[{t,tc,bad}]` `mode` `pressAt` `stagger` `badAt` `smashAt` `closeAt` `cutText` `maxSize` |
| `fx-storyboard` | 分镜翻牌：一排字卡，念到哪个词就翻成一格分镜并立刻演出（步骤条 / 数字滚动 / 前后对比 / 清单打勾） | `items:[{key,tc,kind: steps/number/compare/check,at|cue,label,…}]` |
| `fx-sound-desk` | 音效台：动作排在时间轴上，音效波形掉下来落在接触点、动作亮起；右边响度表指针收敛到 −15 LUFS | `hits:[{t,icon,kind,name,at|cue}]` `meterAt` `target` |
| `fx-director-scan` | 导演检查扫描：分镜缩略图被扫描线扫过，问题格亮红框标签，随后自动改正变绿勾，建议数降到 0 | `thumbs:[{title,sub,subtitle,issue,fixTitle,fixSub,fixMove}]` `scanAt` `scanDur` `fixAt` `fixStagger` |
| `fx-aspect-drop` | 三画幅落地：16:9 / 4:3 / 9:16 三块画面按真实比例砸落、挤压回弹扬灰，每块播按各自画幅重排的同一条片子，最后弹出 60 FPS 角标 | `items:[{r,t,sub,at}]` `title` `caption` `badge` |
| `fx-deliver-fan` | 交付文件发牌：一叠牌里一张张发出成片 / XML / 剪映 / 字幕 / 分轨 / HTML 工程，沿弧线落成扇形，挑起一张打标签 | `items:[{fmt,t,d,c,icon,at}]` `pick` `pickAt` `pickText` |
| `fx-conveyor` | 流水线传送带（放 globals 常驻）：底部皮带随 push 转场同步滚动，像镜头一路跟拍；下方站点导航亮起当前站。精灵可站在皮带上 | `stations` `pans:[{t,dur,d}]` `steps:[{t,i}]`（绝对时间） |
| `fx-station-strip` | 全景收束：从最后一站特写拉远露出整条流水线站牌，再全部收拢到中心闪白，下一层（仓库卡、品牌卡）接上 | `stations` `zoomAt` `zoomDur` `from` `collapseAt` |

## 12 类动效清单（v1.9 补齐，每类 ≥5 个）

按「这句话在干什么」选类，再在类里按语义挑。所有动效都是参数化组件：其他 Agent 直接改 `props` 里的文字、数字、时间、颜色即可复用，不需要改代码；`dms.py effect list` 能列出全部。

**放法**：01–07、09、11 放 `scene.layers`（`box` 可写 `zone` / `zone-main` / `zone-aside` 等内容区，按人物位置和画幅自动排）；08 转场放在两句交界处、`box: "full"`、`at` 设在切点前约半个时长；10 放 `scene.bg`；12 放 `globals`（整片常开，低强度）。

**真实图片**：带 `img` / `imgs` / `avatar` / `posters` / `results` 的字段只能放真实来源（新闻配图、官方海报、真实截图），在画面角落或说明里注明来源；找不到真实图就不填，组件显示「待放真实图片」占位——成片前要么补上真图，要么换成不带图的动效，**绝不生成假图**。

### 01 开场 · 标识
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-collab-badge` 联名标识 | 官方合作、品牌联名、"××官方 × ××团队"开场：左右两个标识从两侧滑入，中间 × 旋转落定，扫光掠过，下方一行说明 | a / b：{name 名称, img 真实 logo 图片（可选，必须用官方图）, color}；sub 说明；cross 中间符号（默认 ×） |
| `fx-depth-word` 巨字在人身后 | 开场钩子、情绪词（急 / 卷 / 慌 / 爽）：一个巨字砸进画面，配合 scene.personFront 让人物压在字前面；旁边两行小标题点题 | word 巨字（1–2 字）；color 字色；side:[{t,hl}] 旁边两行；sideAt；pos left/right 巨字在左或右；tilt 倾角 |
| `fx-flap-title` 翻牌标题 | 开篇钩子、章节名、倒计时式揭晓：每个字像机场翻牌一样翻几轮后停在目标字，正式、有时间感 | text 目标文字；sub 下方小字；flips 每格翻几轮（默认 4）；stagger 错峰；tone 牌面颜色 dark/light |
| `fx-hook-question` 大问句钩子 | 开场或转折抛问题（"凭什么免费？""谁来教？""值不值？"）：粗体问句砸出，问号跳动，下面一行英文小字，左上角压一条色块 | q 问句（含问号）；en 英文小字；tone 主色；at 默认 0 |
| `fx-impact-title` 冲击标题 | 开场一句狠话、结论砸下（"甩了几条街""直接封神"）：放射速度线收拢，标题从镜头前砸到画面上，碎屑飞散，整屏一震 | text 标题；hl 高亮词；sub 副标题；color 速度线颜色 |

### 02 数据 · 报表
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-donut` 环形占比 | 讲占比、份额、构成（"七成的人""成本里 60% 是人工"）：环形分段依次顺时针长出，中间数字滚到主占比，右侧图例逐条亮起 | items:[{t 名称, v 数值, c 颜色}]；center 中间大字（默认第一项占比）；label 中间小字；unit；source |
| `fx-line-chart` 增长折线 | 讲增长、趋势、走势（"三个月涨了 5 倍""用户数一路涨"）：坐标网格淡入，折线一笔画出，面积渐变跟着填充，关键点亮起并弹出数值标签，峰值处挂一个标注 | data:[数值…]；labels:[横轴标签…]；unit 单位；peak 标注文字（挂在最大值上）；color；source 出处小字；drawAt / drawDur |
| `fx-price-card` 会员卡价签 | 讲价格、套餐、会员、积分（"送一张 99 块的会员卡""500 积分"）：一张实体感的会员卡带厚度和高光翻转落定，数字滚动，侧边挂一枚带条形码的吊牌晃动 | title 卡名；value 大数；unit 单位（积分/次/天）；price 价格；brand 卡面小字；tag 吊牌文字；color 卡色 |
| `fx-rank-bars` 排行条 | 讲排名、榜单、谁第一（"最常用的 5 个 AI 工具""播放量前五"）：横条从短到长依次长出，名次徽章翻出，第一名高亮并加冠，数值滚动 | items:[{t 名称, v 数值, img 真实图标（可选）}]（按传入顺序，第一项为第一名）；unit；title 小标题；source |
| `fx-stat-hero` 数据大字 | 讲一个亮眼成绩（"累计播放 1260 万+""全网粉丝 30 万"）：大号数字滚到目标值、单位和 + 号弹出，下方说明和一枚次级数据胶囊；可叠第二个数据向上顶出 | stats:[{v 数值, unit 单位（万/亿/%）, plus 是否带 +, label 说明, chip 次级数据}]（第二项起依次替换上一项，旧数据缩小上移）；every 每项间隔；color |

### 03 对比 · 论证
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-myth-fact` 误区 vs 真相 | 纠正常见说法（"很多人以为……其实……"）：先出一张"误区"卡，红色 ✕ 盖章划掉，卡片翻转成"真相"卡，绿色 ✓ 落定 | myth 误区原话；fact 真相；mythLabel / factLabel 标签（默认 误区 / 真相）；flipAt 翻转时刻 |
| `fx-price-eq` 价格等式 | 算账、拆价格、讲"其实只花了多少"（"¥199 − ¥159 = ¥40"）：两个价格依次弹出，运算符落下，等号后面一张锯齿小票砸下显示结果，下方补一行换算 | a / b 两个数（带单位字符串）；op 运算符（− + × ÷）；result 结果；note 换算说明；hlB 第二个数用高亮色 |
| `fx-scale-balance` 天平称重 | 讲权衡、性价比、哪边更重（"花的钱 vs 得到的""时间 vs 质量"）：天平摆动，两边托盘依次放上砝码卡，横梁倾向更重的一边并晃动停稳 | left / right：{t 名称, w 权重（数值，决定倾斜）, sub 说明}；verdict 结论（挂在下沉的一边） |
| `fx-spec-table` 参数对比表 | 多维度比较两三个选项（价格、速度、画质、能不能商用）：表头落下，逐行展开，每行胜出的格子亮起，最后一列总结胜者盖章 | cols:[选项名…]；rows:[{t 维度, v:[各选项的值…], win 胜出列序号}]；winner 最终胜者列序号；winText 盖章文字 |
| `fx-vs-split` VS 对撞 | 两方硬碰硬（工具 A vs 工具 B、国内 vs 海外、老办法 vs 新办法）：左右两块色板从两侧冲进来撞在中线，闪光后 VS 字砸出，两边各列 2–3 个要点 | left / right：{name 名称, img 真实 logo（可选）, color, points:[要点]}；vs 中间字 |

### 04 流程 · 关系
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-analogy-map` 类比关系图 | 用打比方讲清楚生意模式、上下游关系（"模型厂商 → 培训课 → 你"）：白色节点卡一张张弹出，折线箭头沿路径画过去，节点下挂红 / 绿状态行，旁边弹价格徽章；跟着口播一步步亮 | nodes:[{id, t 名称, icon, sub 状态行, tone bad/good, big 大卡, x, y 中心位置(0–1), at}]；links:[{from, to, at, dash}]；badges:[{node, t, at}] |
| `fx-cycle` 循环闭环 | 讲飞轮、正循环、闭环（"内容 → 流量 → 收入 → 更好的内容"）：节点沿圆环依次亮起，箭头弧线一段段画过去，中心写主题，最后整圈转一下表示转起来了 | items:[节点文字…]（3–6 个）；center 中心文字；sub 中心小字；spinAt 整圈转动时刻 |
| `fx-funnel` 转化漏斗 | 讲层层筛选、转化率（"1000 人看到 → 100 人点进 → 10 人下单"）：漏斗一层层从上往下展开，每层数字滚动，右侧标出层间转化率，底部出口亮起 | levels:[{t 名称, v 数值}]；unit；showRate 是否标转化率（默认是）；color |
| `fx-mind-tree` 结构树 | 讲一件事分几块、每块又包含什么（"这套课教 3 件事，每件 2–3 个要点"）：根节点在左，分支曲线向右生长，二级节点逐个展开，最后高亮一个重点分支 | root 根；branches:[{t 分支, leaves:[叶子…]}]；focus 高亮第几个分支（可选）；color |
| `fx-step-pager` 步骤进度条 | 讲"从 A 到 B 要几步、现在走到第几步"（"从构思到成片 7 步"）：一排编号方块，亮到当前步，起点终点挂说明，进度线跟着推进；可按口播逐步推进 | n 总步数；at:[每一步点亮的时刻…]（或 every 间隔）；start / end 两端说明；current 停在第几步（默认全部）；color |

### 05 引用 · 社媒
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-hot-list` 热搜榜 | 讲"大家都在讨论什么""冲上热搜"：一块热搜榜面板，前几名逐条刷出（排名、话题、热度、新 / 热 / 爆标签），然后选中某一条放大展开，带真实配图 | platform 榜单名；items:[{t 话题, heat 热度, tag 新/热/爆, img 真实配图（可选）}]；focus 展开第几条；focusAt |
| `fx-news-card` 新闻卡 | 讲最近的新闻、行业动态、官方公告（"某某刚刚发布……"）：一张新闻卡带真实配图倾斜滑入，配图缓慢推近，标题逐行出现、关键词划亮，底部来源和时间，角上挂"热点"标签 | img 真实新闻配图（必须来自新闻页面 / 官方渠道，不能生成）；source 来源媒体；time 时间；title 标题；hl 高亮词；tag 角标；credit 底部出处小字 |
| `fx-phone-comments` 手机评论区 | 讲"评论区天天有人问""大家在说什么"：一部手机，顶部是帖子标题，评论一条条从底部顶上来（头像、昵称、内容、点赞），最后高亮其中一条 | title 帖子标题；comments:[{name, t 内容, likes}]；every 间隔；focus 高亮第几条；label 手机旁的标签（可选） |
| `fx-poster-wall` 真实海报墙 | 讲某部作品 / 课程 / 产品（"这部片很多人刷到过""做它的团队"）：真实海报卡叠放展开，主海报推到前面，角上播放量，旁边依次挂类型标签和关键信息胶囊 | posters:[真实海报图…]（必须是官方海报 / 截图）；plays 播放量；tags:[{t, icon}]；main 主海报序号；credit 出处小字 |
| `fx-social-post` 社交帖子卡 | 引用某条帖子、微博、推文、朋友圈、官方账号发言：帖子卡滑入，头像昵称认证，正文逐行出现，真实配图宫格展开，点赞 / 评论 / 转发数字滚动上涨 | avatar 头像（真实图片）；name 昵称；handle 账号；verified 认证；time；text 正文；hl 高亮词；imgs:[真实配图…]（0–4 张）；likes / comments / shares 数字 |

### 06 人物 · 字幕
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-chapter-tag` 章节议程标签 | 人物全屏讲话时，左上角挂一个双语章节标签和本段议程（"一站式搞定：剪辑 · 自动 / 音效 · 配好 / 封面 · 也出"）：标签胶囊滑入，议程一条条亮起，讲到哪条哪条最亮 | en 英文章节名；cn 中文章节名；items:[{t 中文, en 英文, icon, at 亮起时刻}]；current 当前第几条（默认最后亮起的） |
| `fx-keyword-pop` 关键词弹词 | 口播里一个重点词需要被"喊"出来（"免费""三分钟""翻车"）：贴纸感的大词带描边和投影弹出，轻微倾斜晃动，四周迸出小火花，适合放在人物旁或字幕上方 | word 关键词；sub 小字（可选）；tone 底色；tilt 倾角；pos 用 box 控制 |
| `fx-name-strip` 人物名字条 | 人物第一次出场、介绍嘉宾或讲师（"讲师 · 某某老师""《××》原创团队"）：色条从左擦出，名字大字压上，身份小字跟进，侧边可放真实 logo，离场时反向擦除 | name 名字；title 身份；logo 真实 logo 图（可选）；color 色条；out 由层的 out 控制 |
| `fx-side-caption` 人物旁标题 | 人物全屏说话时，在人物空出来的一侧压两行标题点题（"工具比人 / 还勤快"），第二行高亮；可配 layer.front 放在人物前面，或不加让它在人物身后 | lines:[{t, hl}]；en 英文小字；align left/right；tone 高亮色 |
| `fx-speaker-quote` 金句引用 | 人物说出一句金句、观点、别人的原话时：巨大的引号先落下，金句逐字打出，关键词变色，下方一条细线拉出署名 | text 金句；hl 高亮词；by 署名；tone 引号颜色 |

### 07 收尾 · CTA
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-comment-ask` 评论区互动 | 结尾引导留言（"想要的评论区扣 1""你会怎么选？A 还是 B"）：一个评论输入框打出引导语，下方几条"1"和回复气泡快速刷上来，数字计数跳涨 | prompt 引导语；replies:[回复…]；count 最终计数；label 计数标签 |
| `fx-end-brand` 品牌落版 | 整条片子的最后一个画面：品牌标识在中心亮起，品牌名逐字出现，一句 slogan 跟进，光线扫过，四周粒子慢慢散开，停 1–2 秒 | mark 标识字（或 img 真实 logo）；name 品牌名；slogan；color |
| `fx-follow-card` 关注名片 | 结尾引导关注账号：一张名片卡弹出（头像、账号名、一句介绍、作品数 / 粉丝数），光标移到"关注"按钮点下去，按钮变成"已关注"并冒出爱心 | avatar 头像（真实图片，可选）；name；bio；stats:[{t, v}]；btn 按钮文字；done 点后文字；clickAt |
| `fx-next-episode` 下期预告 | 结尾预告下一期（"下期我让它自动做封面，想看扣 1"）：一张"NEXT"预告卡从下方推上来，标题打出，下方期数和日期胶囊，角上倒计时圈转满 | label 角标（默认 NEXT EPISODE）；title 下期标题；ep 期数；date 日期 / 时间；img 下期画面（可选，真实截图）；count 倒计时秒数（默认 3） |
| `fx-series-list` 系列目录 | 结尾或片头交代"这是系列第几期、后面还有什么"：一列期数卡，已更新的打勾，当前这期高亮放大，未更新的灰着带锁 | title 系列名；eps:[{t 标题, state done/now/lock}] |

### 08 转场
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-glitch-hit` 故障闪切 | 话题突然转折、"但是！""翻车了"：0.5 秒内画面被横向切片错位、RGB 分离、反色闪两下，盖住切点，适合科技 / 翻车 / 反转 | dur 时长（默认 0.5）；strength 0–1 强度；color 主色 |
| `fx-light-sweep` 光斑过曝 | 温柔的情绪转场、回忆 / 憧憬 / "想象一下"：一团暖色光从画面一角涌入、整体过曝到接近白，再退去露出下一段，适合情绪、生活类内容 | dur（默认 0.8）；from 光源方位 tl/tr/bl/br（默认 tr）；color 光色 |
| `fx-shutter` 快门开合 | "咔嚓"一下换镜头、讲到拍照 / 截图 / 记住这一刻：上下两片黑色快门合上（中间一道亮线），停一帧再打开，可选闪白 | dur（默认 0.6）；hold 合上停留（默认 0.06）；flash 是否闪白（默认 true）；label 合上时中间小字（可选，如 "CHAPTER 2"） |
| `fx-swipe-bands` 彩带横扫 | 段落之间的轻快过渡、"好，下一个"：三条品牌色斜带从一侧依次扫过整屏，最宽那条刚好盖满时切换内容，适合清单类 / 轻松段落 | dur（默认 0.7）；dir left/right（默认 left，从右往左）；colors 三个颜色；angle 倾角（默认 -12） |
| `fx-zoom-burst` 冲刺变焦 | 进入重点、"直接上干货""冲"：画面中心向外拉出放射速度线、边缘径向模糊，0.4 秒冲进下一句，适合节奏加速和高能段落开头 | dur（默认 0.5）；cx, cy 冲刺中心（0–1，默认 0.5）；color 线色 |

### 09 界面演示
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-app-gen` AI 生成面板 | 演示"输入一句话 → AI 生成结果"：一个工具面板里提示词逐字打出，光标点"生成"，进度条跑满，结果格子依次翻出（放真实生成截图） | app 工具名；prompt 提示词；btn 按钮字；results:[真实结果截图…]（1–4 张，没有就占位）；genAt 点击时刻；genDur 生成时长 |
| `fx-browser-shot` 浏览器实拍 | 讲到某个网站 / 官网 / 产品页（"打开它的官网""GitHub 上已经 2 万星"）：浏览器窗口弹出，网址逐字打出，页面是真实截图，自动往下滚一段，可在某处画框高亮 | url 网址；img 真实网页截图（长图可滚）；scroll 滚动比例 0–1（默认 0.3）；mark [x, y, w, h] 高亮框（0–1，相对窗口可视区，可选）；markLabel 高亮旁标注；tabs:[标签页标题…] |
| `fx-cursor-tour` 光标导览 | 手把手讲一个界面"先点这里，再看这里"：一张真实截图上，光标依次移动到几个热点，每到一处出现放大圈和编号标注，讲到哪里亮哪里 | img 真实截图；pts:[{x, y 0–1, t 标注, at 到达时刻}]；zoom 放大圈倍数（默认 1.8） |
| `fx-settings-toggle` 设置开关 | 讲"只要打开这个选项""这三个设置一定要改"：一个系统设置面板，几行设置项依次出现，开关一个个拨到开（变色），重点那一行高亮并带箭头标注 | title 面板标题；items:[{t 名称, d 说明, on 最终是否打开, key true 为重点}]；note 重点标注文字 |
| `fx-terminal` 终端命令 | 讲到装技能 / 跑脚本 / 一行命令搞定（"只要一行命令"）：深色终端窗口，命令逐字打出，回车后输出一行行刷出，最后一行绿色 ✓ 完成 | title 窗口标题；lines:[{cmd 命令} 或 {out 输出, ok true 时绿色}]；speed 打字速度（字/秒，默认 26） |

### 10 背景
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-bg-aurora` 极光流动 | 高级、温柔、"未来感"段落的底：深色底上几条品牌色极光带缓慢流动、交叠发光，不抢主体；放在 scene.bg 里 | colors 三个颜色；speed 流速（默认 1）；dim 暗度 0–1（默认 0.35）；base 底色 |
| `fx-bg-blueprint` 蓝图工程 | 讲原理、架构、"拆解一下它是怎么做的"：蓝色工程图纸底，网格 + 若干辅助线、圆规弧、尺寸标注慢慢被画出来，像设计稿；可以换成暗色 | tone blue/dark（默认 blue）；notes:[标注文字…]（默认几个尺寸数字） |
| `fx-bg-dotwave` 点阵波浪 | 数据、科技、"算法 / 规律"段落的底：一片透视点阵，像海面一样起伏波动，远处渐隐，高光点随波峰发亮 | color 点色；rows / cols 点数（默认 26 × 48）；amp 波高（默认 1）；speed |
| `fx-bg-spotlight` 舞台追光 | 发布、揭晓、"隆重介绍"段落的底：暗场里两三束追光从顶部斜打下来、慢慢摆动，地面有光斑和反光，空气里有细尘 | beams 光束数（默认 3）；color 光色；focus 地面光斑中心 x（0–1，默认 0.5，可对准人物） |
| `fx-bg-tilt-words` 斜排关键词墙 | 整段话题的氛围底（和品牌文字墙不同：这里用本段关键词）：几行斜排大字，实心与描边交替，相邻两行反向慢移，整体压暗，让人物和动效浮在上面 | words:[关键词…]；angle 倾角（默认 -8）；speed；tone 亮度 0–1（默认 0.18）；color 实心字颜色 |

### 11 浮窗 · 画中画
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-float-shot` 3D 悬浮截图 | 讲到某个产品 / 页面 / 作品时，让真实截图"立"在人物旁边：截图带透视倾斜从远处飞入，悬浮轻摆，底下有投影和倒影，边缘一道高光扫过 | img 真实截图；ry 左右倾角（默认 -18，人物在右时用负值让图朝向人物）；rx 上下倾角（默认 8）；caption 图下说明（可选）；radius 圆角 |
| `fx-magnify` 放大镜细节 | "注意看这个细节""小字里写着…"：一张真实图片上，放大镜从边上滑入停在细节处，镜片里是放大 2–3 倍的画面，旁边拉出一句标注 | img 真实图片；x, y 放大点（0–1）；zoom 倍数（默认 2.4）；note 标注文字；size 镜片直径（占框高比例，默认 0.42） |
| `fx-stack-shots` 截图叠放展开 | "我试了好几个工具 / 做了好几版"：几张真实截图先叠成一摞落下，再像扑克牌一样扇形展开，最后一张（或指定那张）抽出放大 | imgs:[真实截图…]（2–6 张）；labels:[每张小标签]；pick 最后抽出的序号（默认最后一张，-1 不抽） |
| `fx-sticker-pop` 贴纸印章 | 给结论盖个章 / 贴个贴纸（"已购买""亲测有效""避雷""YYDS"）：一张带白边的异形贴纸从上方拍下来、轻微回弹，边角翘起投影，可以连贴几张 | stickers:[{t 文字, x, y 位置 0–1, rot 角度, color, shape round/star/tag, at 出现时刻}] |
| `fx-tag-callout` 吊牌标注 | 给画面里的某个东西"挂个牌子"（产品名 / 价格 / 型号 / "官方正品"）：一根细线从指定点甩出，一张带打孔和条形码的吊牌晃两下停住 | x, y 挂点（0–1，在框内）；title 主字；sub 副字；price 价格（可选）；code 条码下的编号；side left/right 吊牌朝向 |

### 12 质感 · 调色层
| 动效 | 什么时候用 | 字段 |
|---|---|---|
| `fx-color-grade` 统一调色 | 把整片（人物素材 + 动效）压成同一个色调：青橙电影感 / 暖调生活 / 冷调科技 / 黑白回忆；也可只在某一段切换风格，用来区分"过去 / 现在" | look teal-orange/warm/cool/mono/fade（默认 teal-orange）；amount 0–1（默认 0.6）；fadeIn 渐入秒数 |
| `fx-film-grain` 胶片颗粒 | 整片加一层会动的细颗粒 + 轻微闪烁，去掉"数码塑料感"，让 HTML 动效和真人素材更融为一体；建议全片低强度常开 | amount 强度（默认 0.35）；size 颗粒大小（默认 1）；flicker 亮度闪烁（默认 0.04）；dust 是否有灰尘划痕（默认 false） |
| `fx-light-leak` 漏光 | 生活、情绪、回忆段落的胶片味：画面边缘偶尔飘过暖色漏光，像老相机进光，强度很低、慢慢呼吸，不影响阅读 | amount 强度（默认 0.5）；colors 两个漏光色；speed；side 漏光主要出现的边 left/right/both（默认 both） |
| `fx-scanlines` 屏幕扫描线 | "像在屏幕上看"的科技 / 复古感：细横向扫描线 + 一条亮带缓慢从上往下扫 + 边缘轻微色差，适合讲 AI、代码、监控、复古游戏 | amount 强度（默认 0.35）；gap 线距 px（默认 4）；band 是否有扫描亮带（默认 true）；rgb 边缘色差（默认 true）；speed |
| `fx-vignette` 暗角聚焦 | 整片或某段压暗四角，把视线收到人物和主内容上（几乎每条片子都可以开着）；可以随重点句短暂收紧 | amount 强度 0–1（默认 0.45）；shape round/wide（默认 wide，横屏更自然）；pulse:[时刻…] 这些时刻收紧一下；cx, cy 中心 |

## 写新组件
在 `engine/components-*.js`、动效库 `effects/<id>/component.js` 或行业包模板的 `components.js` 里：
```js
DMS.components['my-thing'] = {
  enter: 'rise',                       // 外层入场：rise/settle/pop/drop/slide-l/slide-r/zoom/slam/fade/wipe/none
  build(el, props, L) { /* 只建一次 DOM，返回状态 */ return {}; },
  update(el, lt, props, state, L, t) { /* lt=本层已出现秒数，t=全片时间；只用 t 计算，不用真实时间和随机数 */ },
  sfx(props) { return [{at: 0, kind: 'pop', gain: 0.5}]; }   // 相对本层 at 的音效事件
};
```
