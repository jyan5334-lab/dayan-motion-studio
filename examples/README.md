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
