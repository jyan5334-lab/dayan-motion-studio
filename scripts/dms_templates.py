#!/usr/bin/env python3
"""大琰DAYAN 内置动效：发现、合同校验、绑定与伸缩。

一个内置动效 = 一个目录：
  templates/<templateId>/
    template.motion.json   合同（schema: dayan-motion/1）：画布、时长、输入槽、场景、动作保护窗、
                           镜头状态、人物状态、对象交接、可伸缩停留点、资源、验收项
    scene.json             实现：场景 + 图层（组件名 / 版位 / 时间 / 属性），字符串里用 {{槽位}} 引用输入
    components.js（可选）  内置动效私有组件（注册到 DMS.components）
    style.css（可选）      内置动效私有样式
    example.payload.json   示例输入
    README.md              用途、何时调用、槽位说明

发现路径：技能内 templates/ + 环境变量 DMS_TEMPLATE_PATHS（多个目录用系统路径分隔符）。
"""
from __future__ import annotations
import json, os, re, copy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = 'dayan-motion/1'
SLOT_TYPES = {'text', 'number', 'list', 'image', 'video', 'color', 'icon', 'bool', 'object'}
STATUSES = {'experimental', 'candidate', 'stable'}
WINDOW_KINDS = {'text-reveal', 'enter', 'act', 'handoff', 'camera', 'settle', 'impact', 'count', 'build', 'exit', 'transition'}
REQUIRED_ACCEPTANCE = {'safe-area', 'cjk-font-render', 'continuous-motion-windows', 'handoff-continuity', 'full-mp4-decode', 'audio-and-caption-review'}
TIME_KEYS_ABS = ('at', 'out')

def roots():
    rs = [ROOT / 'templates']
    env = os.environ.get('DMS_TEMPLATE_PATHS')
    if env: rs += [Path(p).expanduser() for p in env.split(os.pathsep) if p]
    return rs

def discover():
    out, seen = [], set()
    for r in roots():
        if not r.exists(): continue
        for c in sorted(r.rglob('template.motion.json')):
            try:
                t = _load_dir(c.parent)
                key = (t['contract'].get('templateId'), t['contract'].get('version'))
                if key not in seen: seen.add(key); out.append(t)
            except Exception as e:
                out.append({'dir': c.parent, 'contract': {'templateId': c.parent.name, 'version': '?', 'status': 'INVALID', 'title': str(e)}, 'impl': None})
    return out

def _load_dir(d):
    d = Path(d)
    c = json.loads((d / 'template.motion.json').read_text(encoding='utf-8'))
    impl = json.loads((d / 'scene.json').read_text(encoding='utf-8')) if (d / 'scene.json').exists() else None
    return {'dir': d, 'contract': c, 'impl': impl}

def load_template(ref):
    tid, _, ver = str(ref).partition('@')
    cands = [t for t in discover() if t['contract'].get('templateId') == tid and t.get('impl') is not None]
    if ver: cands = [t for t in cands if t['contract'].get('version') == ver or t['contract'].get('version', '').startswith(ver)]
    if not cands: raise SystemExit(f'✗ 找不到内置动效 {ref}（运行 template list 查看可用内置动效）')
    def vkey(t): return [int(x) if x.isdigit() else 0 for x in re.split(r'[.\-]', t['contract'].get('version', '0'))]
    return sorted(cands, key=vkey)[-1]

# ------------------------------------------------------------------ 合同校验
def _engine_components():
    names = set()
    for f in list((ROOT / 'engine').glob('components-*.js')) + [ROOT / 'engine' / 'dayan-walls.js']:
        s = f.read_text(encoding='utf-8')
        names |= set(re.findall(r"\bC\.([A-Za-z][\w]*)\s*=", s)) | set(re.findall(r"BG\('([\w-]+)'", s)) | set(re.findall(r"C\['([\w-]+)'\]\s*=", s))
    return names

def validate_template(t):
    c, impl, d = t['contract'], t.get('impl'), Path(t['dir'])
    E, Wn = [], []
    def need(cond, msg):
        if not cond: E.append(msg)
    need(c.get('schema') == SCHEMA, f'schema 必须是 {SCHEMA}')
    for k in ('templateId', 'version', 'title', 'use'): need(isinstance(c.get(k), str) and c.get(k), f'缺少 {k}')
    need(c.get('status') in STATUSES, f'status 必须是 {sorted(STATUSES)} 之一')
    need(c.get('engine') == 'dayan-html', 'engine 必须是 dayan-html（本技能的时间轴引擎）')
    comp = c.get('composition') or {}
    for k in ('width', 'height', 'fps', 'durationInFrames'): need(isinstance(comp.get(k), int) and comp.get(k) > 0, f'composition.{k} 必须是正整数')
    need(comp.get('layout') in ('landscape', 'portrait', 'square'), 'composition.layout 必须是 landscape / portrait / square')
    if comp.get('width') and comp.get('height') and comp.get('layout'):
        lay = 'landscape' if comp['width'] > comp['height'] else 'portrait' if comp['height'] > comp['width'] else 'square'
        need(lay == comp['layout'], f'layout={comp["layout"]} 与画布 {comp["width"]}x{comp["height"]} 不符（竖屏要用自己的 1080x1920 布局，不能只交换宽高）')
    D = comp.get('durationInFrames') or 0
    # 输入槽
    slots = {}
    for i, s in enumerate(c.get('inputSlots') or []):
        p = f'inputSlots[{i}]'
        need(isinstance(s.get('id'), str), f'{p}.id 缺失'); need(s.get('type') in SLOT_TYPES, f'{p}.type 必须是 {sorted(SLOT_TYPES)} 之一')
        need(isinstance(s.get('required'), bool), f'{p}.required 必须是布尔值')
        if s.get('id') in slots: E.append(f'输入槽重复：{s.get("id")}')
        slots[s.get('id')] = s
        if s.get('type') == 'list': need(isinstance(s.get('minItems', 0), int) and isinstance(s.get('maxItems', 99), int), f'{p} list 需要 minItems/maxItems')
        if s.get('type') == 'text' and not s.get('maxLen'): Wn.append(f'{p}({s.get("id")}) 建议写 maxLen，防止长文案撑破版式')
    need(bool(slots), '至少要有一个输入槽')
    # 图层
    lids = set()
    for i, l in enumerate(c.get('layers') or []):
        need(isinstance(l.get('id'), str) and isinstance(l.get('z'), int) and isinstance(l.get('role'), str), f'layers[{i}] 需要 id / role / z')
        lids.add(l.get('id'))
    # 场景
    scenes = c.get('scenes') or []; need(bool(scenes), '至少要有一个场景'); sid = {}
    prev_end = 0
    for i, s in enumerate(scenes):
        p = f'scenes[{i}]({s.get("id")})'
        for k in ('id', 'role', 'entryState', 'exitState'): need(isinstance(s.get(k), str), f'{p}.{k} 缺失')
        a, b = s.get('startFrame'), s.get('endFrame')
        need(isinstance(a, int) and isinstance(b, int) and 0 <= a < b <= D, f'{p} 帧区间无效（0 ≤ start < end ≤ {D}）')
        need(isinstance(s.get('maxHoldFrames'), int), f'{p}.maxHoldFrames 缺失')
        if isinstance(a, int) and a > prev_end + 1: E.append(f'{p} 与上一场之间有 {a - prev_end} 帧空档')
        if isinstance(b, int): prev_end = max(prev_end, b)
        sid[s.get('id')] = s
    if scenes and isinstance(scenes[0].get('startFrame'), int): need(scenes[0]['startFrame'] == 0, '第一场必须从 0 帧开始')
    need(prev_end == D, f'场景覆盖到 {prev_end} 帧，合同时长 {D} 帧')
    # 动作保护窗
    prot = []
    for i, w in enumerate(c.get('motionWindows') or []):
        p = f'motionWindows[{i}]({w.get("id")})'
        sc = sid.get(w.get('sceneId'))
        need(sc is not None, f'{p}.sceneId 不存在')
        need(w.get('kind') in WINDOW_KINDS, f'{p}.kind 必须是 {sorted(WINDOW_KINDS)} 之一')
        a, b = w.get('startFrame'), w.get('endFrame')
        need(isinstance(a, int) and isinstance(b, int) and a < b, f'{p} 帧区间无效')
        if sc and isinstance(a, int) and isinstance(b, int): need(sc['startFrame'] <= a and b <= sc['endFrame'], f'{p} 超出所属场景 {sc["startFrame"]}–{sc["endFrame"]}')
        if w.get('protected'): prot.append((a, b, w.get('id')))
    need(bool(c.get('motionWindows')), '至少声明一个 motionWindows（动作保护窗：准备→主动作→刹停→收势）')
    # 可伸缩停留点
    for i, h in enumerate(c.get('holds') or []):
        f = h.get('atFrame'); need(isinstance(f, int) and 0 <= f <= D, f'holds[{i}].atFrame 无效')
        need(isinstance(h.get('maxFrames'), int) and h['maxFrames'] >= 0, f'holds[{i}].maxFrames 无效')
        for a, b, wid in prot:
            if isinstance(f, int) and a < f < b: E.append(f'holds[{i}] 落在受保护动作窗 {wid}（{a}–{b}）里：伸长会把动作拉断')
    if not c.get('holds'): Wn.append('没有 holds：内置动效只能按原时长使用，无法适配更长的口播段')
    for i, a in enumerate(c.get('anchors') or []):
        need(isinstance(a.get('id'), str) and isinstance(a.get('atFrame'), int) and 0 <= a['atFrame'] <= D, f'anchors[{i}] 需要 id 与有效 atFrame')
        for a0, b0, wid in prot:
            if isinstance(a.get('atFrame'), int) and a0 < a['atFrame'] < b0: Wn.append(f'锚点 {a.get("id")} 落在动作窗 {wid} 中间：钉到关键词时以动作起点为准更自然')
    # 镜头 / 人物 / 交接
    for i, k in enumerate(c.get('cameraStates') or []):
        need(isinstance(k.get('startFrame'), int) and isinstance(k.get('endFrame'), int) and isinstance(k.get('target'), str), f'cameraStates[{i}] 需要 startFrame/endFrame/target')
    for i, k in enumerate(c.get('presenterStates') or []):
        need(isinstance(k.get('atFrame'), int) and k.get('state') in ('full', 'side', 'card', 'story', 'circle', 'circle-big', 'pip', 'window', 'cutout', 'hidden'), f'presenterStates[{i}] state 无效')
    order = [s.get('id') for s in scenes]
    for i, h in enumerate(c.get('handoffs') or []):
        need(isinstance(h.get('from'), str) and isinstance(h.get('to'), str) and isinstance(h.get('atFrame'), int), f'handoffs[{i}] 需要 from / to / atFrame')
        fs, ts = (h.get('from') or '').split('.')[0], (h.get('to') or '').split('.')[0]
        if fs in sid and ts in sid and abs(order.index(fs) - order.index(ts)) > 1: Wn.append(f'handoffs[{i}] {fs}→{ts} 跨越了不相邻的场景')
    if len(scenes) > 1 and not c.get('handoffs'): Wn.append('多场景内置动效没有 handoffs：场景之间可能像"清空再开场"')
    # 资源
    for i, a in enumerate(c.get('assets') or []):
        need(isinstance(a.get('path'), str) and isinstance(a.get('type'), str), f'assets[{i}] 需要 path / type')
        if a.get('required') and isinstance(a.get('path'), str) and not (d / a['path']).exists() and not (ROOT / a['path']).exists(): E.append(f'assets[{i}] 缺文件：{a["path"]}')
    acc = set(c.get('acceptance') or [])
    miss = REQUIRED_ACCEPTANCE - acc
    if miss: E.append('acceptance 缺少：' + '、'.join(sorted(miss)))
    # 与实现交叉核对
    if impl is None: E.append('缺少 scene.json（内置动效实现）')
    else:
        txt = json.dumps(impl, ensure_ascii=False)
        used = set(re.findall(r'\{\{\s*([\w.]+)\s*\}\}', txt))
        for u in used:
            if u.split('.')[0] not in slots and u.split('.')[0] not in ('brand', 'signature'): E.append(f'scene.json 用了未声明的槽位 {{{{{u}}}}}')
        for k, s in slots.items():
            if s.get('required') and k not in {u.split('.')[0] for u in used}: E.append(f'必填槽位 {k} 在 scene.json 里没有用到')
        isc = [s.get('id') for s in impl.get('scenes', [])]
        if isc != order: E.append(f'scene.json 场景顺序 {isc} 与合同 {order} 不一致')
        fps = comp.get('fps', 60)
        if impl.get('scenes'):
            last = impl['scenes'][-1].get('t1')
            if isinstance(last, (int, float)) and abs(last * fps - D) > 1: E.append(f'scene.json 结束于 {last}s（{last * fps:.0f} 帧），合同 {D} 帧')
            for s, cs in zip(impl['scenes'], scenes):
                if abs(s.get('t0', 0) * fps - cs.get('startFrame', 0)) > 1: E.append(f'scene.json {s.get("id")} 起点与合同不一致')
        known = _engine_components() | set(_template_components(d))
        for comp_name in set(re.findall(r'"c"\s*:\s*"([\w-]+)"', txt)):
            if comp_name not in known: E.append(f'scene.json 使用了不存在的组件 {comp_name}')
    return E, Wn

def _template_components(d):
    f = Path(d) / 'components.js'
    if not f.exists(): return []
    s = f.read_text(encoding='utf-8')
    return re.findall(r"\bC\.([A-Za-z][\w]*)\s*=", s) + re.findall(r"C\['([\w-]+)'\]\s*=", s)

# ------------------------------------------------------------------ 绑定与伸缩
def _subst(o, vals):
    if isinstance(o, str):
        m = re.fullmatch(r'\{\{\s*([\w.]+)\s*\}\}', o)
        if m: return _get(vals, m.group(1), o)
        return re.sub(r'\{\{\s*([\w.]+)\s*\}\}', lambda m: str(_get(vals, m.group(1), '')), o)
    if isinstance(o, list): return [_subst(x, vals) for x in o]
    if isinstance(o, dict): return {k: _subst(v, vals) for k, v in o.items()}
    return o

def _get(vals, path, default):
    cur = vals
    for p in path.split('.'):
        if isinstance(cur, dict) and p in cur: cur = cur[p]
        elif isinstance(cur, list) and p.isdigit() and int(p) < len(cur): cur = cur[int(p)]
        else: return default
    return cur

def bind_slots(t, payload):
    c = t['contract']; vals = {}; errs = []
    for s in c.get('inputSlots', []):
        k = s['id']
        if k in payload: v = payload[k]
        elif 'default' in s: v = s['default']
        elif s.get('required'): errs.append(f'缺少必填槽位 {k}'); continue
        else: v = '' if s['type'] == 'text' else [] if s['type'] == 'list' else None
        if s['type'] == 'text' and isinstance(v, str) and s.get('maxLen') and len(v) > s['maxLen']: errs.append(f'槽位 {k} 超长：{len(v)} > {s["maxLen"]}（请缩写，不要缩小字号硬塞）')
        if s['type'] == 'list' and isinstance(v, list):
            if len(v) < s.get('minItems', 0) or len(v) > s.get('maxItems', 99): errs.append(f'槽位 {k} 需要 {s.get("minItems", 0)}–{s.get("maxItems", 99)} 项，给了 {len(v)} 项')
        vals[k] = v
    for k, v in payload.items():
        if k not in vals: vals[k] = v
    return vals, errs

def time_map(t, target, pins=None):
    """自然时长 → 目标时长：只在 holds 停留点插入（或回收）时间，受保护动作保持原速。
    pins: [(锚点自然时间, 目标时间)]——把内置动效里的锚点钉到口播关键词上，锚点之间的差额由其间的停留点吸收。"""
    c = t['contract']; fps = c['composition']['fps']; Dn = c['composition']['durationInFrames'] / fps
    holds = [{'t': h['atFrame'] / fps, 'max': h['maxFrames'] / fps, 'min': h.get('minusFrames', 0) / fps, 'd': 0.0} for h in sorted(c.get('holds') or [], key=lambda h: h['atFrame'])]
    notes = []
    def spread(lo, hi, need):
        hs = [h for h in holds if lo - 1e-6 <= h['t'] < hi - 1e-6]
        if not hs or abs(need) < 1e-4: return 0.0
        if need > 0:
            cap = sum(h['max'] for h in hs) or 1e-9
            for h in hs: h['d'] += need * (h['max'] / cap)
            return need
        room = sum(h['min'] for h in hs); take = min(room, -need)
        for h in hs: h['d'] -= take * (h['min'] / room if room else 0)
        if take < -need - 1e-3: notes.append(f'锚点需要提前 {-need:.2f}s，只能回收 {take:.2f}s')
        return -take
    prev_nat, shift = 0.0, 0.0
    for nat, tgt in sorted(pins or []):
        shift += spread(prev_nat, nat, (tgt - nat) - shift); prev_nat = nat
    rest = (target - Dn) - shift
    applied = spread(prev_nat, Dn + 1e-3, rest)
    if abs(rest - applied) > 0.05 and rest > 0: notes.append(f'末尾多出 {rest - applied:.2f}s 没有停留点可放，最后一场延长停留')
    ins = [(h['t'], h['d']) for h in holds if abs(h['d']) > 1e-6]
    def f(x):
        return x + sum(d for a, d in ins if x > a + 1e-6)
    return f, Dn, target - Dn, ins, notes

def expand_template(s, E=None):
    t = load_template(s['template']); c = t['contract']
    t0, t1 = float(s['t0']), float(s['t1'])
    vals, errs = bind_slots(t, s.get('slots') or {})
    if errs: raise SystemExit(f"✗ 内置动效 {s['template']}：" + '；'.join(errs))
    fps = c['composition']['fps']; anchors = {a['id']: a['atFrame'] / fps for a in c.get('anchors', [])}
    pins = []
    for aid, target in (s.get('pin') or {}).items():
        if aid not in anchors: raise SystemExit(f"✗ 内置动效 {c['templateId']} 没有锚点 {aid}（可用：{', '.join(anchors) or '无'}）")
        tt = target.get('at') if isinstance(target, dict) else target
        if isinstance(target, dict) and 'cue' in target and E is not None and E.get('_words'):
            import dms
            ts = dms.find_word_times(E['_words'], target['cue'], after=t0 - 0.5, before=t1 + 0.5) or dms.find_word_times(E['_words'], target['cue'])
            if ts: tt = ts[0] + float(target.get('lead', -0.15))
        if tt is not None: pins.append((anchors[aid], float(tt) - t0))
    f, Dn, extra, ins, notes = time_map(t, t1 - t0, pins)
    for n in notes: print(f"⚠ 内置动效 {c['templateId']}：{n}")
    if extra < -0.05 and not pins and sum(d for _, d in ins) > extra + 0.05:
        print(f"⚠ 内置动效 {c['templateId']} 自然时长 {Dn:.2f}s，口播段只有 {t1 - t0:.2f}s：受保护动作不压缩，片段会在下一段转场时被接管")
    impl = _subst(copy.deepcopy(t['impl']), vals)
    out = []
    for k, sc in enumerate(impl.get('scenes', [])):
        sc = copy.deepcopy(sc)
        sc['t0'] = t0 + (0 if k == 0 else f(sc['t0'])); sc['t1'] = t1 if k == len(impl['scenes']) - 1 else t0 + f(sc['t1'])
        sc['id'] = f"{s.get('id', c['templateId'])}·{sc.get('id')}"
        sc['_template'] = f"{c['templateId']}@{c['version']}"
        for key in ('energy', 'theme', 'transition'):
            if key in s and k == 0 and key == 'transition': sc['transition'] = s['transition']
            elif key in s and key != 'transition': sc[key] = s[key]
        for L in sc.get('layers', []) + [b for b in (sc.get('bg') or []) if isinstance(b, dict)]:
            if 'at' in L:
                a_rel = float(L['at']); L['at'] = round(t0 + f(a_rel), 3)
                _remap_nested(L.get('props'), a_rel, f)
            if 'out' in L: L['out'] = round(t0 + f(float(L['out'])), 3)
        out.append(sc)
    if out:
        extra_files = [a['path'] for a in c.get('assets', []) if a.get('type') in ('script', 'style')]
        rel = os.path.relpath(t['dir'], ROOT).replace('\\', '/')
        out[0]['_assets_js'] = [f'{rel}/{Path(p).name}' if not p.startswith('templates/') else p for p in extra_files if p.endswith('.js')]
        out[0]['_assets_css'] = [f'{rel}/{Path(p).name}' if not p.startswith('templates/') else p for p in extra_files if p.endswith('.css')]
    if E is not None and s.get('presenter', True) is not False and impl.get('presenter'):
        pk = E.setdefault('presenter', {}).setdefault('keys', [{'t': 0, 'state': 'full'}])
        for k in impl['presenter']:
            k = dict(k); k['t'] = round(t0 + f(float(k['t'])), 3); pk.append(k)
    if E is not None and impl.get('camera'):
        cam = E.setdefault('camera', [])
        for k in impl['camera']:
            k = dict(k); k['t'] = round(t0 + f(float(k['t'])), 3); cam.append(k)
    return out

def _remap_nested(o, base, f):
    """嵌套在 props 里的相对时间（items[].at、winnerAt、strikeAt…）同样只在 hold 处伸缩"""
    if isinstance(o, list):
        for x in o: _remap_nested(x, base, f)
    elif isinstance(o, dict):
        for k, v in list(o.items()):
            if (k == 'at' or (k.endswith('At') and k != 'stopAt')) and isinstance(v, (int, float)):
                o[k] = round(f(base + v) - f(base), 3)
            elif isinstance(v, (list, dict)): _remap_nested(v, base, f)
