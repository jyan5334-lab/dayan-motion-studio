"""把 CC0 音效包整理成技能用的采样库 assets/sfx/<种类>/NN.wav（48k 立体声，去头部静音、尾部淡出）。
只收录自带 CC0 授权文件、已核对过的包；来源写进 assets/sfx/LICENSES.md。
用法：python tools/build_sfx_pack.py <CC0-Public-Domain-Sounds 目录>
音量不在这里定：渲染时按同类合成音效的响度对齐（dms_audio.sample_sfx）。"""
import sys, subprocess, json, hashlib
from pathlib import Path
import numpy as np

SRC = Path(sys.argv[1]); ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / 'assets' / 'sfx'
SR = 48000
PACKS = {
    'kenney_impactsounds': 'Kenney · Impact Sounds',
    'kenney_digitalaudio': 'Kenney · Digital Audio',
    'kenney_casinoaudio': 'Kenney · Casino Audio',
    'kenney_interfacesounds': 'Kenney · Interface Sounds',
    'kenney_uiaudio': 'Kenney · UI Audio',
    'Micro Pack - Organic Wooshes': 'Ben Burnes · Micro Pack - Organic Wooshes',
    'bb - Keyboard Sounds (Mar 2021)': 'Ben Burnes · Keyboard Sounds',
    'bb - Books, Paper, Writing (Jan 2021)': 'Ben Burnes · Books, Paper, Writing',
    'bb - Smol Mechanisms (May 2021)': 'Ben Burnes · Smol Mechanisms',
}
# 种类 → [(包, 文件名关键字), …]，每类最多取 4 个
MAP = {
    'whoosh':      [('Micro Pack - Organic Wooshes', 'Swish 2'), ('Micro Pack - Organic Wooshes', 'Swish 3'), ('Micro Pack - Organic Wooshes', 'Swish 6'), ('Micro Pack - Organic Wooshes', 'Classic Swish 3')],
    'whoosh-soft': [('Micro Pack - Organic Wooshes', 'Gentle Swish'), ('Micro Pack - Organic Wooshes', 'Twirl Smol')],
    'swoosh-soft': [('Micro Pack - Organic Wooshes', 'Twirl Smol'), ('Micro Pack - Organic Wooshes', 'Gentle Swish')],
    'air':         [('Micro Pack - Organic Wooshes', 'Twirl Smol')],
    'swoosh-in':   [('Micro Pack - Organic Wooshes', 'Classic Swish 3'), ('Micro Pack - Organic Wooshes', 'Swish 2'), ('Micro Pack - Organic Wooshes', 'Swish 1'), ('Micro Pack - Organic Wooshes', 'Classic Swish 1')],
    'swoosh-out':  [('Micro Pack - Organic Wooshes', 'Swish 6'), ('Micro Pack - Organic Wooshes', 'Swish 3'), ('Micro Pack - Organic Wooshes', 'Swish 5'), ('Micro Pack - Organic Wooshes', 'Classic Swish 2')],
    'whip':        [('Micro Pack - Organic Wooshes', 'Slash'), ('Micro Pack - Organic Wooshes', 'Combo 1'), ('Micro Pack - Organic Wooshes', 'Combo 4')],
    'impact':      [('kenney_impactsounds', 'impactPunch_heavy'), ('kenney_impactsounds', 'impactSoft_heavy')],
    'hit':         [('kenney_impactsounds', 'impactPunch_medium')],
    'thud':        [('kenney_impactsounds', 'impactSoft_heavy'), ('kenney_impactsounds', 'impactSoft_medium')],
    'stamp':       [('bb - Books, Paper, Writing (Jan 2021)', 'Hardcover Tap'), ('kenney_impactsounds', 'impactSoft_heavy')],
    'pop':         [('kenney_interfacesounds', 'drop_'), ('kenney_interfacesounds', 'pluck_')],
    'pop-soft':    [('kenney_interfacesounds', 'drop_')],
    'pop-big':     [('kenney_interfacesounds', 'maximize_')],
    'bubble':      [('kenney_interfacesounds', 'pluck_'), ('kenney_interfacesounds', 'drop_')],
    'click':       [('kenney_uiaudio', 'click'), ('kenney_interfacesounds', 'click_')],
    'tick':        [('kenney_interfacesounds', 'tick_')],
    'tick-ok':     [('kenney_interfacesounds', 'select_')],
    'typing':      [('bb - Keyboard Sounds (Mar 2021)', 'Keyboard - Key ')],
    'ding':        [('kenney_interfacesounds', 'confirmation_'), ('kenney_interfacesounds', 'bong_')],
    'success':     [('kenney_interfacesounds', 'confirmation_'), ('kenney_digitalaudio', 'powerUp')],
    'notify':      [('kenney_interfacesounds', 'question_')],
    'notify-soft': [('kenney_interfacesounds', 'select_')],
    'receive':     [('kenney_interfacesounds', 'open_')],
    'send':        [('kenney_interfacesounds', 'maximize_')],
    'alert':       [('kenney_interfacesounds', 'error_')],
    'error':       [('kenney_interfacesounds', 'error_')],
    'scratch':     [('kenney_interfacesounds', 'scratch_')],
    'marker':      [('bb - Books, Paper, Writing (Jan 2021)', 'Fine Felt Tip Lines'), ('bb - Books, Paper, Writing (Jan 2021)', 'Thicc Tip Lines')],
    'draw':        [('bb - Books, Paper, Writing (Jan 2021)', 'Pen Writing'), ('bb - Books, Paper, Writing (Jan 2021)', 'Mech Pencil Lines')],
    'paper':       [('bb - Books, Paper, Writing (Jan 2021)', 'Page Turn')],
    'card':        [('kenney_casinoaudio', 'cardPlace'), ('kenney_casinoaudio', 'cardSlide')],
    'stack':       [('kenney_casinoaudio', 'chipsStack'), ('kenney_casinoaudio', 'cardPlace')],
    'zap':         [('kenney_digitalaudio', 'zap')],
    'confetti':    [('bb - Books, Paper, Writing (Jan 2021)', 'Riffle Pages')],
}
MAXN = 4

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def tidy(x, maxlen):
    a = np.abs(x).max(1)
    idx = np.where(a > max(a.max() * 0.02, 1e-4))[0]          # 头部：2% 以下算静音
    tail = np.where(a > max(a.max() * 0.003, 3e-5))[0]          # 尾部：只裁真正的静音，保留渐弱
    if not len(idx): return None
    s = max(0, idx[0] - int(0.004 * SR)); e = min(len(x), tail[-1] + int(0.03 * SR))
    x = x[s:e][: int(maxlen * SR)]
    f = min(len(x), int(0.03 * SR)); x[-f:] *= np.linspace(1, 0, f)[:, None]
    pk = np.abs(x).max(); return x / pk * 0.89 if pk > 0 else None

def write(path, x):
    import wave
    y = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())

maxlen = {'typing': 0.25, 'marker': 0.9, 'draw': 1.1, 'paper': 0.9, 'confetti': 1.0}
OUT.mkdir(parents=True, exist_ok=True)
manifest = {}
for kind, rules in MAP.items():
    d = OUT / kind; d.mkdir(exist_ok=True)
    for old in d.glob('*.wav'): old.unlink()
    picked = []
    for pack, key in rules:
        files = sorted(p for p in (SRC / pack).rglob('*') if p.suffix.lower() in ('.wav', '.ogg') and key.lower() in p.name.lower())
        for p in files:
            if len(picked) >= MAXN: break
            if any(q == p for q, _ in picked): continue
            x = tidy(load(p), maxlen.get(kind, 1.6))
            if x is not None: picked.append((p, x))
    for i, (p, x) in enumerate(picked, 1):
        write(d / f'{i:02d}.wav', x)
    manifest[kind] = [{'file': f'{kind}/{i:02d}.wav', 'source': PACKS[p.relative_to(SRC).parts[0]], 'original': p.name} for i, (p, _) in enumerate(picked, 1)]
    print(kind, len(picked))
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
lic = ['# 采样音效来源与授权', '', '全部采样来自以下 CC0（公有领域）音效包，可免费商用、可修改、无需署名。每个包都自带 CC0 授权文件，收录前已逐个核对。', '']
for k, v in PACKS.items(): lic.append(f'- {v}')
lic += ['', 'Kenney 系列：Kenney Vleugels（kenney.nl），授权 CC0 1.0。Ben Burnes 系列：授权 CC0 1.0（"These sounds are public domain (Creative Commons 0)"）。', '',
        '每个文件对应的原始文件名见 manifest.json。合成音效（dms_audio.gen）在没有采样时兜底。']
(OUT / 'LICENSES.md').write_text('\n'.join(lic) + '\n', encoding='utf-8')
