#!/usr/bin/env python3
"""工程导出：把一期成片整理成可继续编辑的交付包。

deliver/
  成片.mp4                 最终成片（已烧字幕、已混音）
  画面_无字幕.mp4           纯画面（字幕可在剪辑软件里重新加）
  字幕.srt / 字幕.ass        可编辑字幕
  分轨/人声.wav 音效.wav 配乐.wav 配乐_鼓/贝斯/和声/旋律.wav
  剪辑工程_Premiere_达芬奇.xml   FCP7 XML（Premiere Pro、DaVinci Resolve、Final Cut 可导入）：
                           V1 纯画面，V2 透明动效层（导出过时），A1 人声，A2 音效，A3 配乐；每段一个标记点
  动效层_透明.mov/.webm     只有动画元素的透明视频（dms.py overlay）
  段落标记.csv              每段开始时间 + 口播开头
  HTML动画工程.zip          完整动画工程（timeline.json 改文案/时间/颜色后可重新渲染）
  剪映导入说明.txt
"""
from __future__ import annotations
import json, shutil, zipfile, os
from pathlib import Path
from xml.sax.saxutils import escape

def _frames(t, fps): return int(round(t * fps))

def fcp7_xml(name, fps, W, H, dur, video, tracks, out, media_root=None, base=None, overlay=None, markers=()):
    """FCP7 XML：V1 纯画面（+ V2 透明动效层），N 条音频轨，序列上每段一个标记点（段名 + 口播开头）"""
    tb = int(round(fps)); ntsc = 'TRUE' if abs(fps - round(fps)) > 0.01 else 'FALSE'
    N = _frames(dur, fps)
    def file_el(fid, path, kind):
        if media_root and base:  # 写成用户电脑上的路径（解压位置），导入时不用重新链接
            rel = Path(path).resolve().relative_to(Path(base).resolve()).as_posix()
            root = str(media_root).replace('\\', '/').rstrip('/')
            p = 'file:///' + (root.lstrip('/') + '/' + rel).replace(' ', '%20')
        else: p = Path(path).resolve().as_uri()
        media = (f'<media><video><samplecharacteristics><width>{W}</width><height>{H}</height></samplecharacteristics></video><audio><channelcount>2</channelcount></audio></media>' if kind == 'video'
                 else '<media><audio><samplecharacteristics><samplerate>48000</samplerate><depth>16</depth></samplecharacteristics><channelcount>2</channelcount></audio></media>')
        return f'<file id="{fid}"><name>{escape(Path(path).name)}</name><pathurl>{escape(p)}</pathurl><rate><timebase>{tb}</timebase><ntsc>{ntsc}</ntsc></rate><duration>{N}</duration>{media}</file>'
    def clip(cid, fid, path, kind, track_label):
        return (f'<clipitem id="{cid}"><name>{escape(track_label)}</name><enabled>TRUE</enabled><duration>{N}</duration><rate><timebase>{tb}</timebase><ntsc>{ntsc}</ntsc></rate>'
                f'<start>0</start><end>{N}</end><in>0</in><out>{N}</out>{file_el(fid, path, kind)}'
                + ('<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>' if kind == 'audio' else '') + '</clipitem>')
    v = f'<track>{clip("c-v1", "f-v1", video, "video", "画面")}</track>'
    if overlay: v += f'<track>{clip("c-v2", "f-v2", overlay, "video", "动效层（透明）")}</track>'
    mk = ''.join(f'<marker><name>{escape(n)}</name><comment>{escape(c)}</comment><in>{_frames(t, fps)}</in><out>-1</out></marker>' for t, n, c in markers)
    a = ''.join(f'<track>{clip(f"c-a{i}", f"f-a{i}", p, "audio", lab)}</track>' for i, (lab, p) in enumerate(tracks, 1))
    xml = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="seq-1"><name>{escape(name)}</name><duration>{N}</duration>{mk}'
           f'<rate><timebase>{tb}</timebase><ntsc>{ntsc}</ntsc></rate><media><video><format><samplecharacteristics><width>{W}</width><height>{H}</height>'
           f'<pixelaspectratio>square</pixelaspectratio><rate><timebase>{tb}</timebase><ntsc>{ntsc}</ntsc></rate></samplecharacteristics></format>{v}</video>'
           f'<audio>{a}</audio></media></sequence></xmeml>\n')
    Path(out).write_text(xml, encoding='utf-8')

def export_project(P: Path, include_frames=False, media_root=None):
    P = Path(P); TL = json.loads((P / 'timeline.json').read_text(encoding='utf-8'))
    title = TL.get('title') or 'DAYAN'
    D = P / 'deliver'; (D / '分轨').mkdir(parents=True, exist_ok=True)
    finals = sorted([p for p in P.glob('*.mp4') if p.name not in ('picture.mp4',)], key=lambda p: p.stat().st_mtime)
    lf = P / 'last_final.txt'
    if lf.exists():
        q = Path(lf.read_text(encoding='utf-8').strip())
        if q.exists(): finals = [q]
    if not finals: finals = sorted(P.parent.glob('*.mp4'), key=lambda p: p.stat().st_mtime)
    if finals: shutil.copy(finals[-1], D / f'{title}_成片.mp4')
    pic = P / 'picture.mp4'
    if pic.exists(): shutil.copy(pic, D / f'{title}_画面_无字幕.mp4')
    for src, dst in [('subtitles.srt', f'{title}_字幕.srt'), ('subtitles.ass', f'{title}_字幕.ass')]:
        if (P / src).exists(): shutil.copy(P / src, D / dst)
    stems = [('人声', 'voice.wav'), ('音效', 'sfx.wav'), ('配乐', 'bgm.wav'), ('配乐_鼓', 'bgm_drums.wav'), ('配乐_贝斯', 'bgm_bass.wav'), ('配乐_和声', 'bgm_harmony.wav'), ('配乐_旋律', 'bgm_lead.wav'), ('混音', 'mix.wav')]
    got = {}
    try: no_music = (json.loads((P / 'edit.json').read_text(encoding='utf-8')).get('music') or {}).get('mode', 'none') == 'none'
    except Exception: no_music = False
    if no_music: stems = [x for x in stems if not x[1].startswith('bgm')]
    for lab, f in stems:
        if (P / f).exists(): shutil.copy(P / f, D / '分轨' / f'{lab}.wav'); got[lab] = D / '分轨' / f'{lab}.wav'
    video = D / f'{title}_画面_无字幕.mp4' if pic.exists() else (D / f'{title}_成片.mp4')
    tracks = [(k, got[k]) for k in ('人声', '音效', '配乐') if k in got]
    ov = None; lo = P / 'last_overlay.txt'
    if lo.exists() and Path(lo.read_text(encoding='utf-8').strip()).exists():
        q = Path(lo.read_text(encoding='utf-8').strip()); ov = D / f'{title}_动效层_透明{q.suffix}'; shutil.copy(q, ov)
    markers = [(sc['t0'], sc.get('id', ''), (sc.get('say') or '')[:40]) for sc in TL.get('scenes', [])]
    if video.exists():
        fcp7_xml(title, TL['canvas']['fps'], TL['canvas']['w'], TL['canvas']['h'], TL['duration'], video, tracks, D / f'{title}_剪辑工程_Premiere_达芬奇.xml', media_root, D, overlay=ov, markers=markers)
        (D / f'{title}_段落标记.csv').write_text('时间(秒),时间码,段落,口播\n' + ''.join(f'{t:.2f},{int(t // 60):02d}:{t % 60:05.2f},{n},"{c}"\n' for t, n, c in markers), encoding='utf-8-sig')
    # HTML 动画工程（默认不带人物帧，重建命令会重新抽帧）
    z = D / f'{title}_HTML动画工程.zip'
    skip_dirs = {'deliver', 'stills', '__pycache__'} | (set() if include_frames else {'talk', 'matte', 'media'})
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for p in P.rglob('*'):
            rel = p.relative_to(P)
            if any(part in skip_dirs for part in rel.parts[:1]) or p.is_dir(): continue
            if p.suffix in ('.mp4', '.mov', '.webm') or p.name.endswith('.wav') and p.name.startswith('bgm_'): continue
            zf.write(p, rel.as_posix())
    (D / '剪映导入说明.txt').write_text(
        f"""剪映 / CapCut 里继续编辑：
1. 新建项目，导入「{video.name}」放主轨。
2. 导入 {'、'.join('分轨/' + k + '.wav' for k, _ in tracks)}，音频都从 0 秒对齐。
   {'本期没有背景音乐；想加配乐，另起一条音频轨放你的曲子即可，音效和人声不受影响。' if '配乐' not in got else '想换配乐：删掉配乐那条，换成你的曲子；音效和人声不受影响。'}
3. 文本 → 本地字幕 → 导入「{title}_字幕.srt」，在剪映里改字和样式。
4. 剪映不能直接编辑 HTML 动画参数；要改动画（文字、时间、颜色、位置），改 HTML 动画工程里的 timeline.json / edit.json，
   再让助手运行：python dms.py build → audio → render。

Premiere Pro / DaVinci Resolve / Final Cut：直接导入「{title}_剪辑工程_Premiere_达芬奇.xml」，
画面在 V1，{'、'.join(f'{k}在 A{i}' for i, (k, _) in enumerate(tracks, 1))}；导出过透明动效层时它在 V2（可单独调透明度、关掉或换位置）。
序列上每一段口播都有一个标记点（段名 + 口播开头），也可以看「{title}_段落标记.csv」。
剪映：透明动效层用 .webm 版本（python dms.py overlay 工程 动效层.webm），拖到画中画轨即可。
如果提示找不到媒体：选"重新链接"，指向本文件夹即可（文件名都一一对应）；
或者让助手用 python dms.py export 工程 --media-root "你解压到的文件夹路径" 重新生成 XML。
""", encoding='utf-8')
    return D
