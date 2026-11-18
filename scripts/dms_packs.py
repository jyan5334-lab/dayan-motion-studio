#!/usr/bin/env python3
"""大琰DAYAN 行业模板包（Motion 模板包）：发现、校验、版本要求、语义匹配。

主技能是通用的口播剪辑；行业包只负责"这个行业的画面长什么样、怎么动"。调用、填参、语义编排、人物站位、
内容区、导演检查都由主技能统一处理（用户 2026-11-17 定的分工）。

一个行业包 = 一个文件夹：
  <包名>/
    pack.json            包说明（schema: dayan-pack/1）：id、名称、版本、行业、要求的主技能版本、仓库地址
    templates/<模板>/    模板（template.motion.json + scene.json [+ components.js / style.css] + example.payload.json）
    effects/fx-<包名>-*/ 包里自带的动效（和主技能动效库同样的结构），id 必须以 fx-<包名>- 开头，防止和主库重名
    README.md

安装位置：~/.dayan-motion-studio/packs/<包名>/（环境变量 DMS_PACK_HOME 可改），另外 DMS_PACK_PATHS 里的目录也会被发现
（目录本身是一个包，或者下面放着多个包）。调用包里的模板写 "<包名>:<模板 id>"，例如 "ai-tech:claim-proof"。
"""
from __future__ import annotations
import json, os, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK_SCHEMA = 'dayan-pack/1'
PACK_ID = re.compile(r'^[a-z][a-z0-9-]{1,30}$')
ASPECTS = {'16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1.0, '3:4': 3 / 4, '9:16': 9 / 16}
ROLES = {'hook', 'chapter', 'claim', 'data', 'compare', 'process', 'explain', 'ui-demo', 'quote', 'news', 'product', 'cta', 'outro', 'transition', 'other'}
# 语义标签：和 dms.py scaffold 的语义提示同一套（SEM 的 kind）
SEMANTIC = {'number', 'emotion', 'enum', 'contrast', 'process', 'product', 'quote', 'question', 'cta', 'time'}
PRESENTER_STATES = {'full', 'side', 'card', 'story', 'circle', 'circle-big', 'pip', 'window', 'cutout', 'hidden'}


def dms_version():
    try: return json.loads((ROOT / 'package.json').read_text(encoding='utf-8')).get('version') or '0.0.0'
    except Exception: return '0.0.0'


def vtuple(v):
    parts = [int(x) if x.isdigit() else 0 for x in re.split(r'[.\-+]', str(v or '0'))[:3]]
    return tuple(parts + [0] * (3 - len(parts)))


def requires_ok(spec, have=None):
    """spec 例：">=1.13.0"、">=1.13.0 <2.0.0"、"1.13.x"。返回 (是否满足, 说明)"""
    have = have or dms_version()
    if not spec: return True, ''
    for part in str(spec).split():
        m = re.match(r'^(>=|<=|>|<|==|=)?\s*([\dx.]+)$', part)
        if not m: return False, f'看不懂的版本要求 {part}'
        op, v = m.group(1) or '==', m.group(2)
        if 'x' in v:
            pre = v.split('.x')[0]
            if not (have == pre or have.startswith(pre + '.')): return False, f'需要主技能 {spec}，当前 {have}'
            continue
        a, b = vtuple(have), vtuple(v)
        ok = {'>=': a >= b, '<=': a <= b, '>': a > b, '<': a < b, '==': a == b, '=': a == b}[op]
        if not ok: return False, f'需要主技能 {spec}，当前 {have}'
    return True, ''


def pack_home():
    return Path(os.environ.get('DMS_PACK_HOME') or (Path.home() / '.dayan-motion-studio' / 'packs')).expanduser()


def _pack_dirs():
    roots = [pack_home()] + [Path(p).expanduser() for p in os.environ.get('DMS_PACK_PATHS', '').split(os.pathsep) if p]
    out = []
    for r in roots:
        if not r.exists(): continue
        if (r / 'pack.json').exists(): out.append(r); continue
        out += [d for d in sorted(r.iterdir()) if d.is_dir() and (d / 'pack.json').exists()]
    return out


_CACHE = None
def discover_packs(refresh=False):
    """所有已安装的包：[{id, dir, meta, ok（版本满足）, why}]；同名包只取先找到的（安装目录优先）"""
    global _CACHE
    if _CACHE is not None and not refresh: return _CACHE
    out, seen = [], set()
    for d in _pack_dirs():
        try: meta = json.loads((d / 'pack.json').read_text(encoding='utf-8'))
        except Exception as e:
            out.append({'id': d.name, 'dir': d, 'meta': {}, 'ok': False, 'why': f'pack.json 读不了：{e}'}); continue
        pid = meta.get('id') or d.name
        if pid in seen: continue
        seen.add(pid)
        ok, why = requires_ok((meta.get('requires') or {}).get('dms'))
        out.append({'id': pid, 'dir': d, 'meta': meta, 'ok': ok, 'why': why})
    _CACHE = out
    return out


def get_pack(pid):
    for p in discover_packs():
        if p['id'] == pid: return p
    return None


def need_pack(pid):
    """调用某个包之前的检查：没装 / 版本不满足都直接说清楚怎么办"""
    p = get_pack(pid)
    if not p: raise SystemExit(f'✗ 没有安装行业包 {pid}：先 dms.py pack install <仓库地址 / zip / 文件夹>（已装的包：dms.py pack list）')
    if not p['ok']: raise SystemExit(f'✗ 行业包 {pid} {p["why"]}：先更新主技能（每次调用会自动拉取），或换用和当前版本匹配的包版本')
    return p


def pack_effect_dirs(pids=None):
    """行业包里的动效文件夹；pids=None 表示全部已安装的包"""
    out = []
    for p in discover_packs():
        if pids is not None and p['id'] not in pids: continue
        r = p['dir'] / 'effects'
        if r.exists(): out += [d for d in sorted(r.iterdir()) if (d / 'component.js').exists() and (d / 'effect.json').exists()]
    return out


def aspect_tag(w, h):
    r = w / h
    return min(ASPECTS, key=lambda k: abs(ASPECTS[k] - r))


def template_aspects(c):
    comp = c.get('composition') or {}
    if comp.get('aspects'): return list(comp['aspects'])
    w, h = comp.get('width') or 1920, comp.get('height') or 1080
    return [aspect_tag(w, h)]


# ------------------------------------------------------------------ 校验
def validate_pack(p, main_effect_ids=()):
    """返回 (错误, 提醒)。模板逐个走 dms_templates.validate_template（会检查行业包新增字段）"""
    from dms_templates import discover as tdiscover, validate_template
    d, m = Path(p['dir']), p.get('meta') or {}
    E, W = [], []
    def need(c, msg):
        if not c: E.append(msg)
    need(m.get('schema') == PACK_SCHEMA, f'pack.json 的 schema 必须是 {PACK_SCHEMA}')
    pid = m.get('id', '')
    need(bool(PACK_ID.match(pid or '')), 'id 只能用小写字母、数字和连字符（2–31 位，字母开头），例如 ai-tech')
    for k in ('name', 'version', 'industry', 'desc'): need(isinstance(m.get(k), str) and m.get(k), f'pack.json 缺少 {k}')
    need(bool(re.match(r'^\d+\.\d+\.\d+$', str(m.get('version', '')))), 'version 要写成 1.0.0 这种三段式')
    req = (m.get('requires') or {}).get('dms')
    need(bool(req), 'requires.dms 必填：写这个包要求的主技能最低版本，例如 ">=1.13.0"')
    if req:
        ok, why = requires_ok(req, '999.0.0')
        if not ok and '看不懂' in why: E.append(why)
    if d.name != pid: W.append(f'文件夹名 {d.name} 和包 id {pid} 不一致（安装时会按 id 命名）')
    if not m.get('repo'): W.append('没写 repo（仓库地址）：pack update 只能更新 git 克隆下来的包')
    # 模板
    ts = [t for t in tdiscover() if t.get('pack') == pid]
    if not (d / 'templates').exists() and not (d / 'effects').exists(): E.append('包里既没有 templates/ 也没有 effects/')
    for t in ts:
        errs, warns = validate_template(t)
        E += [f"模板 {t['ref']}：{x}" for x in errs]; W += [f"模板 {t['ref']}：{x}" for x in warns]
    # 动效：id 前缀、不和主库重名
    for fd in pack_effect_dirs([pid]):
        try: em = json.loads((fd / 'effect.json').read_text(encoding='utf-8'))
        except Exception as e: E.append(f'动效 {fd.name}：effect.json 读不了 {e}'); continue
        fid = em.get('id')
        if fid != fd.name: E.append(f'动效 {fd.name}：effect.json 里的 id 是 {fid}，要和文件夹名一致')
        if not str(fid).startswith(f'fx-{pid}-'): E.append(f'动效 {fid}：行业包的动效 id 必须以 fx-{pid}- 开头（防止和主技能动效库重名）')
        if fid in main_effect_ids: E.append(f'动效 {fid} 和主技能动效库重名')
        if f"C['{fid}']" not in (fd / 'component.js').read_text(encoding='utf-8'): E.append(f"动效 {fid}：component.js 里要注册 C['{fid}']")
    return E, W


# ------------------------------------------------------------------ 语义匹配
def suggest_templates(text, hints, pids, canvas=(1920, 1080), position=None, n=3):
    """给一段口播挑行业包里的模板。text 原话；hints 是 scaffold 的语义提示 [{kind, word}]；
    position: 'first' / 'last' / None。返回 [(分数, ref, 标题, 原因)]，分数 ≥ 3 才算"明确匹配"。"""
    from dms_templates import discover as tdiscover
    asp = aspect_tag(*canvas); kinds = {h['kind'] for h in hints or []}
    out = []
    for t in tdiscover():
        if t.get('pack') not in (pids or []) or t.get('impl') is None: continue
        p = get_pack(t['pack'])
        if not p or not p['ok']: continue
        c = t['contract']
        if asp not in template_aspects(c): continue
        trg = c.get('triggers') or {}
        sem = set(trg.get('semantic') or []) & kinds
        kws = [k for k in (trg.get('keywords') or []) if k and k.lower() in text.lower()]
        role = c.get('role')
        score = 2 * len(sem) + 3 * len(kws) + int(c.get('priority', 0))
        why = []
        if sem: why.append('语义 ' + '/'.join(sorted(sem)))
        if kws: why.append('关键词 ' + '/'.join(kws))
        if role == 'hook' and position == 'first': score += 3; why.append('开场位置')
        if role in ('cta', 'outro') and position == 'last': score += 3; why.append('结尾位置')
        if role == 'hook' and position != 'first': score -= 3
        if role in ('cta', 'outro') and position != 'last': score -= 3 if 'cta' not in kinds else 2   # 结尾类模板只在最后一段直接放上，中间提到点赞关注只给提示
        if score > 0 and (sem or kws or why): out.append((score, t['ref'], c.get('title', ''), '，'.join(why)))
    return sorted(out, key=lambda x: -x[0])[:n]
