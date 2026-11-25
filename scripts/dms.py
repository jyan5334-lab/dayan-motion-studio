#!/usr/bin/env python3
"""大琰DAYAN Motion Studio — 口播自动剪辑 + 动效 命令行入口

  python dms.py doctor                                   检查环境
  python dms.py asr      原片.mp4 工作目录                 逐字转写（字级时间码）→ words.json / raw.srt
  python dms.py cut      原片.mp4 cut.json 工作目录        按保留区间剪掉口误/停顿 → master.mp4，并同步时间码
  python dms.py face     master.mp4 工作目录               人脸位置轨迹 → face.json（小窗自动居中）
  python dms.py scaffold 工作目录 edit.json [--canvas 1920x1080 --fps 60 --theme dark-tech]   生成分镜草稿与语义提示
  python dms.py words    工作目录 关键词 [关键词…]          查关键词的精确时间（"说到哪个词出画面"）
  python dms.py subs     工作目录 字幕.txt                  润色后的字幕行（每行一条）→ 自动对齐时间 → subs.json
  python dms.py lint     edit.json                         版式与节奏检查（遮脸、压字幕、过密、超时）
  python dms.py build    edit.json 工程目录                 生成可编辑工程（HTML 动画 + 人物帧 + 字幕 + 时间轴）
  python dms.py stills   工程目录 0.5,3,8                    抽静帧并拼成接触表
  python dms.py audio    工程目录                           音效事件 → sfx.wav；原创配乐 → bgm.wav；混音 → mix.wav
  python dms.py render   工程目录 成片.mp4 [--workers 2]     逐帧渲染 + 字幕 + 混音 → MP4
  python dms.py check    成片.mp4                           帧数、时长、完整解码、响度
  python dms.py export   工程目录                           打包工程：分轨、SRT、Premiere/达芬奇 XML、HTML 工程
  python dms.py pack list|install|update|new|check [包]   行业 Motion 模板包：列出 / 安装 / 更新 / 新建 / 自检
  python dms.py template list|validate|show [包名:模板]   行业包里的模板：列出 / 校验合同 / 查看槽位
  python dms.py template render 包名:模板 payload.json 输出目录  单独渲染一个模板片段
"""
from __future__ import annotations
import argparse, math, hashlib, json, math, os, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
def _read_version():
    try: return json.loads((ROOT / 'package.json').read_text(encoding='utf-8')).get('version') or '0.0.0'
    except Exception: return '0.0.0'
VERSION = _read_version()   # 唯一来源：package.json（行业包的 requires.dms 按它判断）
CACHE = Path(os.environ.get('DMS_CACHE', Path.home() / '.cache' / 'dayan-motion-studio'))
CONFIG = Path(os.environ.get('DMS_CONFIG', Path.home() / '.dayan-motion-studio' / 'config.json'))   # 用户自己的品牌（文字墙等），不随技能分发

# 品牌：技能公开分发，文字墙/角标/名牌一律用使用者自己的品牌；没设置时用中性占位，绝不出现技能作者的品牌
NEUTRAL_BRAND = {'name': '', 'wall': ['MOTION · STUDIO', 'CREATE · WITH · AI'], 'mark': '', '_placeholder': True}
EXAMPLE_BRAND = {'name': '品牌名', 'wall': ['品牌名-AI', 'BRAND · AI STUDIO'], 'mark': '品'}   # 动效样张里用的示例
# =================================================================== 动效库（剪辑时现做、自动沉淀的新动效）
def effect_dirs(packs=()):
    """技能自带 effects/ + 环境变量 DMS_EFFECT_PATHS 里的目录 + 指定行业包的 effects/（packs=None 表示全部已安装的包）；
    每个动效一个文件夹（effect.json + component.js [+ style.css]）"""
    roots = [ROOT / 'effects'] + [Path(p) for p in os.environ.get('DMS_EFFECT_PATHS', '').split(os.pathsep) if p]
    out = []
    for r in roots:
        if r.exists(): out += [d for d in sorted(r.iterdir()) if (d / 'component.js').exists() and (d / 'effect.json').exists()]
    if packs is None or packs:
        from dms_packs import pack_effect_dirs
        out += pack_effect_dirs(None if packs is None else list(packs))
    return out

def active_packs(E, scenes=()):
    """这条片子要带上的行业包：edit.json 的 packs + 用到的包模板 + 用到的包动效（fx-<包名>-…）"""
    from dms_packs import discover_packs, need_pack
    ids = set(E.get('packs') or [])
    for s in scenes:
        ref = s.get('_template') or s.get('template') or ''
        if ':' in ref.split('@')[0]: ids.add(ref.split('@')[0].rsplit(':', 1)[0])
    installed = [p['id'] for p in discover_packs()]
    txt = json.dumps([s.get('layers') for s in scenes] + [E.get('globals')], ensure_ascii=False)
    for pid in installed:
        if f'"fx-{pid}-' in txt: ids.add(pid)
    for pid in ids: need_pack(pid)
    return sorted(ids)
BUILTIN_COMPONENTS = None
def builtin_components():
    global BUILTIN_COMPONENTS
    if BUILTIN_COMPONENTS is None:
        txt = ''.join((ROOT / 'engine' / f).read_text(encoding='utf-8') for f in os.listdir(ROOT / 'engine') if f.endswith('.js'))
        BUILTIN_COMPONENTS = set(re.findall(r"C\.([a-zA-Z][\w]*) = \{", txt)) | set(re.findall(r"C\['([\w-]+)'\] = \{", txt)) | set(re.findall(r"DMS\.components\['([\w-]+)'\]", txt))
    return BUILTIN_COMPONENTS

BRAND_FILE = 'dms-brand.json'   # 放在工作库（或任一上层文件夹）里：在这个文件夹下做的作品都自动用这个品牌
def load_brand(start=None):
    """查找顺序：从作品所在文件夹往上找 dms-brand.json → 本机配置 ~/.dayan-motion-studio/config.json"""
    d = Path(start or os.getcwd()).resolve()
    for q in [d] + list(d.parents):
        f = q / BRAND_FILE
        if f.exists():
            try:
                b = json.loads(f.read_text(encoding='utf-8')); b = b.get('brand', b)
                if b.get('wall'): return b
            except Exception: pass
    try:
        b = json.loads(CONFIG.read_text(encoding='utf-8')).get('brand')
        return b if b and b.get('wall') else None
    except Exception: return None
def save_brand(b):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    try: cfg = json.loads(CONFIG.read_text(encoding='utf-8'))
    except Exception: cfg = {}
    cfg['brand'] = b; CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding='utf-8')
def brand_of(E, start=None): return E.get('brand') or load_brand(start) or NEUTRAL_BRAND
def cmd_brand(ns):
    """dms.py brand show / brand set --main 主行 --sub 副行 [--name 品牌名] [--mark 单字]：保存在本机用户配置里，以后新作品默认沿用"""
    if ns.action == 'set':
        if not ns.main: raise SystemExit('✗ 至少要给文字墙主行：--main "品牌名-AI"')
        b = {'name': ns.name or re.split(r'[-·\s]', ns.main)[0], 'wall': [ns.main, ns.sub or ns.main], 'mark': ns.mark or (ns.name or ns.main)[:1]}
        save_brand(b); print('✓ 已保存品牌 →', CONFIG); print(json.dumps(b, ensure_ascii=False))
    else:
        b = load_brand(); print(json.dumps(b, ensure_ascii=False) if b else '（还没有设置品牌：新作品开工时会问；也可以 dms.py brand set --main … --sub …）')
FF = os.environ.get('FFMPEG', 'ffmpeg'); FP = os.environ.get('FFPROBE', 'ffprobe')
NODE = os.environ.get('NODE', 'node')

def log(*a): print('·', *a, flush=True)
def die(msg, code=1): print('✗', msg, file=sys.stderr); sys.exit(code)
def run(cmd, **kw):
    r = subprocess.run(cmd, **kw)
    if r.returncode != 0: die('命令失败：' + ' '.join(map(str, cmd))[:400])
    return r
def jload(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def jsave(p, d): Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
def sha(p, n=1 << 20):
    h = hashlib.sha256()
    with open(p, 'rb') as f: h.update(f.read(n))
    return h.hexdigest()[:16]

def probe(path):
    r = subprocess.run([FP, '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames', '-of', 'json', str(path)], capture_output=True, text=True)
    if r.returncode: die(f'无法读取媒体：{path}')
    d = json.loads(r.stdout); v = next((s for s in d['streams'] if s['codec_type'] == 'video'), None); a = any(s['codec_type'] == 'audio' for s in d['streams'])
    fps = 30.0
    if v and v.get('r_frame_rate', '0/0') != '0/0':
        n, m = v['r_frame_rate'].split('/'); fps = float(n) / float(m or 1)
    return {'duration': float(d['format'].get('duration', 0)), 'w': v and v['width'], 'h': v and v['height'], 'fps': fps, 'audio': a}

# =================================================================== doctor
def cmd_doctor(ns):
    ok = True
    def chk(name, f):
        nonlocal ok
        try: v = f(); print(f'  ✓ {name:18s} {v}')
        except Exception as e: ok = False; print(f'  ✗ {name:18s} {e}')
    print(f'大琰DAYAN Motion Studio {VERSION}  ({sys.platform})')
    chk('python', lambda: sys.version.split()[0])
    chk('ffmpeg', lambda: subprocess.run([FF, '-version'], capture_output=True, text=True).stdout.split('\n')[0][:60])
    chk('ffprobe', lambda: subprocess.run([FP, '-version'], capture_output=True, text=True).stdout.split('\n')[0][:40])
    chk('node', lambda: subprocess.run([NODE, '-v'], capture_output=True, text=True).stdout.strip())
    chk('numpy / scipy', lambda: __import__('numpy').__version__ + ' / ' + __import__('scipy').__version__)
    chk('联网取材', lambda: __import__('dms_grab').config().get('webGrab') or '还没问过用户（第一次需要真实素材时问一次，dms.py grab allow）')
    chk('yt-dlp（视频片段）', lambda: (shutil.which('yt-dlp') or __import__('yt_dlp').version.__version__) if (shutil.which('yt-dlp') or __import__('importlib').util.find_spec('yt_dlp')) else (_ for _ in ()).throw(Exception('未安装：第一次 grab clip 时自动装，或 pip install yt-dlp')))
    chk('playwright', lambda: subprocess.run([NODE, '-e', "try{require('playwright');console.log('playwright')}catch(e){require('playwright-core');console.log('playwright-core')}"], capture_output=True, text=True, cwd=ROOT).stdout.strip() or (_ for _ in ()).throw(Exception('未安装：在技能目录运行 npm install')))
    chk('浏览器', lambda: subprocess.run([NODE, '-e', "const fs=require('fs');const c=[process.env.DMS_CHROME,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(p=>fs.existsSync(p));console.log(c||'用 Playwright 自带 Chromium')"], capture_output=True, text=True).stdout.strip())
    chk('语音识别', lambda: ('sherpa-onnx ' + __import__('sherpa_onnx').__version__) if _has('sherpa_onnx') else ('faster-whisper' if _has('faster_whisper') else (_ for _ in ()).throw(Exception('pip install sherpa-onnx soundfile'))))
    chk('人脸定位(可选)', lambda: 'opencv ' + __import__('cv2').__version__ + (' · YuNet' if hasattr(__import__('cv2'), 'FaceDetectorYN') else ' · 仅 Haar（升级 opencv-python ≥ 4.8 可用 YuNet）'))
    chk('字幕分词(可选)', lambda: 'jieba ' + __import__('jieba').__version__)
    chk('抠像(可选)', lambda: 'onnxruntime ' + __import__('onnxruntime').__version__)
    chk('封面抠图(可选)', lambda: 'MODNet 已下载' if (CACHE / 'models' / 'modnet.onnx').exists() else '第一次出封面时自动下载（下载不了会改用照片卡）')
    print('环境就绪' if ok else '有缺项：按上面提示安装后重试（缺"可选"项不影响出片）')

def _has(m):
    try: __import__(m); return True
    except Exception: return False

# =================================================================== ASR
SHERPA_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-2023-09-14.tar.bz2'
VAD_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx'

def _download(url, dst):
    import urllib.request
    dst = Path(dst); dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_size > 1000: return dst
    log('下载', url)
    tmp = dst.with_suffix('.part')
    with urllib.request.urlopen(url, timeout=600) as r, open(tmp, 'wb') as f: shutil.copyfileobj(r, f)
    tmp.rename(dst); return dst

def ensure_sherpa():
    mdir = CACHE / 'models' / 'sherpa-onnx-paraformer-zh-2023-09-14'
    if not (mdir / 'model.int8.onnx').exists():
        tb = _download(SHERPA_URL, CACHE / 'models' / 'paraformer.tar.bz2')
        import tarfile
        with tarfile.open(tb) as t: t.extractall(CACHE / 'models')
    vad = _download(VAD_URL, CACHE / 'models' / 'silero_vad.onnx')
    return mdir, vad

def asr_sherpa(wav16):
    import numpy as np, soundfile as sf, sherpa_onnx
    mdir, vadp = ensure_sherpa()
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(mdir / 'model.int8.onnx'), tokens=str(mdir / 'tokens.txt'), num_threads=max(1, (os.cpu_count() or 2) // 2 or 1), decoding_method='greedy_search')
    cfg = sherpa_onnx.VadModelConfig(); cfg.silero_vad.model = str(vadp); cfg.silero_vad.min_silence_duration = 0.25; cfg.silero_vad.max_speech_duration = 12; cfg.sample_rate = 16000
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=120)
    wav, sr = sf.read(str(wav16), dtype='float32'); words = []; segs = []
    def flush():
        while not vad.empty():
            seg = vad.front; s = rec.create_stream(); s.accept_waveform(16000, seg.samples); rec.decode_stream(s)
            r = s.result; st = seg.start / 16000; en = st + len(seg.samples) / 16000
            segs.append({'s': round(st, 3), 'e': round(en, 3), 't': r.text})
            ts = list(r.timestamps); tk = list(r.tokens)
            for i, (tok, x) in enumerate(zip(tk, ts)):
                nx = ts[i + 1] if i + 1 < len(ts) else min(en, x + 0.3)
                words.append({'w': tok.replace('@@', ''), 's': round(st + x, 3), 'e': round(st + min(nx, x + 0.45), 3), 'cont': tok.endswith('@@')})
            vad.pop()
    w = cfg.silero_vad.window_size
    for i in range(0, len(wav), w): vad.accept_waveform(wav[i:i + w]); flush()
    vad.flush(); flush()
    return words, segs

def asr_whisper(wav16):
    from faster_whisper import WhisperModel
    m = WhisperModel(os.environ.get('DMS_WHISPER', 'small'), compute_type='int8')
    segs, _ = m.transcribe(str(wav16), language='zh', word_timestamps=True, vad_filter=True)
    words, out = [], []
    for s in segs:
        out.append({'s': s.start, 'e': s.end, 't': s.text})
        for w in s.words or []: words.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)})
    return words, out

def words_to_cues(words, max_chars=16, gap=0.38, min_dur=0.6):
    """把字级时间码组成字幕：停顿 >gap 或满 max_chars 换条；英文词之间保留空格"""
    cues, cur = [], []
    def text_of(ws):
        out = ''
        for i, w in enumerate(ws):
            t = w['w']
            if i and re.match(r'[A-Za-z0-9]', t[:1]) and re.match(r'[A-Za-z0-9]', out[-1:]) and not ws[i - 1].get('cont'): out += ' '
            out += t
        return out
    for w in words:
        if cur and w['s'] - cur[-1]['e'] > gap: cues.append(cur); cur = []
        elif cur and len(text_of(cur + [w])) > max_chars:
            # 超长：在后半段找最大的停顿处断开，避免把一个词劈成两半
            best, bk = -1, len(cur)
            for k in range(max(1, len(cur) // 2), len(cur)):
                g = cur[k]['s'] - cur[k - 1]['e'] + (0.02 if k > len(cur) * 0.7 else 0)
                if cur[k - 1].get('cont'): continue
                if g > best: best, bk = g, k
            cues.append(cur[:bk]); cur = cur[bk:]
        cur.append(w)
    if cur: cues.append(cur)
    res = []
    for c in cues:
        s, e = c[0]['s'], max(c[-1]['e'], c[0]['s'] + min_dur)
        res.append({'s': round(s, 3), 'e': round(e, 3), 't': text_of(c)})
    for i in range(len(res) - 1):  # 不重叠，短间隙补齐避免闪烁
        if res[i + 1]['s'] - res[i]['e'] < 0.25: res[i]['e'] = res[i + 1]['s']
        res[i]['e'] = min(res[i]['e'], res[i + 1]['s'])
    return res

def srt_time(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def write_srt(cues, path, bilingual=False):
    Path(path).write_text('\n'.join(f"{i}\n{srt_time(c['s'])} --> {srt_time(c['e'])}\n{c['t']}" + (f"\n{c['en']}" if bilingual and c.get('en') else '') + '\n' for i, c in enumerate(cues, 1)), encoding='utf-8')

def cmd_asr(ns):
    wd = Path(ns.workdir); wd.mkdir(parents=True, exist_ok=True)
    wav = wd / 'asr16k.wav'
    run([FF, '-v', 'error', '-y', '-i', ns.video, '-vn', '-ac', '1', '-ar', '16000', str(wav)])
    eng = ns.engine or ('sherpa' if _has('sherpa_onnx') else 'whisper' if _has('faster_whisper') else None)
    if not eng: die('没有语音识别引擎：pip install sherpa-onnx soundfile（推荐）或 faster-whisper')
    log('识别引擎', eng)
    words, segs = asr_sherpa(wav) if eng == 'sherpa' else asr_whisper(wav)
    fixes = _load_fixes(ns.fix)
    words = apply_fixes(words, fixes)
    cues = words_to_cues(words)
    jsave(wd / 'words.json', {'source': str(ns.video), 'engine': eng, 'clock': 'source', 'words': words, 'segments': segs})
    write_srt(cues, wd / 'raw.srt')
    jsave(wd / 'cues.json', cues)
    log(f'{len(words)} 字 · {len(cues)} 条字幕 → {wd / "words.json"}  {wd / "raw.srt"}')
    for c in cues[:8]: print(f"   {c['s']:7.2f} {c['t']}")

def _load_fixes(p):
    """识别纠错表：{"cloud":"Claude","憨爆":"夯爆"}；也读 references/asr-fixes.json"""
    d = {}
    base = ROOT / 'references' / 'asr-fixes.json'
    if base.exists(): d.update(jload(base))
    if p and Path(p).exists(): d.update(jload(p))
    return d

def apply_fixes(words, fixes):
    """在字序列上做纠错替换（忽略空格大小写），替换后的词保留首字时间、末字结束时间"""
    if not fixes: return words
    keys = sorted(((k.lower().replace(' ', ''), v) for k, v in fixes.items()), key=lambda kv: -len(kv[0]))
    out = []; i = 0; n = len(words)
    while i < n:
        hit = None
        for k, v in keys:
            acc = ''; j = i
            while j < n and len(acc) < len(k): acc += words[j]['w'].lower().replace(' ', ''); j += 1
            if acc == k:
                # 英文纠错要求词边界：后一个字不能还是字母（避免 cloud 吃掉 cloudy）
                if re.match(r'[a-z]', k[-1:]) and j < n and re.match(r'[A-Za-z]', words[j]['w'][:1]) and words[j - 1].get('cont'): continue
                hit = (v, j); break
        if hit:
            v, j = hit; out.append({'w': v, 's': words[i]['s'], 'e': words[j - 1]['e']}); i = j
        else: out.append(words[i]); i += 1
    return out

# =================================================================== cut（剪口误 / 停顿）
def cmd_cut(ns):
    wd = Path(ns.workdir); wd.mkdir(parents=True, exist_ok=True)
    spec = jload(ns.spec)
    info = probe(ns.video); D = info['duration']
    keep = spec.get('keep')
    if not keep:
        rem = sorted(spec.get('remove', []))
        keep, t = [], 0.0
        for a, b in rem:
            if a > t: keep.append([t, a])
            t = max(t, b)
        if t < D: keep.append([t, D])
    if spec.get('autoSilence'):
        keep = _split_silence(ns.video, keep, float(spec['autoSilence']), float(spec.get('pad', 0.12)))
    keep = [[max(0, a), min(D, b)] for a, b in keep if b - a > 0.05]
    fps = info['fps']
    # 用 trim/atrim + concat；每段音频 12ms 交叉淡化避免爆音
    fc, labels = [], ''
    for i, (a, b) in enumerate(keep):
        fc.append(f'[0:v]trim={a:.4f}:{b:.4f},setpts=PTS-STARTPTS[v{i}]')
        fc.append(f'[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0, b - a - 0.012):.4f}:d=0.012[a{i}]')
        labels += f'[v{i}][a{i}]'
    pre = max(0.0, float(spec.get('pre', 0)))   # 口播前补几秒（首帧定格 + 静音），给开头 solo / 片头动效用
    if pre > 0:
        fc.append(f'{labels}concat=n={len(keep)}:v=1:a=1[vc][ac]')
        fc.append(f'[vc]tpad=start_duration={pre:.3f}:start_mode=clone[v]')
        fc.append(f'[ac]adelay={int(pre * 1000)}:all=1[a]')
    else:
        fc.append(f'{labels}concat=n={len(keep)}:v=1:a=1[v][a]')
    out = wd / 'master.mp4'
    run([FF, '-v', 'error', '-y', '-i', ns.video, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-r', f'{fps:.3f}', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', str(out)])
    jsave(wd / 'cutmap.json', {'source': str(ns.video), 'keep': keep, 'pre': pre})
    wj = wd / 'words.json'
    if wj.exists():
        W = jload(wj)
        if W.get('clock') == 'source':
            W['words'] = [dict(w, s=round(w['s'] + pre, 3), e=round(w['e'] + pre, 3)) for w in remap_words(W['words'], keep)]
            W['clock'] = 'master'; W['keep'] = keep; W['pre'] = pre
            jsave(wj, W); cues = words_to_cues(W['words']); write_srt(cues, wd / 'master.srt'); jsave(wd / 'cues.json', cues)
    tot = sum(b - a for a, b in keep)
    log(f'保留 {len(keep)} 段，{D:.2f}s → {tot:.2f}s（剪掉 {D - tot:.2f}s）' + (f'，口播前补 {pre:.1f}s' if pre else '') + f' → {out}')

def remap_words(words, keep):
    out = []
    for w in words:
        off = 0.0
        for a, b in keep:
            if a - 0.02 <= w['s'] < b:
                nw = dict(w); nw['s'] = round(off + (w['s'] - a), 3); nw['e'] = round(off + (min(w['e'], b) - a), 3); out.append(nw); break
            off += b - a
    return out

def _split_silence(video, keep, min_sil, pad):
    r = subprocess.run([FF, '-hide_banner', '-i', video, '-af', f'silencedetect=n=-35dB:d={min_sil}', '-f', 'null', '-'], capture_output=True, text=True)
    sil, st = [], None
    for line in r.stderr.splitlines():
        m = re.search(r'silence_start: ([\d.]+)', line)
        if m: st = float(m.group(1))
        m = re.search(r'silence_end: ([\d.]+)', line)
        if m and st is not None: sil.append((st + pad, float(m.group(1)) - pad)); st = None
    out = []
    for a, b in keep:
        cur = a
        for s, e in sil:
            if e <= cur or s >= b: continue
            if s > cur: out.append([cur, s])
            cur = max(cur, e)
        if cur < b: out.append([cur, b])
    return out

# =================================================================== face
def cmd_face(ns):
    wd = Path(ns.workdir); wd.mkdir(parents=True, exist_ok=True)
    out = face_track(ns.video, wd / 'face.json', step=float(ns.step))
    log(f'人脸样本 {len(out["track"])} 个，中位位置 cx={out["median"]["cx"]:.3f} cy={out["median"]["cy"]:.3f} h={out["median"]["h"]:.3f} → {wd / "face.json"}')

YUNET_URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
class OneEuro:
    """one-euro 滤波：慢动时强平滑（去抖），快动时跟得上（不拖影）"""
    def __init__(s, mincut=0.35, beta=6.0, dcut=1.0): s.mc, s.b, s.dc, s.x, s.dx, s.t = mincut, beta, dcut, None, 0.0, None
    @staticmethod
    def _a(cut, dt): import math; r = 2 * math.pi * cut * dt; return r / (r + 1)
    def __call__(s, t, x):
        if s.x is None: s.x, s.t = x, t; return x
        dt = max(1e-3, t - s.t); s.t = t
        dx = (x - s.x) / dt; s.dx = s.dx + s._a(s.dc, dt) * (dx - s.dx)
        s.x = s.x + s._a(s.mc + s.b * abs(s.dx), dt) * (x - s.x); return s.x

def _face_detector():
    import cv2
    m = Path(__file__).resolve().parents[1] / 'assets' / 'models' / 'face_detection_yunet_2023mar.onnx'
    if not m.exists():
        try: m = _download(YUNET_URL, CACHE / 'models' / m.name)
        except Exception as e: log('YuNet 模型不可用：', e); m = None
    if m is not None and hasattr(cv2, 'FaceDetectorYN'):
        try:
            det = cv2.FaceDetectorYN.create(str(m), '', (320, 320), 0.6, 0.3, 20)
            def yunet(sm):
                det.setInputSize((sm.shape[1], sm.shape[0])); _, f = det.detect(sm)
                if f is None or not len(f): return None
                f = max(f, key=lambda r: r[2] * r[3] * r[14])          # 最大、最可信的那张脸
                x, y, w, h = f[:4]; eyes_y = (f[5] + f[7]) / 2; mouth_y = (f[11] + f[13]) / 2
                cx = (f[4] + f[6] + f[8]) / 3                              # 两眼 + 鼻尖 的水平中心，比框中心稳
                cy = eyes_y * 0.45 + mouth_y * 0.55                         # 眼睛和嘴之间略偏下 = 视觉脸心
                return float(cx / sm.shape[1]), float(cy / sm.shape[0]), float(h * 1.25 / sm.shape[0]), float(f[14])
            return yunet, 'yunet'
        except Exception as e: log('YuNet 加载失败，退回 Haar：', e)
    xml = Path(getattr(cv2, 'data', None).haarcascades if hasattr(cv2, 'data') else '') / 'haarcascade_frontalface_default.xml'
    if not xml.exists(): xml = _download('https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml', CACHE / 'models' / 'haarcascade_frontalface_default.xml')
    hz = cv2.CascadeClassifier(str(xml))
    def haar(sm):
        g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY); fs = hz.detectMultiScale(g, 1.1, 5, minSize=(int(sm.shape[0] * 0.12),) * 2)
        if not len(fs): return None
        x, y, w, h = map(float, max(fs, key=lambda f: f[2] * f[3])); return (x + w / 2) / sm.shape[1], (y + h * 0.55) / sm.shape[0], h * 1.25 / sm.shape[0], 0.5
    return haar, 'opencv-haar'

def face_track(video, out_path, step=0.25):
    """人脸轨迹：YuNet（五官关键点定脸心）→ 剔除离群 → one-euro 平滑；没有 YuNet 时用 Haar。
    顺序读帧（grab 跳帧）比逐次 seek 快很多。没有脸的片段（录屏）不出样本，渲染端在样本间插值。"""
    fixed = {'median': {'cx': 0.5, 'cy': 0.36, 'h': 0.26}, 'track': [], 'method': 'fixed'}
    try: import cv2
    except Exception: log('未安装 opencv-python：使用默认构图（脸在上三分之一）'); jsave(out_path, fixed); return fixed
    try: detect, method = _face_detector()
    except Exception as e: log('人脸检测不可用，使用默认构图：', e); jsave(out_path, fixed); return fixed
    cap = cv2.VideoCapture(str(video)); fps = cap.get(cv2.CAP_PROP_FPS) or 30
    every = max(1, int(round(step * fps))); raw = []; i = 0
    while True:
        if i % every: 
            if not cap.grab(): break
            i += 1; continue
        ok, fr = cap.read()
        if not ok: break
        H, W = fr.shape[:2]; sc = 640 / max(H, W); sm = cv2.resize(fr, (int(W * sc), int(H * sc)))
        r = detect(sm)
        if r: raw.append({'t': round(i / fps, 3), 'cx': r[0], 'cy': r[1], 'h': r[2], 'c': r[3]})
        i += 1
    cap.release()
    if not raw: jsave(out_path, fixed); return fixed
    import statistics as st
    # 离群：和前后邻居的中位数差太多（误检到画面里的别的脸/海报）就丢掉
    keep = []
    for j, p in enumerate(raw):
        win = raw[max(0, j - 4):j + 5]
        mx, my, mh = (st.median(q[k] for q in win) for k in ('cx', 'cy', 'h'))
        if abs(p['cx'] - mx) < 0.12 and abs(p['cy'] - my) < 0.12 and abs(p['h'] - mh) < mh * 0.35: keep.append(p)
    keep = keep or raw
    # 按断点分段（中间是录屏/转身），每段前向 + 后向各滤一遍：零延迟、去抖
    segs, cur = [], []
    for p in keep:
        if cur and p['t'] - cur[-1]['t'] > 1.5: segs.append(cur); cur = []
        cur.append(p)
    if cur: segs.append(cur)
    def ff(ts, xs, mc, b):
        f = OneEuro(mc, b); y = [f(t, x) for t, x in zip(ts, xs)]
        g = OneEuro(mc, b); tmax = ts[-1]; z = [g(tmax - t, x) for t, x in zip(ts[::-1], y[::-1])]
        return z[::-1]
    out = []
    for sg in segs:
        ts = [p['t'] for p in sg]
        cx, cy, hh = (ff(ts, [p[k] for p in sg], *pr) for k, pr in (('cx', (0.15, 1.5)), ('cy', (0.15, 1.5)), ('h', (0.08, 0.6))))
        out += [{'t': t, 'cx': round(a, 4), 'cy': round(b2, 4), 'h': round(c, 4)} for t, a, b2, c in zip(ts, cx, cy, hh)]
    med = {k: round(st.median(p[k] for p in out), 4) for k in ('cx', 'cy', 'h')}
    d = {'median': med, 'track': out, 'method': method, 'hit': round(len(raw) / max(1, i // every), 3)}
    jsave(out_path, d); return d

# =================================================================== scaffold（分镜草稿 + 语义提示）
SEM = [
    ('number', r'(\d+(\.\d+)?\s*(%|万|亿|千|百|个|条|分钟|秒|小时|天|倍|块|元|美金|token|K|k)|百分之[一二三四五六七八九十\d]+|[一二三四五六七八九十百千万两]+(个|条|种|步|分钟|倍|万|亿))', '大数字 number / 仪表 gauge / 条形对比 bars（数字落在说出数字的那个字，提前 0.1–0.2s）'),
    ('emotion', r'(夯爆|太.{0,2}了|震惊|绝了|离谱|天哪|我的天|oh my god|OMG|哇|卧槽|牛|炸裂|疯了|吓|爽|兴奋|喜欢)', '印章 stamp / 巨字 title(slam) / 贴纸 sticker / 彩纸 confetti；人物可推近 punch-in'),
    ('enum', r'(第一|第二|第三|首先|其次|然后|接着|最后|一是|二是|三是|另外)', '章节号 chapter / 清单 checklist / 流程 flow；常驻导航 nav 更新当前项'),
    ('contrast', r'(不是.{0,10}而是|但是|可是|其实|反而|没想到|以前.{0,8}现在|对比|区别|vs|VS|甩.{0,6}几条街)', '对比卡 compare（胜者高亮）/ 划掉改写 strike / 条形收缩 bars'),
    ('process', r'(步骤|流程|先.{0,8}再|一步|工作流|调用|生成|上传|发布|整理|导出|渲染)', '流程 flow / 进度 progress / 节点网络 nodes'),
    ('product', r'([A-Za-z][A-Za-z0-9\.\- ]{1,20}|小红书|抖音|飞书|剪映|豆包|即梦|微信|视频号|B站)', 'Logo 卡 logo / 软件窗口 window（有录屏优先用真录屏）'),
    ('quote', r'(他说|她说|它说|我说|网友|评论|有人问|私信)', '对话 chat / 引用 quote / 气泡 bubble'),
    ('question', r'(吗|呢|为什么|怎么|如何|是不是|对不对|什么)$', '问题卡 bubble / 巨字提问 title；人物回到全屏或大圆窗'),
    ('cta', r'(关注|点赞|收藏|评论区|转发|下期|再见|拜拜|敬请期待|三连)', '结尾 CTA：fx-follow-card / fx-next-episode / fx-end-brand；人物大圆窗居中'),
    ('time', r'(以前|现在|未来|昨天|今天|明天|每天|每晚|周|月|年|\d+点)', '时间线 timeline / 时钟卡；前后对比'),
]

def semantic_hints(text):
    hits = []
    for kind, pat, sug in SEM:
        for m in re.finditer(pat, text, flags=re.I):
            w = m.group(0).strip()
            if kind == 'product' and (len(w) < 2 or w.lower() in ('ok', 'a', 'i')): continue
            hits.append({'kind': kind, 'word': w, 'suggest': sug})
    seen = set(); out = []
    for h in hits:
        k = (h['kind'], h['word'])
        if k not in seen: seen.add(k); out.append(h)
    return out

PRIO = ['number', 'emotion', 'contrast', 'enum', 'quote', 'question', 'process', 'product', 'cta']
def draft_layers(scenes, words, landscape=True):
    """按语义提示给每段放草稿元素（draft:true），都用 cue 对齐到说出关键词的那个字。
    这是起点不是成品：导演按 playbook 改文案、删多余、补承接。"""
    box = 'left' if landscape else 'upper'
    for i, S in enumerate(scenes):
        t0, t1 = S['t0'], S['t1']; dur = t1 - t0
        S['bg'] = [{'c': 'bg-wall', 'props': {'skin': 'gold'}}]
        if i: S['transition'] = {'type': 'push-left', 'dur': 0.6}
        quota = max(1, min(4, int(dur / 2.6))); used = []; lay = []
        for kind in PRIO:
            for h in S['hints']:
                if h['kind'] != kind or len(lay) >= quota: continue
                w = h['word']
                if kind == 'number' and (re.fullmatch(r'[一两]?(个|条|种|步|分钟|倍)', w) or re.search(r'[几上数好近]' + re.escape(w), S['say'])): continue   # "一个""几十条"不是要上屏的数字
                if kind == 'enum' and w in ('然后', '接着', '另外', '最后'): continue     # 口头连接词，不是列举
                if sum(1 for x in lay if x.get('_k') == kind) >= (2 if kind == 'number' else 1): continue
                ts = find_word_times(words, w, after=t0 + 0.05, before=t1 - 0.3)
                if not ts or any(abs(ts[0] - u) < 1.4 for u in used): continue
                L = {'cue': w, 'lead': -0.15, 'box': box, 'draft': True}
                if kind == 'number':
                    m = re.match(r'(\d+(?:\.\d+)?)\s*(.*)', w)
                    L.update(c='number', props={'value': float(m.group(1)), 'unit': m.group(2)} if m else {'text': w, 'label': ''})
                elif kind == 'emotion': L.update(c='stamp', box='center', props={'text': w[:6]})
                elif kind == 'contrast': L.update(c='compare', props={'items': [{'title': '（之前）'}, {'title': '（之后）'}], 'op': 'vs', 'winner': 1})
                elif kind == 'enum': L.update(c='chips', props={'items': [w]})
                elif kind == 'quote': L.update(c='bubble', props={'text': '（引用原话 ≤16 字）'})
                elif kind == 'question': L.update(c='title', props={'text': '（问题 ≤12 字）'})
                elif kind == 'process': L.update(c='flow', props={'steps': [{'t': '（第一步）'}, {'t': '（第二步）'}, {'t': '（第三步）'}]})
                elif kind == 'product': L.update(c='logo', props={'text': w, 'style': 'glass'})
                elif kind == 'cta': L.update(c='title', props={'text': w})
                L['_k'] = kind; lay.append(L); used.append(ts[0])
        for L in lay: L.pop('_k', None)
        S['layers'] = lay

# 外观 + 人物版式轮换（参考风格 A–D：换章节换底色、人物在全屏 / 方卡 / 圆窗 / 大圆之间切，圆窗每章换角）
LOOK_CYCLE = ['a-blue', 'wall-acid', 'b-paper', 'd-neon', 'wall-gold', 'a-violet', 'b-film', 'wall-jade', 'a-lime', 'd-hud', 'wall-chrome', 'wall-lacquer']
PRESENTER_MENU = {
    'wide':     [('full', 'c'), ('side', 'r'), ('circle', 'br'), ('full', 'c'), ('card', 'r'), ('circle', 'tl'), ('side', 'r'), ('circle', 'bl')],
    'narrow':   [('story', 'c'), ('side', 'r'), ('circle', 'br'), ('story', 'l'), ('side', 'r'), ('circle', 'tl'), ('story', 'r'), ('circle', 'bl')],
    'portrait': [('full', 'c'), ('side', 'r'), ('full', 'c'), ('pip', 'tr'), ('card', 't'), ('full', 'c'), ('pip', 'tl'), ('side', 'r')],
}
def layout_plan(scenes, cw, ch, sw, sh):
    """给分镜草稿排外观和人物版式：约两段一章，章与章换 look；开头暗底钩子、结尾红色放射喊话；人物按画幅菜单轮换，全屏段 > 9s 加一次推近"""
    if not scenes: return [{'t': 0, 'state': 'full'}]
    portrait = ch > cw; narrow = not portrait and (cw / ch < 1.5 or sw / sh < 0.8)
    menu = PRESENTER_MENU['portrait' if portrait else 'narrow' if narrow else 'wide']
    keys = []; n = len(scenes); ci = 0
    for i, S in enumerate(scenes):
        chap = 0 if i == 0 else (n - 1 if i == n - 1 and n > 2 else (i + 1) // 2)
        if i == 0: S['look'] = 'b-film' if not portrait else 'c-wall'
        elif i == n - 1 and n > 2: S['look'] = 'a-red'
        else: S['look'] = LOOK_CYCLE[(chap - 1) % len(LOOK_CYCLE)]
        if i == n - 1 and n > 2: st, pos = ('circle-big', 'c')
        else: st, pos = menu[ci % len(menu)]; ci += 1
        k = {'t': round(S['t0'], 3), 'state': st, 'pos': pos}
        if i: k['dur'] = 0.6
        keys.append(k)
        if st in ('full', 'story') and S['t1'] - S['t0'] > 9:   # 风格 C：全屏段每 8–15s 推近一次（跳切）
            keys.append({'t': round((S['t0'] + S['t1']) / 2, 3), 'state': st, 'pos': pos, 'zoom': 1.14, 'dur': 0})
    return keys

def cmd_scaffold(ns):
    wd = Path(ns.workdir); W = jload(wd / 'words.json'); words = W['words']
    cues = words_to_cues(words)
    master = wd / 'master.mp4'
    if not master.exists():
        src = W.get('source'); log('未找到 master.mp4：直接使用原片作为母版'); master = Path(src)
    info = probe(master); D = round(info['duration'], 3)
    cw, ch = map(int, ns.canvas.lower().split('x'))
    # 场景切分：长停顿或 8–14 秒
    scenes, cur, t0 = [], [], 0.0
    for i, c in enumerate(cues):
        cur.append(c)
        dur = c['e'] - t0; nxt = cues[i + 1] if i + 1 < len(cues) else None
        gap = (nxt['s'] - c['e']) if nxt else 9
        if (dur > 7.5 and gap > 0.3) or dur > 14 or gap > 0.9 or not nxt:
            t1 = round((c['e'] + nxt['s']) / 2, 3) if nxt else D
            text = ''.join(x['t'] for x in cur)
            scenes.append({'id': f's{len(scenes) + 1:02d}', 't0': round(t0, 3), 't1': t1, 'energy': 2, 'say': text, 'hints': semantic_hints(text), 'layers': []})
            t0 = t1; cur = []
    if scenes: scenes[0]['energy'] = 1; scenes[-1]['energy'] = 1
    draft_layers(scenes, words, cw >= ch)
    packs = [x for x in re.split(r'[,，\s]+', getattr(ns, 'packs', None) or '') if x]
    if packs:   # 行业包：按语义 + 位置给每段挑模板；匹配明确（≥4 分）的直接放模板草稿，其余写提示
        from dms_packs import need_pack, suggest_templates
        for pid in packs: need_pack(pid)
        used = {}; cap = max(1, round(len(scenes) * 0.35))   # 同一模板：开场 / 章节 / 结尾类一条片子一次，其余不超过 35% 的段落（不能千篇一律）
        order = sorted(range(len(scenes)), key=lambda i: 0 if i in (0, len(scenes) - 1) else 1)   # 先给开头结尾挑
        for i in order:
            sc = scenes[i]
            pos = 'first' if i == 0 else 'last' if i == len(scenes) - 1 else None
            sug = suggest_templates(sc['say'], sc['hints'], packs, (cw, ch), pos)
            if not sug: continue
            sc['packHints'] = [f'{ref}  {title}（{why}；{sc_:d} 分）' for sc_, ref, title, why in sug]
            ok = [x for x in sug if x[0] >= 4 and used.get(x[1], 0) < (1 if load_template(x[1])['contract'].get('role') in ('hook', 'chapter', 'cta', 'outro') else cap)]
            if ok:
                used[ok[0][1]] = used.get(ok[0][1], 0) + 1
                t = load_template(ok[0][1]); c = t['contract']
                sc['template'] = ok[0][1]; sc['draftTemplate'] = True
                sc['slots'] = {x['id']: (x['default'] if 'default' in x else f"（填：{x.get('desc', x['id'])}）") for x in c.get('inputSlots', []) if x.get('required') or 'default' in x}
                sc['layers'] = []
    keys = layout_plan(scenes, cw, ch, info.get('w') or 1080, info.get('h') or 1920)
    BR = ({'name': ns.brand_name or re.split(r'[-·\s]', ns.wall_main)[0], 'wall': [ns.wall_main, ns.wall_sub or ns.wall_main], 'mark': (ns.brand_name or ns.wall_main)[:1]}
          if getattr(ns, 'wall_main', None) else (load_brand(Path(ns.out).resolve().parent) or dict(NEUTRAL_BRAND)))
    if getattr(ns, 'wall_main', None): save_brand(BR)
    edit = {
        'schema': 'dayan-edit/1', 'title': ns.title or Path(master).stem, 'canvas': {'w': cw, 'h': ch, 'fps': int(ns.fps)}, 'theme': ns.theme,
        'brand': BR, 'signature': {'enabled': False, 'name': BR.get('name', ''), 'pos': 'tl'}, 'master': os.path.relpath(master, Path(ns.out).parent), 'words': os.path.relpath(wd / 'words.json', Path(ns.out).parent), 'duration': D,
        'presenter': {'face': 'auto', 'windowTitle': (BR.get('name') + ' · 口播') if BR.get('name') else '口播', 'keys': keys},
        'subtitles': {'style': 'clean', 'burn': 'ass', 'highlight': [], 'hide': []},
        'music': {'mode': 'none'},   # 默认不加背景音乐（用户 2026-11-07）；要配乐时改 generate
        'media': {}, 'camera': [], 'sfx': [], 'scenes': scenes,
    }
    if packs: edit['packs'] = packs
    Path(ns.out).parent.mkdir(parents=True, exist_ok=True); jsave(ns.out, edit)
    log(f'分镜草稿 {len(scenes)} 段 → {ns.out}')
    for s in scenes:
        hs = '、'.join(f"{h['kind']}:{h['word']}" for h in s['hints'][:6])
        print(f"  {s['id']} {s['t0']:6.2f}–{s['t1']:6.2f}  {s['say'][:34]}{'…' if len(s['say']) > 34 else ''}\n      提示：{hs}")
        if s.get('template'): print(f"      行业包模板（草稿，已放上）：{s['template']}  槽位待填：{', '.join(s.get('slots') or {})}")
        elif s.get('packHints'): print(f"      行业包可选：{s['packHints'][0]}")

# =================================================================== subs（人工润色字幕 → 自动对齐时间）
def align_lines(words, lines):
    """把润色后的字幕行（可改错字、加标点、合并口癖）对齐到字级时间码。
    用全文差异匹配：每行取匹配到的第一个字为开始、最后一个字为结束。"""
    import difflib
    norm = lambda x: re.sub(r'[\s，。！？、,.!?：:；;“”"\'（）()《》~…—-]', '', x).lower()
    chars, st, en = '', [], []
    for w in words:
        t = norm(w['w'])
        for i, ch in enumerate(t): chars += ch; st.append(w['s']); en.append(w['e'] if i == len(t) - 1 else w['s'])
    full = ''; owner = []
    for li, ln in enumerate(lines):
        t = norm(ln); full += t; owner += [li] * len(t)
    sm = difflib.SequenceMatcher(None, full, chars, autojunk=False)
    hit = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): hit.setdefault(owner[a + k], []).append(b + k)
    cues = []; last_e = 0
    for li, ln in enumerate(lines):
        idx = hit.get(li)
        if idx: s0, e0 = st[min(idx)], en[max(idx)] + 0.18
        else: s0, e0 = last_e, last_e + 1.2
        cues.append({'s': round(max(s0 - 0.05, last_e), 3), 'e': round(e0, 3), 't': ln.strip()})
        last_e = cues[-1]['s']
    for i in range(len(cues) - 1):
        cues[i]['e'] = round(min(max(cues[i]['e'], cues[i]['s'] + 0.6), cues[i + 1]['s']), 3)
        if cues[i + 1]['s'] - cues[i]['e'] < 0.3: cues[i]['e'] = cues[i + 1]['s']
    return cues

def cmd_subs(ns):
    wd = Path(ns.workdir); W = jload(wd / 'words.json')
    lines = [l for l in Path(ns.lines).read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')]
    cues = align_lines(W['words'], lines)
    jsave(wd / 'subs.json', cues); write_srt(cues, wd / 'subs.srt')
    log(f'{len(cues)} 条字幕已对齐 → {wd / "subs.json"}（edit.json 里 "subtitles":{{"cuesFile":"…/subs.json"}}）')
    for c in cues: print(f"  {c['s']:6.2f}–{c['e']:6.2f} {c['t']}")

# =================================================================== words（关键词时间）
def find_word_times(words, kw, after=None, before=None):
    """在字序列里找关键词（忽略空格大小写），返回每次出现的开始时间"""
    seq = [(w['w'], w['s']) for w in words]
    flat = ''; pos = []
    for w, s in seq:
        for ch in w: flat += ch.lower(); pos.append(s)
    k = kw.lower().replace(' ', ''); flat2 = ''; pos2 = []
    for ch, p in zip(flat, pos):
        if ch != ' ': flat2 += ch; pos2.append(p)
    out = []; i = flat2.find(k)
    while i != -1:
        t = pos2[i]
        if (after is None or t >= after) and (before is None or t <= before): out.append(round(t, 3))
        i = flat2.find(k, i + 1)
    return out

def cmd_words(ns):
    W = jload(Path(ns.workdir) / 'words.json')
    for k in ns.keys:
        ts = find_word_times(W['words'], k); print(f'  {k}: {ts if ts else "未找到（检查识别错字，或用 asr-fixes 纠正）"}')

# =================================================================== Motion 模板（放在行业包里，见 dms_packs.py）
from dms_templates import discover, load_template, validate_template, expand_template  # noqa: E402

def cmd_template(ns):
    if ns.action == 'list':
        from dms_packs import template_aspects
        ts = discover()
        if not ts: print('还没有可用的模板：主技能不内置模板，装了行业包（dms.py pack install …）后这里会列出包里的模板'); return
        for t in ts:
            c = t['contract']; comp = c.get('composition', {})
            print(f"  {t['ref'] + '@' + c['version']:34s} {c.get('status',''):11s} {c.get('role', '-'):9s} {'/'.join(template_aspects(c)):18s} {comp.get('durationInFrames', 0) / max(1, comp.get('fps', 60)):.1f}s  {c.get('title', '')}")
    elif ns.action == 'validate':
        bad = 0
        for t in discover():
            if ns.id and ns.id not in (t['ref'], t['contract']['templateId'], t.get('pack')): continue
            errs, warns = validate_template(t)
            print(('  ✓ ' if not errs else '  ✗ ') + t['ref'] + ('' if not errs else '\n     ' + '\n     '.join(errs)) + ('' if not warns else '\n     ⚠ ' + '\n     ⚠ '.join(warns)))
            bad += bool(errs)
        sys.exit(1 if bad else 0)
    elif ns.action == 'show':
        t = load_template(ns.id); c = t['contract']
        print(json.dumps({k: c[k] for k in ('templateId', 'version', 'title', 'use', 'composition', 'inputSlots', 'holds') if k in c}, ensure_ascii=False, indent=1))
    elif ns.action == 'gallery':
        template_gallery(ns)
    elif ns.action == 'render':
        t = load_template(ns.id); payload = jload(ns.payload) if ns.payload else {}
        out = Path(ns.out); out.mkdir(parents=True, exist_ok=True)
        comp = t['contract']['composition']; fps = comp.get('fps', 60)
        dur = payload.pop('_duration', None) or comp['durationInFrames'] / fps
        edit = {'schema': 'dayan-edit/1', 'title': t['contract']['templateId'], 'canvas': {'w': comp['width'], 'h': comp['height'], 'fps': fps}, 'theme': payload.pop('_theme', t['contract'].get('theme', 'dark-tech')),
                'duration': dur, 'brand': EXAMPLE_BRAND, 'signature': {'enabled': False, 'name': EXAMPLE_BRAND['name'], 'pos': 'tl'}, 'subtitles': {'enabled': False}, 'music': {'mode': payload.pop('_music', 'none')},
                'scenes': [{'template': f"{t['ref']}@{t['contract']['version']}", 't0': 0, 't1': dur, 'slots': payload}]}
        if payload.get('presenter'): edit['master'] = payload['presenter']
        ep = out / 'edit.json'; jsave(ep, edit)
        cmd_build(argparse.Namespace(edit=str(ep), project=str(out / 'project')))
        cmd_audio(argparse.Namespace(project=str(out / 'project'), music_volume=None))
        cmd_render(argparse.Namespace(project=str(out / 'project'), out=str(out / f"{t['contract']['templateId']}.mp4"), workers=None, preset='medium', crf=16, reuse=False))

def _font(sz, bold=True):
    from PIL import ImageFont
    cands = (['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'C:/Windows/Fonts/msyhbd.ttc'] if bold else []) + \
            ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc', '/System/Library/Fonts/PingFang.ttc']
    for f in cands:
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()

def _demo_presenter(d, w, h, dur):
    """样张用的示意人物（剪影，不放真人）：静帧循环成视频"""
    from PIL import Image, ImageDraw
    demo = d / f'demo_presenter_{w}x{h}.mp4'
    if demo.exists(): return demo
    img = Image.new('RGB', (w, h)); px = ImageDraw.Draw(img)
    for y in range(h):
        k = y / h; px.line([(0, y), (w, y)], fill=(int(44 + 30 * k), int(26 + 14 * k), int(70 + 26 * (1 - k))))
    cx, u = w * 0.5, min(w, h)
    px.ellipse([cx - u * 0.11, h * 0.2, cx + u * 0.11, h * 0.2 + u * 0.3], fill=(176, 150, 140))
    px.rounded_rectangle([cx - u * 0.3, h * 0.2 + u * 0.33, cx + u * 0.3, h * 1.1], int(u * 0.15), fill=(22, 20, 28))
    px.text((cx, h * 0.2 + u * 0.15), '人物画面（示意）', fill=(70, 50, 50), font=_font(int(u * 0.028)), anchor='mm')
    img.save(d / 'demo.png')
    run([FF, '-v', 'error', '-y', '-loop', '1', '-i', str(d / 'demo.png'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', str(dur + 0.5), '-r', '30',
         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(demo)])
    return demo

ASPECT_CANVAS = {'16:9': (1920, 1080), '4:3': (1440, 1080), '1:1': (1080, 1080), '3:4': (1080, 1440), '9:16': (1080, 1920)}

def template_gallery(ns):
    """模板样张：每个模板按它支持的每种画幅各渲染 4 帧（配示意人物），拼成一张 sheet.png 放在模板文件夹里；页面报错直接失败。
    ns.id 可以是模板（包名:模板）或包名；不写就是全部已安装模板。"""
    from PIL import Image, ImageDraw
    from dms_packs import template_aspects
    ts = [t for t in discover() if t.get('impl')]
    if ns.id: ts = [t for t in ts if ns.id in (t['ref'], t.get('pack'), t['contract']['templateId'])]
    if not ts: raise SystemExit(f'✗ 没有找到模板 {ns.id or ""}（dms.py template list）')
    bad = []
    for t in ts:
        c = t['contract']; comp = c['composition']; fps = comp.get('fps', 60)
        pl = t['dir'] / 'example.payload.json'; payload0 = jload(pl) if pl.exists() else {}
        work = Path(ns.out or (t['dir'] / '_check')); shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True)
        rows = []
        pref = [s for s in ('full', 'side', 'circle', 'pip', 'card', 'circle-big', 'window', 'story', 'hidden') if s in (c.get('presenterCompat') or ['full'])] or ['full']
        for asp in template_aspects(c):
            w, h = ASPECT_CANVAS[asp]; payload = dict(payload0)
            dur = payload.pop('_duration', None) or comp['durationInFrames'] / fps
            edit = {'schema': 'dayan-edit/1', 'title': t['ref'], 'canvas': {'w': w, 'h': h, 'fps': 30}, 'theme': payload.pop('_theme', c.get('theme', 'dark-tech')),
                    'duration': dur, 'brand': EXAMPLE_BRAND, 'signature': {'enabled': False}, 'subtitles': {'enabled': False}, 'music': {'mode': 'none'},
                    'scenes': [{'template': f"{t['ref']}@{c['version']}", 't0': 0, 't1': dur, 'slots': payload}]}
            sub_ = work / asp.replace(':', 'x'); sub_.mkdir()
            edit['master'] = str(_demo_presenter(work, w, h, dur))
            edit['presenter'] = {'face': {'cx': 0.5, 'cy': 0.3, 'h': 0.28}, 'keys': [{'t': 0, 'state': pref[0], **({'pos': 'r'} if pref[0] in ('side', 'card') else {'pos': 'br'} if pref[0] in ('circle', 'pip') else {})}]}
            jsave(sub_ / 'edit.json', edit)
            cmd_build(argparse.Namespace(edit=str(sub_ / 'edit.json'), project=str(sub_ / 'p')))
            times = [round(dur * f, 2) for f in (0.15, 0.4, 0.7, 0.95)]
            r = subprocess.run([NODE, str(HERE / 'render.mjs'), str(sub_ / 'p'), '--stills', ','.join(map(str, times))], cwd=str(ROOT), capture_output=True, text=True)
            errs = [l for l in (r.stdout + r.stderr).splitlines() if re.search(r'\[page\]|\[console\]|TypeError|ReferenceError|SyntaxError', l)]
            if r.returncode or errs: bad.append(f"{t['ref']} {asp}：" + ' / '.join(errs[:4] or [r.stderr[-300:]])); continue
            rows.append((asp, w, h, [sub_ / 'p' / 'stills' / f't{x:.2f}.png' for x in times], times))
        if not rows: continue
        th = 300; gap = 14; head = 110
        widths = [int(th * w / h) for _, w, h, _, _ in rows]; tw = max(widths) * 4 + gap * 5
        S = Image.new('RGB', (tw, head + len(rows) * (th + 44)), '#0E1014'); dr = ImageDraw.Draw(S)
        dr.text((gap, 18), f"{c.get('title', t['ref'])}", fill='#E9EEF4', font=_font(34))
        dr.text((gap, 66), f"{t['ref']} · {c.get('role', '')} · 人物 {pref[0]} · {'/'.join(template_aspects(c))}", fill='#8A93A0', font=_font(20, False))
        for i, (asp, w, h, fs, times) in enumerate(rows):
            y = head + i * (th + 44); cw_ = int(th * w / h)
            for j, f in enumerate(fs):
                x = gap + j * (cw_ + gap)
                if f.exists(): S.paste(Image.open(f).convert('RGB').resize((cw_, th)), (x, y))
                dr.text((x, y + th + 8), f'{asp}  {times[j]:.2f}s', fill='#C9D1DB', font=_font(18, False))
        S.save(t['dir'] / 'sheet.png'); shutil.copy(rows[0][3][-2], t['dir'] / 'preview.png') if rows[0][3][-2].exists() else None
        if not ns.out: shutil.rmtree(work, ignore_errors=True)
        log('模板样张', t['ref'], '→', t['dir'] / 'sheet.png')
    if bad: raise SystemExit('✗ 渲染出错：\n  ' + '\n  '.join(bad))

# =================================================================== 行业模板包（Motion 模板包）
PACK_README = """# {name}

行业：{industry}

{desc}

## 包里有什么
- templates/：Motion 模板（每个一个文件夹，规范见主技能 references/motion-templates.md）
- effects/：这个行业专用的动效（id 以 fx-{id}- 开头）

## 怎么用
1. 安装：`python scripts/dms.py pack install <这个包的仓库地址 / zip / 文件夹>`
2. 剪辑时：edit.json 写 `"packs": ["{id}"]`（或 scaffold 加 `--packs {id}`），分镜会优先匹配包里的模板
3. 自检：`python scripts/dms.py pack check {id} --render`
"""

def _copy_pack(src, dst):
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('_check', '_editcheck', '__pycache__'))

def _fetch_pack(src, tmp):
    """把 git 地址 / zip / 文件夹 取到临时目录，返回包的根目录（里面有 pack.json）"""
    s = str(src)
    if re.match(r'^(https?://|git@)', s) or s.endswith('.git'):
        r = subprocess.run(['git', 'clone', '--depth', '1', s, str(tmp / 'repo')], capture_output=True, text=True)
        if r.returncode: raise SystemExit(f'✗ 克隆失败：{r.stderr.strip()[-300:]}')
        base = tmp / 'repo'
    elif s.lower().endswith('.zip'):
        import zipfile
        with zipfile.ZipFile(s) as z: z.extractall(tmp / 'zip')
        base = tmp / 'zip'
    else:
        base = Path(s).expanduser().resolve()
        if not base.exists(): raise SystemExit(f'✗ 找不到 {s}')
    if (base / 'pack.json').exists(): return base
    hits = [p.parent for p in base.rglob('pack.json') if len(p.relative_to(base).parts) <= 3]
    if len(hits) != 1: raise SystemExit(f'✗ {s} 里{"没有" if not hits else "有多个"} pack.json（一个行业包的根目录要有且只有一个 pack.json）')
    return hits[0]

def cmd_pack(ns):
    """行业模板包：list 列出 / install 安装 / update 更新 / new 新建骨架 / check 自检（--render 出样张）"""
    import dms_packs as PK
    act = ns.action
    if act == 'list':
        ps = PK.discover_packs()
        if not ps: print(f'还没有安装行业包（安装位置 {PK.pack_home()}）：dms.py pack install <仓库地址 / zip / 文件夹>'); return
        for p in ps:
            m = p['meta']; nt = len(list((p['dir'] / 'templates').glob('*/template.motion.json'))) if (p['dir'] / 'templates').exists() else 0
            nf = len(PK.pack_effect_dirs([p['id']]))
            print(f"  {p['id']:16s} v{m.get('version', '?'):8s} {m.get('industry', ''):10s} 模板 {nt} · 动效 {nf}  要求主技能 {(m.get('requires') or {}).get('dms', '-')}  {'✓' if p['ok'] else '✗ ' + p['why']}\n      {m.get('name', '')}：{m.get('desc', '')}  ({p['dir']})")
        return
    if act == 'install':
        if not ns.target: raise SystemExit('✗ 要给包的来源：git 仓库地址、zip 文件或文件夹')
        with tempfile.TemporaryDirectory() as td:
            base = _fetch_pack(ns.target, Path(td)); m = jload(base / 'pack.json'); pid = m.get('id', '')
            if not PK.PACK_ID.match(pid): raise SystemExit(f'✗ pack.json 的 id "{pid}" 不合规（小写字母、数字、连字符）')
            dst = PK.pack_home() / pid
            if dst.exists() and not ns.force: raise SystemExit(f'✗ 已经装了 {pid}（{dst}）：更新用 dms.py pack update {pid}，要覆盖加 --force')
            dst.parent.mkdir(parents=True, exist_ok=True); _copy_pack(base, dst)
        PK.discover_packs(refresh=True); p = PK.get_pack(pid)
        E_, W_ = PK.validate_pack(p, {d.name for d in (ROOT / 'effects').iterdir()})
        print(f"✓ 已安装 {pid} v{m.get('version')} → {dst}" + ('' if p['ok'] else f"\n✗ 但{p['why']}：先更新主技能才能用"))
        for x in E_: print('  ✗ ' + x)
        for x in W_: print('  ⚠ ' + x)
        if E_: print('  这个包没通过自检，调用时可能出错：联系包作者，或 dms.py pack check ' + pid)
        return
    if act == 'update':
        ps = [PK.get_pack(ns.target)] if ns.target else PK.discover_packs()
        if ns.target and not ps[0]: raise SystemExit(f'✗ 没有安装 {ns.target}')
        for p in ps:
            d, old = p['dir'], p['meta'].get('version')
            if (d / '.git').exists():
                r = subprocess.run(['git', '-C', str(d), 'pull', '--ff-only'], capture_output=True, text=True)
                if r.returncode: print(f"  ✗ {p['id']} 拉取失败：{r.stderr.strip()[-200:]}"); continue
            elif p['meta'].get('repo'):
                with tempfile.TemporaryDirectory() as td:
                    try: base = _fetch_pack(p['meta']['repo'], Path(td))
                    except SystemExit as e: print(f"  ✗ {p['id']} {e}"); continue
                    new = jload(base / 'pack.json').get('version')
                    if PK.vtuple(new) > PK.vtuple(old): _copy_pack(base, d)
            else: print(f"  - {p['id']}：不是从 git 安装、pack.json 也没写 repo，没法自动更新"); continue
            now = jload(d / 'pack.json').get('version')
            print(f"  ✓ {p['id']}：{old} → {now}" if now != old else f"  ✓ {p['id']}：已是最新 {now}")
        PK.discover_packs(refresh=True)
        return
    if act == 'new':
        pid = ns.target or ''
        if not PK.PACK_ID.match(pid): raise SystemExit('✗ 包名只能用小写字母、数字和连字符（字母开头，2–31 位），例如 ai-tech')
        dst = Path(ns.dir).expanduser().resolve() / pid if ns.dir else PK.pack_home() / pid
        if dst.exists(): raise SystemExit(f'✗ {dst} 已存在')
        (dst / 'templates').mkdir(parents=True); (dst / 'effects').mkdir()
        meta = {'schema': PK.PACK_SCHEMA, 'id': pid, 'name': ns.name or pid, 'version': '0.1.0', 'industry': ns.industry or '（行业，例如 AI 科技）',
                'desc': '（一句话：这个包适合什么口播、整体风格是什么）', 'requires': {'dms': f'>={VERSION}'}, 'repo': '', 'author': '', 'license': 'MIT'}
        jsave(dst / 'pack.json', meta)
        (dst / 'README.md').write_text(PACK_README.format(**meta), encoding='utf-8')
        print(f'✓ 行业包骨架 → {dst}\n  照着 {ROOT / "examples" / "packs" / "demo-pack"} 的写法加模板和动效；规范见 references/motion-templates.md；写完 dms.py pack check {pid} --render')
        return
    if act == 'check':
        tgt = ns.target or ''
        pth = Path(tgt).expanduser()
        if tgt and pth.is_dir() and (pth / 'pack.json').exists():   # 还没安装的包（开发中的文件夹）
            os.environ['DMS_PACK_PATHS'] = os.pathsep.join([str(pth.resolve())] + [x for x in os.environ.get('DMS_PACK_PATHS', '').split(os.pathsep) if x])
            PK.discover_packs(refresh=True); tgt = jload(pth / 'pack.json').get('id', '')
        p = PK.get_pack(tgt)
        if not p: raise SystemExit(f'✗ 没有找到行业包 {ns.target}（写包名，或包所在的文件夹）')
        E_, W_ = PK.validate_pack(p, {d.name for d in (ROOT / 'effects').iterdir()})
        print(f"行业包 {p['id']} v{p['meta'].get('version')}（{p['dir']}）" + ('' if p['ok'] else f"  ✗ {p['why']}"))
        for x in E_: print('  ✗ ' + x)
        for x in W_: print('  ⚠ ' + x)
        if E_ or not p['ok']: raise SystemExit(1)
        if ns.render:
            if any(t.get('pack') == p['id'] for t in discover()): template_gallery(argparse.Namespace(id=p['id'], out=None))
            for d in PK.pack_effect_dirs([p['id']]): cmd_effect(argparse.Namespace(action='check', id=d.name, name=None, use=None, pack=p['id'], force=False))
        print('✓ 自检通过' + ('（样张已出：每个模板文件夹里的 sheet.png、每个动效文件夹里的 sheet.png，必须打开看）' if ns.render else '（加 --render 再按画幅出样张）'))
        return

FX_JS = """/* {name}（{id}）—— 剪辑时现做的新动效，已沉淀进动效库
   什么时候用：{use}
   标准（SKILL.md「动效不够时」）：画面跟着口播的字走（子元素 at/cue 相对本层）、有入场和落定的质感、带音效、
   16:9 / 4:3 / 9:16 都排得下（尺寸用 cqw/cqh，不写死像素）、时间的纯函数（只用 lt/t，不用真实时间和 Math.random）、不出现任何人的品牌。
   剪辑台能改、改了不坏（references/editable.md 十条）：连线用 DMS.link(e, a, b) 并在 update 里 ln.update(k)；装饰做成被装饰元素的子元素；
   一个节点一个容器；文字自适应（DMS.fitText）、flex/grid 排版；数字与图形同参数；动画不占用 translate/scale/rotate；颜色走 CSS 变量；可编辑元素写 data-edit。 */
(function () {{
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, clamp = DMS.clamp, el = DMS.el;
  C['{id}'] = {{
    enter: 'none',                         // 入场自己做（下面 update 里），不用外层默认入场
    build(e, p) {{
      e.classList.add('{id}');
      const items = (p.items || []).map((it, i) => {{
        const o = typeof it === 'string' ? {{ t: it }} : it;
        const x = el('div', 'it', DMS.hl(o.t || '', o.hl), e); x.dataset.edit = 'item-' + (i + 1);   // 稳定编号：剪辑台按它记修改
        return {{ o, at: o.at == null ? 0.25 + i * 0.4 : o.at, el: x }};
      }});
      return {{ items }};
    }},
    update(e, lt, p, s) {{
      s.items.forEach(x => {{
        const k = prog(lt, x.at, 0.55), q = E.outExpo(k), sp = E.spring(k, 0.55, 11);
        x.el.style.opacity = clamp(k * 2.5).toFixed(3);
        x.el.style.transform = `translateY(${{lerp(3, 0, q)}}cqh) scale(${{lerp(0.94, 1, sp).toFixed(4)}})`;   // 入场 + 回弹落定
        x.el.style.filter = `blur(${{lerp(8, 0, E.outQuart(k)).toFixed(2)}}px)`;
      }});
    }},
    sfx: p => (p.items || []).map((it, i) => ({{ at: (it && it.at != null) ? it.at : 0.25 + i * 0.4, kind: 'pop', gain: 0.45 }})),
  }};
}})();
"""
FX_CSS = """.{id} {{ position: absolute; inset: 0; container-type: size; display: flex; flex-direction: column; justify-content: center; gap: 3cqh; }}
.{id} .it {{ font: 800 min(6cqw, 11cqh)/1.2 var(--title-font); color: var(--fg); }}
"""
def _similar_effects(name, use, limit=3):
    """新建动效前查重：和动效库 + 已装行业包里的动效、引擎组件比"名称 + 用途"——新动效的描述有多少（二字片段）已经被某个现有动效覆盖"""
    import dms_catalog as K
    def grams(t):
        t = re.sub(r'[\s，。、“”"（）()：:；;/·\-]', '', str(t).lower()); return {t[i:i + 2] for i in range(len(t) - 1)}
    q = grams(f'{name}{use}')
    if not q: return []
    out = []
    for it in K.components() + K.effects(with_packs=True):
        g = grams(f"{it.get('name', '')}{it.get('use', '')}")
        if g: out.append((len(q & g) / len(q), it['src'], it['id'], it.get('name', '')))
    return [x for x in sorted(out, reverse=True)[:limit] if x[0] >= 0.1]

def cmd_grab(ns):
    import dms_grab; dms_grab.cli(ns, NODE, FF)

def cmd_library(ns):
    """动效库体检（只给建议，从不删除）：查重、闲置、缺样张 / 缺触发词，以及按使用情况升降成熟度"""
    import dms_catalog as K
    U = K.load_usage(); lib = ROOT / 'effects'
    if ns.action == 'index':
        rows = K.build_index(); K.write_md(); return log(f'动效索引 → {K.INDEX}（{len(rows)} 个，编号 01-01 … 12-xx），目录 → references/catalog.md')
    if ns.action == 'promote':
        d = lib / (ns.id or '')
        if not (d / 'effect.json').exists() or ns.status not in K.STATUS_W: die('用法：dms.py library promote fx-xxx stable|candidate|experimental')
        m = jload(d / 'effect.json'); old = m.get('status', 'candidate'); m['status'] = ns.status; jsave(d / 'effect.json', m); K.build_index()
        return log(f'{ns.id}：{old} → {ns.status}')
    fx = K.effects(); ids = [x['id'] for x in fx]
    print(f'动效库 {len(fx)} 个：' + '、'.join(f"{k} {sum(1 for x in fx if x.get('status') == k)}" for k in K.STATUS_W))
    # 1 很像的两个：建议合并成一个动效的两个变体（presets）
    pairs = []
    for x in fx:
        for sc, src, yid, nm in _similar_effects(x['name'], x['use'], limit=4):
            if yid != x['id'] and yid in ids and sc >= 0.45 and (yid, x['id']) not in [(b, a) for _, a, b in pairs]: pairs.append((sc, x['id'], yid))
    if pairs:
        print(f'\n【可能重复】{len(pairs)} 对（考虑把其中一个改成另一个的变体 presets，保留两个也可以，但描述要写出区别）：')
        for sc, a, b in sorted(pairs, reverse=True)[:15]: print(f'  {sc:.2f}  {a}  ↔  {b}')
    # 2 成熟度建议
    up = [x['id'] for x in fx if (U.get(x['id']) or {}).get('uses', 0) >= 3 and x.get('status') != 'stable']
    if up: print('\n【建议升 stable】用过 3 期以上：' + '、'.join(up) + '（dms.py library promote <id> stable）')
    exp = [x['id'] for x in fx if x.get('status') == 'experimental' and (U.get(x['id']) or {}).get('uses', 0) >= 1]
    if exp: print('【建议升 candidate】已在真实成片里用过：' + '、'.join(exp))
    idle = [x['id'] for x in fx if not (U.get(x['id']) or {}).get('uses')]
    if idle and U: print(f'\n【还没在成片里用过】{len(idle)} 个（不删；检查 use / triggers 写得够不够清楚，搜不到的动效等于不存在）：' + '、'.join(idle[:30]) + (' …' if len(idle) > 30 else ''))
    # 3 资料不全
    nosheet = [i for i in ids if not (lib / i / 'sheet.png').exists()]
    notrig = [x['id'] for x in fx if x.get('status') == 'experimental' and (not x.get('tags', '').strip() or '（' in x.get('tags', ''))]
    if nosheet: print('\n【缺样张】' + '、'.join(nosheet) + '（dms.py effect check <id>）')
    if notrig: print(f'【缺触发词 triggers】{len(notrig)} 个：' + '、'.join(notrig[:30]) + (' …' if len(notrig) > 30 else '') + '（effect.json 里写口播里会出现的说法，搜索靠它）')

PLACEHOLDER_CARDS = {'T31', 'T33', 'T83', 'T86', 'M15·5'}   # 带样板账号 @XXX1… 的原卡（2026-11-20 统一换成占位）
EDIT_RULES_SINCE = '2026-11-20'   # 这天以后新建的动效：可编辑性体检有 error 就不能入库；之前的老动效只记下“待升级”，不拦
_ENUM_KEYS = {'brand', 'skin', 'tint', 'style', 'kind', 'who', 'icon', 'theme', 'look', 'pos', 'align', 'mode', 'dir', 'shape', 'type', 'variant', 'layout', 'color', 'logo', 'img', 'src', 'font', 'ease', 'id', 'preset'}
def _lengthen(v, key=''):
    """把参数里给人看的文字都加长 60%（枚举值、颜色、路径、图片不动），模拟用户在剪辑台把字改长"""
    if isinstance(v, str):
        if not v.strip() or key in _ENUM_KEYS or re.match(r'^(#|rgb|https?:|engine/|[\w./-]+\.(png|jpe?g|svg|webp|gif|mp4|mov)$)', v): return v
        if re.fullmatch(r'[a-z][a-z0-9_-]*', v) and len(v) < 16: return v
        n = max(2, int(len(v) * 0.6))
        return v + ('加长文字测试' * 6)[:n] if re.search(r'[\u4e00-\u9fa5]', v) else v + 'x' * n
    if isinstance(v, list): return [_lengthen(x, key) for x in v]
    if isinstance(v, dict): return {k: _lengthen(x, k) for k, x in v.items()}
    return v

def _editcheck(d, m, strict=None):
    """可编辑性体检（references/editable.md）：16:9 示例 + 文字加长 60% 版各建一个工程，按剪辑台的改法动一动：
    手画连线 / DMS.link 跟随、附着装饰、文字加长出框、文字互相压住。返回 issues；strict 时有 error 直接失败"""
    fid = m['id']; ex = m.get('example') or {}; dur = float(ex.get('dur', 4))
    bx = (ex.get('box') or {}).get('landscape', 'center')
    work = d / '_editcheck'; shutil.rmtree(work, ignore_errors=True); work.mkdir()
    for tag, props in (('a', ex.get('props', {})), ('b', _lengthen(ex.get('props', {})))):
        edit = {'schema': 'dayan-edit/1', 'title': fid, 'canvas': {'w': 1920, 'h': 1080, 'fps': 30}, 'theme': ex.get('theme', 'dark-tech'), 'duration': dur,
                'brand': EXAMPLE_BRAND, 'signature': {'enabled': False}, 'subtitles': {'enabled': False}, 'music': {'mode': 'none'},
                'scenes': [{'id': 'fx', 't0': 0, 't1': dur, 'bg': [{'c': 'bg-wall', 'props': {'skin': 'platinum'}}], 'layers': [{'c': fid, 'at': 0.2, 'box': bx, 'props': props}]}]}
        jsave(work / f'{tag}.json', edit)
        cmd_build(argparse.Namespace(edit=str(work / f'{tag}.json'), project=str(work / tag)))
    t = round(0.2 + (dur - 0.2) * 0.85, 2)
    r = subprocess.run([NODE, str(HERE / 'editcheck.mjs'), str(work / 'a'), str(work / 'b'), fid, str(t)], cwd=str(ROOT), capture_output=True, text=True)
    shutil.rmtree(work, ignore_errors=True)
    try: rep = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: raise SystemExit('✗ 可编辑性体检没跑起来：\n' + (r.stderr or r.stdout)[-800:])
    iss = rep['issues']; errs = [x for x in iss if x['level'] == 'error']
    if strict is None: strict = str(m.get('created', '')) >= EDIT_RULES_SINCE
    print(f"  可编辑性体检（references/editable.md）：DMS.link 连线 {rep['links']} 条（挪动后跟上 {rep['linkOk']} 条）；error {len(errs)} 个、warn {len(iss) - len(errs)} 个")
    for x in iss[:12]: print(f"   {'✗' if x['level'] == 'error' else '⚠'} [第{x['rule']}条] {x['what']}")
    m['editable'] = {'checked': time.strftime('%Y-%m-%d %H:%M'), 'ok': not errs, 'issues': [f"[{x['level']}·{x['rule']}] {x['what']}" for x in iss][:20]}
    jsave(d / 'effect.json', m)
    if errs and strict: raise SystemExit('✗ 可编辑性体检没通过：按 references/editable.md 改好再入库（剪辑台里拖、缩放、改字会错位）')
    if errs: print('  ⚠ 老动效（规范之前做的）：先记为“待升级”，不拦；改到它时顺手按 references/editable.md 升级')
    return iss

def cmd_effect(ns):
    """动效库：new 新建骨架 / check 三种画幅出样张 / list 列出。剪辑时现做的新动效都走这里沉淀。
    存档分流（用户 2026-11-17）：通用的存主技能 effects/；只有某个行业才用的加 --pack <包名> 存进那个行业包（id 要 fx-<包名>- 开头）。"""
    lib = ROOT / 'effects'; lib.mkdir(exist_ok=True)
    pid = getattr(ns, 'pack', None)
    if pid:
        from dms_packs import need_pack
        lib = need_pack(pid)['dir'] / 'effects'; lib.mkdir(exist_ok=True)
    if ns.action == 'list':
        ds = effect_dirs(None)
        if not ds: print('动效库还是空的（剪辑时现做的新动效会自动存进 effects/）'); return
        for d in ds:
            m = jload(d / 'effect.json'); tag = '' if d.parent == ROOT / 'effects' else f'[{d.parent.parent.name}] '
            print(f"  {tag}{m['id']:<22} {m.get('name', '')}  ·  {m.get('use', '')}")
        return
    if not ns.id: raise SystemExit('✗ 要给动效 id（英文小写和连字符，如 fx-before-after）')
    fid = ns.id; d = lib / fid
    if ns.action != 'new' and not d.exists():
        d = next((x for x in effect_dirs(None) if x.name == fid), d)
    if ns.action == 'new':
        if fid in builtin_components(): raise SystemExit(f'✗ {fid} 和引擎自带组件重名，换一个（建议 fx- 开头）')
        if pid and not fid.startswith(f'fx-{pid}-'): raise SystemExit(f'✗ 存进行业包 {pid} 的动效 id 要以 fx-{pid}- 开头（例如 fx-{pid}-{fid.removeprefix("fx-")}）')
        if not pid:
            from dms_packs import discover_packs
            if any(fid.startswith(f"fx-{p['id']}-") for p in discover_packs()): raise SystemExit(f'✗ {fid} 用了行业包的前缀：通用动效换个名字，行业专属的加 --pack')
        dup = next((x for x in effect_dirs(None) if x.name == fid), None)
        if dup: raise SystemExit(f'✗ 已经有 {fid}：直接改 {dup}')
        sim = _similar_effects(ns.name or fid, ns.use or '')
        if sim:
            print('⚠ 先查重：这些已有的动效和你要做的有点像，能直接用或改进就不要新建（改进旧的比新建一个相似的更好）：')
            for sc, src, xid, nm in sim: print(f'   {sc:.2f}  [{src}] {xid}  {nm}')
            if sim[0][0] >= 0.3 and not getattr(ns, 'force', False): raise SystemExit(f'✗ 和 {sim[0][2]} 太像了（{sim[0][0]:.2f}）：优先给它加一个变体——在 effects/{sim[0][2]}/effect.json 的 presets 里写 {{"<变体名>": {{"use": "什么时候用", "props": {{…}}}}}}，图层写 "preset": "<变体名>"；画面结构确实不同、变体做不到时才加 --force 新建')
        d.mkdir(parents=True)
        meta = {'id': fid, 'name': ns.name or fid, 'use': ns.use or '（说到什么时用：写清楚语义）', 'created': time.strftime('%Y-%m-%d'), 'version': '1.0.0', 'status': 'experimental',
                'triggers': ['（口播里出现哪些说法时用它：3–8 个词，搜索靠它）'],
                'props': '（主要参数说明）', 'ref': '（参考了哪种风格的哪种做法，只写代号，如 C2 无限画布横移）', 'example': {'dur': 4.0, 'props': {'items': ['第一条', '第二条', '第三条']}, 'box': {'landscape': 'center', 'portrait': 'center'}}}
        jsave(d / 'effect.json', meta)
        (d / 'component.js').write_text(FX_JS.format(id=fid, name=meta['name'], use=meta['use']), encoding='utf-8')
        (d / 'style.css').write_text(FX_CSS.format(id=fid), encoding='utf-8')
        print(f'✓ 新动效骨架 → {d}\n  改 component.js / style.css / effect.json（use、example），然后 dms.py effect check {fid}')
        return
    if ns.action == 'editcheck':
        if not d.exists(): raise SystemExit(f'✗ 动效库和已装行业包里都没有 {fid}')
        _editcheck(d, jload(d / 'effect.json')); return
    if ns.action == 'check':
        """三种画幅（16:9 1920×1080 / 4:3 1440×1080 / 9:16 1080×1920）各渲染 4 帧，拼成 sheet.png；页面报错直接失败"""
        if not d.exists(): raise SystemExit(f'✗ 动效库和已装行业包里都没有 {fid}')
        from PIL import Image, ImageDraw
        m = jload(d / 'effect.json'); ex = m.get('example') or {}; dur = float(ex.get('dur', 4))
        work = d / '_check'; shutil.rmtree(work, ignore_errors=True); work.mkdir()
        rows = []
        for tag, (w, h) in (('16:9', (1920, 1080)), ('4:3', (1440, 1080)), ('9:16', (1080, 1920))):
            bx = (ex.get('box') or {}).get('portrait' if h > w else 'landscape', 'center')
            edit = {'schema': 'dayan-edit/1', 'title': fid, 'canvas': {'w': w, 'h': h, 'fps': 30}, 'theme': ex.get('theme', 'dark-tech'), 'duration': dur,
                    'brand': EXAMPLE_BRAND, 'signature': {'enabled': False}, 'subtitles': {'enabled': False}, 'music': {'mode': 'none'},
                    'scenes': [{'id': 'fx', 't0': 0, 't1': dur, 'bg': [{'c': 'bg-wall', 'props': {'skin': 'platinum'}}], 'layers': [{'c': fid, 'at': 0.2, 'box': bx, 'props': ex.get('props', {})}]}]}
            sub_ = work / tag.replace(':', 'x'); sub_.mkdir(); jsave(sub_ / 'edit.json', edit)
            cmd_build(argparse.Namespace(edit=str(sub_ / 'edit.json'), project=str(sub_ / 'p')))
            times = [round(dur * f, 2) for f in (0.12, 0.35, 0.65, 0.95)]
            r = subprocess.run([NODE, str(HERE / 'render.mjs'), str(sub_ / 'p'), '--stills', ','.join(map(str, times))], cwd=str(ROOT), capture_output=True, text=True)
            errs = [l for l in (r.stdout + r.stderr).splitlines() if re.search(r'\[page\]|\[console\]|TypeError|ReferenceError|SyntaxError', l)]
            if r.returncode or errs: raise SystemExit(f'✗ {tag} 渲染出错：\\n' + '\\n'.join(errs[:8] or [r.stderr[-800:]]))
            r = subprocess.run([NODE, str(HERE / 'render.mjs'), str(sub_ / 'p'), '--sweep', '0.0333'], cwd=str(ROOT), capture_output=True, text=True)   # 逐帧试跑：抓抽帧看不到的瞬时报错
            errs = [l for l in (r.stdout + r.stderr).splitlines() if re.search(r'\[page\]|\[console\]|TypeError|ReferenceError|SyntaxError', l)]
            if r.returncode or errs: raise SystemExit(f'✗ {tag} 逐帧试跑出错：\n' + '\n'.join(sorted(set(errs))[:8] or [r.stderr[-800:]]))
            rows.append((tag, [sub_ / 'p' / 'stills' / f't{t:.2f}.png' for t in times]))
        th = 300; pad = 14; head = 70
        tiles = [[Image.open(f).convert('RGB') for f in fs] for _, fs in rows]
        widths = [sum(int(im.width * th / im.height) for im in r) + pad * (len(r) + 1) for r in tiles]
        S = Image.new('RGB', (max(widths), head + len(rows) * (th + 44) + pad), (16, 17, 22)); dr = ImageDraw.Draw(S)
        dr.text((pad, 18), f"{m.get('name', fid)}  {fid}  ·  {m.get('use', '')}", fill=(240, 240, 240), font=_font(26))
        y = head
        for (tag, _), r in zip(rows, tiles):
            x = pad; dr.text((pad, y), tag, fill=(170, 170, 180), font=_font(22, False)); y += 30
            for im in r:
                w2 = int(im.width * th / im.height); S.paste(im.resize((w2, th)), (x, y)); x += w2 + pad
            y += th + 14
        S.save(d / 'sheet.png'); shutil.rmtree(work, ignore_errors=True)
        _editcheck(d, m)   # 可编辑性体检：规范之后新建的动效有 error 不能入库、不分配编号（references/editable.md）
        try:
            import dms_catalog as K
            if d.parent == ROOT / 'effects': K.build_index()   # 新动效检查通过 → 分配编号、进索引
        except Exception as e: log('索引没更新（不影响样张）：', e)
        m['checked'] = time.strftime('%Y-%m-%d %H:%M'); m['layouts'] = ['16:9', '4:3', '9:16']; jsave(d / 'effect.json', m)
        print(f'✓ 三种画幅都渲染通过 → {d / "sheet.png"}（必须打开看：文字有没有溢出、有没有压到人物和字幕区）')

# =================================================================== show（把示例图真正发给用户看）
SHOW_IMAGES = {
    '文字墙示例': ('什么是文字墙', lambda: ROOT / 'assets' / '文字墙示例.jpg'),
    '风格样张': ('封面 A / B / C 三种风格样张（上排竖版、下排横版）', lambda: ROOT / 'assets' / 'cover' / '风格样张.jpg'),
    '人物总览': ('工作库人物总览（每张标有编号）', lambda: _find_people_sheet()),
}

def _find_people_sheet():
    """在当前文件夹和上层找用户工作库的 03_人物资产，里面文件名带「总览」的 jpg/png。"""
    for q in [Path.cwd().resolve()] + list(Path.cwd().resolve().parents):
        d = q / '03_人物资产'
        if d.is_dir():
            hit = sorted([p for p in d.iterdir() if p.is_file() and '总览' in p.stem and p.suffix.lower() in ('.jpg', '.jpeg', '.png')])
            if hit: return hit[0]
    return None

def _md_image(label, p):
    return f'![{label}]({Path(p).resolve().as_uri()})'

def _open_with_viewer(p):
    try:
        if sys.platform.startswith('win'): os.startfile(str(p))          # noqa
        elif sys.platform == 'darwin': subprocess.Popen(['open', str(p)])
        else: subprocess.Popen(['xdg-open', str(p)])
        return True
    except Exception as e:
        log('没能用看图软件打开：', e); return False

def cmd_show(ns):
    """用户 2026-11-26 定：开工提问用的示例图要真的让用户看到。Agent 读图（read_file / 看图工具）只是模型自己看，不算发给用户。
    这个命令同时做两件事：① 打印一行可直接贴进回复正文的 Markdown 图片；② 用系统默认看图软件在用户电脑上打开这张图（兜底，任何 Agent 都有效）。"""
    key = ns.name
    if key in SHOW_IMAGES:
        label, fn = SHOW_IMAGES[key]; p = fn()
    else:
        label, p = Path(key).stem, Path(key)
    if not p or not Path(p).exists():
        sys.exit(f'找不到图：{key}' + ('（在工作库文件夹里运行，或直接给图片路径：dms.py show <路径>）' if key == '人物总览' else ''))
    p = Path(p).resolve()
    print('把下面这一行原样贴进给用户的回复正文（在弹出提问之前）：')
    print('   ' + _md_image(label, p))
    if not ns.no_open:
        if _open_with_viewer(p): print(f'✓ 已在用户电脑上用看图软件打开：{p}（回复里也要告诉用户「已在你电脑上打开了这张图」）')
    print(f'图片文件：{p}')

def cmd_kickoff(ns):
    """新作品开工时要问用户的问题。用户 2026-11-23 定：每一条新视频都把每一题问一遍，不能因为上一期答过、本机或工作库有配置就跳过——
    上一次的回答只放进选项里当「沿用上次」，让用户自己点。只有同一条视频的修改（改一处、重渲染、补一段）才不重问。"""
    b = load_brand()
    src = next((q / BRAND_FILE for q in [Path.cwd().resolve()] + list(Path.cwd().resolve().parents) if (q / BRAND_FILE).exists()), None)
    wall_img, cover_img = ROOT / 'assets' / '文字墙示例.jpg', ROOT / 'assets' / 'cover' / '风格样张.jpg'
    print('【怎么把示例图发给用户（用户 2026-11-26 定，所有 Agent 必须做到）】')
    print('   读图（read_file / 看图工具）只是你自己看，用户那边看不到，不算「发」。按你所在的 Agent 这样发：')
    print('   · Claude 桌面端：用它展示本机文件 / 图片给用户的功能把图发出来（和以前一样）。')
    print('   · Codex / Antigravity / WorkBuddy / 豆包：在回复正文里贴下面给的 Markdown 图片行，同时跑 dms.py show <图名> 用看图软件在用户电脑上打开（兜底）。')
    print('   · 顺序：先发图 + 一句说明 → 再弹这一步的问题。提问弹窗里放不了图，不能指望弹窗带出图。')
    print('   · 发完问一句「看到图了吗」只在第一次需要；用户说看不到时，改成只靠 dms.py show 打开。')
    print('每条新视频开剪前，下面每一题都要问（用户已经在这次请求里说明的才跳过；不许沿用上一期直接默认）。分步问：每一步先发这一步的示例图，再弹出这一步的问题，回答后再进下一步：')
    print('第 1 步 · 视频设置（一个弹窗）：')
    print('1. 画幅：横屏 16:9 / 横屏 4:3 / 竖屏 9:16 / 竖屏 3:4')
    print('2. 分辨率：1080P（默认）/ 2K / 4K / 720P')
    print('3. 帧率：60（默认）/ 30 / 25 / 24')
    print('4. 字幕：中英双语（中文在上、英文在下）/ 纯中文（默认）/ 不要字幕 → edit.json subtitles.lang = zh-en / zh / none；双语要给每条字幕写英文 en')
    print('第 2 步 · 5. 文字墙品牌（每次都问）：背景文字墙会循环显示你的品牌，分两行——主行写品牌名，副行写英文名或口号。')
    print(f'   第一次用先发示例图「什么是文字墙」：dms.py show 文字墙示例，回复正文贴 → {_md_image("什么是文字墙", wall_img)}')
    last = (f"沿用上次：主行「{b['wall'][0]}」/ 副行「{b['wall'][1]}」" + (f'（来自 {src}）' if src else '')) if b else None
    print('   弹窗选项：' + (last + ' / ' if last else '') + '输入新的品牌 / 先不用（中性占位字 MOTION · STUDIO）')
    print('   选「输入新的品牌」→ 马上在对话里（不用弹窗）请用户直接回复「主行 / 副行」两行，示例：主行「小明说AI」、副行「XIAOMING · AI LAB」')
    print('   拿到答案后：dms.py scaffold … --wall-main "主行" --wall-sub "副行"')
    print('封面（视频设置问完后，最后问，分步；规则见 references/cover.md「开工时问的封面问题」）：')
    print('  第 3 步 · 6. 要不要封面（单独一个弹窗）：同时生成（默认）/ 不要封面（选不要，后面不问）')
    print('  第 4 步 · 7. 封面怎么做（cover.mode）：按口播自定义（AI 按标题和口播自己设计配色、元素、版式）/ 用模板（A 手账 / B 科技 / C 电影）/ 两种都出 / 我发一张参考封面')
    print(f'     选了模板：先发样张（dms.py show 风格样张），回复正文贴 → {_md_image("封面风格样张", cover_img)}，再问 三种都出 / A / B / C（cover.styles）')
    print('     选了自定义：问出几套（1 / 2 / 3，每套横竖各一张）+ 风格方向（AI 按口播自己定 / 我说个方向 / 发参考图）')
    print('  第 5 步 · 8. 封面有没有人物（模板和自定义都问）：有人物 / 没有人物（文字 + 背景版）')
    print('     有人物 → 9. 人物从哪来：工作库里的人物图（发总览图，让用户选编号或说"随意"由 AI 按每套风格挑动作）/ 我自己准备新图 / 从视频里自动挑（有真人出镜时）')
    ps = _find_people_sheet()
    print('       发总览图：在工作库里跑 dms.py show 人物总览' + (f'，回复正文贴 → {_md_image("人物总览", ps)}' if ps else '（当前文件夹往上没找到 03_人物资产 里的总览图；在工作库里运行或 dms.py show <路径>）'))
    print('     自己准备：Codex / 豆包 / WorkBuddy 能按人物照 + 参考图生成；Claude 不能生图，请用户生成好或拍好发来。写进 cover.photo（或每套的 custom[i].photo）')
    print('画幅 × 分辨率 → 画布：16:9 1920×1080 / 2560×1440 / 3840×2160 / 1280×720；4:3 1440×1080 / 1920×1440 / 2880×2160 / 960×720；')
    print('                     9:16 1080×1920 / 1440×2560 / 2160×3840 / 720×1280；3:4 1080×1440 / 1440×1920 / 2160×2880 / 720×960')
    fx = effect_dirs()
    if fx:
        print('（不用问用户）动效库里剪辑时沉淀的新动效，按 id 当组件用：')
        for d in fx: m = jload(d / 'effect.json'); print(f"   {m['id']}  {m.get('name', '')}：{m.get('use', '')}")
    from dms_packs import discover_packs
    pk = discover_packs()
    if pk:
        print('（不用问用户）本机已安装的行业模板包：选题属于这个行业时，edit.json 写 "packs": ["包名"]（scaffold 加 --packs），分镜会优先匹配包里的模板：')
        for p in pk: print(f"   {p['id']}  {p['meta'].get('name', '')} v{p['meta'].get('version', '?')} · {p['meta'].get('industry', '')}{'' if p['ok'] else '  ✗ ' + p['why']}")

# =================================================================== lint
def cmd_lint(ns):
    E = jload(ns.edit); W, H = E['canvas']['w'], E['canvas']['h']; probs = []; warns = []
    base = Path(ns.edit).resolve().parent
    words = jload(base / E['words'])['words'] if E.get('words') and (base / E['words']).exists() else None
    E['_words'] = words
    # 口播母版必须存在：找不到时 build 会给一条静音人声轨，成片只剩音效、没有口播（2026-11-20《GPT-6.2》出过这事）
    if E.get('master') and not (base / E['master']).exists():
        probs.append(f"口播母版找不到：{E['master']}（相对 edit.json）——成片会没有口播声音。改成 asr 用的那个视频 / 音频文件")
    elif not E.get('master') and words:
        probs.append('有口播字幕（words）却没写 master：成片会没有口播声音。把 asr 用的那个视频 / 音频文件写进 "master"')
    sub = E.get('subtitles') or {}
    if sub.get('lang') == 'zh-en':   # 中英双语：每条字幕都要有英文
        cs = sub.get('cues')
        if cs is None and sub.get('cuesFile') and (base / sub['cuesFile']).exists(): cs = jload(base / sub['cuesFile'])
        miss = [c.get('t', '') for c in (cs or []) if not (c.get('en') or '').strip()]
        if not cs: probs.append('字幕选了中英双语（lang: zh-en），但没有现成的字幕条（cues / cuesFile）：先跑 subs，再给每条加英文 en')
        elif miss: probs.append(f'字幕选了中英双语，还有 {len(miss)} 条没写英文 en，如「{miss[0][:16]}」：逐条翻译后写进 cuesFile 的 en 字段')
    elif sub.get('lang') not in (None, 'zh', 'zh-en', 'none'):
        probs.append(f"subtitles.lang 只能是 zh / zh-en / none，现在是 {sub.get('lang')}")
    cv = E.get('cover') or {}   # v1.17 封面：模板 / 自定义 / 两种都出
    if cv and cv.get('enabled') is not False:
        md = cv.get('mode', 'template')
        if md not in ('template', 'custom', 'both'): probs.append(f'cover.mode 只能是 template / custom / both，现在是 {md}')
        if md in ('custom', 'both'):
            if not cv.get('custom'): probs.append('cover.mode 选了自定义，但 cover.custom 是空的：每一套写 {"name", "html", "photo", 文案…}（见 cover.md「自定义封面」）')
            for k, c in enumerate(cv.get('custom') or []):
                if not c.get('html') or not (base / c['html']).exists(): probs.append(f"cover.custom[{k}] 的 html 找不到：{c.get('html')}")
                if c.get('photo') and not (base / c['photo']).exists(): probs.append(f"cover.custom[{k}] 的人物图找不到：{c['photo']}")
        for st in cv.get('styles') or []:
            if st not in ('A', 'B', 'C'): probs.append(f'cover.styles 只能写 A / B / C，现在有 {st}')
    scenes = expand_all(E, dry=True)
    try:
        import dms_grab; probs += dms_grab.lint_media(ns.edit, E)   # 联网取来的视频片段：用户确认能用才放进片子
    except Exception as e: warns.append(f'素材来源检查没跑成：{e}')
    for s in scenes:
        for L in s.get('layers', []):
            resolve_cues(L, words, None, (s['t0'] - 1.0, s['t1'] + 0.5))
            if L.get('_cueMissing'): probs.append(f"{s.get('id')}/{L.get('c')}: 关键词“{L['_cueMissing']}”在口播里找不到")
    D = E.get('duration') or (scenes[-1]['t1'] if scenes else 0)
    last = 0
    for s in scenes:
        if s['t0'] - last > 0.05: probs.append(f"{s.get('id')}: 与上一段之间空了 {s['t0'] - last:.2f}s")
        last = s['t1']
        n_layers = len(s.get('layers', [])); dur = s['t1'] - s['t0']
        if n_layers / max(dur, 0.5) > 1.6: warns.append(f"{s.get('id')}: {dur:.1f}s 里放了 {n_layers} 个元素，偏密（建议每 1–2 秒一个）")
        for L in s.get('layers', []):
            at = L.get('at')
            if at is None: probs.append(f"{s.get('id')}/{L.get('c')}: 缺少 at（或 cue 没解析到）")
            elif at < s['t0'] - 0.6 or at > s['t1']: warns.append(f"{s.get('id')}/{L.get('c')}: at={at:.2f} 不在本段 {s['t0']:.2f}–{s['t1']:.2f} 内")
            b = L.get('box')
            if isinstance(b, list) and len(b) == 4 and L.get('c', '').startswith('bg-') is False:
                if b[1] + b[3] > 0.86 and b[1] < 0.95 and not L.get('allowSubs'): warns.append(f"{s.get('id')}/{L.get('c')}: 下沿到 {b[1] + b[3]:.2f}，可能压字幕区（>0.86）")
                if b[0] < 0.02 or b[0] + b[2] > 0.98: warns.append(f"{s.get('id')}/{L.get('c')}: 贴边，超出安全区")
            txt = json.dumps(L.get('props', {}), ensure_ascii=False) if L.get('c') in ('title', 'stamp', 'chips', 'number', 'compare', 'flow', 'checklist', 'tags', 'equation', 'chapter') else ''
            for m in re.findall(r'"(?:text|title|t)": "([^"]{24,})"', txt): warns.append(f"{s.get('id')}/{L.get('c')}: 文案偏长（{len(m)} 字）：{m[:20]}…，大字建议 ≤12 字")
            # 样板账号占位 @XXX1、@XXX2…（用户 2026-11-20 定）：用进片子时必须按口播语义换掉，成片里不能留 @XXX
            pr = L.get('props', {}) or {}
            def _strs(v):
                if isinstance(v, str): yield v
                elif isinstance(v, dict): yield from (x for k, w in v.items() if k != 'replace' for x in _strs(w))
                elif isinstance(v, list): yield from (x for w in v for x in _strs(w))
            rp = pr.get('replace') if isinstance(pr.get('replace'), list) else []
            left = [x for x in list(_strs(pr)) + [str(r[1]) for r in rp if isinstance(r, list) and len(r) > 1] if re.search(r'@XXX\d*', x)]
            if left: probs.append(f"{s.get('id')}/{L.get('c')}: 账号占位没换：{left[0][:24]}——按口播语义换成真实账号或合适称呼，不需要就换成空")
            if L.get('c') == 'dayan' and str(pr.get('id', '')) in PLACEHOLDER_CARDS and not any(isinstance(r, list) and str(r[0]).startswith('@XXX') for r in rp):
                warns.append(f"{s.get('id')}/dayan {pr.get('id')}: 这张原卡里有样板账号 @XXX1…，用 replace 按口播语义换掉（dms.py card {pr.get('id')} 看全部文字）")
    if D and abs(last - D) > 0.1: probs.append(f'分镜结束于 {last:.2f}s，片长 {D:.2f}s')
    keys = sorted([k for k in ((E.get('presenter') or {}).get('keys') or []) if 't' in k], key=lambda k: k['t'])
    for a, b in zip(keys, keys[1:]):
        if b['t'] - a['t'] < 0.8: warns.append(f"人物窗 {a['t']:.2f}→{b['t']:.2f} 变化太快（<0.8s），观众会晕")
    from dms_packs import get_pack
    for pid in E.get('packs') or []:
        p = get_pack(pid)
        if not p: probs.append(f'packs 里的行业包 {pid} 没有安装（dms.py pack install …）')
        elif not p['ok']: probs.append(f'行业包 {pid} {p["why"]}')
    for s in E.get('scenes', []):
        if s.get('template'):
            left = [k for k, v in (s.get('slots') or {}).items() if isinstance(v, str) and ('（填' in v or v.startswith('（'))]
            if left: probs.append(f"{s.get('id')}: 模板 {s['template']} 的槽位还是草稿占位：{', '.join(left)}（填成本期口播内容）")
            if s.get('draftTemplate'): warns.append(f"{s.get('id')}: 模板 {s['template']} 是分镜自动挑的（draftTemplate）：确认合适后删掉这个标记")
    print(('✓ 无硬错误' if not probs else '✗ 错误：\n  ' + '\n  '.join(probs)))
    # 文字墙标准（2026-11-07 定稿）：偏离默认值就提醒
    WALL_STD = {'layout': 'tight', 'blur': 5, 'k': 1.55, 'lh': 1.32, 'gap': 1.6, 'tilt': 0, 'mainStyle': None, 'mainOp': 0.2, 'subFade': 1.35}
    for s in E.get('scenes', []):
        bgs = s.get('bg') if isinstance(s.get('bg'), list) else ([s['bg']] if s.get('bg') else [])
        for b in bgs:
            if isinstance(b, dict) and b.get('c') == 'bg-wall':
                pr = b.get('props') or {}
                off = [f"{k}={pr[k]}" for k, v in WALL_STD.items() if k in pr and pr[k] != v]
                if off: warns.append(f"{s.get('id')}/bg-wall: {', '.join(off)} 偏离文字墙标准（整墙柔焦 5px、主标识粗黑实心灰、错位交叉），除非用户要求，删掉这些参数用默认")
        if s.get('depth'): warns.append(f"{s.get('id')}: 打开了前景局部柔焦 depth，文字墙标准是不加，除非用户要求")
    for s in scenes:   # 演示区：样式要跟着内容变
        for L in s.get('layers', []):
            if L.get('c') == 'demo-zone':
                bs = [b.get('c') for b in (L.get('props') or {}).get('beats') or []]
                if len(bs) >= 3 and len(set(bs)) == 1: warns.append(f"{s.get('id')}/demo-zone: {len(bs)} 拍全是 {bs[0]}，演示样式要跟着口播内容变（见 playbook 4.5）")
    br = E.get('brand')
    if not br: warns.append('edit.json 没写 brand：文字墙会用本机保存的品牌或中性占位字；新作品开工时要问用户品牌（dms.py kickoff 第 4 题）')
    elif br.get('_placeholder'): warns.append('品牌还是中性占位（MOTION · STUDIO）：确认用户是否真的不需要自己的品牌')
    # 人物侧移不要一直停着
    pk = sorted([k for k in ((E.get('presenter') or {}).get('keys') or []) if 't' in k], key=lambda k: k['t'])
    for i, k in enumerate(pk):
        if k.get('state') not in (None, 'full', 'side', 'card', 'story', 'circle', 'circle-big', 'pip', 'window', 'cutout', 'hidden'): probs.append(f"人物窗 {k['t']}s：不认识的状态 {k.get('state')}")
        if k.get('state') == 'side':
            end = pk[i + 1]['t'] if i + 1 < len(pk) else (E.get('duration') or 1e9)
            if end - k['t'] > 20: warns.append(f"人物窗 {k['t']}s 起侧移了 {end - k['t']:.0f}s：侧移是讲解时的临时状态，建议 ≤ 20s 后回到全屏或换圆窗")
    # 转场：类型要认识；morph 要有同名 share 层
    TRANS = {'cut', 'fade', 'push-left', 'push-right', 'push-up', 'zoom-in', 'zoom-out', 'whip', 'flash', 'line', 'iris', 'slide-up', 'wipe-diag', 'split', 'rect', 'blinds', 'text-mask', 'morph', 'page', 'page-back'}
    used = {}
    for i, s in enumerate(scenes):
        tr = s.get('transition') or {}
        ty = tr.get('type') if isinstance(tr, dict) else tr
        if not ty: continue
        used[ty] = used.get(ty, 0) + 1
        if ty not in TRANS: probs.append(f"{s.get('id')}: 不认识的转场 {ty}（可用：{' '.join(sorted(TRANS))}）")
        if ty == 'morph' and i > 0:
            a = {L.get('share') for L in scenes[i - 1].get('layers', []) if L.get('share')}
            b = {L.get('share') for L in s.get('layers', []) if L.get('share')}
            if not (a & b): warns.append(f"{s.get('id')}: morph 转场但和上一段没有同名 share 层，会退化成叠化")
    for ty in ('morph', 'text-mask'):
        if used.get(ty, 0) > max(2, len(scenes) // 5): warns.append(f"{ty} 用了 {used[ty]} 次，重点时刻才用，建议 ≤ {max(2, len(scenes) // 5)} 次")
    base_types = [k for k in used if k not in ('cut', 'line', 'iris', 'morph', 'text-mask', 'page-back')]   # 录屏闪切、结尾展开、承接、字幕镂空是功能性转场，不算
    if len(base_types) > 3: warns.append(f"常规转场用了 {len(base_types)} 种（{' '.join(base_types)}），建议 2–3 种为主")
    if warns: print('⚠ 建议：\n  ' + '\n  '.join(warns))
    sys.exit(1 if probs else 0)

# =================================================================== direct（导演检查：语义 ↔ 画面）
CN_NUM = {'零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
def cn2num(t):
    """三十 → 30，四五 → 4–5，一百二 → 120；认不出返回 None"""
    if re.fullmatch(r'[一二三四五六七八九]{2}', t) and t[0] != t[1]: return f'{CN_NUM[t[0]]}–{CN_NUM[t[1]]}'
    tot, cur, ok = 0, 0, False
    for ch in t:
        if ch in CN_NUM: cur = CN_NUM[ch]; ok = True
        elif ch in '十百千万':
            m = {'十': 10, '百': 100, '千': 1000, '万': 10000}[ch]
            if ch == '万': tot = (tot + cur) * m; cur = 0
            else: tot += (cur or 1) * m; cur = 0
            ok = True
        else: return None
    return str(tot + cur) if ok else None

TURN = r'^(但是|不过|可是|然后|接下来|另外|第二|其次|最后|所以|结果|现在我们|那么|其实|反而)'
TEXT_COMPS = ('title', 'stamp', 'chips', 'chapter', 'tags', 'strike', 'number', 'equation')
def _layer_texts(L):
    p = L.get('props') or {}; out = []
    for k in ('text', 'title', 'to', 'from', 'label', 'sub'):
        v = p.get(k)
        if isinstance(v, str): out.append(v)
        elif isinstance(v, list): out += [x for x in v if isinstance(x, str)]
    for it in p.get('items') or []:
        if isinstance(it, str): out.append(it)
        elif isinstance(it, dict): out += [str(it[k]) for k in ('t', 'title', 'label', 'body') if it.get(k)]
    return out
def _events(L):
    at = L.get('at') or 0; ev = [at]
    if L.get('out') is not None: ev.append(L['out'])
    def walk(o, base):
        if isinstance(o, dict):
            # 演示区里的一拍（有 c 和 at）：拍内元素的时间按这一拍的起点算
            inner = base + o['at'] if o.get('c') and isinstance(o.get('at'), (int, float)) else base
            for k, v in o.items():
                if isinstance(v, (int, float)) and not isinstance(v, bool) and (k == 'at' or k.endswith('At')): ev.append(base + v)
                elif k == 'props' and isinstance(v, dict): walk(v, inner)
                elif isinstance(v, (dict, list)): walk(v, base)
        elif isinstance(o, list):
            for x in o: walk(x, base)
    walk(L.get('props') or {}, at)
    return ev
DYNAMIC = ('window', 'media', 'type', 'chat', 'progress', 'number', 'dayan', 'nodes', 'flow')   # 自己在动的组件

def _look_sig(S, T):
    th = S.get('theme') or T.get('theme') or ''
    bgs = []
    for L in S.get('bg') or []:
        p = L.get('props') or {}
        c = L.get('c', '')   # 文字墙不同皮肤看起来仍是"文字墙"，只按背景种类归类；纯色 / 放射 / 纸张按颜色区分
        bgs.append(c + (':' + str(p.get('gradient') or p.get('color') or p.get('c1') or p.get('tone') or '') if c in ('bg-solid', 'bg-burst', 'bg-paper') else (':' + str(p.get('skin') or 'platinum') if c == 'bg-wall' else '')))
    return th + '|' + ','.join(bgs)

def style_monotony(T):
    out = []; scenes = T['scenes']; D = T['duration']
    if not scenes: return out
    sigs = [_look_sig(S, T) for S in scenes]
    i = 0
    while i < len(scenes):
        j = i
        while j + 1 < len(scenes) and sigs[j + 1] == sigs[i]: j += 1
        dur = scenes[j]['t1'] - scenes[i]['t0']
        if dur > 20 and j > i: out.append(f"{scenes[i]['id']}–{scenes[j]['id']} 连续 {dur:.0f}s 用同一个外观：换章节就换 look（a-blue / b-paper / d-neon / a-violet / b-film …），同一章节内再共用")
        i = j + 1
    kinds = len(set(sigs)); need = max(4, math.ceil(D / 60 * 2.5))
    if D > 40 and kinds < need: out.append(f"全片只用了 {kinds} 种背景：{D:.0f}s 的片子至少 {need} 种（每分钟 2–3 种）——色块（a-blue / a-violet / a-lime / a-red）、暗胶片 b-film、米白纸 b-paper、霓虹 d-neon、HUD d-hud，文字墙换皮肤 wall-gold / wall-jade / wall-acid / wall-chrome / wall-lacquer / wall-pop …（16 套），同一个话题内再共用")
    keys = [k for k in ((T.get('presenter') or {}).get('keys') or []) if k.get('state') != 'hidden']
    allk = (T.get('presenter') or {}).get('keys') or []
    for a, b in zip(allk, allk[1:] + [{'t': D}]):
        if a.get('state') in (None, 'hidden'): continue
        if b['t'] - a['t'] > 25: out.append(f"人物 {a['t']:.1f}s 起保持「{a.get('state')}{'·' + str(a.get('pos')) if a.get('pos') else ''}」{b['t'] - a['t']:.0f}s：每 10–20s 换一次形态（全屏 ↔ 方卡 ↔ 圆窗 ↔ 大圆），或推近一次")
    circ = [k.get('pos', 'br') for k in keys if k.get('state') == 'circle']
    if len(circ) >= 3 and len(set(circ)) == 1: out.append(f"圆窗出现 {len(circ)} 次都在 {circ[0]}：内容换了，圆窗跟着换角落（内容在左 → 去右下，内容在右 → 去左下）")
    states = {k.get('state') for k in keys}
    if D > 45 and keys and len(states) < 3: out.append(f"人物只用了 {len(states)} 种形态（{'、'.join(sorted(states))}）：至少用 3 种")
    return out

TEXT_ONLY = {'title', 'chips', 'glow-quote', 'stamp', 'strike', 'echo', 'tags', 'chapter', 'namecard', 'bubble', 'quote', 'equation', 'nav'}
def _vis_comps(L):
    c = L.get('c', '')
    if c == 'demo-zone': return [b.get('c', '') for b in (L.get('props') or {}).get('beats') or []]
    return [c]

def visual_monotony(T):
    """画面单调（用户 2026-11-13：除了文字没有别的动画 = 失败；几百种动效不用、一个自制动效套到底 = 千篇一律）"""
    from collections import Counter
    out = []; scenes = T['scenes']; n = len(scenes)
    if n < 4: return out
    per = []
    for S in scenes:
        comps = [x for L in S.get('layers', []) if not str(L.get('c', '')).startswith('bg-') for x in _vis_comps(L)]
        vis = [x for x in comps if x not in TEXT_ONLY]
        per.append((S, comps, vis))
        if S['t1'] - S['t0'] >= 3 and not vis:
            out.append(f"{S['id']} {S['t0']:.1f}–{S['t1']:.1f}s 只有文字（{'、'.join(sorted(set(comps))) or '空'}）：字幕已经在说了，画面要“证明”它——数字 → number / gauge，对比 → compare / bars / fx-before-after，步骤 → flow / checklist，工具 / 界面 → window / phone / 录屏放大，物件和比喻 → 现做一个动效；先 `dms.py catalog 关键词` 找现成的")
    cnt = Counter(x for _, _, vis in per for x in set(vis))
    for c, k in cnt.most_common():
        limit = 3 if c.startswith('fx-') else max(4, int(n * 0.35))
        if c in ('window', 'media'): limit = max(limit, int(n * 0.45))   # 真录屏 / 真截图可以多用
        if k > limit:
            out.append(f"「{c}」用在 {k}/{n} 段：同一个画面反复出现，片子会千篇一律。" + ('自己做的动效一条片子最多用 3 段，其余段落按语义换别的组件 / 动效库 / 原卡（`dms.py catalog`）' if c.startswith('fx-') else '同一个对象跨句承接可以共用，其余段落换别的组件'))
    need = max(5, round(n / 3))
    if len(cnt) < need:
        out.append(f"全片只用了 {len(cnt)} 种画面组件（{'、'.join(sorted(cnt)) or '无'}）：{n} 段至少 {need} 种。数字、对比、流程、清单、对话、界面、进度、节点、印章、贴纸、彩纸……按 references/catalog.md 的语义分组挑")
    D = T['duration']; total = sum(len(comps) for _, comps, _ in per)
    if D > 30 and total / (D / 60) < 15:
        out.append(f"全片 {total} 个动效 / {D / 60:.1f} 分钟 = 每分钟 {total / (D / 60):.0f} 个：至少每分钟 15–20 个（每段 2–4 层：主画面 + 强调 + 辅助，一两句话换一次画面）")
    for S, comps, vis in per:
        dur = S['t1'] - S['t0']
        swaps = sum(1 for L in S.get('layers', []) if L.get('out') is not None) + sum(max(0, len((L.get('props') or {}).get('beats') or []) - 1) for L in S.get('layers', []) if L.get('c') == 'demo-zone') + len([z for L in S.get('layers', []) for z in ((L.get('props') or {}).get('zoom') if isinstance((L.get('props') or {}).get('zoom'), list) else [])])
        if dur > 12 and swaps < int(dur // 8):
            out.append(f"{S['id']} {S['t0']:.1f}–{S['t1']:.1f}s 一段 {dur:.0f}s 画面没换过：一两句话（4–10 秒）就该换一次画面——拆成两段换背景 / 换主画面，或在段内用 out + 新元素翻页、demo-zone 换拍、窗口推近到新位置")
    textish = sum(1 for _, _, vis in per if not vis)
    if textish > n * 0.25: out.append(f"{textish}/{n} 段只有文字：超过 1/4 的段落画面只是把字幕换个字号再排一遍")
    return out


CONTENT_SKIP = {'bg-wall', 'bg-solid', 'bg-glow', 'bg-grid', 'bg-paper', 'bg-film', 'bg-hud', 'bg-burst', 'bg-thumbs', 'bg-watermark', 'bg-stars', 'subtitle', 'fx-conveyor',
    'fx-vignette', 'fx-light-leak', 'fx-film-grain', 'fx-color-grade', 'fx-scanlines', 'fx-play-sprite', 'fx-chapter-tag',
    'fx-bg-aurora', 'fx-bg-dotwave', 'fx-bg-tilt-words', 'fx-bg-spotlight', 'fx-bg-blueprint',
    'fx-glitch-hit', 'fx-zoom-burst', 'fx-shutter', 'fx-swipe-bands', 'fx-light-sweep'}
def layout_density(T):
    """版面太空 / 动效断档：每 0.25s 采样，人物不是全屏时，内容区被动效盒子覆盖多少；有没有超过 0.8s 的空档"""
    E = {'canvas': T['canvas'], 'presenter': T.get('presenter')}
    E_HAS_PRES[0] = T.get('presenter') is not None
    pr = T.get('presenter') or {}; cw, ch = T['canvas']['w'], T['canvas']['h']
    a = (pr.get('srcW') or 0) / (pr.get('srcH') or 1)
    E_PILLAR[0] = (ch * a / cw) if a and a / (cw / ch) < 0.75 else 0
    fc = pr.get('face')
    if isinstance(fc, list) and fc:
        import statistics as _st; fc = {k: _st.median(x[k] for x in fc) for k in ('cx', 'cy', 'h')}
    E_FACE[0] = fc if isinstance(fc, dict) else None
    empty, gaps = [], []
    for S in T.get('scenes', []):
        t0, t1 = S['t0'], S['t1']; run = None; low = None
        t = t0 + 0.6
        while t < t1 - 0.3:
            k = presenter_at(E, t); zk = zone_key(k)
            if zk in ('full', 'full-v') and not S.get('_graphic'): t += 0.25; run = None; low = None; continue
            z = zone_box(E, t, 'zone')
            vis = []
            for L in S.get('layers', []):
                if L.get('c') in CONTENT_SKIP or not isinstance(L.get('box'), list): continue
                a = L.get('at', t0); b = L.get('out', t1)
                if a <= t <= b: vis.append(L['box'])
            # 覆盖率：内容区 32×18 网格里被盒子盖住的格子比例
            cov = 0; GX, GY = 32, 18
            for i in range(GX):
                for j in range(GY):
                    px = z[0] + z[2] * (i + 0.5) / GX; py = z[1] + z[3] * (j + 0.5) / GY
                    if any(bx[0] <= px <= bx[0] + bx[2] and bx[1] <= py <= bx[1] + bx[3] for bx in vis): cov += 1
            cov /= GX * GY
            if not vis: run = run if run is not None else t
            else:
                if run is not None and t - run > 0.8: gaps.append(f"{run:.1f}–{t:.1f}s 人物不是全屏，画面里没有动效（{t - run:.1f}s）：上一个动效留到下一句再走，或补一个辅助动效")
                run = None
            if vis and cov < 0.42: low = low if low is not None else (t, cov)
            else:
                if low is not None and t - low[0] > 0.9: empty.append(f"{low[0]:.1f}–{t:.1f}s 内容区只用了约 {low[1] * 100:.0f}%：动效 box 改用 \"zone\" 撑满，或加一个辅助动效（zone-main + zone-aside）")
                low = None
            t += 0.25
        if run is not None and t1 - run > 0.8: gaps.append(f"{run:.1f}–{t1:.1f}s 人物不是全屏，画面里没有动效：上一个动效留到段尾，或补一个辅助动效")
        if low is not None and t1 - low[0] > 0.9: empty.append(f"{low[0]:.1f}–{t1:.1f}s 内容区只用了约 {low[1] * 100:.0f}%：动效 box 改用 \"zone\" 撑满，或加辅助动效")
    return empty, gaps

def cmd_direct(ns):
    """读已 build 的工程（timeline.json），按"导演"标准检查语义与画面的对应。只给建议，不改文件。"""
    import difflib
    P = Path(ns.project); T = jload(P / 'timeline.json')
    cues = [c for c in (T.get('subtitles') or {}).get('cues', []) if c.get('t')]
    norm = lambda x: re.sub(r'[\s，。！？、,.!?：:；;“”"\'（）()《》~…—\-]', '', x or '').lower()
    def say_between(a, b): return [c for c in cues if c['e'] > a and c['s'] < b]
    def char_time(c, i): n = max(1, len(norm(c['t']))); return c['s'] + (c['e'] - c['s']) * i / n
    def spoken_at(text, a, b):
        k = norm(text)
        for c in say_between(a, b):
            j = norm(c['t']).find(k)
            if j >= 0: return char_time(c, j)
        return None
    R = {'照抄字幕': [], '一段两件事': [], '画面静止': [], '口播有画面没有': [], '出现错位': [], '字幕可读性': [], '样式单一': [], '画面单调': [], '版面太空': [], '动效断档': [], '同一句话出现两次': []}
    port = T['canvas']['h'] > T['canvas']['w']; maxc = 12 if port else 16
    for c in cues:
        n = _vlen(norm(c['t'])); d = c['e'] - c['s']
        if n > maxc * 2: R['字幕可读性'].append(f"{c['s']:.1f}s「{c['t'][:14]}…」{n:.0f} 字，超过两行：拆成两条")
        elif d > 0 and n / d > 8.5 and n >= 6: R['字幕可读性'].append(f"{c['s']:.1f}s「{c['t'][:14]}」每秒 {n / d:.1f} 字，读不过来（≤ 8）：合并口癖或拆条")
        elif d < 0.5 and n >= 3: R['字幕可读性'].append(f"{c['s']:.1f}s「{c['t']}」只停留 {d:.2f}s：和相邻一条合并")
    scenes = T['scenes']; keys = (T.get('presenter') or {}).get('keys', [])
    for S in scenes:
        sid, t0, t1 = S.get('id'), S['t0'], S['t1']; layers = [L for L in S.get('layers', []) if not str(L.get('c', '')).startswith('bg-')]
        says = say_between(t0, t1)
        # 1 大字照抄字幕
        for L in layers:
            if L.get('c') not in TEXT_COMPS: continue
            for tx in _layer_texts(L):
                k = norm(tx)
                if len(k) < 9: continue
                for c in say_between((L.get('at') or t0) - 1.5, (L.get('at') or t0) + 3):
                    ck = norm(c['t'])
                    if difflib.SequenceMatcher(None, k, ck).ratio() > 0.78 or (k in ck and len(k) / max(1, len(ck)) > 0.7):
                        R['照抄字幕'].append(f"{sid}/{L['c']}「{tx[:16]}」≈ 字幕「{c['t'][:16]}」：大字只放 ≤12 字的结论/关键词，别把整句再排一遍"); break
        # 2 一段讲两件事：中途转折，后面 2.5 秒内画面没变化
        evs = sorted(e for L in layers for e in _events(L)) + [k['t'] for k in keys if t0 <= k['t'] <= t1]
        for c in says:
            if c['s'] < t0 + 3 or c['s'] > t1 - 3: continue
            m = re.match(TURN, norm(c['t']))
            if m and not any(c['s'] - 1.0 <= e <= c['s'] + 2.5 for e in evs):
                R['一段两件事'].append(f"{sid} {c['s']:.1f}s 说「{c['t'][:14]}」换了意思，画面没跟着变：从这里拆成新段，或在这句上加一个元素")
        # 3 画面静止
        live = [(L.get('at') or 0, L.get('out') if L.get('out') is not None else t1) for L in layers if L.get('c') in DYNAMIC or (L.get('props') or {}).get('kenburns') or L.get('float')]
        for L in layers:   # 演示区：自己在动的一拍（录屏/打字/进度/动效库动效等）从这一拍开始到下一拍
            if L.get('c') != 'demo-zone': continue
            bs = sorted([b for b in (L.get('props') or {}).get('beats') or [] if isinstance(b.get('at'), (int, float))], key=lambda b: b['at'])
            end = L.get('out') if L.get('out') is not None else t1
            for i, b in enumerate(bs):
                if b.get('c') in DYNAMIC or str(b.get('c', '')).startswith('fx-'):
                    live.append(((L.get('at') or 0) + b['at'], (L.get('at') or 0) + bs[i + 1]['at'] if i + 1 < len(bs) else end))
        pts = sorted({t0, t1, *[e for e in evs if t0 <= e <= t1]})
        for a, b in zip(pts, pts[1:]):
            if b - a <= 4.2: continue
            cov = sum(max(0, min(b, y) - max(a, x)) for x, y in live)
            if cov < (b - a) * 0.6:
                R['画面静止'].append(f"{sid} {a:.1f}–{b:.1f}s 有 {b - a:.1f}s 没有任何新元素/状态变化：在中间的关键词上加一个强调（印章、圈选、数字）或换人物窗状态")
        # 4 口播里的数字 / 高亮词，画面上没有（只看在本段开始说的句子）
        says = [c for c in says if t0 - 0.3 <= c['s'] < t1]
        shown = norm(' '.join(t for L in layers for t in _layer_texts(L)) + json.dumps([L.get('props') for L in layers], ensure_ascii=False))
        for c in says:
            for m in re.finditer(r'(?<![几上数好近])(\d+(?:\.\d+)?|[一二三四五六七八九十两百千万]{1,4})(?=\s*(%|万|亿|倍|分钟|秒|小时|天|个|条|步|块|元|年))', c['t']):
                raw = m.group(1); arab = raw if raw[0].isdigit() else cn2num(raw)
                if arab is None or raw in ('十', '百', '千', '万') or arab in ('1', '2') and not raw[0].isdigit(): continue
                if norm(raw) not in shown and norm(arab) not in shown and norm(arab.replace('–', '-')) not in shown:
                    R['口播有画面没有'].append(f"{sid} {c['s']:.1f}s 说了「{raw}{m.group(2)}」，画面没有这个数字：数字是最好上屏的信息，用 number（cue 落在数字那个字，lead -0.15）")
            for h in c.get('hl') or []:
                nums = [cn2num(x) or x for x in re.findall(r'[一二三四五六七八九十两百千万]{2,4}|[二三四五六七八九两](?=分钟|秒|小时|天|个|条|步|倍|件)|\d+', h)]
                if nums and all(norm(x) in shown or norm(x.replace('–', '-')) in shown for x in nums): continue
                if norm(h) and norm(h) not in shown:
                    R['口播有画面没有'].append(f"{sid} {c['s']:.1f}s 字幕高亮了「{h}」，画面没有呼应：要么上屏（印章/大字/圈选），要么取消字幕高亮")
        # 5 出现错位：元素文字在口播里说到的时间 vs 元素出现时间
        for L in layers:
            if L.get('c') not in TEXT_COMPS or L.get('at') is None: continue
            best = None
            for tx in _layer_texts(L):
                k = norm(tx)
                if not (2 <= len(k) <= 12): continue
                ts = spoken_at(tx, t0 - 1, t1 + 0.5)
                if ts is not None: best = ts if best is None else min(best, ts)
            if best is None: continue
            d = L['at'] - best
            if d > 0.9: R['出现错位'].append(f"{sid}/{L['c']} 晚了 {d:.1f}s：口播 {best:.1f}s 已经说到，元素 {L['at']:.1f}s 才出（改用 cue 对齐，lead -0.15）")
            elif d < -1.6: R['出现错位'].append(f"{sid}/{L['c']} 早了 {-d:.1f}s：元素 {L['at']:.1f}s 就出来，口播 {best:.1f}s 才说到（剧透；改用 cue）")
    # 7 样式单一（参考风格 A–D：换章节换底色；人物在全屏 / 方卡 / 圆窗 / 大圆之间切；圆窗每章换角；全屏段隔 8–15s 推近一次）
    R['样式单一'] += style_monotony(T)
    R['画面单调'] += visual_monotony(T)
    _e, _g = layout_density(T); R['版面太空'] += _e; R['动效断档'] += _g
    # 同一句话同时在画面上出现两次（例如大问句还没退场，顶上又出一行同样的小标题）：用户 2026-11-20 在成片里指出过
    for S in T.get('scenes', []):
        seen = []
        for L in S.get('layers', []):
            lp = L.get('props') or {}
            txt = norm(' '.join(str(lp.get(k, '')) for k in ('text', 'q') if lp.get(k)))
            if len(txt) < 3: continue
            a0 = L.get('at', S['t0']); b0 = L.get('out', S['t1'])
            for (t2, c2, a2, b2) in seen:
                if t2 == txt and min(b0, b2) - max(a0, a2) > 0.15:
                    R['同一句话出现两次'].append(f"{max(a0, a2):.1f}s {S.get('id')}：{c2} 和 {L.get('c')} 都写着「{txt[:14]}」：留一个，另一个先退场（out）或删掉")
            seen.append((txt, L.get('c'), a0, b0))
    # 可选写法（不计入建议、不拦渲染）：同一段里依次念出 3 个以上已经定好的品牌名，logo 一个个蹦出来前面会空一段 →
    # 可以改成「先占位、念到才亮」：所有 logo 在列举开头一起出现成虚线空位，各自写 litAt = 念到名字的时刻 - 图层 at（用户 2026-11-20 认可）
    tips = []
    for S in T.get('scenes', []):
        lg = [L for L in S.get('layers', []) if L.get('c') == 'logo' and isinstance(L.get('at'), (int, float))]
        if len(lg) >= 3 and not any((L.get('props') or {}).get('litAt') is not None for L in lg):
            ats = sorted(L['at'] for L in lg)
            if ats[-1] - ats[0] >= 1.2:
                tips.append(f"{ats[0]:.1f}–{ats[-1]:.1f}s {S.get('id')}：{len(lg)} 个 logo 依次出现，前面会空着——下文已经定好时，可以让它们在 {ats[0]:.1f}s 一起出现成虚线空位，各自写 litAt（念到名字的时刻 − 图层 at），念到哪个亮哪个")
    n = sum(len(v) for v in R.values())
    print(f"导演检查 · {T.get('title', '')} · {len(scenes)} 段 · {T['duration']:.1f}s")
    for k, v in R.items():
        print(f"\n【{k}】{'✓ 无' if not v else f'{len(v)} 处'}")
        for x in v: print('  · ' + x)
    print(f"\n合计 {n} 处建议" + ('' if n else '：语义与画面对应良好'))
    if tips:
        print('\n【可选写法】（不算建议，按需采用）')
        for x in tips: print('  · ' + x)
    jsave(P / 'direct.json', R)
    return R

# =================================================================== build
def resolve_cues(obj, words, base_at=None, window=None):
    """把 {"cue":"关键词","lead":-0.15,"nth":1} 解析为时间。层级：at=绝对；嵌套 items 内 at=相对层 at"""
    if isinstance(obj, list):
        for x in obj: resolve_cues(x, words, base_at, window)
        return
    if not isinstance(obj, dict): return
    if 'cue' in obj and not obj['cue']: obj.pop('cue')          # 模板里没填的 cue 槽位：用自然时间
    if 'cue' in obj and words is not None:
        a, b = window or (None, None)
        ts = find_word_times(words, obj['cue'], after=(obj.get('after', a)), before=b)
        if not ts: ts = find_word_times(words, obj['cue'])
        if ts:
            t = ts[min(len(ts) - 1, max(0, int(obj.get('nth', 1)) - 1))] + float(obj.get('lead', -0.12))
            obj['at'] = round(t if base_at is None else t - base_at, 3); obj['_cueT'] = ts[0]
        else:
            obj.setdefault('_cueMissing', obj['cue'])
    for k, v in list(obj.items()):
        if base_at is not None and k != 'props' and isinstance(v, list):   # props 里更深的列表（cards[].items[]）同样按层 at 计相对时间
            resolve_cues(v, words, base_at, window); continue
        if k in ('props',) and isinstance(v, dict):
            inner_base = obj.get('at') if base_at is None else base_at
            if base_at is not None and obj.get('c') and isinstance(obj.get('at'), (int, float)): inner_base = base_at + obj['at']   # 演示区里的一拍：拍内的 cue 按这一拍的时间算
            for kk, vv in v.items():
                if isinstance(vv, (list, dict)): resolve_cues(vv, words, inner_base, window)
                if isinstance(vv, dict) and 'cue' in vv and kk.endswith('At') is False: pass
            for kk in list(v.keys()):
                if kk.endswith('Cue') and isinstance(v[kk], str):  # 如 winnerCue:"Claude" → winnerAt
                    ts = find_word_times(words or [], v[kk], after=window[0] if window else None)
                    if ts: v[kk[:-3] + 'At'] = round(ts[0] - 0.1 - (inner_base or 0), 3)

# 章节外观预设（从参考风格 A–D 迁移）：scene.look 一键换"主题 + 背景"，同一章节共用一个 look，换章节换 look
LOOKS = {
    'c-wall':   ('film-warm',   'C 品牌文字墙（深灰墙慢移，最"家常"的底）', lambda T: [{'c': 'bg-wall', 'props': {'skin': 'platinum'}}]),
    'c-wall-gold': ('film-warm', 'C 品牌文字墙 · 金', lambda T: [{'c': 'bg-wall', 'props': {'skin': 'gold'}}]),
    'a-blue':   ('comic-pop',   'A 纯蓝色块（讲解段、SHOW TIME）', lambda T: [{'c': 'bg-solid', 'props': {'gradient': 'radial-gradient(120% 90% at 30% 15%, #5584FF 0%, #2F6BFF 45%, #1A44C8 100%)'}}, {'c': 'bg-watermark', 'props': {'text': T, 'op': 0.10}}]),
    'a-violet': ('violet-dream','A 紫色过渡页（章节之间、锚点页）', lambda T: [{'c': 'bg-solid', 'props': {'gradient': 'radial-gradient(110% 90% at 70% 15%, #7446FF 0%, #3A1C9E 55%, #220E70 100%)'}}, {'c': 'bg-glow'}]),
    'a-red':    ('pop-red',     'A 红色放射（喊话、CTA、情绪高点）', lambda T: [{'c': 'bg-burst', 'props': {'c1': '#E2343E', 'c2': '#F25A52', 'rays': 20}}]),
    'a-lime':   ('block-lime',  'A 荧光绿色块 + 巨字（节奏 / 数量 / 反差）', lambda T: [{'c': 'bg-solid', 'props': {'color': '#C8FF3D'}}, {'c': 'bg-watermark', 'props': {'text': T, 'op': 0.07}}]),
    'a-thumbs': ('dark-tech',   'A 倾斜作品墙（证据蒙太奇、成果展示）', lambda T: [{'c': 'bg-thumbs', 'props': {'dim': 0.55}}]),
    'b-film':   ('film-warm',   'B 暗胶片（情绪 / 产品 / 态度句）', lambda T: [{'c': 'bg-solid', 'props': {'gradient': 'radial-gradient(100% 80% at 50% 25%, #231A14 0%, #0B0907 100%)'}}, {'c': 'bg-glow', 'props': {'colors': ['#FF7A1A55', '#FF3D6E33', '#FFC24B33']}}, {'c': 'bg-film'}]),
    'b-paper':  ('paper-swiss', 'B 米白纸（理性 / 叙述 / 总结）', lambda T: [{'c': 'bg-paper', 'props': {'tone': 'cream', 'dots': True}}]),
    'd-neon':   ('neon-violet', 'D 霓虹紫 + 斜体章节水印（术语、概念）', lambda T: [{'c': 'bg-solid', 'props': {'gradient': 'radial-gradient(120% 90% at 50% 0%, #2E1660 0%, #0E0820 70%)'}}, {'c': 'bg-watermark', 'props': {'text': T, 'op': 0.16}}, {'c': 'bg-glow', 'props': {'colors': ['#B47CFF66', '#FF4FD844', '#4DE3FF33']}}]),
    'd-hud':    ('hud-blue',    'D HUD 暗蓝（数据、系统、执行中）', lambda T: [{'c': 'bg-solid', 'props': {'gradient': 'radial-gradient(110% 90% at 50% 20%, #0F2A8A 0%, #061247 75%)'}}, {'c': 'bg-grid', 'props': {'color': '#33D1FF'}}, {'c': 'bg-hud'}]),
}


# ---------------- v1.12 内容区：按人物站位自动划出"动效该放哪、该多大" ----------------
# 动效的 box 可以写成 "zone" / "zone-top" / "zone-bottom" / "zone-left" / "zone-right" / "zone-main" / "zone-aside"，
# 构建时按该时刻人物的状态和位置（以及画幅）换算成真实坐标，保证动效撑满人物以外的版面，避开字幕区。
ZONES = {
    'wide': {      # 16:9
        'full': [0.05, 0.1, 0.5, 0.68], 'side-r': [0.045, 0.1, 0.5, 0.7], 'side-l': [0.455, 0.1, 0.5, 0.7],
        'card-r': [0.045, 0.08, 0.6, 0.74], 'card-l': [0.355, 0.08, 0.6, 0.74], 'story-r': [0.045, 0.08, 0.54, 0.74], 'story-l': [0.415, 0.08, 0.54, 0.74],
        'corner-r': [0.05, 0.08, 0.68, 0.74], 'corner-l': [0.27, 0.08, 0.68, 0.74], 'cutout-l': [0.25, 0.08, 0.71, 0.74], 'cutout-r': [0.04, 0.08, 0.71, 0.74],
        'window-l': [0.53, 0.1, 0.43, 0.7], 'window-r': [0.04, 0.1, 0.43, 0.7], 'big-c': [0.05, 0.08, 0.9, 0.12], 'none': [0.06, 0.08, 0.88, 0.74]},
    'narrow': {    # 4:3：内容区更窄更高
        'full': [0.05, 0.1, 0.56, 0.7], 'side-r': [0.04, 0.1, 0.56, 0.72], 'side-l': [0.4, 0.1, 0.56, 0.72],
        'card-r': [0.04, 0.08, 0.56, 0.76], 'card-l': [0.4, 0.08, 0.56, 0.76], 'story-r': [0.04, 0.08, 0.5, 0.76], 'story-l': [0.46, 0.08, 0.5, 0.76],
        'corner-r': [0.05, 0.08, 0.64, 0.76], 'corner-l': [0.31, 0.08, 0.64, 0.76], 'cutout-l': [0.3, 0.08, 0.66, 0.76], 'cutout-r': [0.04, 0.08, 0.66, 0.76],
        'window-l': [0.05, 0.62, 0.9, 0.2], 'window-r': [0.05, 0.62, 0.9, 0.2], 'big-c': [0.05, 0.08, 0.9, 0.12], 'none': [0.06, 0.08, 0.88, 0.76]},
    'portrait': {  # 9:16：人物多在上方，内容在中下部（字幕在 0.78 以下）
        'full': [0.06, 0.46, 0.88, 0.3], 'side-r': [0.05, 0.4, 0.9, 0.37], 'side-l': [0.05, 0.4, 0.9, 0.37],
        'card-r': [0.05, 0.47, 0.9, 0.3], 'card-l': [0.05, 0.47, 0.9, 0.3], 'story-r': [0.05, 0.6, 0.9, 0.18], 'story-l': [0.05, 0.6, 0.9, 0.18],
        'corner-r': [0.05, 0.1, 0.9, 0.44], 'corner-l': [0.05, 0.1, 0.9, 0.44], 'cutout-l': [0.05, 0.1, 0.9, 0.48], 'cutout-r': [0.05, 0.1, 0.9, 0.48],
        'window-l': [0.05, 0.47, 0.9, 0.3], 'window-r': [0.05, 0.47, 0.9, 0.3], 'big-c': [0.05, 0.06, 0.9, 0.08], 'none': [0.06, 0.12, 0.88, 0.64]},
}
def _aspect_kind(w, h): return 'portrait' if h > w else ('narrow' if w / h < 1.5 else 'wide')
def presenter_at(E, t):
    keys = sorted(((E.get('presenter') or {}).get('keys') or [{'t': 0, 'state': 'full'}]), key=lambda k: k['t'])
    cur = keys[0]
    for k in keys:
        if k['t'] <= t + 1e-6: cur = k
    return cur
def zone_key(k):
    st = k.get('state', 'full'); pos = k.get('pos') or ''
    pos = pos if isinstance(pos, str) else ('r' if pos[0] > 0.5 else 'l')
    right = 'l' not in pos
    if st == 'hidden' or not E_HAS_PRES[0]: return 'none'
    if st == 'full': return 'full-v' if E_PILLAR[0] else 'full'
    if st in ('side', 'card', 'story'): return f"{st}-{'r' if right else 'l'}"
    if st in ('circle', 'pip'): return 'corner-r' if right else 'corner-l'
    if st == 'cutout': return 'cutout-r' if pos in ('br', 'r') else 'cutout-l'
    if st == 'window': return 'window-r' if pos == 'r' else 'window-l'
    if st == 'circle-big': return 'big-c'
    return 'none'
E_HAS_PRES = [True]
E_PILLAR = [0]   # 人物全屏且原片比画布窄很多（竖拍放横屏，左右留边）时 = 人物那一竖条占画布宽度的比例
E_FACE = [None]  # 人物全屏时脸的位置 {cx, cy, h}（原片坐标比例）：内容区避开脸

def _full_zone_by_face(cw, ch):
    """横屏、人物全屏：内容区放在脸的一侧（默认左侧），右边界停在脸左边留一点空；脸偏左就放右侧"""
    f = E_FACE[0]
    if not f or ch > cw or f.get('cx') is None: return None
    cx, fh = float(f['cx']), float(f.get('h') or 0.3)
    fw = fh * 0.8 * ch / cw            # 脸宽（画布宽度比例），按全屏铺满估算
    x1 = cx - fw / 2 - 0.05            # 左侧内容区的右边界
    if x1 >= 0.3: return [0.04, 0.1, min(0.52, x1 - 0.04), 0.68]
    x0 = cx + fw / 2 + 0.05
    if x0 <= 0.7: return [x0, 0.1, min(0.52, 0.96 - x0), 0.68]
    return [0.04, 0.1, 0.26, 0.68]
def zone_box(E, t, name):
    cw, ch = E['canvas']['w'], E['canvas']['h']
    k = presenter_at(E, t); zk = zone_key(k)
    if zk == 'full-v':   # 竖拍放在横屏中间：内容放在人物左侧那一条（不压脸）
        pw = E_PILLAR[0]; z = [0.03, 0.1, max(0.2, 0.5 - pw / 2 - 0.05), 0.68]
    elif zk == 'full' and _full_zone_by_face(cw, ch): z = _full_zone_by_face(cw, ch)
    else: z = ZONES[_aspect_kind(cw, ch)][zk]
    x, y, w, h = z; port = ch > cw; g = 0.025
    sub = name.split('-', 1)[1] if '-' in name else ''
    if sub == 'top': return [x, y, w, h * 0.56 - g / 2]
    if sub == 'bottom': return [x, y + h * 0.56 + g / 2, w, h * 0.44 - g / 2]
    if sub == 'left': return [x, y, w / 2 - g / 2, h] if not port else [x, y, w, h / 2 - g / 2]
    if sub == 'right': return [x + w / 2 + g / 2, y, w / 2 - g / 2, h] if not port else [x, y + h / 2 + g / 2, w, h / 2 - g / 2]
    if sub == 'main': return [x, y, w * 0.64 - g / 2, h] if not port else [x, y, w, h * 0.66 - g / 2]
    if sub == 'aside': return [x + w * 0.64 + g / 2, y, w * 0.36 - g / 2, h] if not port else [x, y + h * 0.66 + g / 2, w, h * 0.34 - g / 2]
    return [x, y, w, h]
def resolve_zones(E, scenes):
    E_HAS_PRES[0] = E.get('presenter') is not None
    E_FACE[0] = E.get('_face') if isinstance(E.get('_face'), dict) else None
    a = E.get('_srcAspect'); cw, ch = E['canvas']['w'], E['canvas']['h']
    E_PILLAR[0] = (ch * a / cw) if a and a / (cw / ch) < 0.75 else 0
    for S in scenes:
        for L in S.get('layers', []):
            b = L.get('box')
            if isinstance(b, str) and b.startswith('zone'):
                t = L.get('at', S.get('t0', 0)); t = t if t >= S.get('t0', 0) - 1e-6 else S.get('t0', 0) + t
                L['box'] = [round(v, 4) for v in zone_box(E, t + 0.01, b)]; L['_zone'] = b; L['_zt'] = t
        # 动效接力：同一个内容区里后一个动效出现时，前一个才退场（不提前消失，也不和后一个叠在一起）
        byz = {}
        for L in S.get('layers', []):
            if L.get('_zone'): byz.setdefault(L['_zone'], []).append(L)
        for name, Ls in byz.items():
            Ls.sort(key=lambda x: x['_zt'])
            for A, B in zip(Ls, Ls[1:]):
                if 'out' not in A: A['out'] = round(B['_zt'] + 0.15, 3); A.setdefault('exit', 'fade'); A.setdefault('exitDur', 0.35)
            # 整块内容区换内容时，半区里的旧动效也让位
        whole = [L for L in S.get('layers', []) if L.get('_zone') == 'zone']
        for W_ in whole:
            for L in S.get('layers', []):
                if L.get('_zone', '').startswith('zone-') and L['_zt'] < W_['_zt'] and 'out' not in L:
                    L['out'] = round(W_['_zt'] + 0.15, 3); L.setdefault('exit', 'fade'); L.setdefault('exitDur', 0.35)
    return scenes

WALL_SKINS = ['pop', 'gold', 'acid', 'song', 'chrome', 'lime', 'obsidian', 'platinum', 'abyss', 'hollow', 'satin', 'lacquer', 'frost', 'porcelain', 'jade', 'mist']
def apply_look(s, E):
    lk = s.get('look')
    if not lk: return s
    name, text = (lk, None) if isinstance(lk, str) else (lk.get('name'), lk.get('text'))
    if isinstance(name, str) and name.startswith('wall-') and name[5:] in WALL_SKINS:   # 文字墙换皮肤：wall-gold / wall-jade / wall-acid …（16 套），{"name": "wall-lime", "light": true} 用亮底原貌
        light = isinstance(lk, dict) and lk.get('light')
        s.setdefault('theme', 'paper-swiss' if light else 'film-warm')
        if not s.get('bg'): s['bg'] = [{'c': 'bg-wall', 'props': dict({'skin': name[5:]}, **({'light': True} if light else {}))}]
        return s
    if name not in LOOKS: return s
    theme, _, bgf = LOOKS[name]
    T = text or s.get('lookText') or ((E.get('brand') or {}).get('wall') or ['MOTION'])[0]
    s.setdefault('theme', theme)
    if not s.get('bg'): s['bg'] = bgf(T)
    return s

def expand_all(E, dry=False):
    out = []
    for s in E.get('scenes', []):
        if 'template' in s: out.extend(apply_look(x, E) for x in expand_template(s, E))
        else: out.append(apply_look(json.loads(json.dumps(s)), E))
    return resolve_zones(E, out)

def cmd_build(ns):
    ep = Path(ns.edit).resolve(); E = jload(ep); base = ep.parent
    P = Path(ns.project).resolve(); P.mkdir(parents=True, exist_ok=True)
    W, H, FPS = E['canvas']['w'], E['canvas']['h'], E['canvas'].get('fps', 60)
    # 1 引擎
    if (P / 'engine').exists(): shutil.rmtree(P / 'engine')
    shutil.copytree(ROOT / 'engine', P / 'engine')
    lib = ROOT / 'assets' / 'dayan-library.html'
    if lib.exists() and (not (P / 'assets' / 'dayan-library.html').exists() or (P / 'assets' / 'dayan-library.html').stat().st_size != lib.stat().st_size or (P / 'assets' / 'dayan-library.html').stat().st_mtime < lib.stat().st_mtime):   # 技能里的原卡库更新过就重新拷
        (P / 'assets').mkdir(exist_ok=True); shutil.copy(lib, P / 'assets' / 'dayan-library.html')
    words = None
    if E.get('words') and (base / E['words']).exists(): words = jload(base / E['words'])['words']
    if E.get('presenter') is not None: E['presenter'].setdefault('keys', [{'t': 0, 'state': 'full'}])
    E['_words'] = words
    try:
        mp = (base / E['master']).resolve() if E.get('master') else None
        if mp and mp.exists():
            _i = probe(mp); E['_srcAspect'] = _i['w'] / _i['h']
            # 脸的位置提前算好（有缓存）：人物全屏时内容区要避开脸
            fc = (E.get('presenter') or {}).get('face', 'auto') if E.get('presenter') is not None else None
            if isinstance(fc, dict): E['_face'] = fc
            elif fc in ('auto', None) and E.get('presenter') is not None:
                fj = P / 'face.json'; pf0 = min(_i['fps'], FPS, float((E.get('presenter') or {}).get('fps') or 999)); st0 = f"{sha(mp)}-{pf0:.3f}"
                if not fj.exists() or jload(fj).get('_src') != st0:
                    fd = face_track(mp, fj); fd['_src'] = st0; jsave(fj, fd)
                E['_face'] = jload(fj).get('median')
    except Exception as e: log('（提前读取原片信息失败，内容区按默认排：', e, '）')
    scenes = expand_all(E)   # 先展开模板（模板可能追加人物关键帧与镜头）
    # 2 母版 → 人物帧 + 人声
    master = (base / E['master']).resolve() if E.get('master') else None
    if master and not master.exists(): raise SystemExit(f'✗ 口播母版找不到：{master}——成片会没有口播声音。改 edit.json 的 "master"')
    D = float(E.get('duration') or 0)
    pres = None
    if master and master.exists():
        info = probe(master); D = D or info['duration']
        pfps = min(info['fps'], FPS, float((E.get('presenter') or {}).get('fps') or 999))
        stamp = f"{sha(master)}-{pfps:.3f}"
        if (P / 'talk' / '.stamp').exists() and (P / 'talk' / '.stamp').read_text() == stamp: log('人物帧已是最新，跳过抽帧')
        else:
            if (P / 'talk').exists(): shutil.rmtree(P / 'talk')
            (P / 'talk').mkdir()
            sc = 'scale=-2:min(ih\\,1440)' if info['h'] >= info['w'] else 'scale=min(iw\\,1920):-2'
            log(f'抽取人物帧 {pfps:.2f}fps …'); run([FF, '-v', 'error', '-y', '-i', str(master), '-vf', f'fps={pfps:.4f},{sc}', '-q:v', '3', str(P / 'talk' / '%06d.jpg')])
            (P / 'talk' / '.stamp').write_text(stamp)
        if info['audio']: run([FF, '-v', 'error', '-y', '-i', str(master), '-vn', '-ac', '2', '-ar', '48000', str(P / 'voice.wav')])
        nfr = len(list((P / 'talk').glob('*.jpg')))
        from PIL import Image
        fw, fh = Image.open(P / 'talk' / '000001.jpg').size
        pc = dict(E.get('presenter') or {})
        face = pc.get('face', 'auto')
        if face == 'auto' or face is None:
            fj = P / 'face.json'
            if not fj.exists() or jload(fj).get('_src') != stamp:
                fd = face_track(master, fj); fd['_src'] = stamp; jsave(fj, fd)
            fd = jload(fj); face = fd['track'] or fd['median']
        pres = {'frames': 'talk/%06d.jpg', 'fps': pfps, 'frameCount': nfr, 'srcW': fw, 'srcH': fh, 'face': face, 'keys': pc.get('keys', [{'t': 0, 'state': 'full'}]),
                'windowTitle': pc.get('windowTitle', (brand_of(E, Path(ns.edit).resolve().parent).get('name') + ' · 口播') if brand_of(E, Path(ns.edit).resolve().parent).get('name') else '口播'), 'fullFit': pc.get('fullFit'), 'scrimColor': pc.get('scrimColor')}
        need_matte = pc.get('matte') or pc.get('personFront') or any(k.get('state') in ('cutout',) for k in pc.get('keys', [])) \
            or any(sc.get('personFront') for sc in E.get('scenes', []))   # 用到抠像站位 / 人物在前就自动抠像
        if need_matte:
            md = P / 'matte'
            if not md.exists() or not any(md.glob('*.png')):
                try:
                    import dms_matte; dms_matte.matte_frames(P / 'talk', md); pres['matte'] = 'matte/%06d.png'; pres['personFront'] = bool(pc.get('personFront'))
                except Exception as e: log('抠像不可用，跳过：', e)
            else: pres['matte'] = 'matte/%06d.png'; pres['personFront'] = bool(pc.get('personFront'))
    if not D: D = max((s.get('t1', 0) for s in E.get('scenes', [])), default=10)
    # 3 B-roll 素材 → 帧序列
    media = {}
    for mid, m in (E.get('media') or {}).items():
        src = (base / m['src']).resolve()
        if not src.exists(): die(f'素材不存在：{src}')
        if src.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'):
            (P / 'media').mkdir(exist_ok=True); dst = P / 'media' / f'{mid}{src.suffix.lower()}'; shutil.copy(src, dst); media[mid] = {'src': f'media/{dst.name}'}
        else:
            d = P / 'media' / mid; fps = float(m.get('fps', 30)); stamp = f"{sha(src)}-{m.get('from', 0)}-{m.get('to', '')}-{fps}-{m.get('crop', '')}"
            if not (d / '.stamp').exists() or (d / '.stamp').read_text() != stamp:
                if d.exists(): shutil.rmtree(d)
                d.mkdir(parents=True)
                vf = [f'fps={fps}']
                if m.get('crop'): cx = m['crop']; vf.append(f"crop=iw*{cx[2]}:ih*{cx[3]}:iw*{cx[0]}:ih*{cx[1]}")
                vf.append('scale=min(iw\\,1600):-2')
                cmd = [FF, '-v', 'error', '-y']
                if m.get('from') is not None: cmd += ['-ss', str(m['from'])]
                if m.get('to') is not None: cmd += ['-to', str(m['to'])]
                run(cmd + ['-i', str(src), '-vf', ','.join(vf), '-q:v', '3', str(d / '%05d.jpg')]); (d / '.stamp').write_text(stamp)
            media[mid] = {'seq': {'path': f'media/{mid}/%05d.jpg', 'fps': fps, 'count': len(list(d.glob('*.jpg')))}, 'clock': m.get('clock'), 'from': float(m.get('from') or 0)}
    # 4 场景：关键词对齐 → 媒体引用
    extra_js, extra_css = [], []
    asset_src = {}
    for s in scenes:
        for key, lst in (('_assets_js', extra_js), ('_assets_css', extra_css)):
            for f in s.pop(key, []):
                if isinstance(f, dict): asset_src[f['rel']] = f['src']; f = f['rel']
                lst.append(f)
    missing = []
    for s in scenes:
        win = (s['t0'] - 1.0, s['t1'] + 0.5)
        for L in s.get('layers', []) + [b for b in (s.get('bg') or []) if isinstance(b, dict)]:
            resolve_cues(L, words, None, win)
            if L.get('_cueMissing'): missing.append(f"{s.get('id')}: “{L['_cueMissing']}”")
            if 'at' not in L and L.get('c', '').startswith('bg-') is False: L['at'] = s['t0'] + 0.25
        def subst(o, L=None):
            if isinstance(o, dict):
                for k, v in list(o.items()):
                    if isinstance(v, str) and v.startswith('@') and v[1:] in media:
                        m = media[v[1:]]; o.pop(k)
                        if 'seq' in m:
                            q = dict(m['seq'])
                            # clock=master：素材与母版同一时钟（如母版后半段本身就是录屏），帧号 = 全片时间
                            if m.get('clock') == 'master' and L is not None: q['offset'] = round(float(L.get('at', 0)) - m['from'], 3)
                            o['seq'] = q
                        else: o['src' if k in ('src', 'media') else ('image' if k == 'image' else k)] = m['src']
                    else: subst(v, L)
            elif isinstance(o, list):
                for x in o: subst(x, L)
        for L in s.get('layers', []) + [b for b in (s.get('bg') or []) if isinstance(b, dict)]: subst(L, L)
    if missing: log('⚠ 这些关键词没在口播里找到（已用段首时间代替）：' + '；'.join(missing))
    # 5 人物关键帧也支持 cue
    if pres:
        for k in pres['keys']:
            if isinstance(k, dict) and 'cue' in k and words:
                ts = find_word_times(words, k['cue']);
                if ts: k['t'] = round(ts[0] + float(k.get('lead', -0.2)), 3)
        pres['keys'] = sorted(pres['keys'], key=lambda k: k['t'])
    # 6 字幕
    sub = dict(E.get('subtitles') or {})
    cues = sub.get('cues')
    if cues is None and sub.get('cuesFile') and (base / sub['cuesFile']).exists(): cues = jload(base / sub['cuesFile'])
    if cues is None and words: cues = words_to_cues(words, max_chars=int(sub.get('maxChars', 16 if W >= H else 12)))
    hl = sub.get('highlight') or []
    for c in cues or []:
        c.setdefault('hl', [h for h in hl if h in c['t']])
    for fix in sub.get('replace', []):
        for c in cues or []: c['t'] = c['t'].replace(fix[0], fix[1])
    burn = sub.get('burn', 'ass')
    # 字幕语言（用户 2026-11-20 定，开工必问）：zh 纯中文（默认）/ zh-en 中英双语（中文在上、英文在下，英文写在每条 cue 的 en）/ none 不要字幕
    lang = sub.get('lang', 'zh')
    if lang == 'none': sub['enabled'] = False
    for f in ('subtitles.srt', 'subtitles.ass'):
        if lang == 'none' and (P / f).exists(): (P / f).unlink()
    tl_sub = {'style': sub.get('style', 'clean'), 'cues': cues or [], 'hide': sub.get('hide', []), 'enabled': sub.get('enabled', True) and bool(cues), 'size': sub.get('size'), 'lang': lang}
    if burn == 'ass': tl_sub['previewOnly'] = True
    if cues and lang != 'none': write_srt(cues, P / 'subtitles.srt', lang == 'zh-en'); write_ass(cues, P / 'subtitles.ass', W, H, sub, words)
    TL = {'version': VERSION, 'title': E.get('title', ''), 'canvas': {'w': W, 'h': H, 'fps': FPS}, 'duration': round(D, 3), 'theme': E.get('theme', 'dark-tech'),
          'brand': brand_of(E, Path(ns.edit).resolve().parent), 'signature': E.get('signature', {'enabled': False, 'name': brand_of(E, Path(ns.edit).resolve().parent).get('name', '')}), 'presenter': pres, 'subtitles': tl_sub, 'scenes': scenes, 'camera': E.get('camera', []),
          'sfx': E.get('sfx', []), 'globals': E.get('globals', []), 'previewAudio': 'mix.wav', 'dayanLibrary': 'assets/dayan-library.html'}
    E.pop('_words', None)
    for k in ('motionBlur', 'lift', 'sheen', 'depth'):
        if k in E: TL[k] = E[k]
    # 动效变体：图层写 "preset": "<变体名>"，取 effect.json 里 presets 的参数打底，图层自己的 props 覆盖（相似需求做成变体，不另建新动效）
    fx_meta = {}
    for d in effect_dirs(active_packs(E, scenes)):
        try: fx_meta[d.name] = json.loads((d / 'effect.json').read_text(encoding='utf-8'))
        except Exception: pass
    used = []
    for S in scenes:
        for L in (S.get('layers') or []) + [b for b in (S.get('bg') or []) if isinstance(b, dict)]:
            c = L.get('c'); used.append(c if c != 'dayan' else 'dayan:' + str((L.get('props') or {}).get('id', '')))
            pn = L.get('preset')
            if pn and c in fx_meta:
                pr = (fx_meta[c].get('presets') or {}).get(pn)
                if not isinstance(pr, dict): log(f'⚠ {S.get("id")} 的 {c} 没有变体 {pn}（有：{"、".join(fx_meta[c].get("presets") or {}) or "无"}）'); continue
                L['props'] = {**(pr.get('props') or {}), **(L.get('props') or {})}
    used += [g.get('c') for g in E.get('globals', []) if isinstance(g, dict)]
    try:
        import dms_catalog; dms_catalog.record_usage([u for u in used if u], str(Path(ns.edit).resolve().parent))
    except Exception: pass
    jsave(P / 'timeline.json', TL)
    (P / 'timeline.js').write_text('window.TIMELINE = ' + json.dumps(TL, ensure_ascii=False) + ';\n', encoding='utf-8')
    html = (ROOT / 'engine' / 'stage.html').read_text(encoding='utf-8')
    html = html.replace('{{TITLE}}', E.get('title', 'Motion Studio')).replace('{{EXTRA_JS}}', '\n'.join(f'<script src="{j}"></script>' for j in dict.fromkeys(extra_js))).replace('{{EXTRA_CSS}}', '\n'.join(f'<link rel="stylesheet" href="{c}">' for c in dict.fromkeys(extra_css)))
    # 动效库里的新动效：全部带进工程（体积很小），剪辑时按名字直接用
    fx_tags = []
    packs_used = active_packs(E, scenes)
    if packs_used: log('行业包：' + '、'.join(packs_used))
    for d in effect_dirs(packs_used):
        dst = P / 'effects' / d.name
        if dst.exists(): shutil.rmtree(dst)
        shutil.copytree(d, dst, ignore=shutil.ignore_patterns('*.png', '_check', '_editcheck'))
        if (d / 'style.css').exists(): fx_tags.append(f'<link rel="stylesheet" href="effects/{d.name}/style.css">')
        fx_tags.append(f'<script src="effects/{d.name}/component.js"></script>')
    html = html.replace('<script src="timeline.js"></script>', '\n'.join(fx_tags) + '\n<script src="timeline.js"></script>', 1) if fx_tags else html
    (P / 'index.html').write_text(html, encoding='utf-8')
    for f in dict.fromkeys(extra_js + extra_css):
        src = Path(asset_src[f]) if f in asset_src else ROOT / f
        if src.exists(): (P / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, P / f)
    shutil.copy(ep, P / 'edit.json')
    jsave(P / 'project.json', {'tool': 'dayan-motion-studio', 'version': VERSION, 'built': time.strftime('%Y-%m-%d %H:%M:%S'), 'edit': str(ep), 'master': str(master) if master else None, 'canvas': TL['canvas'], 'duration': TL['duration'], 'scenes': len(scenes)})
    log(f'工程已生成 {P}  画布 {W}x{H}@{FPS}  {len(scenes)} 段  {D:.2f}s  （浏览器打开 index.html 可拖动预览）')

# =================================================================== 字幕 ASS（烧录用，可编辑）
def _ass_color(hexs, alpha=0):
    h = hexs.lstrip('#'); r, g, b = h[0:2], h[2:4], h[4:6]; return f'&H{alpha:02X}{b}{g}{r}'.upper()

def _vlen(t): return sum(0.55 if ord(ch) < 128 else 1 for ch in t)
def wrap_cn(t, maxc, keep=()):
    """中文字幕断行：超过 maxc 才断；优先断在标点后、靠近中间；不拆英文单词、不拆高亮词；不留单字孤行。最多两行。"""
    t = t.strip().rstrip('，。,.;；')
    if _vlen(t) <= maxc: return t
    n = len(t); best, bs = None, 1e9
    protect = set(); bounds = None
    try:   # 有 jieba 就按词边界断（不会把"自己"拆成两行）；没有就用虚词启发式
        import warnings; warnings.filterwarnings('ignore', category=SyntaxWarning)
        import jieba, logging; jieba.setLogLevel(logging.WARNING); bounds = set(); k = 0
        for w in jieba.cut(t): k += len(w); bounds.add(k)
    except Exception: pass
    for w in keep:
        for m in re.finditer(re.escape(w), t): protect.update(range(m.start() + 1, m.end()))
    for i in range(2, n - 1):
        if i in protect: continue
        if t[i - 1].isascii() and t[i - 1].isalnum() and t[i].isascii() and t[i].isalnum(): continue   # 英文单词中间
        a, b = _vlen(t[:i]), _vlen(t[i:])
        if a > maxc + 1 or b > maxc + 1: continue
        punct = t[i - 1] in '，、,：:；;！？!?'
        sc = abs(a - b) * 1.0 + (0 if punct else 8) + (0 if a >= b else 0.6)   # 标点处最好；上长下短更好看
        if not punct:
            if bounds is not None: sc += 0 if i in bounds else 6
            elif not (t[i - 1] in '的了着过吧呢啊' or t[i] in '就让把给在和跟为是也都还又而但所'): sc += 4
        if t[i] in '，。、,.：:；;！？!?）)」”': sc += 20                                              # 标点不能放行首
        if sc < bs: best, bs = i, sc
    if best is None: return t
    l1, l2 = t[:best].rstrip('，、,'), t[best:].lstrip(' ')
    return l1 + '\\N' + l2

def write_ass(cues, path, W, H, sub, words=None):
    font = sub.get('font') or ('Microsoft YaHei' if sys.platform.startswith('win') else 'PingFang SC' if sys.platform == 'darwin' else 'Noto Sans CJK SC')
    port = H > W
    size = int(sub.get('size') or (52 if port else 46) * (H if not port else W) / (1080))
    style = sub.get('style', 'clean'); hl = sub.get('hlColor', '#FFC24B')
    mv = int(H * (0.18 if port else 0.074))
    if style == 'pill': st = f'Style: Default,{font},{int(size * .82)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H50101012,-1,0,0,0,100,100,1,0,3,14,0,2,60,60,{mv},1'
    elif style == 'bold': st = f'Style: Default,{font},{int(size * 1.08)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,1,0,1,5,0,2,60,60,{mv},1'
    else: st = f'Style: Default,{font},{size},&H00FFFFFF,&H00FFFFFF,&H00141414,&H78000000,-1,0,0,0,100,100,1,0,1,2.6,1.2,2,60,60,{mv},1'
    def ts(x):
        cs = int(round(x * 100)); h, cs = divmod(cs, 360000); m, cs = divmod(cs, 6000); s, cs = divmod(cs, 100); return f'{h}:{m:02}:{s:02}.{cs:02}'
    lines = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '', '[V4+ Styles]',
             'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding', st, '', '[Events]',
             'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    hide = sub.get('hide') or []; maxc = int(sub.get('maxChars', 12 if port else 16)); pop = sub.get('pop', True)
    for c in cues:
        if any(a <= c['s'] < b for a, b in hide): continue
        t = wrap_cn(c['t'].replace('{', '(').replace('}', ')'), maxc, c.get('hl') or [])
        for w in sorted(c.get('hl') or [], key=len, reverse=True):
            if w not in t: continue
            col = _ass_color(hl)
            if not pop: t = t.replace(w, '{\\c' + col + '&}' + w + '{\\r}', 1); continue
            # 关键词强调：说到这个词的那一刻变色 + 外发光一闪 + 纵向轻弹（只改高度，不挤动整行）
            wt = find_word_times(words, w, after=c['s'] - 0.3, before=c['e']) if words else []
            off = int(max(0, (wt[0] - c['s']) if wt else 0) * 1000)
            glow = _ass_color(hl, 0x60)
            tag = (f'{{\\t({off},{off + 80},\\c{col}&\\3c{glow}&\\bord{max(4, size // 9)}\\blur6\\fscy114)'
                   f'\\t({off + 80},{off + 300},\\bord2.6\\blur0.6\\fscy100\\3c&H00141414&)}}')
            t = t.replace(w, tag + w + '{\\r}', 1)
        if sub.get('lang') == 'zh-en' and c.get('en'):   # 中英双语：中文在上，英文小一号、浅灰，在下
            en = c['en'].replace('{', '(').replace('}', ')')
            t = t + '\\N{\\fs' + str(int(size * 0.62)) + '\\b0\\c&H00E6E6E6&}' + en
        lines.append(f"Dialogue: 0,{ts(c['s'])},{ts(c['e'])},Default,,0,0,0,,{{\\fad(90,40)}}{t}")
    Path(path).write_text('\n'.join(lines) + '\n', encoding='utf-8')

# =================================================================== stills
def cmd_stills(ns):
    P = Path(ns.project); _node_render(P, ['--stills', ns.times, '--outdir', 'stills'])
    from PIL import Image
    fs = sorted((P / 'stills').glob('t*.png'), key=lambda p: float(p.stem[1:]))
    sel = [f for f in fs if f'{float(f.stem[1:]):.2f}' in {f'{float(x):.2f}' for x in ns.times.split(',')}]
    if not sel: return
    w0, h0 = Image.open(sel[0]).size; tw = 640; th = int(h0 * tw / w0); cols = 3 if w0 >= h0 else 5; rows = math.ceil(len(sel) / cols)
    S = Image.new('RGB', (cols * tw, rows * (th + 30)), 'white')
    from PIL import ImageDraw
    d = ImageDraw.Draw(S)
    for i, f in enumerate(sel):
        x, y = (i % cols) * tw, (i // cols) * (th + 30); S.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y + 30)); d.text((x + 8, y + 8), f'{float(f.stem[1:]):.2f}s', fill='black')
    S.save(P / 'stills' / 'contact.jpg', quality=86); log('接触表 →', P / 'stills' / 'contact.jpg')

def _node_render(P, extra):
    run([NODE, str(HERE / 'render.mjs'), str(Path(P).resolve())] + [str(Path(x).resolve()) if x.endswith('.mp4') else x for x in extra], cwd=str(ROOT))

# =================================================================== audio
def cmd_audio(ns):
    import dms_audio as A
    P = Path(ns.project); TL = jload(P / 'timeline.json'); E = jload(P / 'edit.json'); D = TL['duration']
    _node_render(P, ['--cues', 'sfx_cues.json'])
    cues = jload(P / 'sfx_cues.json')
    used = A.render_sfx(cues, D, P / 'sfx.wav', seed=int((E.get('sfxSeed') or 11)))
    log('音效', sum(used.values()), '个：', '、'.join(f'{k}×{v}' for k, v in sorted(used.items(), key=lambda x: -x[1])[:12]))
    mus = E.get('music') or {'mode': 'none'}; bgm = None
    if mus.get('mode', 'none') == 'none':   # 不配乐：清掉上一版留下的配乐文件，免得导出时混进分轨
        for f in P.glob('bgm*.wav'): f.unlink()
    if mus.get('mode') == 'generate':
        secs = [{'t0': s['t0'], 't1': s['t1'], 'energy': int(s.get('energy', 2))} for s in TL['scenes']]
        bgm, info = A.compose_bgm(D, mus.get('mood', 'tech-pulse'), secs, seed=int(mus.get('seed', 7)), key_shift=int(mus.get('key', 0)), bpm=mus.get('bpm'), out_dir=P)
        log(f"原创配乐 {info['mood']} {info['bpm']}bpm {info['bars']} 小节（{info['desc']}）")
        if mus.get('range'):   # 只在一段里出声（如片头 solo 卡点配乐），其余时间静音；分轨同样裁切
            a, b = [float(x) for x in mus['range']]; fo = float(mus.get('fadeOut', 0.6)); fi = float(mus.get('fadeIn', 0.02))
            for f in sorted(P.glob('bgm*.wav')):
                tmp = f.with_name(f.stem + '_r.wav')
                run([FF, '-v', 'error', '-y', '-i', str(f), '-af', f'atrim=0:{b + fo:.3f},afade=t=in:st={a:.3f}:d={fi:.3f},afade=t=out:st={b:.3f}:d={fo:.3f},adelay=0:all=1,apad=whole_dur={D:.3f}', '-ar', '48000', '-ac', '2', str(tmp)])
                if a > 0: run([FF, '-v', 'error', '-y', '-i', str(tmp), '-af', f'volume=enable=\'lt(t,{a:.3f})\':volume=0', str(f)]); tmp.unlink()
                else: tmp.replace(f)
            log(f'配乐只在 {a:.1f}–{b:.1f}s 出声，{fo:.1f}s 淡出')
    elif mus.get('mode') == 'track':
        src = (Path(E.get('_base', P)) / mus['path']) if not Path(mus['path']).is_absolute() else Path(mus['path'])
        if not src.exists(): src = Path(jload(P / 'project.json')['edit']).parent / mus['path']
        bgm = str(P / 'bgm.wav'); run([FF, '-v', 'error', '-y', '-ss', str(mus.get('offset', 0)), '-i', str(src), '-t', str(D + 1), '-af', f'afade=t=out:st={max(0, D - 2.2)}:d=2.2', '-ar', '48000', '-ac', '2', bgm])
    voice = P / 'voice.wav'
    if not voice.exists():  # 无口播（单独渲染的模板片段）：生成静音人声轨
        run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', str(D), str(voice)])
    vol = ns.music_volume if getattr(ns, 'music_volume', None) is not None else float(mus.get('volume', 0.30))
    A.mix(str(voice), str(P / 'mix.wav'), bgm=bgm, sfx=str(P / 'sfx.wav'), music_vol=vol, sfx_vol=float(E.get('sfxVolume', 0.85)), duration=D, denoise=bool(E.get('denoise')))
    L = A.loudness(str(P / 'mix.wav')); log(f"混音 → mix.wav  响度 {L['I']} LUFS  峰值 {L['TP']} dBTP")
    jsave(P / 'audio.json', {'sfx': used, 'music': mus, 'musicVolume': vol, 'loudness': L})

# =================================================================== render / check
def cmd_render(ns):
    P = Path(ns.project).resolve(); TL = jload(P / 'timeline.json'); out = Path(ns.out).resolve()
    # 混音过期（人声 / 时间线比 mix.wav 新）也要重混：以前只在没有 mix.wav 时才混，换了口播母版后成片还是旧的静音混音
    mx = P / 'mix.wav'
    stale = not mx.exists() or any((P / f).exists() and (P / f).stat().st_mtime > mx.stat().st_mtime for f in ('voice.wav', 'timeline.json'))
    if stale: cmd_audio(argparse.Namespace(project=str(P), music_volume=None))
    TL = jload(P / 'timeline.json')
    burn = TL['subtitles'].get('previewOnly') and (P / 'subtitles.ass').exists()
    pic = P / 'picture.mp4' if burn else out
    reuse = getattr(ns, 'reuse', False) and burn and pic.exists() and pic.stat().st_mtime > (P / 'timeline.json').stat().st_mtime
    if reuse: log('画面未改动，复用 picture.mp4（只重新烧字幕和混音）')
    else:
        args = [str(pic), '--crf', str(ns.crf or 16), '--preset', ns.preset or 'medium']
        if ns.workers: args += ['--workers', str(ns.workers)]
        if not burn: args += ['--audio', 'mix.wav']
        _node_render(P, args)
    if burn:
        log('烧录字幕 + 混音 …')
        ass = str(P / 'subtitles.ass').replace('\\', '/').replace(':', '\\:')
        fontsdir = ROOT / 'assets' / 'fonts'
        vf = f"ass='{ass}'" + (f":fontsdir='{str(fontsdir).replace(chr(92), '/').replace(':', chr(92) + ':')}'" if fontsdir.exists() else '')
        run([FF, '-v', 'error', '-y', '-i', str(pic), '-i', str(P / 'mix.wav'), '-vf', vf, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', str(ns.crf or 16), '-preset', ns.preset or 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', f"{TL['duration']:.3f}", '-movflags', '+faststart', str(out)])
    log('成片 →', out)
    (P / 'last_final.txt').write_text(str(out), encoding='utf-8')   # 导出时优先用这一版
    cmd_check(argparse.Namespace(video=str(out)))
    if not getattr(ns, 'no_cover', False):   # 成片出来后顺带出一套封面（失败不影响成片）
        try:
            files = cmd_cover(argparse.Namespace(project=str(P), out=None, person=None, frames=None))
            if files:
                dst = out.parent / f'{out.stem}_封面'; dst.mkdir(exist_ok=True)
                for f in list(files) + [P / 'cover' / '封面_总览.jpg']:
                    if Path(f).exists(): shutil.copy(f, dst / Path(f).name)
                log('封面 →', dst)
        except Exception as e: log('封面没出成（不影响成片），可单独运行 dms.py cover：', e)

def cmd_catalog(ns):
    """动效目录：无参数 → 生成 references/catalog.md；带关键词 → 搜索组件 / 动效库 / 原卡库 / 已装行业包并给出写法"""
    import dms_catalog as K
    if ns.keys: K.search(ns.keys, ns.limit)
    else:
        n, p = K.write_md(ns.out)
        log(f"动效目录 → {p}（组件 {n['组件']} · 动效库 {n['动效库']} · 原卡 {n['原卡库']}）")

def cmd_card(ns):
    """看一张原卡：截 3 帧拼图 + 列出卡里全部可见文字（都是样板，按口播换掉），给出可直接写进 edit.json 的写法"""
    from PIL import Image
    out = Path(ns.out or (Path.cwd() / 'cards')).resolve(); out.mkdir(parents=True, exist_ok=True)
    args = [NODE, str(HERE / 'card.mjs'), ns.id, str(out)] + ([str(Path(ns.replace).resolve())] if ns.replace else [])
    r = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True)
    if r.returncode: die('原卡挂载失败：' + (r.stderr or r.stdout)[-400:])
    d = json.loads(r.stdout.strip().splitlines()[-1])
    ims = [Image.open(f).convert('RGB').resize((640, 360)) for f in d['shots']]
    sheet = Image.new('RGB', (640 * 3 + 20, 360), 'white')
    for i, im in enumerate(ims): sheet.paste(im, (i * 650, 0))
    safe = ns.id.replace('·', '-'); dst = out / f'原卡_{safe}.jpg'; sheet.save(dst, quality=88)
    for f in d['shots']: Path(f).unlink(missing_ok=True)
    (out / '_card.html').unlink(missing_ok=True)
    print(f'样张（入场 / 落定 / 后段）→ {dst}')
    print('卡里的可见文字（全部是样板，按本期口播换掉；不需要的换成空字符串）：')
    for t in d['texts']: print('   ', t)
    rep = [[t, '…'] for t in d['texts']]
    print('写法：')
    print('  ' + json.dumps({'c': 'dayan', 'cue': '关键词', 'box': 'full', 'props': {'id': ns.id, 'replace': rep}}, ensure_ascii=False))
    print('提示：替换后再跑一次 `dms.py card ' + ns.id + ' --replace 替换表.json` 看样张，确认画面里没有残留的样板文字、价格、别家产品名')

def cmd_plan(ns):
    """把 edit.json / 已 build 的工程整理成一张编排单（每段：口播 → 外观 → 人物 → 主画面 → 文字 → 转场），交付前自查"千篇一律"用"""
    src = Path(ns.src)
    T = jload(src / 'timeline.json') if src.is_dir() else jload(src)
    rows = ['| 段 | 时间 | 口播 | 外观 | 主画面（非文字） | 文字层 | 转场 |', '|---|---|---|---|---|---|---|']
    from collections import Counter
    cnt = Counter()
    for S in T.get('scenes', []):
        comps = [x for L in S.get('layers', []) if not str(L.get('c', '')).startswith('bg-') for x in _vis_comps(L)]
        vis = [x for x in comps if x not in TEXT_ONLY]; txt = [x for x in comps if x in TEXT_ONLY]; cnt.update(set(vis))
        look = S.get('look') if isinstance(S.get('look'), str) else (S.get('look') or {}).get('name') if S.get('look') else ','.join(L.get('c', '') + ':' + str((L.get('props') or {}).get('skin', '')) for L in S.get('bg') or [])
        tr = (S.get('transition') or {}).get('type', '')
        say = (S.get('say') or '').replace('|', '/')[:40]
        rows.append(f"| {S.get('id')} | {S.get('t0', 0):.1f}–{S.get('t1', 0):.1f} | {say} | {look or ''} | {'、'.join(vis) or '⚠ 只有文字'} | {'、'.join(txt)} | {tr} |")
    rows += ['', '主画面组件使用次数：' + '、'.join(f'{k}×{v}' for k, v in cnt.most_common())]
    out = Path(ns.out) if ns.out else (src / 'plan.md' if src.is_dir() else src.with_name('plan.md'))
    out.write_text('\n'.join(rows), encoding='utf-8'); log('编排单 →', out)

def cmd_cover(ns):
    """封面：A 手账贴纸 / B 科技海报 / C 电影海报 × 竖屏 3:4 + 横屏 4:3。有真人就从母版挑人物帧抠像，没有就出文字 + 背景版"""
    import dms_cover
    P = Path(ns.project).resolve(); E = jload(P / 'edit.json')
    pj = jload(P / 'project.json') if (P / 'project.json').exists() else {}
    start = Path(pj['edit']).parent if pj.get('edit') else P
    frames = [float(x) for x in ns.frames.split(',')] if getattr(ns, 'frames', None) else None
    return dms_cover.make_covers(P, brand_of(E, start), getattr(ns, 'out', None), getattr(ns, 'person', None) or 'auto', frames)

def cmd_sweep(ns):
    """逐帧试跑整条时间轴（不截图），页面报错按出错的组件汇总；渲染前跑一遍，0 报错再渲染"""
    P = Path(ns.project).resolve()
    args = [NODE, str(HERE / 'render.mjs'), str(P), '--sweep', str(ns.step)] + (['--from', str(ns.start)] if ns.start is not None else []) + (['--to', str(ns.end)] if ns.end is not None else [])
    r = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True)
    errs = [l.strip() for l in (r.stdout + r.stderr).splitlines() if re.search(r'^\s*\[(page|console)\]', l)]
    ovs = [l.strip() for l in r.stdout.splitlines() if l.startswith('[overflow:')]
    ov_err = [l for l in ovs if l.startswith('[overflow:error]')]; ov_warn = [l for l in ovs if l.startswith('[overflow:warn]')]
    if ov_warn:
        print(f'⚠ 文字超出自己的 box {len(ov_warn)} 处（打开对应帧看有没有压到别的东西）：'); [print('  · ' + l.split('] ', 1)[1]) for l in ov_warn[:12]]
    if ov_err:
        print(f'✗ 文字超出画布 {len(ov_err)} 处（观众看不到，必须改：缩短文字、加大 box 或换小字号）：'); [print('  · ' + l.split('] ', 1)[1]) for l in ov_err[:12]]
        if not (r.returncode or errs): sys.exit(1)
    if r.returncode or errs:
        print(f'✗ 逐帧试跑发现 {len(errs)} 次页面报错（{len(set(errs))} 种）：'); [print('  · ' + e) for e in sorted(set(errs))[:12]]
        sys.exit(1)
    log('✓ 逐帧试跑无报错', (r.stdout.strip().splitlines() or [''])[-1])

def cmd_check(ns):
    import dms_audio as A
    info = probe(ns.video)
    r = subprocess.run([FF, '-v', 'error', '-i', ns.video, '-f', 'null', '-'], capture_output=True, text=True)
    L = A.loudness(ns.video) if info['audio'] else {}
    print(f"  {info['w']}x{info['h']} @ {info['fps']:.2f}fps  {info['duration']:.2f}s  音轨:{'有' if info['audio'] else '无'}  解码:{'通过' if not r.stderr.strip() else '有错误'}  响度:{L.get('I')} LUFS  峰值:{L.get('TP')} dBTP")
    if r.stderr.strip(): print(r.stderr[:500])

# =================================================================== export
def cmd_overlay(ns):
    """透明动效层：只有动画元素（无背景、无人物、无字幕），叠在原片上用。.mov = ProRes 4444（Premiere/达芬奇/FCP），.webm = VP9 透明（剪映/网页）"""
    P = Path(ns.project).resolve(); out = Path(ns.out or (P / '动效层_透明.mov')).resolve()
    extra = [str(out), '--alpha']
    if ns.workers: extra += ['--workers', str(ns.workers)]
    run([NODE, str(HERE / 'render.mjs'), str(P)] + extra, cwd=str(ROOT))
    (P / 'last_overlay.txt').write_text(str(out), encoding='utf-8')
    log('透明动效层 →', out)

def cmd_export(ns):
    import dms_export
    out = dms_export.export_project(Path(ns.project).resolve(), include_frames=ns.frames, media_root=ns.media_root)
    log('导出完成 →', out)

# =================================================================== main
def main():
    ap = argparse.ArgumentParser(prog='dms', description='大琰DAYAN Motion Studio — 口播自动剪辑 + 动效 + 行业模板包')
    sp = ap.add_subparsers(dest='cmd')
    sp.add_parser('doctor')
    sp.add_parser('kickoff', help='新作品开工前要问用户的问题（画幅 / 分辨率 / 帧率 / 文字墙品牌）')
    a = sp.add_parser('show', help='把开工示例图发给用户：打印可贴进回复的 Markdown 图片行，并用看图软件在用户电脑上打开（文字墙示例 / 风格样张 / 人物总览 / 图片路径）'); a.add_argument('name'); a.add_argument('--no-open', dest='no_open', action='store_true', help='只打印 Markdown，不打开看图软件')
    a = sp.add_parser('effect', help='动效库：new 新建 / check 三画幅样张 + 可编辑性体检 / editcheck 只做可编辑性体检 / list'); a.add_argument('action', choices=['new', 'check', 'editcheck', 'list']); a.add_argument('id', nargs='?'); a.add_argument('--name'); a.add_argument('--use')
    a.add_argument('--pack', help='行业专属动效：存进这个行业包（id 要 fx-<包名>- 开头）；通用动效不加，存主技能动效库'); a.add_argument('--force', action='store_true', help='查重发现很像时仍然新建')
    a = sp.add_parser('brand', help='查看 / 保存本机品牌（文字墙两行等）'); a.add_argument('action', choices=['show', 'set']); a.add_argument('--main'); a.add_argument('--sub'); a.add_argument('--name'); a.add_argument('--mark')
    a = sp.add_parser('asr'); a.add_argument('video'); a.add_argument('workdir'); a.add_argument('--engine'); a.add_argument('--fix', help='识别纠错表 json')
    a = sp.add_parser('cut'); a.add_argument('video'); a.add_argument('spec'); a.add_argument('workdir')
    a = sp.add_parser('face'); a.add_argument('video'); a.add_argument('workdir'); a.add_argument('--step', default='0.25')
    a = sp.add_parser('scaffold'); a.add_argument('workdir'); a.add_argument('out'); a.add_argument('--canvas', default='1920x1080'); a.add_argument('--fps', default='60'); a.add_argument('--theme', default='dark-tech'); a.add_argument('--title'); a.add_argument('--wall-main', dest='wall_main', help='文字墙主行（品牌名）'); a.add_argument('--wall-sub', dest='wall_sub', help='文字墙副行（英文名/口号）'); a.add_argument('--brand-name', dest='brand_name'); a.add_argument('--packs', help='启用的行业包（逗号分隔），分镜时优先匹配包里的模板')
    a = sp.add_parser('words'); a.add_argument('workdir'); a.add_argument('keys', nargs='+')
    a = sp.add_parser('subs'); a.add_argument('workdir'); a.add_argument('lines', help='每行一条润色后的字幕')
    a = sp.add_parser('direct', help='导演检查：大字照抄字幕 / 一段两件事 / 画面静止 / 口播有画面没有 / 出现错位'); a.add_argument('project'); a.set_defaults(fn=cmd_direct)
    a = sp.add_parser('lint'); a.add_argument('edit')
    a = sp.add_parser('build'); a.add_argument('edit'); a.add_argument('project')
    a = sp.add_parser('stills'); a.add_argument('project'); a.add_argument('times')
    a = sp.add_parser('audio'); a.add_argument('project'); a.add_argument('--music-volume', dest='music_volume', type=float)
    a = sp.add_parser('sweep', help='逐帧试跑查页面报错（渲染前跑）'); a.add_argument('project'); a.add_argument('--step', type=float, default=1 / 30); a.add_argument('--from', dest='start', type=float); a.add_argument('--to', dest='end', type=float); a.set_defaults(fn=cmd_sweep)
    a = sp.add_parser('render'); a.add_argument('project'); a.add_argument('out'); a.add_argument('--workers', type=int); a.add_argument('--preset', default='medium'); a.add_argument('--crf', type=int, default=16); a.add_argument('--reuse', action='store_true', help='画面没改时复用已渲染的 picture.mp4，只重做字幕和声音'); a.add_argument('--no-cover', dest='no_cover', action='store_true', help='不顺带出封面')
    a = sp.add_parser('grab', help='联网取材：check 检查连接情况、allow/deny（首次问一次）、shot 网页截图、image 网页配图、clip 视频截几秒（待用户确认）、ok/no 确认、list')
    a.add_argument('action', choices=['allow', 'deny', 'status', 'check', 'shot', 'image', 'clip', 'ok', 'no', 'list']); a.add_argument('target', nargs='?', help='网址或文件')
    a.add_argument('--to', default='素材', help='存到哪个文件夹（默认 ./素材，来源记在里面的 素材来源.json）'); a.add_argument('--name')
    a.add_argument('--full', action='store_true', help='整页长图'); a.add_argument('--selector', help='只截页面里这个元素（CSS 选择器）'); a.add_argument('--scroll', type=int, default=0)
    a.add_argument('--w', type=int, default=1440); a.add_argument('--h', type=int, default=900); a.add_argument('--dark', action='store_true')
    a.add_argument('--start', help='视频片段起点，如 1:23 或 83'); a.add_argument('--dur', type=float, default=6.0)
    a.add_argument('--agent', help='check：当前是哪个 Agent（claude / codex / workbuddy / doubao），给出该装什么'); a.add_argument('--n', type=int, default=4, help='image：最多取几张图')
    a = sp.add_parser('library', help='动效库体检：查重 / 闲置 / 缺样张缺触发词（只给建议，不删）；promote 改成熟度'); a.add_argument('action', choices=['audit', 'promote', 'index']); a.add_argument('id', nargs='?'); a.add_argument('status', nargs='?')
    a = sp.add_parser('catalog', help='动效目录：生成 references/catalog.md，或按关键词搜索可调用的组件 / 动效 / 原卡'); a.add_argument('keys', nargs='*'); a.add_argument('--limit', type=int, default=8); a.add_argument('--out')
    a = sp.add_parser('card', help='看一张原卡：样张 + 卡里全部可见文字（样板，按口播替换）+ 写法'); a.add_argument('id'); a.add_argument('--out'); a.add_argument('--replace', help='替换表 json：[[原文, 新文], …]')
    a = sp.add_parser('plan', help='把 edit.json / 工程整理成编排单 plan.md（每段主画面一目了然）'); a.add_argument('src'); a.add_argument('--out')
    a = sp.add_parser('cover', help='封面：A/B/C 三种风格 × 竖屏 3:4 + 横屏 4:3（有真人抠像，没有出文字 + 背景版）'); a.add_argument('project'); a.add_argument('--out'); a.add_argument('--person', choices=['auto', 'yes', 'no']); a.add_argument('--frames', help='手动指定 A,B,C 三帧的母版秒数，如 12.3,40.1,70.2')
    a = sp.add_parser('overlay', help='导出透明动效层（.mov ProRes 4444 / .webm VP9）'); a.add_argument('project'); a.add_argument('out', nargs='?'); a.add_argument('--workers', type=int)
    a = sp.add_parser('check'); a.add_argument('video')
    a = sp.add_parser('export'); a.add_argument('project'); a.add_argument('--frames', action='store_true', help='连人物帧一起打包（体积大）'); a.add_argument('--media-root', dest='media_root', help='交付文件夹在用户电脑上的路径，XML 里的媒体路径按它写')
    a = sp.add_parser('pack', help='行业模板包：list / install / update / new / check'); a.add_argument('action', choices=['list', 'install', 'update', 'new', 'check']); a.add_argument('target', nargs='?', help='包名、仓库地址、zip 或文件夹')
    a.add_argument('--force', action='store_true'); a.add_argument('--render', action='store_true', help='check 时按画幅出样张'); a.add_argument('--name'); a.add_argument('--industry'); a.add_argument('--dir', help='new：建在这个文件夹下（默认直接建在安装位置）')
    a = sp.add_parser('template'); a.add_argument('action', choices=['list', 'validate', 'show', 'render', 'gallery']); a.add_argument('id', nargs='?'); a.add_argument('payload', nargs='?'); a.add_argument('out', nargs='?')
    ns = ap.parse_args()
    fn = globals().get('cmd_' + (ns.cmd or ''))
    if not fn: ap.print_help(); return
    fn(ns)

if __name__ == '__main__':
    main()
