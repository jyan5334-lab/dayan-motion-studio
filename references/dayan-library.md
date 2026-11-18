# 大琰DAYAN 动效库（334 条）与新引擎的对应关系

技能自带你的动效库 `assets/dayan-library.html`（v6.1 优化版，100 模板 / 130 动效 / 104 包装件）。两种用法：

1. **用升级版组件重做**（默认）：同一类语义，新引擎的组件是时间纯函数、能按关键词对齐、自带音效、和人物窗联动，画面更精致。下表给出每一族对应的组件。
2. **直接嵌入原卡并改成本期内容**（用户 2026-11-13 定：原卡里的内容只是样板，可以改了拿来用）：用 `dayan` 组件，引擎会逐帧 seek 原卡的 CSS 动画。
   - 先 `dms.py card <卡号>`：出样张（入场 / 落定 / 后段），列出卡里全部可见文字，给出写法。
   - 再用 `replace: [[原文, 新文], …]` 把每一条样板文字、数字、价格、产品名换成本期口播的内容，不要的换成 `""`。
   - 最后 `dms.py card <卡号> --replace 替换表.json` 复查。
   ```json
   {"c": "dayan", "cue": "五分之一", "box": "full", "props": {"id": "M03·2", "replace": [["全部办下来只要", "GPT-6.1 Sol 的成本只要"], ["¥8,000", "1/5"], [".00", ""], ["汇率 1 : 1", "对比 GPT-6 Astra"], ["¥17,378", "省 80%"], ["那香港哪家最便宜", "日常任务交给 Codex"], ["So which one in Hong Kong is cheapest", "CODEX · COST"]]}}
   ```
   旧写法 `text: {槽位: 文案}` 仍可用，但只覆盖少数槽位，大多数卡要用 `replace`。下面是旧示例：
   ```json
   {"c": "dayan", "cue": "价格", "box": "full", "props": {"id": "M03·2", "text": {"title": "¥129 / 月"}, "wall": "platinum"}}
   ```
   原卡的署名、账号、文字墙自动换成使用者自己的品牌（edit.json 的 `brand`）。原卡是 1920×1080 横屏布局，竖屏片子不要直接嵌。
   查卡：`references/catalog.md`（按语义分组的完整目录）、`dms.py catalog 关键词`，或浏览器打开 `assets/dayan-library.html`。

| 库内阶段 / 族 | 典型卡 | 升级版组件 |
|---|---|---|
| 01 开场（A 组、title、poster、chapbig、radial、stacktxt、badge、icon） | 翻牌开场、巨字遮罩、铬字大标题、印章盖题、放射章节、Let's Go 文字流 | `title`（slam/mask/chars/3d）、`stamp`、`echo`、`chapter`、`logo`、`sticker` + `bg-burst` / `bg-wall` |
| 02 数据（B 组、num、count3d、money、gauge、cal、matrix、txt3d、splitflap） | 平台大数字、价格砸入、表盘、日程、立体大数字 | `number`、`gauge`、`bars`、`timeline`、`grid`、`logo`(metal) |
| 03 对比（C 组、bar、splitcol、pricecard） | 左右分屏 VS、三栏对比、价格差距条、三档套餐 | `compare`、`bars`、`fx-vs-split`、`fx-myth-fact` |
| 04 流程关系（D 组、node、step、check、listin、flowcon） | 步骤条、中心辐射、决策流、勾选清单 | `flow`、`nodes`、`checklist`、`timeline`、`stacks`、`fx-mind-tree` |
| 05 引用社媒（E 组、chat、paper） | 评论卡、推文卡、指令对话、批注便签 | `quote`、`chat`、`bubble`、`doc`、`type` |
| 06 人物字幕（F 组、tick、subbar、lower3） | 圆形人物窗、章节导航、人名条、跑马灯 | 人物窗系统（presenter keys）、`nav`、`namecard`、字幕样式 clean/pill/bold |
| 07 收尾 CTA（G 组、spec、stamp） | 关注引导、三连卡、下期预告、印章 | `fx-follow-card`、`fx-next-episode`、`chips`(sticker)、`stamp` |
| 08 转场（trans、speedln、tiled、gridtr） | 放大转场门、甩入、倒计时门、速度线 | 场景 `transition`：zoom-in / whip / push-left / line / iris / flash，`burst` |
| 09 界面录屏（phone、mocks） | 聊天屏、图文流、商品详情 | `phone`、`window`（`sim: true` 标"界面示意"） |
| 10 文字墙（16 套皮肤） | pop、gold、acid、song、chrome、lime、obsidian、platinum、abyss、hollow、satin、lacquer、frost、porcelain、jade、mist | `bg-wall`：沿用库里的文字墙版式，两行字用使用者自己的品牌（edit.json 的 `brand.wall`）|
| 11 悬浮画中画（floatcard、pip、sticker、mediagrid、shotstack、devframe、circallout、sticky） | 三卡斜置飞入、录屏+圆形人像、圈选+箭头、便签 | `cards`、`media`、`window`（callouts/highlight/cursor）、`mark`、`arrow` |
| 12 风格质感（hlmark、appgrid、codeflow、iso3d、colorblk、hlword、wm、topic、mascot） | 荧光笔扫亮、图标阵列、终端打字、关键词飞字 | `title`(marker/block)、`chips`、`type`(terminal)、`mark`(marker)、背景主题 |

库里检查记录中提到的"T01–T50 版式偏小、留白偏多"，在新组件里已按参考片的密度规则重做（大字占 40–60% 画面、每屏一个主焦点）。
