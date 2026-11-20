#!/usr/bin/env python3
"""联网取材（用户 2026-11-20 定）：没有真人出镜、只有一段口播音频时，画面要靠网上的真实素材支撑。

  dms.py grab allow | deny          第一次用时问用户一次，记在本机配置里，以后不再问
  dms.py grab shot <网址> [--to 素材] [--name 名字] [--full] [--selector css] [--scroll 600] [--w 1440 --h 900] [--dark]
                                    网页真实截图（仓库、官网、新闻页、博主主页…）
  dms.py grab clip <视频网址> --start 1:23 --dur 6 [--to 素材] [--name 名字]
                                    视频只截需要的几秒（yt-dlp）；下载后状态是"待确认"，要先问用户能不能用
  dms.py grab ok <文件> | no <文件>  用户确认能用 / 不能用
  dms.py grab list [--to 素材]       列出取到的素材、来源、状态

每个素材都记进 <目录>/素材来源.json（网址、取得时间、类型、状态），交付说明照着它列来源。
lint 会拦下：edit.json 里用到了还没经用户确认（或用户说不能用）的视频片段。
"""
from __future__ import annotations
import json, os, re, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
LOG = '素材来源.json'


def home():
    return Path(os.environ.get('DMS_HOME') or (Path.home() / '.dayan-motion-studio')).expanduser()


def config():
    try: return json.loads((home() / 'config.json').read_text(encoding='utf-8'))
    except Exception: return {}


def save_config(c):
    home().mkdir(parents=True, exist_ok=True)
    (home() / 'config.json').write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8')


ASK = ('还没问过用户是否允许联网取材。先问用户一次（只问这一次，之后记住）：\n'
       '  「剪辑时如果需要真实素材（新闻截图、仓库 / 官网 / 博主主页截图、视频里的几秒片段），我可以自己上网去找、去截。'
       '视频片段下载后会先给你看，你说能用才放进片子。允许吗？」\n'
       '  用户同意 → dms.py grab allow；不同意 → dms.py grab deny（之后只列缺的素材清单让用户自己提供）。\n'
       '  另外：Agent 自己的浏览器 / 联网工具第一次用到某个网站时，宿主可能还会弹授权，请用户选"始终允许这个网站"，之后就不再弹。')


def need_consent():
    v = config().get('webGrab')
    if v == 'allow': return
    if v == 'deny': raise SystemExit('✗ 用户说过不联网取材：把缺的素材（哪张截图、哪段视频、去哪找）列给用户，让用户提供。要改主意：dms.py grab allow')
    raise SystemExit('✗ ' + ASK)


def _log_path(d): return Path(d) / LOG


def load_log(d):
    try: return json.loads(_log_path(d).read_text(encoding='utf-8'))
    except Exception: return []


def add_log(d, item):
    L = [x for x in load_log(d) if x.get('file') != item['file']] + [item]
    _log_path(d).write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8')


def _slug(s, n=40):
    s = re.sub(r'^https?://(www\.)?', '', s)
    return (re.sub(r'[^\w一-鿿.-]+', '_', s).strip('_') or 'grab')[:n]


def _secs(t):
    if t is None: return 0.0
    p = [float(x) for x in str(t).split(':')]
    return sum(v * 60 ** i for i, v in enumerate(reversed(p)))


def shot(url, to='素材', name=None, full=False, selector=None, scroll=0, w=1440, h=900, dark=False, node='node'):
    need_consent()
    d = Path(to); d.mkdir(parents=True, exist_ok=True)
    f = d / f'{name or _slug(url)}.png'
    args = [node, str(HERE / 'grab.mjs'), url, str(f.resolve()), '--w', str(w), '--h', str(h)] + (['--full'] if full else []) + (['--dark'] if dark else []) \
        + (['--selector', selector] if selector else []) + (['--scroll', str(scroll)] if scroll else [])
    r = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True)
    try: res = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: raise SystemExit('✗ 截图失败：' + (r.stderr or r.stdout)[-400:])
    if not res.get('ok'):
        why = res.get('error') or ('页面样式没加载全（' + '；'.join(res.get('failed') or [])[:200] + '）' if res.get('failed') or not res.get('styled') else f"HTTP {res.get('status')}")
        if f.exists(): f.rename(f.with_name(f.stem + '_未成功.png'))
        raise SystemExit(f'✗ {url} 没截成：{why}\n'
                         '  截出来不像真网页的图不能用。换下一条路：用 Agent 自己的浏览器工具打开这个网址截图并存成文件（例如 Claude in Chrome 截图时 save_to_disk）；'
                         '还不行就把网址和要截的位置列给用户，请用户截好放进素材文件夹。')
    add_log(d, {'file': f.name, 'kind': 'screenshot', 'url': url, 'title': res.get('title', ''), 'time': time.strftime('%Y-%m-%d %H:%M'), 'status': 'ok'})
    print(f'✓ 网页截图 → {f}（{res.get("title", "")}）')
    return f


def images(url, to='素材', name=None, n=4, node='node'):
    """取网页配图（新闻配图、文章封面图、产品图）：og:image + 正文里够大的图，下载后转成 jpg/png 原样保存"""
    need_consent()
    d = Path(to); d.mkdir(parents=True, exist_ok=True)
    tmp = d / f'.img_{int(time.time())}'; tmp.mkdir()
    r = subprocess.run([node, str(HERE / 'grab.mjs'), url, str(tmp.resolve()), '--images', '--n', str(n)], cwd=str(ROOT), capture_output=True, text=True)
    try: res = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: shutil.rmtree(tmp, ignore_errors=True); raise SystemExit('✗ 取图失败：' + (r.stderr or r.stdout)[-300:])
    out = []
    for i, x in enumerate(res.get('files') or [], 1):
        src = Path(x['file']); f = d / f"{name or _slug(url, 30)}_{i}{src.suffix}"; shutil.move(str(src), f)
        add_log(d, {'file': f.name, 'kind': 'image', 'url': url, 'image': x['src'], 'note': x.get('why', ''), 'title': res.get('title', ''), 'time': time.strftime('%Y-%m-%d %H:%M'), 'status': 'ok'})
        out.append(f); print(f"✓ 配图 → {f}（{x.get('why', '')}）")
    shutil.rmtree(tmp, ignore_errors=True)
    if not out: raise SystemExit(f"✗ {url} 没取到够大的配图（{res.get('error') or '页面里没有 og:image，也没有宽 ≥800 的图'}）：改用 grab shot 截网页，或换一个来源")
    return out


AGENTS = {
    'claude': ('Claude（Claude Code / Claude 桌面版 / 网页版）', '安装 Claude in Chrome 扩展：https://claude.ai/chrome → 添加到 Chrome → 用同一个 claude.ai 账号登录（多个组织时选和当前对话同一个）'),
    'codex': ('Codex', '在 Codex 应用的「插件」里找到 Chrome，按提示从 Chrome 应用商店安装 Codex 扩展 → 同意 Chrome 的权限 → 在 Chrome 里确认扩展显示已连接；网站第一次访问时选「始终允许」'),
    'workbuddy': ('WorkBuddy', '不需要装扩展：技能自带的无头浏览器（grab shot / grab image）和 yt-dlp（grab clip）就在你电脑上跑。想让 WorkBuddy 自己也能点网页，可在 WorkBuddy「+ → 技能」里搜索安装「浏览器自动化」技能'),
    'doubao': ('豆包', '不需要装扩展：用技能自带的 grab shot / grab image / grab clip。第一次使用时豆包「工作任务」会请求操作电脑的授权，请允许'),
}

PITCH = '为了能更好地获取网上优质素材，从而提升视频质量'


def check(agent=None, node='node'):
    """检查连接情况：联网取材授权、本机无头浏览器能不能截真网页、yt-dlp、以及这个 Agent 该装什么"""
    print('联网取材 · 检查连接情况')
    v = config().get('webGrab'); print('  授权：' + {'allow': '✓ 已允许联网取材', 'deny': '✗ 用户选了不联网取材'}.get(v, '· 还没问过用户（先问一次：dms.py grab allow / deny）'))
    d = home() / '_check'; d.mkdir(parents=True, exist_ok=True); f = d / 'check.png'
    r = subprocess.run([node, str(HERE / 'grab.mjs'), 'https://github.com/', str(f), '--wait', '800'], cwd=str(ROOT), capture_output=True, text=True)
    try: res = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: res = {'ok': False, 'error': (r.stderr or r.stdout)[-200:]}
    local_ok = bool(res.get('ok'))
    print('  本机无头浏览器：' + ('✓ 能截真网页（github.com 样式完整）' if local_ok else '✗ 截不了真网页：' + (res.get('error') or '样式没加载全，多半是工作环境的网络限制')))
    y = shutil.which('yt-dlp') or (__import__('importlib').util.find_spec('yt_dlp') and 'python -m yt_dlp')
    print('  视频片段（yt-dlp）：' + (f'✓ {y}' if y else '· 还没装（第一次 grab clip 时自动装）'))
    a = (agent or '').lower()
    if a in ('claude', 'codex'):
        name, how = AGENTS[a]
        print(f'\n  {name}：必须装浏览器扩展（用户 2026-11-20 定）。还没装 / 没连上时对用户说：')
        print(f'    「{PITCH}，请安装浏览器扩展：{how}。装好后回到这里发一句"检查连接情况"。」')
        print('  装好后由 Agent 自己验证：用扩展打开 https://github.com/ 截一张图（能存成文件、页面是英文原样、没有被自动翻译）才算连上；连上了就按用户的要求开始剪。')
    elif a in AGENTS:
        name, how = AGENTS[a]
        print(f'\n  {name}：{how}')
        if not local_ok: print('  本机无头浏览器现在截不了真网页：检查网络 / 代理后再发"检查连接情况"；仍不行就把要截的网址列给用户。')
    else:
        print('\n  其他 Agent：本机无头浏览器能截就用 grab；截不了时用 Agent 自己的浏览器工具截图存文件，再不行请用户截。')
    return local_ok


def _ytdlp():
    exe = shutil.which('yt-dlp')
    if exe: return [exe]
    try:
        import yt_dlp  # noqa: F401
        return [sys.executable, '-m', 'yt_dlp']
    except ImportError: pass
    print('· 没有 yt-dlp，自动安装 …')
    for extra in ([], ['--break-system-packages'], ['--user']):
        if subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'yt-dlp'] + extra, capture_output=True).returncode == 0:
            return [sys.executable, '-m', 'yt_dlp']
    raise SystemExit('✗ yt-dlp 装不上：手动 pip install yt-dlp 后重试')


def clip(url, start, dur=6.0, to='素材', name=None, ff='ffmpeg'):
    need_consent()
    d = Path(to); d.mkdir(parents=True, exist_ok=True)
    s = _secs(start); e = s + float(dur)
    f = d / f'{name or _slug(url, 30)}_{int(s)}s.mp4'
    tmp = d / (f.stem + '.dl.%(ext)s')
    cmd = _ytdlp() + ['-q', '--no-playlist', '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b',
                      '--download-sections', f'*{s:.2f}-{e:.2f}', '--force-keyframes-at-cuts', '--merge-output-format', 'mp4', '-o', str(tmp), url]
    r = subprocess.run(cmd, capture_output=True, text=True)
    got = sorted(d.glob(f.stem + '.dl.*'))
    if r.returncode or not got:
        raise SystemExit(f'✗ {url} 片段没下下来：{(r.stderr or r.stdout).strip()[-300:]}\n'
                         '  可能是网络打不开、需要登录或地区限制。把网址和时间点列给用户，请用户自己录屏或下载这几秒。')
    # 统一转成剪辑好用的格式（H.264 + AAC，最长边 1920），也顺便把时长卡准
    subprocess.run([ff, '-v', 'error', '-y', '-i', str(got[0]), '-t', f'{float(dur):.2f}', '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast',
                    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(f)], check=True)
    for g in got: g.unlink(missing_ok=True)
    add_log(d, {'file': f.name, 'kind': 'clip', 'url': url, 'start': s, 'dur': float(dur), 'time': time.strftime('%Y-%m-%d %H:%M'), 'status': 'pending'})
    print(f'✓ 视频片段 → {f}（{s:.1f}s 起 {float(dur):.1f}s）\n'
          f'  状态：待确认。先把这段发给用户看，问"这段能不能用"；用户说能用 → dms.py grab ok "{f}"，不能用 → dms.py grab no "{f}"。确认前 lint 会拦住。')
    return f


def mark(file, status):
    f = Path(file); d = f.parent; L = load_log(d)
    hit = [x for x in L if x.get('file') == f.name]
    if not hit: raise SystemExit(f'✗ {d / LOG} 里没有 {f.name}')
    for x in hit: x['status'] = status; x['decided'] = time.strftime('%Y-%m-%d %H:%M')
    _log_path(d).write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"✓ {f.name}：{'用户确认可以用' if status == 'ok' else '用户说不能用（别放进片子）'}")


def listing(to='素材'):
    L = load_log(to)
    if not L: return print(f'{Path(to) / LOG} 还没有素材')
    st = {'ok': '可用', 'pending': '待用户确认', 'rejected': '不能用'}
    for x in L: print(f"  [{st.get(x.get('status'), x.get('status'))}] {x['file']}  ← {x['url']}" + (f"（{x['start']:.0f}s 起 {x['dur']:.0f}s）" if x.get('kind') == 'clip' else ''))


def lint_media(edit_path, E):
    """lint 用：edit.json 引用了未确认 / 被拒的视频片段 → 返回错误列表"""
    base = Path(edit_path).resolve().parent; errs = []
    srcs = {}
    for k, m in (E.get('media') or {}).items():
        s = m.get('src') if isinstance(m, dict) else m
        if s: srcs[(base / s).resolve()] = k
    for logf in list(base.glob(LOG)) + list(base.glob('*/' + LOG)) + list(base.glob('*/*/' + LOG)):
        for x in load_log(logf.parent):
            p = (logf.parent / x['file']).resolve()
            if p in srcs and x.get('kind') == 'clip' and x.get('status') != 'ok':
                errs.append(f"media.{srcs[p]} 用了视频片段 {x['file']}（{x['url']}），" + ('用户还没确认能不能用：先发给用户看，确认后 dms.py grab ok' if x.get('status') == 'pending' else '用户说过不能用：换掉'))
    return errs


def cli(ns, node='node', ff='ffmpeg'):
    a = ns.action
    if a == 'allow': c = config(); c['webGrab'] = 'allow'; save_config(c); return print('✓ 已记住：允许联网取材（以后不再问）')
    if a == 'deny': c = config(); c['webGrab'] = 'deny'; save_config(c); return print('✓ 已记住：不联网取材（缺素材时列清单给用户）')
    if a == 'status': return print({'allow': '允许联网取材', 'deny': '不联网取材'}.get(config().get('webGrab'), '还没问过用户'))
    if a == 'check': return check(getattr(ns, 'agent', None), node)
    if a == 'image': return images(ns.target, ns.to, ns.name, getattr(ns, 'n', 4), node)
    if a == 'shot': return shot(ns.target, ns.to, ns.name, ns.full, ns.selector, ns.scroll, ns.w, ns.h, ns.dark, node)
    if a == 'clip':
        if ns.start is None: raise SystemExit('✗ clip 要写 --start（例如 1:23）')
        return clip(ns.target, ns.start, ns.dur, ns.to, ns.name, ff)
    if a in ('ok', 'no'): return mark(ns.target, 'ok' if a == 'ok' else 'rejected')
    if a == 'list': return listing(ns.to)
