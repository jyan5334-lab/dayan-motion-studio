# 大琰DAYAN 动效库（334 条）与新引擎的对应关系

大琰DAYAN 动效库（v6.1 优化版，100 模板 / 130 动效 / 104 包装件）**不随公开仓库发布**。有这份库文件的用户，把它放到 `assets/dayan-library.html` 即可使用下面第 2 种用法；没有也不影响剪辑，默认走第 1 种。两种用法：

1. **用升级版组件重做**（默认）：同一类语义，新引擎的组件是时间纯函数、能按关键词对齐、自带音效、和人物窗联动，画面更精致。下表给出每一族对应的组件。
2. **直接嵌入原卡**：想要某张原卡的原样效果时，用 `dayan` 组件，引擎会逐帧 seek 原卡的 CSS 动画：
   ```json
   {"c": "dayan", "cue": "价格", "box": "full", "props": {"id": "M03·2", "text": {"title": "¥129 / 月"}, "wall": "platinum"}}
   ```
   原卡的署名、账号、文字墙自动换成使用者自己的品牌（edit.json 的 `brand`）。原卡是 1920×1080 横屏布局，竖屏片子不要直接嵌。
   查卡：浏览器打开 `assets/dayan-library.html`，或在项目文档《DAYAN动效库_v6.1_优化版》里按编号搜索。库文件不存在时不要用 `dayan` 组件，改用下表的升级版组件。

| 库内阶段 / 族 | 典型卡 | 升级版组件 |
|---|---|---|
| 01 开场（A 组、title、poster、chapbig、radial、stacktxt、badge、icon） | 翻牌开场、巨字遮罩、铬字大标题、印章盖题、放射章节、Let's Go 文字流 | `title`（slam/mask/chars/3d）、`stamp`、`echo`、`chapter`、`logo`、`sticker` + `bg-burst` / `bg-wall` |
| 02 数据（B 组、num、count3d、money、gauge、cal、matrix、txt3d、splitflap） | 平台大数字、价格砸入、表盘、日程、立体大数字 | `number`、`gauge`、`bars`、`timeline`、`grid`、`logo`(metal) |
| 03 对比（C 组、bar、splitcol、pricecard） | 左右分屏 VS、三栏对比、价格差距条、三档套餐 | `compare`、`bars`、内置动效 `compare-verdict` |
| 04 流程关系（D 组、node、step、check、listin、flowcon） | 步骤条、中心辐射、决策流、勾选清单 | `flow`、`nodes`、`checklist`、`timeline`、`stacks`、内置动效 `term-explainer` |
| 05 引用社媒（E 组、chat、paper） | 评论卡、推文卡、指令对话、批注便签 | `quote`、`chat`、`bubble`、`doc`、`type` |
| 06 人物字幕（F 组、tick、subbar、lower3） | 圆形人物窗、章节导航、人名条、跑马灯 | 人物窗系统（presenter keys）、`nav`、`namecard`、字幕样式 clean/pill/bold |
| 07 收尾 CTA（G 组、spec、stamp） | 关注引导、三连卡、下期预告、印章 | 内置动效 `cta-outro`、`chips`(sticker)、`stamp` |
| 08 转场（trans、speedln、tiled、gridtr） | 放大转场门、甩入、倒计时门、速度线 | 场景 `transition`：zoom-in / whip / push-left / line / iris / flash，`burst` |
| 09 界面录屏（phone、mocks） | 聊天屏、图文流、商品详情 | `phone`、`window`（`sim: true` 标"界面示意"） |
| 10 文字墙（16 套皮肤） | pop、gold、acid、song、chrome、lime、obsidian、platinum、abyss、hollow、satin、lacquer、frost、porcelain、jade、mist | `bg-wall`：沿用库里的文字墙版式，两行字用使用者自己的品牌（edit.json 的 `brand.wall`）|
| 11 悬浮画中画（floatcard、pip、sticker、mediagrid、shotstack、devframe、circallout、sticky） | 三卡斜置飞入、录屏+圆形人像、圈选+箭头、便签 | `cards`、`media`、`window`（callouts/highlight/cursor）、`mark`、`arrow` |
| 12 风格质感（hlmark、appgrid、codeflow、iso3d、colorblk、hlword、wm、topic、mascot） | 荧光笔扫亮、图标阵列、终端打字、关键词飞字 | `title`(marker/block)、`chips`、`type`(terminal)、`mark`(marker)、背景主题 |

库里检查记录中提到的"T01–T50 版式偏小、留白偏多"，在新组件里已按参考片的密度规则重做（大字占 40–60% 画面、每屏一个主焦点）。
