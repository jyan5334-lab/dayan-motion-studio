# AGENTS.md — 给 Codex 和其他编码助手

这是一个"口播自动剪辑 + 动效"技能。入口是 `SKILL.md`，命令行入口是 `python scripts/dms.py <命令>`。

## 开工前必读（按顺序）

1. `SKILL.md`：完整流程、每次剪辑前必问的问题（画幅、分辨率、帧率、封面、品牌，选了封面再问风格和人物）、必须遵守的规则。
2. `references/orchestration.md`：**编排手册**，先写编排单再写 edit.json，以及怎么选动效、怎么现做动效。
3. 找动效用 `python scripts/dms.py catalog 关键词`（读 `effects/index.json` 索引，按匹配度 + 成熟度 + 使用次数排序，默认前 8 个；知道编号可直接搜 `09-08`）。`references/catalog.md` 是按类浏览用的目录，库大了不要整份读。
4. 需要时再查：`references/playbook.md`（剪辑语法）、`references/edit-spec.md`（edit.json 字段）、`references/components.md`（组件参数）、`references/quality.md`（动效质量标准）、`references/cover.md`（封面）。

## 硬规则

- **开工示例图要让用户真的看到**：读图只是你自己看，不算发给用户。问文字墙 / 封面风格 / 封面人物之前，跑 `python scripts/dms.py show 文字墙示例|风格样张|人物总览`，把它打印的 Markdown 图片行原样贴进回复正文，再弹问题；这个命令同时会用看图软件在用户电脑上打开图片。
- **人物编排新规范（2026-11-27）**：① **黄金前 5 秒控流失 & 灵活开场**：前 2 秒强视觉钩子（控流失 ≤30%）、前 5 秒亮清重点，不一定非要全屏封面标题——**横拍**可选「第 1s 钩子封面 → 人物全屏 3–5s」或「第一帧直接人物全屏 + 左右安全区适中动效 / 人物背后嵌字」；**竖拍**可选「0.5–1s 钩子标题 → 人物+演示区」或「第一帧直接人物+演示区并存 + 本期重点标题」（均不切全景）。② **人物背后嵌字**：开场或重点词可用 `fx-depth-word` + `scene.personFront: true` 在抠像人物后方嵌入标题/数字/关键词（`mode:"pop"` 直接出现或 `mode:"scroll"` 横向滚动，出现后消失）。③ **短暂退场节拍**：重点/高密度语义段可 `hidden` 消失约 **5 秒左右**，随后返场 **3–5 秒**（不可长时间不见人）。④ **抠像人物（`cutout`）**：可放 `bl`/`br`/`tr`，支持原地缩小后翻页衔接圆窗 `circle`，且人物区为严格不重叠的静止禁区。
- **画面要证明口播，不能只有文字。** 每段都要有一个非文字的主画面：数字、对比、流程、界面、录屏放大、对话、物件动效等。
- **不能千篇一律。** 同一个组件不超过 35% 的段落；自己做的动效一条片子最多用 3 段；画面组件种类至少 5 种，且不少于段数的 1/3。
- **素材优先级**：真实截图 / 录屏 / 视频 > 现成动效 > 现做新动效（检查通过自动入库、分配编号）。**相似的做成已有动效的变体（`presets` + 图层 `preset`），只换参数的不新建**。
- **先找现成的**（catalog），找不到再现做；现做的动效要画"这一句话里的那个东西"，不要做通用面板。
- **行业模板包**：`dms.py pack list` 看本机装了哪些包；选题属于那个行业就在 edit.json 写 `"packs": ["包名"]`（scaffold 加 `--packs`），模板写 `"template": "<包名>:<模板 id>"`。新动效通用的存主库，行业专属的 `effect new --pack <包名>`。规范见 `references/motion-templates.md`。
- **剪辑台能改、改了不坏**：新动效按 `references/editable.md` 十条做（连线用 `DMS.link` 自动跟随、装饰做成被装饰元素的子元素、文字自适应不出框、flex / grid 互相让位、数字和图形同参数、可编辑元素写 `data-edit`），`effect check` 自带可编辑性体检，不通过不能入库；用户丢来的卡片 / 动效先升级再入库。
- **328 张原卡（`dayan` 组件）都能改来用**：卡里的文字是样板，`dms.py card <卡号>` 列出全部可见文字，用 `replace` 换成本期口播内容，换完再看样张。
- **密度**：每分钟至少 15–20 个动效；一两句话（4–10 秒）换一次画面；每分钟 2–3 种背景，文字墙换皮肤（`look: "wall-jade"` 等 16 套）。
- **必须看图**：`stills` 出接触表后逐张看；`plan` 看编排单；`direct` 导演检查做到 0 条建议；`sweep` 0 报错，然后才能 `render`。
- **主体要大、字要清楚**（1080p 下正文 ≥ 28px），前景和背景对比要鲜明。
- **真实**：数字、结论只来自口播原话，示意界面标"界面示意"。
- **对话场景**：口播里有"跟 AI 说 / 提要求 / 提意见 / 截图发给它 / 它回我"的意思，主画面就用 `fx-ai-chat-app` 还原那个 AI 产品的真实对话页（连续几句同一个窗口）；提到产品名用 `logo`（`brand`）放官方图标。
- **真实素材优先**：网站 / 仓库放真实网页截图，热点新闻放新闻页截图、配图或视频，注明来源；拿不到就告诉用户，不生成假图。取材按 `references/sourcing.md`：第一次跑 `dms.py grab check --agent …`（Claude / Codex 必须装 Chrome 扩展，WorkBuddy / 豆包用技能自带的 `grab`）；`grab shot / image / clip` 取网页截图、配图、视频片段，视频片段下载后先给用户确认。

## 最小命令序列

```bash
python scripts/dms.py doctor
python scripts/dms.py kickoff                       # 每条新视频：先问用户（画幅 / 分辨率 / 帧率 / 封面…），等回答再剪
python scripts/dms.py asr 原片.mp4 work
python scripts/dms.py cut 原片.mp4 cut.json work
python scripts/dms.py subs work lines.txt
python scripts/dms.py scaffold work edit.json --canvas 1920x1080 --fps 60
#   → 按 orchestration.md 填编排单，改写 edit.json（这一步最重要）
python scripts/dms.py catalog 关键词                # 每段按语义找动效
python scripts/dms.py card M03·2                    # 原卡：看样张和样板文字，用 replace 改成本期内容
python scripts/dms.py lint edit.json
python scripts/dms.py build edit.json proj
python scripts/dms.py plan proj
python scripts/dms.py stills proj 3,11,19,…
python scripts/dms.py direct proj
python scripts/dms.py sweep proj
python scripts/dms.py audio proj
python scripts/dms.py render proj 成片.mp4 --workers 2   # 渲染完自动出封面
python scripts/dms.py export proj
```

完整可复现的范例：`examples/claude-vs-codex/`（`make_edit.py` 生成 edit.json，`plan.md` 是它的编排单）。
