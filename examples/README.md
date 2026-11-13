# 样片：Claude 做动画夯爆了（98 秒竖拍口播 → 81.5 秒 1080p60 横屏）

复现（原片放在 examples/claude-promo/raw.mp4）：
```
cd examples/claude-promo
python ../../scripts/dms.py asr raw.mp4 work
python ../../scripts/dms.py cut raw.mp4 cut.json work
python ../../scripts/dms.py subs work lines.txt
python ../../scripts/dms.py build edit.json proj
python ../../scripts/dms.py audio proj
python ../../scripts/dms.py render proj 成片.mp4
python ../../scripts/dms.py export proj
```
看 edit.json 可以学到：关键词 cue 对齐、人物窗从全屏 → 侧卡 → 圆窗 → 隐藏、母版自身作为录屏 B-roll（clock: master）、一个窗口跨 30 秒连续承接、内置动效 cta-outro 的锚点钉到"下期再见"。


# 范例 2：Claude vs Codex 动画实测（289 秒纯录屏口播 → 277 秒 1080p60 横屏 · 28 段）

`examples/claude-vs-codex/`：`make_edit.py`（用 `T("关键词")` 把每个元素卡到口播的字上，逐段写清楚为什么用这个画面）、生成的 `edit.json`、`cut.json`、`lines.txt`，以及 `plan.md`（`dms.py plan` 出的编排单）。
看这个范例可以学到：
- 没有真人时，全片怎么靠录屏窗口的放大、标注、光标点击来撑画面；
- 28 段用了 16 种主画面组件，同一个窗口跨 8 段用 `morph` 承接；
- 每段的强调元素（印章、数字、清单、流程）都落在说出那个词的时刻。

复现：把原片的 `work/`（`asr` → `cut` → `subs`）放到这个文件夹，运行 `python make_edit.py`，再 `build` → `direct` → `render`。
