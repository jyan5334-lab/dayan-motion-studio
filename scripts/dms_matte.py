#!/usr/bin/env python3
"""可选：人物抠像（Robust Video Matting，onnxruntime CPU 可跑）。
用于"巨字在人物身后"和"抠像站位"两种画面。模型首次使用时从 GitHub 下载到缓存目录（约 15MB，GPL-3.0 项目的公开权重，仅本地推理）。
pip install onnxruntime
"""
from __future__ import annotations
import os, urllib.request, shutil
from pathlib import Path
import numpy as np

CACHE = Path(os.environ.get('DMS_CACHE', Path.home() / '.cache' / 'dayan-motion-studio'))
URL = 'https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx'

def model_path():
    p = CACHE / 'models' / 'rvm_mobilenetv3_fp32.onnx'
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(URL, timeout=300) as r, open(p, 'wb') as f: shutil.copyfileobj(r, f)
    return p

def matte_frames(src_dir, out_dir, downsample=None):
    import onnxruntime as ort
    from PIL import Image
    src_dir, out_dir = Path(src_dir), Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    sess = ort.InferenceSession(str(model_path()), providers=['CPUExecutionProvider'])
    fs = sorted(src_dir.glob('*.jpg'))
    rec = [np.zeros([1, 1, 1, 1], np.float32)] * 4
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGB'); w, h = im.size
        ds = downsample or min(1.0, 512 / max(w, h)) * 1.0
        x = np.asarray(im, np.float32)[None].transpose(0, 3, 1, 2) / 255.0
        fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': np.array([ds], np.float32)})
        a = (pha[0, 0] * 255).clip(0, 255).astype(np.uint8)
        rgba = np.dstack([np.asarray(im), a])
        Image.fromarray(rgba, 'RGBA').save(out_dir / f.name.replace('.jpg', '.png'), compress_level=1)
        if i % 100 == 0: print(f'  抠像 {i}/{len(fs)}', flush=True)
    return len(fs)
