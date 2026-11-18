# 行业模板包（Motion 模板包）：规范、调用与制作

主技能是通用的口播剪辑：理解口播、按语义挑画面、人物站位、内容区、动效接力、导演检查、渲染，**都由主技能负责**。
行业模板包只负责**这个行业的画面长什么样、怎么动**。按本规范做出来、`pack check` 通过的包，主技能都能正确调用；最终画面好不好，仍然要每条片子跑完检查再看图确认。

主技能本身**不内置模板**（用户 2026-11-17：原来 6 个内置模板质量不够，删掉了；对应效果用动效库里的新动效）。不装任何包时，剪辑完全照常。

## 分工

| 层 | 负责 | 不负责 |
|---|---|---|
| 主技能（dms.py） | 发现和安装包、检查版本、按语义和位置挑模板、填槽位、对齐关键词、伸缩、内容区、人物站位、导演检查、渲染 | 写死某个行业的画面 |
| 包说明 `pack.json` | 包名、版本、行业、要求的主技能版本、仓库地址 | 画面 |
| 模板合同 `template.motion.json` | 角色、语义标签、支持的画幅、配合的人物状态、槽位、场景、动作保护窗、停留点、锚点、验收项 | 具体画面实现 |
| 模板实现 `scene.json`（+ 可选 `components.js` / `style.css`） | 场景、图层、组件、版位、时间、属性，用 `{{槽位}}` 引用输入 | 读取整期内容、擅自选片 |
| 本期内容（edit.json 里的一段） | 槽位取值、起止时间、锚点钉到哪个词 | 改动模板的运动语法 |

## 包的结构

```
<包名>/
  pack.json
  README.md
  templates/<模板 id>/template.motion.json + scene.json + example.payload.json [+ components.js / style.css]
  effects/fx-<包名>-<名字>/effect.json + component.js [+ style.css]      ← 这个行业专用的动效
```

完整可运行的参照：主技能的 `examples/packs/demo/`（两个模板 + 一个包专属动效）。

### pack.json（schema: dayan-pack/1）

```jsonc
{
  "schema": "dayan-pack/1",
  "id": "ai-tech",                    // 小写字母、数字、连字符；调用模板时写 "ai-tech:<模板 id>"
  "name": "AI 科技博主",
  "version": "1.0.0",                 // 三段式；pack update 按它判断新旧
  "industry": "AI 科技",
  "desc": "一句话：适合什么口播、整体风格",
  "requires": {"dms": ">=1.13.0"},    // 要求的主技能版本（支持 >= <= > < ==、1.13.x）；不满足时调用直接报错并提示先更新
  "repo": "https://github.com/…",     // 仓库地址：pack update 用
  "author": "…", "license": "MIT"
}
```

### 命名规则
- 包里的模板按 `<包名>:<模板 id>` 调用，不同包可以有同名模板。
- 包里的动效 id **必须以 `fx-<包名>-` 开头**（例如 `fx-ai-tech-benchmark`），并且不能和主技能动效库重名；`pack check` 会拦下。
- 模板可以直接用主技能的引擎组件、动效库（几百种）、原卡，以及本包自己的动效。

## 模板合同（schema: dayan-motion/1）

```jsonc
{
  "schema": "dayan-motion/1",
  "templateId": "claim-proof", "version": "1.0.0", "status": "candidate",   // experimental → candidate → stable
  "engine": "dayan-html", "title": "结论 + 证据数字", "use": "什么时候用", "theme": "dark-tech",

  // ---- 行业包模板必填：主技能靠这几项挑模板、排版面 ----
  "role": "claim",            // hook chapter claim data compare process explain ui-demo quote news product cta outro transition other
  "triggers": {
    "semantic": ["number", "emotion"],      // 和分镜语义提示同一套：number emotion enum contrast process product quote question cta time
    "keywords": ["结论", "实测", "提升"]     // 口播里出现这些词时加分
  },
  "priority": 1,              // 同等匹配时谁优先，默认 0
  "presenterCompat": ["full", "cutout", "circle", "side", "pip"],   // 设计时配合的人物状态；不在里面时构建会提醒
  "composition": {"id": "claim-proof", "width": 1920, "height": 1080, "fps": 30, "durationInFrames": 150,
                  "layout": "landscape", "aspects": ["16:9", "4:3", "9:16"]},   // 支持的画幅；不支持的画幅调用直接报错

  "inputSlots": [
    {"id": "claim", "type": "text", "required": true, "maxLen": 12, "desc": "结论"},
    {"id": "shot", "type": "image", "required": false, "real": true, "desc": "真实截图"}   // 图片 / 视频槽写 real：true = 必须真实图片，没有就显示占位
  ],
        // type: text number list image video color icon bool object；list 写 minItems/maxItems；text 写 maxLen（超长报错，不缩字硬塞）
  "layers": [{"id": "world", "role": "background", "z": 0}, …],
  "scenes": [{"id": "claim", "role": "claim", "startFrame": 0, "endFrame": 60, "entryState": "presenter", "exitState": "title-settled", "maxHoldFrames": 60}, …],
        // 场景首尾相接、覆盖全部时长
  "motionWindows": [{"id": "title-in", "sceneId": "claim", "startFrame": 3, "endFrame": 30, "kind": "impact", "protected": true}, …],
        // 动作保护窗：伸缩时绝不拉伸或压缩
  "holds": [{"atFrame": 45, "maxFrames": 90, "minusFrames": 10}, …],
        // 停留点：只有这里可以加时间或回收时间；不能落在保护窗里
  "anchors": [{"id": "proof", "atFrame": 60}],         // 可以钉到口播关键词上的时刻
  "handoffs": [{"from": "claim.title", "to": "proof.number", "atFrame": 60}],   // 多场景模板写对象交接
  "assets": [{"id": "fx", "path": "components.js", "type": "script", "required": true}],
  "acceptance": ["safe-area", "cjk-font-render", "continuous-motion-windows", "handoff-continuity", "full-mp4-decode", "audio-and-caption-review"]
}
```

### 版位（scene.json 里图层的 box）
支持多种画幅的模板**不能写死坐标**，只能用：
- 内容区：`zone`、`zone-main` + `zone-aside`（一主一辅）、`zone-top` / `zone-bottom`、`zone-left` / `zone-right`。主技能按当下人物站位、脸的位置和画幅换算成实际矩形，人物全屏时会自动避开脸。
- 引擎版位：`full`、`center`、`left`、`right`、`top`、`upper`、`lower`、`wide`、`quote`、`demo`。
- 按画幅分别给：`{"16:9": [x, y, w, h], "9:16": [x, y, w, h]}` 或 `{"landscape": …, "portrait": …}`。

模板可以在 `scene.json` 顶层写 `"presenter": [{"t": 0, "state": "circle", "pos": "br"}]` 控制这一段的人物站位（会替换这一段原有的人物关键帧）；edit 里写 `"presenter": false` 可以不让模板改人物。

品牌用 `{{brand.name}}`、`{{brand.wall.0}}`：自动取使用者自己的品牌，包不能写死别人的品牌。

## 调用

```jsonc
// edit.json
{
  "packs": ["ai-tech"],             // 启用的行业包：scaffold、catalog 会优先匹配包里的模板
  "scenes": [
    {"id": "s03", "template": "ai-tech:claim-proof@1.0.0",   // 不写版本取最新
     "t0": 23.85, "t1": 30.2,
     "slots": {"claim": "剪一条只要五分钟", "number": 5, "unit": "分钟", "label": "一条口播成片"},
     "pin": {"proof": {"cue": "五分钟", "lead": -0.15}}}     // 锚点钉到关键词（或直接写秒数）
  ]
}
```

- `scaffold … --packs ai-tech`：分镜时按**语义标签 + 关键词 + 位置**给每段打分。开场类模板只在第一段、结尾类只在最后一段直接放上；匹配明确（≥4 分）的段落直接放模板草稿（槽位写着"（填：…）"，`draftTemplate: true`），其余段落写"行业包可选"提示。同一模板一条片子里：开场 / 章节 / 结尾类用一次，其余不超过 35% 的段落。
- `lint` 会拦下：没装或版本不满足的包、还是草稿占位的槽位；`draftTemplate` 确认后删掉。
- 模板段落的长度要和模板的动作量相当（一两句话）：段落太长，模板停留点被拉得太久，导演检查会报"画面静止 / 画面没换过"，把段落拆短。

**伸缩算法**：先按锚点顺序，把"锚点目标时间 − 自然时间"的差额分配给两个锚点之间的停留点；最后一个锚点之后的剩余时长分给其后的停留点。受保护动作始终原速。回收不够时给出警告，不会偷偷压缩动作。

## 命令

```bash
python scripts/dms.py pack list                          # 已安装的包、版本、是否满足主技能版本
python scripts/dms.py pack install <git 地址 / zip / 文件夹>   # 装到 ~/.dayan-motion-studio/packs/<包名>/（--force 覆盖）
python scripts/dms.py pack update [包名]                  # git 装的 pull；其余按 pack.json 的 repo 取新版
python scripts/dms.py pack new ai-tech --name "AI 科技博主" --industry "AI 科技"   # 新建包骨架
python scripts/dms.py pack check <包名或文件夹> [--render]  # 自检；--render 每个模板按支持的画幅各出 4 帧样张（配示意人物）
python scripts/dms.py template list | validate | show | render | gallery
python scripts/dms.py catalog 关键词                      # 搜索时包含已安装包里的模板和动效
```

安装位置可用环境变量 `DMS_PACK_HOME` 改；开发中的包可以放在 `DMS_PACK_PATHS` 列出的目录里（不用安装就能被发现）。散装模板（不属于任何包）仍可放在 `DMS_TEMPLATE_PATHS`。

## 新动效存到哪（存档分流）

剪辑时库里没有、现做的动效，检查通过后自动存档：
- **通用的**（任何口播都能用）：存主技能动效库，`dms.py effect new fx-xxx`。
- **只有某个行业才用的**：存进那个行业包，`dms.py effect new fx-<包名>-xxx --pack <包名>`。
- **新建前先查重**：`effect new` 会把新动效的名称和用途和动效库、已装包的动效、引擎组件比对，相似的列出来；很像（≥0.3）时拒绝新建，除非加 `--force`。能改进旧的就改进旧的。

## 做一个行业包

1. `pack new <包名>` 建骨架，照着 `examples/packs/demo/` 写。
2. 每个模板**先写动作谱**，再写代码：主体是什么、准备动作、主动作、超调/刹停、配角让位、交接对象、声音落点。
3. `scene.json` 时间从 0 开始，文字全部换成 `{{槽位}}`；版位用内容区；组件不够就在 `components.js` 注册（只能用时间 t 计算画面）。
4. 写合同：角色、语义标签、画幅、人物状态都要填；每个主动作登记保护窗；阅读停留处放停留点；口播可能对齐的时刻放锚点。
5. `pack check <包名> --render`：校验 + 每个模板每种画幅出样张、每个包动效三画幅样张。**必须打开看**：字有没有溢出、有没有压到脸和字幕区、画面是不是够满。
6. 用一条真实口播跑一遍（`scaffold --packs`、build、direct、sweep、stills），没问题再把 status 提到 candidate；2–3 期真实使用后标 stable。
7. 推到自己的仓库，pack.json 写上 repo，别的电脑 `pack install <仓库地址>`。

## 参考片匿名
从参考片做模板时，合同的 `use`、`source` 等字段和动作谱里只写风格代号（如「风格 C」「参考片 E1」）和画面/编排描述，不写博主名字、账号、视频标题、原话、粉丝或播放数据、其自有产品名。
