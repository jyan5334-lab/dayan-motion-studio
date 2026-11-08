#!/usr/bin/env python3
"""大琰DAYAN Motion Studio — 声音：原创程序化音效库、原创背景音乐作曲器、混音。

全部声音由代码实时合成（不含任何第三方采样），同一 seed 每次结果相同。
  sfx   : 40+ 种动作音效（转场、弹出、印章、打字、点击、数字滚动、成功、警示……）
  bgm   : 6 种情绪风格，按分镜能量曲线自动编曲，导出总轨和分轨
  mix   : 人声链 + 配乐侧链闪避 + 音效 + 交付响度（-15 LUFS / TP -1.2）
"""
from __future__ import annotations
import json, math, os, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 48000
try:
    from scipy import signal as sps
except Exception:  # scipy 可选：缺失时用简化滤波
    sps = None

# ----------------------------------------------------------------- 基础工具
def _rng(seed):
    return np.random.default_rng(seed)

def t_axis(d):
    return np.arange(int(d * SR)) / SR

def env_adsr(n, a=0.005, d=0.08, s=0.0, r=0.05, hold=0.0):
    a_n, d_n, h_n, r_n = int(a * SR), int(d * SR), int(hold * SR), int(r * SR)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)), np.full(h_n, s), np.linspace(s, 0, max(r_n, 1))])
    if len(e) < n: e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]

def env_exp(n, tau):
    return np.exp(-np.arange(n) / SR / max(tau, 1e-4))

def bell(n, peak=0.5, sharp=2.0):
    x = np.linspace(0, 1, n)
    return np.clip(np.where(x < peak, (x / peak) ** sharp, ((1 - x) / (1 - peak)) ** (sharp * 0.8)), 0, 1)

def lp(x, fc, order=2):
    if sps is None: return x
    fc = min(max(fc, 20), SR / 2 - 100)
    return sps.sosfilt(sps.butter(order, fc, 'low', fs=SR, output='sos'), x)

def hp(x, fc, order=2):
    if sps is None: return x
    return sps.sosfilt(sps.butter(order, max(fc, 10), 'high', fs=SR, output='sos'), x)

def bp(x, lo, hi, order=2):
    if sps is None: return x
    hi = min(hi, SR / 2 - 200); lo = max(20, min(lo, hi - 10))
    return sps.sosfilt(sps.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)

def sweep_noise(d, f0, f1, q=0.6, seed=1, curve='exp'):
    """时变带通噪声（扫频 whoosh 的核心）：分块更新滤波器，保持状态连续"""
    rng = _rng(seed); n = int(d * SR); x = rng.standard_normal(n)
    if sps is None: return x * 0.3
    out = np.zeros(n); blk = 256; zi = None
    for i in range(0, n, blk):
        k = i / max(n - 1, 1)
        fc = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
        bw = fc * q
        lo, hi = max(40, fc - bw / 2), min(SR / 2 - 500, fc + bw / 2)
        sos = sps.butter(2, [lo, hi], 'band', fs=SR, output='sos')
        if zi is None: zi = sps.sosfilt_zi(sos) * 0
        y, zi = sps.sosfilt(sos, x[i:i + blk], zi=zi)
        out[i:i + blk] = y
    return out

def sine_sweep(d, f0, f1, curve='exp'):
    n = int(d * SR); k = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def norm(x, peak=0.9):
    m = np.max(np.abs(x)) if len(x) else 0
    return x * (peak / m) if m > 1e-9 else x

def simple_reverb(x, decay=1.2, mix=0.25, seed=3, pre=0.012):
    """指数衰减噪声脉冲响应卷积，立体声输出 (n,2)"""
    rng = _rng(seed); n = int(decay * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR / (decay / 6.5))[:, None]
    ir = np.vstack([np.zeros((int(pre * SR), 2)), ir]); ir[:, 0] = lp(ir[:, 0], 7000); ir[:, 1] = lp(ir[:, 1], 6500)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) + 1e-9
    mono = x if x.ndim == 1 else x.mean(axis=1)
    if sps is not None:
        wet = np.stack([sps.fftconvolve(mono, ir[:, 0])[:len(mono)], sps.fftconvolve(mono, ir[:, 1])[:len(mono)]], axis=1)
    else:
        wet = np.stack([mono, mono], axis=1) * 0
    dry = np.stack([mono, mono], axis=1) if x.ndim == 1 else x
    return dry * (1 - mix) + wet * mix * 1.4

def padadd(*xs):
    """不同长度的单声道数组相加（短的补零）"""
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out

def pan(x, p):
    """p: -1 左 … +1 右（可为数组）"""
    p = np.asarray(p); l = np.cos((p + 1) * np.pi / 4); r = np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l, x * r], axis=1)

def write_wav(path, x, sr=SR):
    x = np.asarray(x)
    if x.ndim == 1: x = np.stack([x, x], axis=1)
    x = np.clip(x, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        a = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768
    return a.reshape(-1, ch), sr

# ----------------------------------------------------------------- 音效生成器
def _pop(d=0.12, f0=900, f1=260, seed=1, body=1.0):
    n = int(d * SR); s = sine_sweep(d, f0, f1) * env_exp(n, d / 3.2)
    c = hp(_rng(seed).standard_normal(n), 2000) * env_exp(n, 0.004) * 0.35
    return s * body + c

def _click(seed=1, f=3200):
    n = int(0.02 * SR); x = bp(_rng(seed).standard_normal(n), f * 0.6, f * 1.6) * env_exp(n, 0.0025)
    return x + np.sin(2 * np.pi * 1800 * t_axis(0.02)) * env_exp(n, 0.003) * 0.25

def _pluck(f, d, bright=0.6, seed=1):
    """Karplus-Strong 拨弦（IIR 实现，向量化）：温暖、有乐器感"""
    n = int(d * SR); N = max(2, int(SR / f)); rng = _rng(seed)
    exc = np.zeros(n); burst = rng.uniform(-1, 1, N)
    exc[:N] = lp(burst, 800 + bright * 7000) if sps is not None else burst
    damp = 0.996 - (1 - bright) * 0.006
    if sps is None: return exc * env_exp(n, d / 3)
    a = np.zeros(N + 2); a[0] = 1; a[N] = -damp * 0.5; a[N + 1] = -damp * 0.5
    out = sps.lfilter([1.0], a, exc)
    return out * env_adsr(n, 0.001, d * 0.9, 0, d * 0.1)

def _bellfm(f, d, ratio=1.41, index=2.5, tau=0.5):
    t = t_axis(d); n = len(t); e = env_exp(n, tau)
    return np.sin(2 * np.pi * f * t + index * e * np.sin(2 * np.pi * f * ratio * t)) * e

def gen(kind, d=None, seed=1, gain=1.0):
    """返回单个音效（立体声 numpy 数组），kind 见 SFX_KINDS"""
    r = _rng(seed); k = kind
    if k in ('whoosh', 'whoosh-soft', 'swoosh-soft', 'air'):
        d = d or {'whoosh': 0.5, 'whoosh-soft': 0.4, 'swoosh-soft': 0.42, 'air': 0.55}[k]
        lo, hi = {'whoosh': (260, 3400), 'whoosh-soft': (220, 2200), 'swoosh-soft': (200, 1600), 'air': (150, 900)}[k]
        n = int(d * SR)
        a = sweep_noise(d * 0.55, lo, hi, 0.8, seed); b = sweep_noise(d * 0.45, hi, lo * 1.6, 0.8, seed + 1)
        x = np.concatenate([a, b])[:n]; x = x * bell(len(x), 0.55, 1.6)
        out = pan(norm(x, 0.8), np.linspace(-0.6, 0.6, len(x)))
        return out * {'whoosh': 0.9, 'whoosh-soft': 0.6, 'swoosh-soft': 0.45, 'air': 0.4}[k]
    if k in ('swoosh-in', 'zoom-in', 'rise'):
        d = d or {'swoosh-in': 0.45, 'zoom-in': 0.38, 'rise': 0.9}[k]; n = int(d * SR)
        x = sweep_noise(d, 300, 5200 if k != 'rise' else 3000, 0.7, seed) * (np.linspace(0, 1, n) ** 2.2)
        if k == 'rise': x = padadd(x * 0.6, sine_sweep(d, 220, 880) * (np.linspace(0, 1, len(x)) ** 2) * 0.25)
        x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
        return pan(norm(x, 0.8), 0) * 0.7
    if k in ('swoosh-out', 'zoom-out', 'shrink'):
        d = d or {'swoosh-out': 0.45, 'zoom-out': 0.38, 'shrink': 0.35}[k]; n = int(d * SR)
        x = sweep_noise(d, 4800, 260, 0.7, seed) * (np.linspace(1, 0, n) ** 1.6) * np.minimum(1, np.arange(n) / (0.01 * SR))
        if k == 'shrink': x = x * 0.5 + sine_sweep(d, 900, 240) * env_exp(n, d / 2.5) * 0.35
        return pan(norm(x, 0.8), 0) * 0.65
    if k == 'whip':
        d = d or 0.2; n = int(d * SR); x = sweep_noise(d, 900, 7000, 0.5, seed) * bell(n, 0.7, 2.5)
        return pan(norm(x, 0.85), np.linspace(-0.8, 0.8, n)) * 0.75
    if k in ('impact', 'hit', 'thud', 'stamp'):
        d = d or {'impact': 0.9, 'hit': 0.35, 'thud': 0.3, 'stamp': 0.42}[k]; n = int(d * SR)
        f0, f1 = {'impact': (120, 38), 'hit': (220, 120), 'thud': (140, 60), 'stamp': (170, 70)}[k]
        body = sine_sweep(d, f0, f1) * env_exp(n, {'impact': 0.28, 'hit': 0.07, 'thud': 0.08, 'stamp': 0.07}[k])
        nz = r.standard_normal(n)
        crack = bp(nz, 800, 6000) * env_exp(n, {'impact': 0.05, 'hit': 0.045, 'thud': 0.01, 'stamp': 0.03}[k])
        x = body * 1.0 + crack * {'impact': 0.6, 'hit': 0.8, 'thud': 0.15, 'stamp': 0.55}[k]
        if k == 'stamp':  # 纸面拍击 + 轻微回弹
            slap = bp(r.standard_normal(n), 1200, 4500) * env_exp(n, 0.012)
            x = x + slap * 0.7; x += np.roll(body * 0.25, int(0.06 * SR))
        x = norm(x, 0.95)
        out = simple_reverb(x, 0.9 if k == 'impact' else 0.4, 0.18 if k == 'impact' else 0.1, seed)
        return out * {'impact': 1.0, 'hit': 0.8, 'thud': 0.7, 'stamp': 0.95}[k]
    if k in ('pop', 'pop-soft', 'pop-big', 'bubble'):
        if k == 'pop': x = _pop(0.12, 1000 + r.uniform(-80, 80), 300, seed)
        elif k == 'pop-soft': x = _pop(0.09, 1400 + r.uniform(-100, 100), 600, seed, 0.8) * 0.6
        elif k == 'pop-big': x = _pop(0.2, 700, 140, seed, 1.2) + _pop(0.2, 180, 60, seed + 1) * 0.6
        else: x = sine_sweep(0.12, 300, 1300) * bell(int(0.12 * SR), 0.3, 1.5) * 0.8
        return pan(norm(x, 0.85), r.uniform(-0.25, 0.25)) * (0.8 if k != 'pop-soft' else 0.55)
    if k == 'click':
        n = int(0.11 * SR); x = np.zeros(n); a = _click(seed); x[:len(a)] += a; b = _click(seed + 1, 2600) * 0.7; x[int(0.07 * SR):int(0.07 * SR) + len(b)] += b
        return pan(norm(x, 0.8), 0.1) * 0.75
    if k in ('tick', 'tick-ok'):
        n = int(0.05 * SR); x = np.sin(2 * np.pi * 2400 * t_axis(0.05)) * env_exp(n, 0.008)
        if k == 'tick-ok':
            n2 = int(0.32 * SR); y = np.zeros(n2); y[:n] += x * 0.6
            for i, f in enumerate((1318.5, 1975.5)):
                s = _bellfm(f, 0.25, 2.0, 1.2, 0.07) * 0.5; st = int((0.03 + i * 0.07) * SR); y[st:st + len(s)] += s[:n2 - st]
            x = y
        return pan(norm(x, 0.7), 0) * 0.6
    if k == 'typing':
        d = d or 0.8; n = int(d * SR); x = np.zeros(n + int(0.03 * SR)); tt = 0.0
        while tt < d:
            c = _click(int(seed + tt * 1000), r.uniform(2200, 4200)) * r.uniform(0.5, 1.0)
            i = int(tt * SR); x[i:i + len(c)] += c[:len(x) - i]; tt += r.uniform(0.055, 0.12)
        return pan(norm(x, 0.7), r.uniform(-0.2, 0.2)) * 0.55
    if k == 'roll':
        d = d or 0.9; n = int(d * SR); x = np.zeros(n + 2000); tt = 0.0
        while tt < d:
            k2 = tt / d; gap = 0.028 + 0.09 * k2 ** 2
            c = np.sin(2 * np.pi * (1800 + 600 * (1 - k2)) * t_axis(0.012)) * env_exp(int(0.012 * SR), 0.003)
            i = int(tt * SR); x[i:i + len(c)] += c * (0.5 + 0.5 * (1 - k2)); tt += gap
        return pan(norm(x, 0.6), 0) * 0.5
    if k in ('ding', 'success', 'notify', 'notify-soft', 'receive', 'send', 'alert'):
        if k == 'ding': x = padadd(_bellfm(1567.98, 1.3, 1.41, 2.2, 0.45) * 0.8, _bellfm(3135.96, 0.8, 1.0, 0.6, 0.18) * 0.2)
        elif k == 'success':
            x = np.zeros(int(1.0 * SR))
            for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
                s = padadd(_pluck(f, 0.55, 0.85, seed + i) * 0.7, _bellfm(f, 0.5, 2.0, 0.8, 0.12) * 0.3)
                st = int(i * 0.075 * SR); x[st:st + len(s)] += s
        elif k in ('notify', 'notify-soft'):
            x = np.zeros(int(0.5 * SR))
            for i, f in enumerate((880, 1318.5) if k == 'notify' else (1318.5,)):
                s = _bellfm(f, 0.4, 3.5, 1.0, 0.09); st = int(i * 0.09 * SR); x[st:st + len(s)] += s
            x *= 0.8 if k == 'notify' else 0.45
        elif k == 'receive':
            x = np.zeros(int(0.4 * SR))
            for i, f in enumerate((1174.7, 1568.0)):
                s = _bellfm(f, 0.3, 2.0, 0.7, 0.06) * 0.6; st = int(i * 0.06 * SR); x[st:st + len(s)] += s
        elif k == 'send': x = sine_sweep(0.16, 500, 1800) * bell(int(0.16 * SR), 0.25, 1.4) * 0.6
        else:
            x = np.zeros(int(0.6 * SR))
            for i in range(3):
                s = np.sign(np.sin(2 * np.pi * 988 * t_axis(0.07))) * env_adsr(int(0.07 * SR), 0.003, 0.05, 0.3, 0.02); s = lp(s, 3000) * 0.4
                st = int(i * 0.14 * SR); x[st:st + len(s)] += s
        return simple_reverb(norm(x, 0.8), 0.6, 0.12, seed) * 0.6
    if k == 'error':
        x = np.zeros(int(0.42 * SR))
        for i, f in enumerate((415.3, 311.1)):
            s = lp(np.sign(np.sin(2 * np.pi * f * t_axis(0.16))), 2200) * env_adsr(int(0.16 * SR), 0.004, 0.1, 0.4, 0.04)
            st = int(i * 0.15 * SR); x[st:st + len(s)] += s * 0.45
        return pan(norm(x, 0.7), 0) * 0.5
    if k in ('scratch', 'marker', 'draw', 'paper'):
        d = d or {'scratch': 0.26, 'marker': 0.32, 'draw': 0.45, 'paper': 0.36}[k]; n = int(d * SR)
        nz = r.standard_normal(n)
        if k == 'scratch': x = bp(nz, 1800, 6500) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t_axis(d))) * bell(n, 0.2, 1.2)
        elif k == 'marker': x = bp(nz, 2400, 5200) * bell(n, 0.15, 1) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t_axis(d)))
        elif k == 'draw': x = bp(nz, 3000, 8000) * bell(n, 0.5, 1) * 0.5
        else: x = bp(nz, 1200, 6000) * bell(n, 0.35, 1.3) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 13 * t_axis(d))))
        return pan(norm(x, 0.6), r.uniform(-0.3, 0.3)) * 0.55
    if k == 'card':
        x = gen('whoosh-soft', 0.22, seed).mean(axis=1) * 0.7
        tap = _click(seed + 3, 1400) * 0.6; x[-len(tap):] += tap[:len(x)]
        return pan(norm(x, 0.7), r.uniform(-0.4, 0.4)) * 0.6
    if k == 'confetti':
        n = int(1.3 * SR); x = np.zeros(n)
        b = _pop(0.15, 600, 120, seed) * 0.8; x[:len(b)] += b
        for i in range(26):
            f = r.uniform(2500, 6500); s = np.sin(2 * np.pi * f * t_axis(0.06)) * env_exp(int(0.06 * SR), 0.012) * r.uniform(0.1, 0.35)
            st = int(r.uniform(0.04, 1.1) * SR); x[st:st + len(s)] += s[:n - st]
        return simple_reverb(norm(x, 0.8), 0.7, 0.2, seed) * 0.7
    if k == 'stack':
        d = d or 1.0; n = int(d * SR) + 4000; x = np.zeros(n); cnt = max(3, int(d * 9))
        for i in range(cnt):
            s = _pop(0.06, 500 + i * 70, 300 + i * 40, seed + i, 0.8) * 0.5; st = int(i * d / cnt * SR); x[st:st + len(s)] += s
        return pan(norm(x, 0.6), 0) * 0.5
    if k == 'zap':
        d = d or 0.35; n = int(d * SR); x = sine_sweep(d, 2400, 180) * env_exp(n, d / 3) * 0.6 + bp(r.standard_normal(n), 2000, 9000) * env_exp(n, 0.05) * 0.5
        x = np.tanh(x * 3) * 0.5
        return pan(norm(x, 0.8), 0) * 0.65
    raise KeyError(kind)

SFX_KINDS = ['whoosh', 'whoosh-soft', 'swoosh-soft', 'air', 'swoosh-in', 'swoosh-out', 'zoom-in', 'zoom-out', 'rise', 'shrink', 'whip',
             'impact', 'hit', 'thud', 'stamp', 'pop', 'pop-soft', 'pop-big', 'bubble', 'click', 'tick', 'tick-ok', 'typing', 'roll',
             'ding', 'success', 'notify', 'notify-soft', 'receive', 'send', 'alert', 'error', 'scratch', 'marker', 'draw', 'paper',
             'card', 'confetti', 'stack', 'zap']
ALIASES = {'swipe': 'whoosh-soft', 'swipe-soft': 'swoosh-soft', 'type-soft': 'typing', 'tick-roll': 'roll', 'crash': 'impact', 'drop': 'impact', 'riser': 'rise'}

# ----------------------------------------------------------------- 采样音效（CC0，assets/sfx/<种类>/NN.wav）
SFX_DIR = Path(__file__).resolve().parents[1] / 'assets' / 'sfx'
_SCACHE, _RMS = {}, {}
LAYER = {'confetti': ('pop-big', 0.55), 'stamp': ('thud', 0.45), 'impact': ('impact', 0.35)}   # 采样 + 合成叠层（补低频/冲击）

def _rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-9)

def _samples(kind):
    if kind not in _SCACHE:
        import wave
        xs = []
        for f in sorted((SFX_DIR / kind).glob('*.wav')) if (SFX_DIR / kind).exists() else []:
            with wave.open(str(f)) as w:
                a = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
                xs.append(a.reshape(-1, w.getnchannels()) if w.getnchannels() == 2 else np.repeat(a[:, None], 2, 1))
        _SCACHE[kind] = xs
    return _SCACHE[kind]

def _synth_level(kind):
    if kind not in _RMS:
        x = gen(kind, None, 101); a = np.abs(x).max(1); m = a > a.max() * 0.05
        _RMS[kind] = _rms(x[m]) if m.any() else _rms(x)
    return _RMS[kind]

def sample_sfx(kind, dur=None, seed=1):
    """有采样就用采样（随机变体 + ±4% 音高浮动 + 响度对齐合成版），没有返回 None。"""
    xs = _samples(kind)
    if not xs: return None
    rng = np.random.default_rng(seed)
    if kind == 'typing':                         # 打字：按时长拼一串键声，节奏不均匀才像真人
        D = float(dur or 0.8); out = np.zeros((int((D + 0.4) * SR), 2)); t = 0.0
        while t < D:
            k = xs[rng.integers(len(xs))]; st = int(t * SR); en = min(len(out), st + len(k))
            out[st:en] += k[:en - st] * rng.uniform(0.6, 1.0); t += rng.uniform(0.06, 0.14)
        x = out
    else:
        x = xs[rng.integers(len(xs))].copy()
        r = rng.uniform(0.96, 1.04)              # 轻微变调，避免同一个声音反复出现
        idx = np.arange(0, len(x) - 1, r); x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in (0, 1)], 1)
        if dur and kind in ('marker', 'draw', 'paper', 'scratch') and len(x) > dur * SR:
            n = int(dur * SR); x = x[:n]; f = min(n, int(0.05 * SR)); x[-f:] *= np.linspace(1, 0, f)[:, None]
    a = np.abs(x).max(1); m = a > a.max() * 0.05
    x = x * (_synth_level(kind) / (_rms(x[m]) if m.any() else _rms(x)))
    if kind in LAYER:
        lk, lg = LAYER[kind]; y = gen(lk, dur, seed) * lg
        n = max(len(x), len(y)); z = np.zeros((n, 2)); z[:len(x)] += x; z[:len(y)] += y; x = z
    return x

def render_sfx(cues, duration, out_path, seed=11, master=0.9, use_samples=True):
    """把音效事件 [{t, kind, gain, dur}] 合成到一条立体声轨"""
    n = int((duration + 2) * SR); bus = np.zeros((n, 2)); used = {}
    cues = sorted(cues, key=lambda c: c['t'])
    last = {}
    for i, c in enumerate(cues):
        k = ALIASES.get(c.get('kind'), c.get('kind'))
        if k not in SFX_KINDS: continue
        t = float(c['t'])
        if t < 0 or t > duration + 0.5: continue
        # 同类音效 80ms 内只保留一个，避免叠成噪音；连续同类自动衰减
        if k in last and t - last[k][0] < 0.08: continue
        streak = last[k][1] + 1 if k in last and t - last[k][0] < 0.6 else 0
        last[k] = (t, streak)
        g = float(c.get('gain', 0.6)) * (0.82 ** min(streak, 4))
        sd = seed + i * 7 + int(t * 100)
        x = (sample_sfx(k, c.get('dur'), sd) if use_samples else None)
        x = (x if x is not None else gen(k, c.get('dur'), sd)) * g
        st = int(t * SR); en = min(n, st + len(x)); bus[st:en] += x[:en - st]
        used[k] = used.get(k, 0) + 1
    bus = bus[:int((duration + 0.6) * SR)]
    peak = np.max(np.abs(bus)) if len(bus) else 0
    if peak > 0.98: bus *= 0.98 / peak
    write_wav(out_path, bus * master)
    return used

def build_library(out_dir, variants=2):
    """把每种音效导出成独立 wav（方便在剪映 / PR / 达芬奇里手动替换）"""
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    for k in SFX_KINDS:
        for v in range(variants):
            write_wav(out / f'{k}_{v + 1}.wav', gen(k, None, 100 + v * 13))
    return len(SFX_KINDS) * variants

# ----------------------------------------------------------------- 背景音乐作曲器
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
CHORD = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'add9': [0, 4, 7, 14], 'm9': [0, 3, 7, 10, 14]}
def parse_chord(s):
    root = s[:2] if len(s) > 1 and s[1] in '#b' else s[:1]
    return NOTE[root], CHORD.get(s[len(root):], CHORD[''])

MOODS = {
    # 情绪：bpm, 和弦进行, 音色配置
    'tech-pulse':    dict(bpm=112, prog=['Am', 'F', 'C', 'G'], swing=0.0, lead='arp', pad='saw', drums='edm', desc='科技 / 产品 / AI 工具：明亮的电子琶音 + 稳定四拍'),
    'bright-pop':    dict(bpm=120, prog=['C', 'G', 'Am', 'F'], swing=0.0, lead='pluck', pad='soft', drums='pop', desc='轻快 / 好物推荐 / 教程：拨弦 + 拍手'),
    'lofi-warm':     dict(bpm=84, prog=['Dm7', 'G7', 'Cmaj7', 'Am7'], swing=0.18, lead='keys', pad='warm', drums='lofi', desc='温暖 / 讲故事 / 经验分享：爵士和弦 + 黑胶底噪'),
    'cinematic-rise': dict(bpm=90, prog=['Am', 'F', 'C', 'Em'], swing=0.0, lead='bell', pad='strings', drums='taiko', desc='大事件 / 行业观察 / 有分量：弦乐铺底 + 太鼓推进'),
    'comic-bounce':  dict(bpm=128, prog=['C', 'Am', 'F', 'G'], swing=0.1, lead='marimba', pad='soft', drums='bounce', desc='搞笑 / 反转 / 轻松：木琴 + 弹跳低音'),
    'calm-ambient':  dict(bpm=72, prog=['Cmaj7', 'Fmaj7', 'Am7', 'Gsus4'], swing=0.0, lead='bell', pad='warm', drums='none', desc='冷静 / 思考 / 深度讲解：柔和铺底，几乎没有鼓'),
}

def _kick(d=0.4):
    n = int(d * SR); body = sine_sweep(d, 150, 42) * env_exp(n, 0.12)
    body[:int(0.004 * SR)] += _click(1, 1800)[:int(0.004 * SR)] * 0.6
    return body
def _snare(seed, d=0.25):
    n = int(d * SR); return bp(_rng(seed).standard_normal(n), 900, 7000) * env_exp(n, 0.06) * 0.7 + np.sin(2 * np.pi * 190 * t_axis(d)) * env_exp(n, 0.05) * 0.5
def _clap(seed, d=0.25):
    n = int(d * SR); x = np.zeros(n); r = _rng(seed)
    for i in range(3):
        s = bp(r.standard_normal(n), 1000, 5000) * env_exp(n, 0.012 if i < 2 else 0.08); x[int(i * 0.011 * SR):] += s[:n - int(i * 0.011 * SR)]
    return x * 0.5
def _hat(seed, d=0.05, open_=False):
    d = 0.22 if open_ else d; n = int(d * SR); return lp(hp(_rng(seed).standard_normal(n), 7000), 13000) * env_exp(n, 0.06 if open_ else 0.012) * 0.22
def _saw(f, t):
    return 2 * ((f * t) % 1) - 1
def _pad(freqs, d, kind, seed):
    t = t_axis(d); n = len(t); x = np.zeros(n); r = _rng(seed)
    for f in freqs:
        for det in (-0.08, 0.0, 0.08):
            ff = f * 2 ** (det / 12)
            if kind in ('saw', 'strings'): x += _saw(ff, t + r.uniform(0, 1)) * 0.33
            else: x += (np.sin(2 * np.pi * ff * t + r.uniform(0, 6)) + 0.3 * np.sin(4 * np.pi * ff * t)) * 0.33
    cut = {'saw': 1800, 'strings': 2400, 'soft': 1500, 'warm': 1100}.get(kind, 1500)
    x = lp(x, cut, 2) / max(1, len(freqs))
    a = {'strings': 0.5, 'warm': 0.22}.get(kind, 0.18)
    return x * env_adsr(n, a, 0.3, 0.85, 0.85, max(0, d - a - 0.3 - 0.85))

def _voice(kind, f, d, seed):
    if kind == 'arp': x = lp(_saw(f, t_axis(d)) * 0.6 + np.sign(np.sin(2 * np.pi * f * t_axis(d))) * 0.25, 3500) * env_adsr(int(d * SR), 0.003, d * 0.6, 0.15, 0.04)
    elif kind == 'pluck': x = _pluck(f, max(d, 0.35), 0.75, seed)
    elif kind == 'marimba': x = _bellfm(f, 0.45, 4.0, 1.6, 0.09) * 0.8 + np.sin(2 * np.pi * f * t_axis(0.45)) * env_exp(int(0.45 * SR), 0.12) * 0.4
    elif kind == 'keys': x = padadd(_bellfm(f, 1.2, 1.0, 0.9, 0.5) * 0.6, np.sin(2 * np.pi * f * t_axis(1.2)) * env_exp(int(1.2 * SR), 0.6) * 0.5)
    elif kind == 'bell': x = _bellfm(f, 1.6, 3.5, 1.8, 0.6) * 0.7
    else: x = np.sin(2 * np.pi * f * t_axis(d)) * env_adsr(int(d * SR), 0.01, d * 0.5, 0.3, 0.05)
    return x

def compose_bgm(duration, mood='tech-pulse', sections=None, seed=7, key_shift=0, bpm=None, out_dir='.', stems=True):
    """按分镜能量曲线作曲。sections: [{t0,t1,energy 0..3}]；能量切换对齐到小节。
    返回 bgm.wav 路径；同时写出 drums/bass/harmony/lead 分轨。"""
    M = dict(MOODS.get(mood, MOODS['tech-pulse']))
    bpm = bpm or M['bpm']; beat = 60.0 / bpm; bar = beat * 4
    nbar = int(math.ceil((duration + 2.5) / bar))
    total = int((nbar * bar + 3) * SR)
    tracks = {k: np.zeros(total) for k in ('drums', 'bass', 'harmony', 'lead')}
    rng = _rng(seed)
    sections = sections or [{'t0': 0, 't1': duration, 'energy': 2}]
    def energy_at(t):
        e = 1
        for s in sections:
            if s['t0'] <= t < s['t1']: e = s['energy']
        return e
    # 每小节能量 = 小节中点能量（自然对齐到小节线）
    bar_e = [energy_at(min(duration, (b + 0.5) * bar)) for b in range(nbar)]
    prog = [parse_chord(c) for c in M['prog']]
    base = 57 + key_shift  # A3
    def place(tr, x, t, g=1.0):
        st = int(t * SR); en = min(total, st + len(x));
        if st < total: tracks[tr][st:en] += x[:en - st] * g
    kick = _kick(); sn = [_snare(seed + i) for i in range(4)]; cl = [_clap(seed + i) for i in range(4)]
    for b in range(nbar):
        e = bar_e[b]; t0 = b * bar
        root, iv = prog[b % len(prog)]
        r_midi = base + ((root - 9) % 12) - (12 if (root - 9) % 12 > 6 else 0)
        # 和声铺底
        freqs = [midi(r_midi + 12 + i) for i in iv[:4]]
        place('harmony', _pad(freqs, bar + 0.9, M['pad'], seed + b), t0, 0.32 if e >= 1 else 0.24)
        # 低音
        if e >= 1 and M['drums'] != 'none':
            pat = [0, 2] if e == 1 else ([0, 1.5, 2, 3.5] if M['drums'] in ('edm', 'bounce') else [0, 2, 2.75])
            for p in pat:
                d = beat * (0.9 if e >= 2 else 1.8)
                f = midi(r_midi - 12 + (7 if (M['drums'] == 'bounce' and p in (1.5, 3.5)) else 0))
                x = (np.sin(2 * np.pi * f * t_axis(d)) * 0.8 + lp(_saw(f, t_axis(d)), 600) * 0.35) * env_adsr(int(d * SR), 0.005, d * 0.6, 0.5, 0.05)
                place('bass', x, t0 + p * beat, 0.5)
        # 鼓
        sw = M['swing']
        if M['drums'] != 'none' and e >= 1:
            for q in range(8):
                tt = t0 + q * beat / 2 + (sw * beat / 2 if q % 2 else 0)
                if e >= 1: place('drums', _hat(seed + q + b * 8, open_=(q % 4 == 2 and e >= 3)), tt, 0.5 if q % 2 else 0.32)
            if e >= 2:
                kp = [0, 1, 2, 3] if M['drums'] in ('edm', 'pop', 'bounce') else ([0, 2.5] if M['drums'] == 'lofi' else [0, 1.5, 2.5])
                for p in kp: place('drums', kick, t0 + p * beat, 0.9 if M['drums'] != 'lofi' else 0.7)
                for p in (1, 3):
                    place('drums', (cl if M['drums'] in ('pop', 'bounce') else sn)[(b + p) % 4], t0 + p * beat + (sw * beat / 4), 0.55 if M['drums'] != 'lofi' else 0.4)
            if M['drums'] == 'taiko' and e >= 2:
                for p in (0, 0.75, 2, 2.5, 3):
                    x = padadd(sine_sweep(0.5, 95, 55) * env_exp(int(0.5 * SR), 0.15), bp(_rng(b).standard_normal(int(0.5 * SR)), 200, 1200) * env_exp(int(0.5 * SR), 0.03) * 0.4)
                    place('drums', x, t0 + p * beat, 0.6 if p in (0, 2) else 0.35)
            if e >= 3 and b % 4 == 0:
                cr = lp(hp(rng.standard_normal(int(1.6 * SR)), 5000), 12000) * env_exp(int(1.6 * SR), 0.35) * 0.1
                place('drums', cr, t0, 0.5)
        # 旋律 / 琶音
        if e >= 2 or (e >= 1 and M['lead'] in ('bell', 'keys')):
            notes = [r_midi + 24 + i for i in iv] + [r_midi + 36]
            if M['lead'] == 'arp':
                steps = 16 if e >= 3 else 8; d = bar / steps
                for q in range(steps): place('lead', _voice('arp', midi(notes[(q * (1 if q % 4 else 2)) % len(notes)]), d * 0.9, seed + q), t0 + q * d, 0.17)
            elif M['lead'] in ('pluck', 'marimba'):
                rhythm = [0, 0.75, 1.5, 2, 2.75, 3.5] if e >= 3 else [0, 1, 2, 3]
                for j, p in enumerate(rhythm): place('lead', _voice(M['lead'], midi(notes[(j * 2 + b) % len(notes)]), beat, seed + j + b), t0 + p * beat, 0.22)
            elif M['lead'] == 'keys':
                for j, p in enumerate([0, 1.5, 3] if e >= 2 else [0, 2]): place('lead', _voice('keys', midi(notes[(j + b) % len(notes)] - 12), bar, seed + j), t0 + p * beat + (sw * beat / 3 if j % 2 else 0), 0.2)
            elif M['lead'] == 'bell':
                for j, p in enumerate([0, 2] if e < 3 else [0, 1, 2, 3]): place('lead', _voice('bell', midi(notes[(j * 3 + b) % len(notes)]), bar, seed + j), t0 + p * beat, 0.14)
    if M['drums'] == 'lofi':  # 黑胶底噪
        cr = rng.standard_normal(total) * 0.004; pops = rng.random(total) < 0.00004; cr[pops] = rng.uniform(-0.15, 0.15, pops.sum())
        tracks['drums'] += lp(cr, 5000)
        for k in ('harmony', 'lead'): tracks[k] = lp(tracks[k], 3200)
    # 空间与母带
    out = np.zeros((total, 2)); stems_out = {}
    send = {'drums': 0.06, 'bass': 0.0, 'harmony': 0.35, 'lead': 0.3}
    for k, x in tracks.items():
        st = simple_reverb(x, 1.8, send[k], seed + 5) if send[k] > 0 else np.stack([x, x], axis=1)
        if k == 'lead': st = st * np.array([0.85, 1.0])
        stems_out[k] = st; out += st
    # 简单总线压缩（RMS 跟随）
    rms = np.sqrt(lp(out.mean(axis=1) ** 2, 1.5) + 1e-9); gain = np.minimum(1, 0.3 / (rms + 1e-6)) ** 0.35
    out *= gain[:, None]
    end = int((duration + 0.2) * SR); fade = int(2.2 * SR)
    out = out[:end + int(1.0 * SR)]
    f = np.ones(len(out)); f[max(0, end - fade):end] = np.linspace(1, 0.0, min(fade, end)); f[end:] = 0
    out *= f[:, None]
    out = norm(out, 0.85)
    od = Path(out_dir); od.mkdir(parents=True, exist_ok=True)
    write_wav(od / 'bgm.wav', out)
    if stems:
        for k, st in stems_out.items():
            st = st[:len(out)] * f[:, None]; write_wav(od / f'bgm_{k}.wav', norm(st, 0.8))
    return str(od / 'bgm.wav'), dict(mood=mood, bpm=bpm, bars=nbar, desc=M['desc'], barEnergy=bar_e)

# ----------------------------------------------------------------- 混音
def ffmpeg():
    return os.environ.get('FFMPEG', 'ffmpeg')

def mix(voice, out, bgm=None, sfx=None, music_vol=0.30, sfx_vol=0.85, duration=None, denoise=False, target=-15.0):
    """人声链 → 配乐侧链闪避 → 音效 → 限幅 → 交付响度"""
    ins = ['-i', voice]; fc = []
    vchain = 'highpass=f=75,lowpass=f=16000' + (',afftdn=nf=-25' if denoise else '') + ',acompressor=threshold=-20dB:ratio=3:attack=8:release=160:makeup=3,loudnorm=I=-16:TP=-2:LRA=9'
    # 先补静音再处理：单遍 loudnorm 在结尾会吞掉约 3 秒，最后按 duration 精确裁切
    fc.append(f'[0:a]aresample=48000,apad=pad_dur=6,{vchain},asplit=2[v][vk]')
    mixins = ['[v]']; idx = 1
    if bgm:
        # 配乐先按实测响度对齐到"人声下方约 5 dB（闪避后约 10 dB）"（music_vol=0.30 → −21 LUFS，每翻倍 +6 dB），保留编曲的能量起伏
        # 再用柔和侧链闪避：说话时再让 3~5 dB，停顿处自然浮上来
        tgt = -21.0 + 20 * math.log10(max(music_vol, 0.01) / 0.30)
        mi = (loudness(bgm) or {}).get('I')
        gdb = (tgt - mi) if mi is not None and mi > -70 else 20 * math.log10(max(music_vol, 0.01))
        ins += ['-i', bgm]; fc.append(f'[{idx}:a]aresample=48000,volume={gdb:.2f}dB[m0]'); fc.append('[m0][vk]sidechaincompress=threshold=0.06:ratio=2.5:attack=40:release=600:makeup=1[m]'); mixins.append('[m]'); idx += 1
    else:
        fc.append('[vk]anullsink')
    if sfx:
        ins += ['-i', sfx]; fc.append(f'[{idx}:a]aresample=48000,highpass=f=50,volume={sfx_vol}[s]'); mixins.append('[s]'); idx += 1
    fc.append(f'{"".join(mixins)}amix=inputs={len(mixins)}:normalize=0:duration=first,alimiter=limit=0.92:level=false,apad=pad_dur=6,loudnorm=I={target}:TP=-1.2:LRA=10,aresample=48000[out]')
    cmd = [ffmpeg(), '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ac', '2', '-c:a', 'pcm_s16le']
    if duration is None:
        r = subprocess.run([os.environ.get('FFPROBE', 'ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice], capture_output=True, text=True)
        duration = float(r.stdout.strip() or 0) or None
    if duration: cmd += ['-t', f'{duration:.3f}']
    cmd.append(out)
    subprocess.run(cmd, check=True)
    return out

def loudness(path):
    r = subprocess.run([ffmpeg(), '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr; I = TP = None
    for line in txt.splitlines()[::-1]:
        s = line.strip()
        if s.startswith('I:') and I is None: I = float(s.split()[1])
        if s.startswith('Peak:') and TP is None: TP = float(s.split()[1])
    return {'I': I, 'TP': TP}

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser(description='大琰DAYAN 声音工具')
    sub = ap.add_subparsers(dest='cmd')
    a = sub.add_parser('library'); a.add_argument('out')
    b = sub.add_parser('bgm'); b.add_argument('duration', type=float); b.add_argument('--mood', default='tech-pulse'); b.add_argument('--out', default='.'); b.add_argument('--seed', type=int, default=7)
    c = sub.add_parser('moods')
    ns = ap.parse_args()
    if ns.cmd == 'library': print(build_library(ns.out), 'files')
    elif ns.cmd == 'bgm': print(compose_bgm(ns.duration, ns.mood, seed=ns.seed, out_dir=ns.out))
    elif ns.cmd == 'moods':
        for k, v in MOODS.items(): print(f'{k:16s} {v["bpm"]:>4} bpm  {v["desc"]}')
    else: ap.print_help()
