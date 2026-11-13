# 安装与运行环境

技能需要一个**能读写文件、能运行命令**的助手环境：Claude（桌面端 / 网页端的电脑任务）、Claude Code、Codex、WorkBuddy、CodeBuddy 等。只能聊天的网页版助手只能读说明，不能出片。

## 一次性安装

Windows（PowerShell，在技能目录里）：
```powershell
winget install Gyan.FFmpeg        # 或者把 ffmpeg.exe / ffprobe.exe 放进 PATH
winget install OpenJS.NodeJS.LTS
python -m pip install -r requirements.txt
npm install                        # 安装 playwright-core（渲染用，直接调用本机 Chrome / Edge）
python scripts/dms.py doctor
```
macOS / Linux：`brew install ffmpeg node`（或 apt），其余同上，`python` 换成 `python3`。

- 浏览器：自动找本机 Chrome 或 Edge；都没有时运行 `npx playwright install chromium`。也可用环境变量 `DMS_CHROME` 指定。
- 语音识别模型（约 230MB）、人脸模型、抠像模型第一次使用时自动下载到 `~/.cache/dayan-motion-studio/models`，都来自 GitHub。封面人像抠图模型 MODNet（约 25MB）第一次出封面时从 Hugging Face 下载（下载不了时自动试 hf-mirror.com，也可设 `DMS_HF_MIRROR` 或 `DMS_MODNET_URL`；都不行时封面改用照片卡，照样出图）。
- 中文字体：Windows 默认微软雅黑，macOS 苹方。想要更有冲击力的标题，安装免费商用字体（阿里巴巴普惠体 3.0、思源黑体 Heavy、MiSans），引擎会优先使用；字幕烧录的字体可在 `subtitles.font` 指定，或把字体文件放进 `assets/fonts/`。

## 放在哪里

- Codex：`C:\Users\<你>\.codex\skills\dayan-motion-studio\`
- WorkBuddy / CodeBuddy：放进对应的 skills 目录，或在对话里告诉助手"读取 <路径>\SKILL.md"
- Claude：在技能设置里添加，或在电脑任务里告诉它技能目录

## 性能参考（2 核云主机实测）

| 步骤 | 81 秒口播 |
|---|---|
| 语音识别 | ≈30 秒 |
| build（抽人物帧 + 录屏帧） | ≈80 秒 |
| audio（音效 + 原创配乐 + 混音） | ≈16 秒 |
| render 1080p60 | ≈6 帧/秒，约 14 分钟（4 核以上可 `--workers 4` 约快一倍） |

快速看效果：`render 工程 预览.mp4 --preset veryfast`，或在 edit 里把 fps 改 30 先出一版。
