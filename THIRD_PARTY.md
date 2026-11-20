# 第三方素材与许可

本仓库的代码、模板、文档和动效库按 MIT 许可发布（见 LICENSE）。下面这些随附的第三方素材保留各自的原许可：

| 素材 | 位置 | 来源 | 许可 |
|---|---|---|---|
| 采样音效（37 类） | `assets/sfx/` | Kenney（kenney.nl）Impact / Digital Audio / Casino / Interface / UI Audio；Ben Burnes Micro Pack、Keyboard、Books Paper Writing、Smol Mechanisms | CC0 1.0（公有领域），详见 `assets/sfx/LICENSES.md` |
| 人脸检测模型 YuNet | `assets/models/face_detection_yunet_2023mar.onnx` | OpenCV Zoo（github.com/opencv/opencv_zoo） | MIT |
| 得意黑 Smiley Sans 字体 | `engine/fonts/SmileySans-Oblique.woff2` | atelier-anchor/smiley-sans | SIL Open Font License 1.1，详见 `engine/fonts/LICENSE.md` |

封面人像抠图模型 MODNet（ZHKKKe/MODNet，ONNX 版来自 Hugging Face Xenova/modnet，Apache-2.0）首次出封面时下载到本机缓存，不随仓库分发。

运行时依赖（不随仓库分发，安装时下载）：FFmpeg（LGPL/GPL）、Node.js、playwright-core（Apache-2.0）、numpy / scipy / pillow / soundfile / opencv-python / jieba / sherpa-onnx（各自开源许可）；语音识别模型首次使用时从 GitHub 下载。


## 品牌图标（engine/logos/）

来自开源图标库 LobeHub Icons（`@lobehub/icons-static-svg`，MIT License，https://github.com/lobehub/lobe-icons）。图标对应的商标归各自所有者；这里只用于在口播里指称对应的产品。
