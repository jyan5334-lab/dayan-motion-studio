#!/usr/bin/env python3
"""大琰DAYAN Motion Studio — 封面（成片渲染完自动出一套：A 手账贴纸 / B 科技海报 / C 电影海报 × 竖屏 3:4 + 横屏 4:3）

有真人：从母版里人物可见的区间抽帧 → 人脸检测 + 清晰度 + 静止度 + 抠像完整度打分 → 挑 3 帧（A/B/C 各一帧，时间错开）
       → 抠像（绿幕色键 / MODNet 人像抠图，抠不了时退回圆角照片卡）→ 按风格轻度调色（不改五官、不镜像、保留痣）→ 排版。
没有真人：文字 + 背景版（大标题 + 副标题 + 话题元素），三种风格同样各出横竖两版。
文案、截图、数字徽章写在 edit.json 的 "cover"（见 references/cover.md）；没写时用片名自动拆两行。
"""
from __future__ import annotations
import json, os, re, shutil, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = Path(os.environ.get('DMS_CACHE', Path.home() / '.cache' / 'dayan-motion-studio'))
FF = os.environ.get('FFMPEG', 'ffmpeg'); NODE = os.environ.get('NODE', 'node')
NAMES = {'A': '手账贴纸风', 'B': '科技海报风', 'C': '电影海报风'}
SIZES = [(1080, 1440, '竖屏3比4'), (1440, 1080, '横屏4比3')]
MODNET_URLS = ['https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx',
               'https://hf-mirror.com/Xenova/modnet/resolve/main/onnx/model.onnx']   # MODNet，Apache-2.0

def log(*a): print('·', *a, flush=True)
def jload(p): return json.loads(Path(p).read_text(encoding='utf-8'))

# ------------------------------------------------------------------ 模型
def modnet_path():
    p = CACHE / 'models' / 'modnet.onnx'
    if p.exists() and p.stat().st_size > 1e6: return p
    urls = ([os.environ['DMS_MODNET_URL']] if os.environ.get('DMS_MODNET_URL') else []) + MODNET_URLS
    if os.environ.get('DMS_HF_MIRROR'): urls.insert(0, MODNET_URLS[0].replace('https://huggingface.co', os.environ['DMS_HF_MIRROR'].rstrip('/')))
    p.parent.mkdir(parents=True, exist_ok=True)
    for u in urls:
        try:
            log('下载人像抠图模型', u); tmp = p.with_suffix('.part')
            with urllib.request.urlopen(u, timeout=120) as r, open(tmp, 'wb') as f: shutil.copyfileobj(r, f)
            if tmp.stat().st_size > 1e6: tmp.rename(p); return p
        except Exception as e: log('  下载失败：', e)
    return None

_det = None
def yunet(img):
    """返回最大的一张脸 [x,y,w,h, 5 个关键点 ×2, score]（像素坐标），没有返回 None"""
    global _det
    import cv2
    if _det is None:
        m = ROOT / 'assets' / 'models' / 'face_detection_yunet_2023mar.onnx'
        _det = cv2.FaceDetectorYN.create(str(m), '', (320, 320), 0.6, 0.3, 20)
    _det.setInputSize((img.shape[1], img.shape[0])); _, f = _det.detect(img)
    if f is None or not len(f): return None
    return max(f, key=lambda r: r[2] * r[3] * r[14])

_sess = None
def matte_modnet(rgb):
    """rgb: HxWx3 uint8 → alpha HxW float(0..1)；模型不可用返回 None"""
    global _sess
    import numpy as np, cv2
    if _sess is None:
        mp = modnet_path()
        if not mp: return None
        import onnxruntime as ort
        _sess = ort.InferenceSession(str(mp), providers=['CPUExecutionProvider'])
    h, w = rgb.shape[:2]; s = 512 / min(h, w)
    nh, nw = max(32, int(round(h * s / 32)) * 32), max(32, int(round(w * s / 32)) * 32)
    x = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.
    x = ((x - .5) / .5).transpose(2, 0, 1)[None].astype(np.float32)
    a = _sess.run(None, {_sess.get_inputs()[0].name: x})[0][0, 0]
    return cv2.resize(a, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)

def is_green(rgb):
    import numpy as np
    b = np.concatenate([rgb[:8].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)]).astype(int)
    return float(((b[:, 1] - np.maximum(b[:, 0], b[:, 2])) > 45).mean()) > 0.6

def matte_green(rgb):
    import numpy as np, cv2
    g = rgb.astype(np.float32); r_, g_, b_ = g[..., 0], g[..., 1], g[..., 2]
    a = 1 - np.clip(((g_ - np.maximum(r_, b_)) - 45) / 50, 0, 1)
    return cv2.GaussianBlur(a, (0, 0), .8)

def clean_alpha(a):
    """只留最大的一块（人），去掉零碎的误检"""
    import numpy as np, cv2
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > .5).astype(np.uint8))
    if n <= 1: return a
    keep = cv2.dilate((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    return np.where(keep, a, 0).astype(np.float32)

def despill(rgb, a):
    import numpy as np, cv2
    g = rgb.astype(np.float32)
    edge = cv2.dilate(((a > .02) & (a < .98)).astype(np.uint8), np.ones((11, 11), np.uint8)) > 0
    g[..., 1] = np.where(edge, np.minimum(g[..., 1], np.maximum(g[..., 0], g[..., 2]) + 8), g[..., 1])
    return g

# ------------------------------------------------------------------ 调色（轻度美化：提亮、色温、对比、轻磨皮保纹理、轻锐化；不瘦脸、不改五官、不去痣）
def retouch(a, style):
    import numpy as np, cv2
    from PIL import Image, ImageFilter, ImageEnhance
    sm = cv2.bilateralFilter(np.clip(a, 0, 255).astype(np.uint8), 9, 34, 9).astype(np.float32)
    a = a * .74 + sm * .26
    lum = (a @ [.299, .587, .114])[..., None] / 255.
    a = a + (1 - lum) ** 2 * np.array([6, 7, 8])                     # 轻提暗部
    if style == 'A': a = a * [1.035, 1.01, .975]
    if style == 'B': a = a * [1.02, 1.0, .99]
    if style == 'C': a = a + (1 - lum) ** 2 * np.array([-16, 4, 18]) + lum ** 2 * np.array([18, 7, -14])   # 阴影偏青、高光偏暖
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    im = ImageEnhance.Brightness(im).enhance({'A': 1.05, 'B': 1.04, 'C': .97}[style])
    im = ImageEnhance.Contrast(im).enhance({'A': 1.04, 'B': 1.05, 'C': 1.14}[style])
    return np.asarray(im.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=3))).astype(np.float32)

def cut_person(rgb, style, path, target_h=1500):
    """抠像 + 调色 + （A）贴纸描边 → RGBA PNG；返回 {cut, edges}，cut=False 表示抠不了，输出的是照片卡用的裁切图"""
    import numpy as np, cv2
    from PIL import Image
    a = matte_green(rgb) if is_green(rgb) else matte_modnet(rgb)
    if a is None:   # 没有抠图模型：裁一张以脸为中心的 3:4 照片
        Image.fromarray(np.clip(retouch(rgb.astype(np.float32), style), 0, 255).astype(np.uint8)).save(path); return {'cut': False, 'edges': []}
    if not is_green(rgb): a = np.clip((a - .08) / .84, 0, 1)
    a = clean_alpha(a)
    col = retouch(despill(rgb, a), style)
    ys, xs = np.where(a > .5)
    H, W = a.shape; m = 3
    edges = [e for e, hit in (('left', xs.min() <= m), ('right', xs.max() >= W - 1 - m), ('bottom', ys.max() >= H - 1 - m), ('top', ys.min() <= m)) if hit]
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    pad = 40
    sc = min(2.4, max(1.0, target_h / (y1 - y0)))
    rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    im = Image.fromarray(rgba, 'RGBA')
    if sc > 1.01: im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
    if style == 'A':   # 贴纸描边：白 16px + 细黑 5px；被画框截断的边不描（贴着画布边）
        al = np.asarray(im)[..., 3].astype(np.float32) / 255.
        pl, pr, pt, pb = (0 if 'left' in edges else pad), (0 if 'right' in edges else pad), (0 if 'top' in edges else pad), (0 if 'bottom' in edges else pad)
        big = np.pad(al, ((pt, pb), (pl, pr))); hard = (big > .5).astype(np.uint8) * 255
        k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        out = Image.new('RGBA', (big.shape[1], big.shape[0]), (0, 0, 0, 0))
        for c, r in (((26, 26, 26, 255), 21), ((255, 255, 255, 255), 16)):
            mk = cv2.GaussianBlur(cv2.dilate(hard, k(r)), (0, 0), .8); lay = Image.new('RGBA', out.size, c); lay.putalpha(Image.fromarray(mk)); out = Image.alpha_composite(out, lay)
        out.alpha_composite(im, (pl, pt)); im = out
    im.save(path)
    return {'cut': True, 'edges': edges}

# ------------------------------------------------------------------ 选帧
def visible_ranges(TL, D):
    keys = sorted((k for k in (TL.get('presenter') or {}).get('keys', []) if 't' in k), key=lambda k: k['t'])
    if not keys: return []
    out, cur = [], None
    for i, k in enumerate(keys):
        t1 = keys[i + 1]['t'] if i + 1 < len(keys) else D
        if k.get('state', 'full') != 'hidden' and k['t'] < D: out.append([k['t'], min(t1, D)])
    merged = []
    for a, b in out:
        if merged and a <= merged[-1][1] + 0.01: merged[-1][1] = b
        elif b - a > 0.5: merged.append([a, b])
    return merged

def frame_reader(P, TL, master):
    """按时间取一帧（RGB），优先用 build 抽好的人物帧（talk/），没有再用 ffmpeg 从母版取"""
    import numpy as np
    from PIL import Image
    pr = TL.get('presenter') or {}
    fr = P / (pr.get('frames') or 'talk/%06d.jpg'); fps = float(pr.get('fps') or 0); n = int(pr.get('frameCount') or 0)
    if not (fps and n and Path(str(fr) % 1).exists()) and master and Path(master).exists():
        # 工程里没有抽好的人物帧：一次性按 4 帧/秒抽一套小图做选帧（逐帧 seek 长视频太慢）
        cd = P / '_cover_cand'
        if not (cd / '000001.jpg').exists():
            cd.mkdir(parents=True, exist_ok=True)
            subprocess.run([FF, '-v', 'error', '-y', '-i', str(master), '-vf', 'fps=4,scale=640:640:force_original_aspect_ratio=decrease', '-q:v', '4', str(cd / '%06d.jpg')], check=True)
        fr, fps, n = cd / '%06d.jpg', 4.0, len(list(cd.glob('*.jpg')))
    def get(t, full=False):
        if fps and n and (fr.parent).exists():
            i = min(n, max(1, int(round(t * fps)) + 1)); f = Path(str(fr) % i)
            if f.exists() and not full: return np.asarray(Image.open(f).convert('RGB')), f
        tmp = P / 'cover' / '_work' / f'_f{t:.2f}.png'; tmp.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', str(master), '-frames:v', '1', str(tmp)], check=True)
        return np.asarray(Image.open(tmp).convert('RGB')), tmp
    return get, fps

def pick_frames(P, TL, master, ranges, want=3, manual=None):
    import numpy as np, cv2
    get, fps = frame_reader(P, TL, master)
    if manual: return [float(t) for t in manual][:want]
    total = sum(b - a for a, b in ranges); step = max(0.5, total / 160)
    cands = []
    for a, b in ranges:
        t = a + 0.4
        while t < b - 0.3: cands.append(round(t, 2)); t += step
    scored = []
    for t in cands:
        try: img, _ = get(t)
        except Exception: continue
        H0, W0 = img.shape[:2]; s = 640 / max(H0, W0); sm = cv2.resize(img, (int(W0 * s), int(H0 * s)), interpolation=cv2.INTER_AREA)
        bgr = cv2.cvtColor(sm, cv2.COLOR_RGB2BGR); f = yunet(bgr)
        if f is None or f[14] < 0.75: continue
        h, w = sm.shape[:2]; x, y, fw, fh = f[:4]
        if fh < 0.09 * h or y < 0.03 * h or x < 0.02 * w or x + fw > 0.98 * w: continue   # 脸太小 / 头顶或侧边被截
        x0, y0, x1, y1 = int(max(0, x)), int(max(0, y)), int(min(w, x + fw)), int(min(h, y + fh))
        g = cv2.cvtColor(sm[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY)
        sharp = float(cv2.Laplacian(g, cv2.CV_64F).var())
        # 静止度：和 0.2 秒后的画面比，脸部变化越小 → 没在眨眼 / 甩头 / 运动模糊
        try:
            img2, _ = get(t + max(0.2, 1.1 / fps if fps else 0.2)); sm2 = cv2.resize(img2, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_AREA)
            still = float(np.abs(sm2[y0:y1, x0:x1].astype(np.float32) - sm[y0:y1, x0:x1]).mean())
            body = float(np.abs(sm2[int(y1):].astype(np.float32) - sm[int(y1):]).mean()) if int(y1) < h - 10 else 0.0   # 脸以下（手、身体）在动 = 手势糊、动作没定住
        except Exception: still, body = 8.0, 4.0
        ex = (f[4] + f[6]) / 2; nose = f[8]; front = 1 - min(1, abs(nose - ex) / (abs(f[6] - f[4]) + 1e-6) * 2)   # 1 = 正脸
        base = f[14] * np.log1p(sharp) / (1 + still / 6) / (1 + body / 8) * (0.75 + 0.25 * front)
        scored.append({'t': t, 'base': float(base), 'img': sm, 'face': [float(v) for v in f[:4]]})
    if not scored: return []
    scored.sort(key=lambda d: -d['base'])
    top = scored[:14]
    for d in top:   # 抠像完整度：头顶留白、两侧不被截（手和肩完整）、脸下方要有身体
        a = matte_green(d['img']) if is_green(d['img']) else matte_modnet(d['img'])
        if a is None: d['score'] = d['base']; continue
        h, w = a.shape; m = a > .5
        side = (m[:, :3].mean() + m[:, -3:].mean()) / 2
        topc = m[:3].mean()
        below = m[int(min(h - 1, d['face'][1] + d['face'][3] * 2.2)):].mean() if d['face'][1] + d['face'][3] * 2.2 < h else 0
        fx, fy, fw, fh = d['face']; cx = fx + fw / 2   # 头部那一条：抠出来的范围往一侧伸得太远 = 椅背、柜子被一起抠进来了
        band = m[int(max(0, fy - .3 * fh)):int(min(h, fy + .8 * fh))]; cols = np.where(band.mean(0) > .15)[0] if band.size else []
        wide = max((cx - cols.min()) / fw, (cols.max() - cx) / fw) if len(cols) else .6
        d['score'] = d['base'] * (1 - min(.6, side * 1.5)) * (1 - min(.8, topc * 4)) * (0.7 + 0.3 * min(1, below * 3)) * (1 if wide < .8 else max(.3, 1 - (wide - .8) * 2.5))
    top.sort(key=lambda d: -d['score'])
    gap = max(2.5, total / 10); out = []
    for d in top:
        if all(abs(d['t'] - o) >= gap for o in out): out.append(d['t'])
        if len(out) == want: break
    for d in top:
        if len(out) == want: break
        if d['t'] not in out: out.append(d['t'])
    while out and len(out) < want: out.append(out[len(out) % len(out)])
    return out

# ------------------------------------------------------------------ 文案
def default_text(E, brand):
    title = (E.get('title') or brand.get('name') or '').strip()
    parts = [p for p in re.split(r'\s*[|｜/／·：:，,]\s*|\s{2,}', title) if p]
    if len(parts) < 2:
        t = title.replace(' ', '') if len(title) > 10 else title
        k = (len(t) + 1) // 2 if len(t) > 8 else len(t)
        parts = [t[:k], t[k:]] if t[k:] else [t]
    lines = parts[:2] if len(parts) <= 2 else [parts[0], ''.join(parts[1:])]
    hl = None
    for w in ((E.get('subtitles') or {}).get('highlight') or []):
        if any(w in l for l in lines): hl = w; break
    if not hl:
        m = re.search(r'[0-9][0-9.]*[%×xX倍]?|[A-Za-z][A-Za-z0-9.+-]+', ''.join(lines))
        hl = m.group(0) if m else (lines[-1][-2:] if lines and len(lines[-1]) >= 2 else None)
    return {'title': lines, 'hl': hl}

def extract_shot(P, master, s, i, out_dir, TL):
    """话题元素截图：{"src": 图片路径} 或 {"t": 母版秒数, "crop": [x,y,w,h]}；也可直接写字符串路径"""
    if isinstance(s, str): s = {'src': s}
    dst = out_dir / f'shot{i}.png'
    if s.get('src'):
        src = Path(s['src']);
        if not src.is_absolute(): src = (Path(jload(P / 'project.json')['edit']).parent / src).resolve()
        if not src.exists(): log('封面截图不存在，跳过：', src); return None
        shutil.copy(src, dst.with_suffix(src.suffix.lower())); dst = dst.with_suffix(src.suffix.lower())
    elif s.get('t') is not None and master:
        vf = ['crop=iw*{2}:ih*{3}:iw*{0}:ih*{1}'.format(*s['crop'])] if s.get('crop') else []
        subprocess.run([FF, '-v', 'error', '-y', '-ss', str(s['t']), '-i', str(master), '-frames:v', '1'] + (['-vf', ','.join(vf)] if vf else []) + [str(dst)], check=True)
    else: return None
    return {'src': dst.name, 'label': s.get('label', '')}

# ------------------------------------------------------------------ 主流程
def make_covers(P, brand, out=None, person='auto', frames=None):
    P = Path(P).resolve(); E = jload(P / 'edit.json'); TL = jload(P / 'timeline.json')
    pj = jload(P / 'project.json') if (P / 'project.json').exists() else {}
    master = Path(pj['master']) if pj.get('master') else None
    cfg = dict(E.get('cover') or {})
    if cfg.get('enabled') is False: log('edit.json 里 cover.enabled = false，不出封面'); return []
    out = Path(out or (P / 'cover')).resolve(); wk = out / '_work'
    if wk.exists(): shutil.rmtree(wk)
    wk.mkdir(parents=True)
    D = float(TL.get('duration') or 0)
    pmode = person if person not in (None, 'auto') else cfg.get('person', 'auto')   # 命令行优先于 edit.json
    if pmode in (None, 'auto'):
        ranges = visible_ranges(TL, D) if master and master.exists() else []
    elif pmode in (True, 'yes', 'on'): ranges = [[0.0, D]] if master else []
    else: ranges = []
    picks = pick_frames(P, TL, master, ranges, 3, frames or cfg.get('frames')) if ranges else []
    people = {}
    if picks:
        import numpy as np
        get, _ = frame_reader(P, TL, master)
        for s, t in zip('ABC', picks):
            img, _ = get(t, full=True)
            info = cut_person(img, s, wk / f'person_{s}.png'); info.update({'src': f'person_{s}.png', 't': t}); people[s] = info
        log('封面人物帧：' + '、'.join(f'{s} {people[s]["t"]:.2f}s' for s in people) + ('（抠像）' if people['A']['cut'] else '（没有抠图模型：用照片卡）'))
    else: log('没有可用的真人画面 → 出文字 + 背景版封面')
    base = default_text(E, brand)
    shots = [x for x in (extract_shot(P, master, s, i, wk, TL) for i, s in enumerate((cfg.get('shots') or [])[:2])) if x]
    data = {'title': cfg.get('title') or base['title'], 'hl': cfg.get('hl', base['hl']), 'sub': cfg.get('sub', ''), 'note': cfg.get('note', ''),
            'badges': (cfg.get('badges') or [])[:3], 'label': cfg.get('label') or ((brand.get('wall') or ['', ''])[-1] if not brand.get('_placeholder') else 'AI · VIDEO'),
            'colors': cfg.get('colors') or ['#FF9A3C', '#E8561A'], 'shots': shots, 'people': people, 'brand': {k: brand.get(k) for k in ('name', 'mark')},
            'styles': {s: cfg.get(s) or {} for s in 'ABC'}}
    if isinstance(data['title'], str): data['title'] = [x for x in re.split(r'\s*[/\n]\s*', data['title']) if x]
    if not cfg: log('edit.json 没写 "cover"：标题用片名自动拆两行（', ' / '.join(data['title']), '），交付前建议补上 cover 文案')
    (wk / 'data.js').write_text('window.COVER=' + json.dumps(data, ensure_ascii=False) + ';', encoding='utf-8')
    shutil.copy(ROOT / 'assets' / 'cover' / 'cover.html', wk / 'cover.html')
    shutil.copy(ROOT / 'engine' / 'fonts' / 'SmileySans-Oblique.woff2', wk / 'smiley.woff2')
    fonts = []
    for f in sorted((ROOT / 'assets' / 'fonts').glob('*')) if (ROOT / 'assets' / 'fonts').exists() else []:
        if f.suffix.lower() in ('.woff2', '.woff', '.ttf', '.otf'): shutil.copy(f, wk / f.name); fonts.append(f.name)
    (wk / 'fonts.css').write_text(''.join(f'@font-face{{font-family:"{Path(n).stem}";src:url("{n}");font-weight:100 900}}\n' for n in fonts)
                                + ''.join(f'@import url("{u}");\n' for u in filter(None, os.environ.get('DMS_COVER_FONTCSS', '').split(';'))), encoding='utf-8')
    (wk / 'fontlist.js').write_text('window.COVER_FONTS=' + json.dumps([Path(n).stem for n in fonts], ensure_ascii=False) + ';', encoding='utf-8')
    r = subprocess.run([NODE, str(HERE / 'cover.mjs'), str(wk), str(out)], cwd=str(ROOT), capture_output=True, text=True)
    if r.returncode: raise RuntimeError('封面截图失败：' + (r.stderr or r.stdout)[-800:])
    for l in (r.stdout or '').splitlines():
        if l.startswith('[对比度]'): log(l)
    files = [out / f'封面_{s}_{NAMES[s]}_{tag}.png' for s in 'ABC' for _, _, tag in SIZES]
    sheet(files, out / '封面_总览.jpg')
    log(f'封面 6 张 → {out}')
    return files

def sheet(files, dst):
    from PIL import Image
    ims = [Image.open(f).convert('RGB') for f in files if Path(f).exists()]
    if len(ims) < 6: return
    v = [ims[i] for i in (0, 2, 4)]; h = [ims[i] for i in (1, 3, 5)]
    W = 540 * 3 + 40; im = Image.new('RGB', (W, 720 + 405 + 30), 'white')
    for i, x in enumerate(v): im.paste(x.resize((540, 720)), (10 + i * 550, 0))
    for i, x in enumerate(h): im.paste(x.resize((540, 405)), (10 + i * 550, 740))
    im.save(dst, quality=88)
