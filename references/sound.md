# 声音

**默认不加背景音乐**（用户 2026-11-07 要求）：成片声音 = 人声 + 音效。用户明确要配乐时，edit.json 写 `"music": {"mode": "generate", "mood": …}`，下面的配乐部分才生效。
**片头 solo 例外**（用户 2026-11-08）：口播前的纯动效展示段要配卡点配乐。写 `"music": {"mode": "generate", "mood": "tech-pulse", "bpm": 120, "range": [0, solo结束秒], "fadeOut": 0.5, "volume": 0.55}`——整首照常作曲，再裁成只在 range 里出声、末尾淡出（分轨同样裁切），口播部分仍然没有配乐。solo 画面按拍子切：120 BPM 一拍 0.5s，每 2 拍（1 秒）切一个动效，转场居中落在拍点；solo 最后一下用 `transitionSfx: "impact"` 收住进人物。solo 段没有人声，`volume` 0.55 让配乐响度和后面人声接近（约 −15 LUFS）。

## 音效：真实采样优先
- 采样库 `assets/sfx/<种类>/NN.wav`：137 条 CC0 采样（Kenney 冲击 / 界面 / UI / 数码 / 卡牌，Ben Burnes 嗖声 / 键盘 / 纸笔），来源和授权见 `assets/sfx/LICENSES.md`，每条的原始文件名见 `manifest.json`。
- 每次触发随机选一个变体，音高浮动 ±4%，响度对齐同类合成音效，所以混音比例和以前一致。
- 印章、冲击、彩纸会叠一层合成低频，补足"砸下去"的分量。
- 没有采样的种类（推近、拉远、上升、收缩、数字滚动）用合成；`render_sfx(..., use_samples=False)` 可整体回到合成版。
- 加新采样：放进对应种类文件夹，或改 `tools/build_sfx_pack.py` 的映射后重跑；只收 CC0 或用户有权使用的素材。

# 声音：音效库、原创配乐、混音

所有声音由 `scripts/dms_audio.py` 用代码实时合成，**不含任何第三方采样或版权音乐**，同一 seed 每次结果相同。

## 动作音效（40 种）

| 类别 | kind |
|---|---|
| 转场 / 滑动 | whoosh · whoosh-soft · swoosh-soft · swoosh-in · swoosh-out · whip · air · zoom-in · zoom-out · zap |
| 冲击 | impact · hit · thud · stamp |
| 弹出 | pop · pop-soft · pop-big · bubble · card |
| 界面 | click · tick · tick-ok · typing · send · receive · notify · notify-soft · alert · error |
| 数值 | roll（数字滚动）· rise（上升）· shrink（收缩）· stack（堆叠） |
| 完成 | ding · success · confetti |
| 书写 | scratch（划掉）· marker（荧光笔）· draw（画线）· paper（翻纸） |

- 组件自带默认音效（见 components.md），转场按类型自动配（push → whoosh，zoom-in → swoosh-in，whip → whip，line → zap，flash → impact）。
- 人物窗换形态自动加很轻的 swoosh-soft。
- 去重：同类 80ms 内只留一个；0.6 秒内连续同类每次 ×0.82 衰减。
- 想手动加：`"sfx":[{"t": 12.3, "kind": "impact", "gain": 0.6}]`；想关掉某层：该层写 `"sfx": false`。
- 导出整套音效 wav 到剪映/PR 里手动用：`python scripts/dms_audio.py library 输出目录`

## 原创配乐（6 种情绪）

| mood | bpm | 适合 |
|---|---|---|
| tech-pulse | 112 | 科技 / 产品 / AI 工具：电子琶音 + 四拍 |
| bright-pop | 120 | 轻快教程 / 好物推荐：拨弦 + 拍手 |
| lofi-warm | 84 | 讲故事 / 经验分享：爵士七和弦 + 黑胶底噪 |
| cinematic-rise | 90 | 大事件 / 行业观察：弦乐铺底 + 太鼓 |
| comic-bounce | 128 | 搞笑 / 反转：木琴 + 弹跳低音 |
| calm-ambient | 72 | 深度讲解：柔和铺底，几乎无鼓 |

- **自动编曲**：每个场景的 `energy`（0–3）决定编制：0 只有铺底，1 加低音和镲，2 加鼓和旋律，3 全编制 + 镲片。能量变化对齐到小节线，片尾 2.2 秒淡出。
- 同时导出分轨：`bgm_drums / bgm_bass / bgm_harmony / bgm_lead.wav`，不满意哪一层可以单独换。
- 换风格只改 `music.mood`；换一版同风格旋律改 `music.seed`；整体升降调 `music.key`（半音）；`music.bpm` 覆盖速度。
- 用自己的曲子：`{"mode": "track", "path": "x.mp3", "offset": 12.5}`。

## 混音链

人声：高通 75Hz → 压缩 3:1 → 响度 −16 LUFS（可选 `denoise: true` 降噪）
配乐：先实测配乐响度，按 `music.volume` 对齐电平（0.30 → −21 LUFS，翻倍 +6 dB；成片里约比人声低 11 dB）→ 柔和侧链闪避（2.5:1，起 40ms，释放 600ms，说话时再让 3~5 dB）
音效：高通 50Hz → 音量 `sfxVolume`（默认 0.85）
总线：限幅 0.92 → 交付响度 −15 LUFS / 真峰值 −1.2 dBTP → 48kHz

反馈怎么调：配乐"听不到" → `music.volume` 0.30→0.42（约 +3 dB）；"太吵" → 0.30→0.21（约 −3 dB）；音效太密 → 去掉次要层的 sfx 或 `sfxVolume` 0.7。
