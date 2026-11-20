#!/usr/bin/env python3
"""动效目录：把 引擎组件 / 动效库 effects / 大琰DAYAN 原卡库（dayan-library.html）合成一份可搜索的清单；
关键词搜索时再加上本机已安装行业包里的模板和动效（生成的 catalog.md 只收主技能，不带某台电脑装的包）。

  dms.py catalog              → 生成 references/catalog.md（按语义分组的完整目录），打印各类数量
  dms.py catalog 价格 对比     → 按关键词搜索所有来源，给出可直接写进 edit.json 的调用写法

给任何助手用（Claude / Codex / 豆包 / WorkBuddy …）：编排每一段之前先按这句话的语义搜一下，
有现成的就调用，没有再现做（见 references/orchestration.md）。
"""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGES = {'01': '开场 / 标题 / 钩子', '02': '数字 / 数据', '03': '对比 / 反差', '04': '流程 / 关系 / 清单', '05': '引用 / 对话 / 社媒',
          '06': '人物 / 名牌 / 字幕条', '07': '收尾 / CTA / 印章', '08': '转场', '09': '界面 / 手机 / 录屏', '10': '文字墙 / 背景',
          '11': '悬浮画中画 / 卡片 / 标注', '12': '风格质感 / 高亮 / 图标'}
COMP_STAGE = {'title': '01', 'stamp': '07', 'strike': '03', 'type': '09', 'chips': '12', 'equation': '03', 'tags': '12', 'chapter': '01', 'nav': '06',
              'namecard': '06', 'bubble': '05', 'echo': '01', 'quote': '05', 'number': '02', 'gauge': '02', 'bars': '02', 'compare': '03',
              'checklist': '04', 'flow': '04', 'timeline': '04', 'nodes': '04', 'stacks': '02', 'grid': '02', 'cards': '11', 'panel-stack': '04',
              'demo-zone': '11', 'glow-quote': '05', 'window': '09', 'phone': '09', 'doc': '05', 'chat': '05', 'progress': '04', 'media': '11',
              'logo': '01', 'sticker': '12', 'mark': '11', 'arrow': '11', 'dayan': '11', 'confetti': '12', 'burst': '12'}
FX_STAGE = {'fx-before-after': '03', 'fx-editor-timeline': '09', 'fx-cta-buttons': '07', 'fx-repo-card': '09', 'fx-play-sprite': '12', 'fx-horizon-title': '01',
            'fx-comment-pick': '05', 'fx-raw-clip': '11', 'fx-word-tape': '04', 'fx-storyboard': '04', 'fx-sound-desk': '04', 'fx-director-scan': '04',
            'fx-aspect-drop': '11', 'fx-deliver-fan': '11', 'fx-conveyor': '04', 'fx-station-strip': '04'}
TEXT_ONLY = {'title', 'chips', 'glow-quote', 'stamp', 'strike', 'echo', 'tags', 'chapter', 'namecard', 'bubble', 'quote', 'equation', 'nav'}

def components():
    out = []
    md = (ROOT / 'references' / 'components.md').read_text(encoding='utf-8')
    for m in re.finditer(r'^\|\s*`([a-z][a-z0-9-]*)`\s*\|\s*([^|]+)\|\s*([^|]*)\|', md, re.M):
        cid, use, props = m.group(1), m.group(2).strip(), m.group(3).strip()
        if cid.startswith('fx-'): continue
        out.append({'src': '组件', 'id': cid, 'name': cid, 'use': use, 'props': props, 'stage': COMP_STAGE.get(cid, '12'),
                    'call': f'{{"c": "{cid}", "cue": "关键词", "box": [x, y, w, h], "props": {{…}}}}'})
    for cid, use in (('confetti', '彩纸（情绪爆点）'), ('burst', '速度线 + 冲击环（砸字、爆点）')):
        out.append({'src': '组件', 'id': cid, 'name': cid, 'use': use, 'props': '', 'stage': '12', 'call': f'{{"c": "{cid}", "cue": "关键词", "box": [0, 0, 1, 0.8]}}'})
    return out

# ---------------- 使用记录（库越大越要靠它排序）：每次 build 把这条片子用到的组件 / 动效 / 原卡记一笔，存在本机，不进仓库
def usage_path():
    import os
    return Path(os.environ.get('DMS_HOME') or (Path.home() / '.dayan-motion-studio')).expanduser() / 'usage.json'

def load_usage():
    try: return json.loads(usage_path().read_text(encoding='utf-8'))
    except Exception: return {}

def record_usage(ids, project=''):
    import time
    U = load_usage(); today = time.strftime('%Y-%m-%d')
    for i in sorted(set(ids)):
        u = U.setdefault(i, {'uses': 0, 'projects': []})
        if project and project in u['projects']: continue      # 同一个工程反复 build 只算一次
        u['uses'] += 1; u['last'] = today
        if project: u['projects'] = (u['projects'] + [project])[-20:]
    try: usage_path().parent.mkdir(parents=True, exist_ok=True); usage_path().write_text(json.dumps(U, ensure_ascii=False, indent=0), encoding='utf-8')
    except Exception: pass

STATUS_W = {'stable': 4, 'candidate': 2, 'experimental': 0}

# ---------------- 动效编号 + 索引：库再大也只读一个小文件
# 每个动效有固定编号「类号-序号」（如 09-07 = 第 09 类界面演示的第 7 个），一经分配不再变；
# effects/index.json 收录全部动效的编号、名称、用途、触发词、成熟度、变体，搜索只读它，不再逐个打开几百个文件夹。
INDEX = ROOT / 'effects' / 'index.json'

def _fx_stage(e):
    return FX_STAGE.get(e['id']) or (str(e.get('cat', ''))[:2] if str(e.get('cat', ''))[:2] in STAGES else '11')

def build_index(assign=True):
    """重建 effects/index.json；没有编号的动效按类别分配下一个空号并写回 effect.json"""
    rows, metas = [], []
    for d in sorted((ROOT / 'effects').glob('fx-*')):
        try: e = json.loads((d / 'effect.json').read_text(encoding='utf-8'))
        except Exception: continue
        metas.append((d, e))
    used = {}
    for d, e in metas:
        if e.get('code'): used.setdefault(e['code'].split('-')[0], set()).add(int(e['code'].split('-')[1]))
    for d, e in sorted(metas, key=lambda x: (x[1].get('created', ''), x[1]['id'])):
        st = _fx_stage(e)
        if not e.get('code') and assign:
            n = 1
            while n in used.setdefault(st, set()): n += 1
            used[st].add(n); e['code'] = f'{st}-{n:02d}'
            (d / 'effect.json').write_text(json.dumps(e, ensure_ascii=False, indent=1), encoding='utf-8')
        ex = json.dumps((e.get('example') or {}).get('props') or {}, ensure_ascii=False)
        rows.append({'code': e.get('code', ''), 'id': e['id'], 'name': e.get('name', ''), 'stage': st, 'use': e.get('use', ''), 'props': str(e.get('props', '')),
                     'triggers': e.get('triggers') or [], 'status': e.get('status') or 'candidate',
                     'presets': {k: (v.get('use', '') if isinstance(v, dict) else '') for k, v in (e.get('presets') or {}).items()}, 'example': ex[:160]})
    rows.sort(key=lambda r: r['code'])
    INDEX.write_text(json.dumps({'count': len(rows), 'effects': rows}, ensure_ascii=False, indent=0), encoding='utf-8')
    return rows

def load_index():
    """读索引；文件夹数量和索引对不上（新建 / 拷进来的动效）就自动重建"""
    try:
        J = json.loads(INDEX.read_text(encoding='utf-8'))
        if J.get('count') == sum(1 for _ in (ROOT / 'effects').glob('fx-*/effect.json')): return J['effects']
    except Exception: pass
    return build_index()

def effects(with_packs=False):
    out = []
    for r in load_index():
        out.append({'src': '动效库', 'id': r['id'], 'code': r['code'], 'name': r['name'], 'use': r['use'], 'props': r['props'], 'stage': r['stage'],
                    'tags': ' '.join(r['triggers']) + ' ' + ' '.join(f'{k} {v}' for k, v in r['presets'].items()), 'status': r['status'], 'presets': list(r['presets']),
                    'call': f'{{"c": "{r["id"]}", "cue": "关键词", "box": "zone", "props": {r["example"]}}}', 'sheet': f'effects/{r["id"]}/sheet.png'})
    if not with_packs: return out
    dirs = []
    from dms_packs import pack_effect_dirs
    dirs += pack_effect_dirs(None)
    for d in dirs:
        try: e = json.loads((d / 'effect.json').read_text(encoding='utf-8'))
        except Exception: continue
        ex = json.dumps((e.get('example') or {}).get('props') or {}, ensure_ascii=False)
        pre = e.get('presets') or {}
        out.append({'src': '动效库' if d.parent == ROOT / 'effects' else '行业包动效', 'id': e['id'], 'name': e.get('name', ''), 'use': e.get('use', ''), 'props': str(e.get('props', '')),
                    'tags': ' '.join(e.get('triggers') or []) + ' ' + ' '.join(f"{k} {v.get('use', '')}" for k, v in pre.items() if isinstance(v, dict)),
                    'status': e.get('status') or 'candidate', 'presets': list(pre), 'stage': FX_STAGE.get(e['id']) or (str(e.get('cat', ''))[:2] if str(e.get('cat', ''))[:2] in STAGES else '11'),
                    'call': f'{{"c": "{e["id"]}", "cue": "关键词", "box": "zone", "props": {ex[:160]}}}', 'sheet': str(d / 'sheet.png') if d.parent != ROOT / 'effects' else f'effects/{d.name}/sheet.png'})
    return out

ROLE_STAGE = {'hook': '01', 'chapter': '06', 'claim': '01', 'data': '02', 'compare': '03', 'process': '04', 'explain': '04', 'ui-demo': '09',
              'quote': '05', 'news': '05', 'product': '11', 'cta': '07', 'outro': '07', 'transition': '08', 'other': '12'}

def templates():
    """本机已安装行业包里的模板（只在关键词搜索时出现）"""
    from dms_templates import discover
    from dms_packs import template_aspects
    out = []
    for t in discover():
        c = t['contract']
        if not t.get('pack') or t.get('impl') is None: continue
        trg = c.get('triggers') or {}
        out.append({'src': '行业包模板', 'id': t['ref'], 'name': c.get('title', ''), 'use': c.get('use', ''), 'tags': ' '.join((trg.get('keywords') or []) + (trg.get('semantic') or [])),
                    'props': '槽位 ' + '、'.join(s.get('id', '') for s in c.get('inputSlots') or []), 'stage': ROLE_STAGE.get(c.get('role'), '12'),
                    'call': f'场景里写 "template": "{t["ref"]}", "slots": {{…}}（画幅 {"/".join(template_aspects(c))}）', 'sheet': str(Path(t['dir']) / 'sheet.png')})
    return out

def library():
    f = ROOT / 'assets' / 'dayan-library.html'
    if not f.exists(): return []
    s = f.read_text(encoding='utf-8'); dec = json.JSONDecoder(); out = {}
    for m in re.finditer(r'\{"id":"', s):
        try: o, _ = dec.raw_decode(s, m.start())
        except Exception: continue
        if 'name' in o: out.setdefault(o['id'], {}).update(o)
    # 包装件里有一部分是 JS 写法（PP(13, [{ name:'…', use:'…' }])，不是 JSON），比如 P13 真实产品界面（ChatGPT / Claude Code / 豆包 / WorkBuddy …）：
    # 之前目录读不到它们，编排时就找不到"真实界面"卡，这里按 PP 分组补进来
    for m in re.finditer(r'PP\((\d+),\s*\[', s):
        n, i0 = int(m.group(1)), m.end()
        nxt = re.search(r'\nPP\(\d+,\s*\[', s[i0:]); blk = s[i0:i0 + nxt.start()] if nxt else s[i0:i0 + 400000]
        for k, e in enumerate(re.finditer(r"\{\s*name:'([^']*)'(.*?)(?=\n\{\s*name:'|\Z)", blk, re.S), 1):
            cid = f'P{n:02d}·{k}'
            if cid in out: continue
            body = e.group(2); g = lambda key: (re.search(key + r":\s*'([^']*)'", body) or [None, ''])[1]
            sc = re.search(r"scene:\s*\[([^\]]*)\]", body)
            out[cid] = {'id': cid, 'name': e.group(1), 'use': g('use'), 'motion': g('motion'), 'stage': f'{n:02d}' if n <= 12 else '09',
                        'scene': re.findall(r"'([^']*)'", sc.group(1)) if sc else [], 'type': '包装件'}
    res = []
    for o in out.values():
        slots = o.get('slotList') or o.get('slots') or []
        if isinstance(slots, dict): slots = list(slots)
        slots = [x if isinstance(x, str) else (x.get('k') or x.get('key') or x.get('id') or '') for x in slots]
        txt = ', '.join(f'"{k}": "…"' for k in slots[:4] if k)
        res.append({'src': '原卡库', 'id': o['id'], 'name': o.get('name', ''), 'use': o.get('use', ''), 'props': o.get('motion', ''), 'stage': o.get('stage') or '12',
                    'tags': ' '.join(o.get('scene') or []), 'kind': o.get('type', ''),
                    'call': f'先 dms.py card {o["id"]} 看样板文字 → {{"c": "dayan", "cue": "关键词", "box": "full", "props": {{"id": "{o["id"]}", "replace": [["样板文字", "本期口播的内容"], …]}}}}'})   # 不输出 source（参考片来源，匿名规则）
    return sorted(res, key=lambda x: (x['stage'], x['id']))

def everything(with_packs=False):
    return components() + effects(with_packs) + (templates() if with_packs else []) + library()

SYN = {   # 口播里的说法 → 目录里的说法（搜索时一起找）
    '等待': ['进度', '执行'], '慢': ['进度', '对比'], '卡住': ['进度'], '断线': ['进度', '警告'], '思考': ['进度', '对话'],
    '快': ['数字', '倍'], '速度': ['数字', '倍'], '倍': ['数字'], '便宜': ['价格', '成本'], '成本': ['价格', '数字'], '钱': ['价格'], '贵': ['价格'],
    '比': ['对比'], 'vs': ['对比'], '不一样': ['对比', '前后'], '以前': ['前后', '对比'], '现在': ['前后'],
    '步骤': ['流程'], '先': ['流程'], '然后': ['流程'], '怎么做': ['流程', '步骤'], '注意': ['印章', '警告'], '风险': ['警告', '印章'], '提醒': ['印章'],
    '问': ['对话', '聊天'], '回答': ['对话'], '告诉': ['对话'], '要求': ['对话'], '意见': ['对话'], '发给': ['对话'], '发过去': ['对话'], '回我': ['对话'], '提示词': ['输入', '打字'], '命令': ['终端', '打字'], '代码': ['终端', '代码'],
    '软件': ['窗口', '界面'], '网站': ['窗口', '界面'], '录屏': ['窗口'], '手机': ['手机', '通知'], '粉丝': ['数字', '通知'],
    '优势': ['叠卡', '功能'], '功能': ['叠卡'], '组成': ['节点'], '很多': ['网格'], '挑': ['网格', '高亮'], '结论': ['大字', '印章'],
    '震惊': ['砸', '印章'], '夯': ['砸', '印章'], '厉害': ['砸', '彩纸'], '完美': ['彩纸', '印章'], '关注': ['三连', '关注'], '点赞': ['三连'], '开源': ['仓库'],
    '热点': ['新闻', '热榜'], '新闻': ['新闻', '热榜'], '网友': ['评论', '社媒'], '评论': ['评论'], '排名': ['排行'], '第一': ['排行'], '占比': ['环形'], '趋势': ['折线'], '增长': ['折线', '数字'],
    '下期': ['预告'], '系列': ['目录'], '官网': ['浏览器'], '截图': ['截图', '浏览器'], '细节': ['放大镜'], '转折': ['故障', '转场'], '回忆': ['漏光', '光斑'],
}

def search(words, limit=8):
    items = everything(with_packs=True); ks = [w.lower() for w in words if w.strip()]; U = load_usage()
    for w in list(ks):
        for k, v in SYN.items():
            if k in w: ks += [x for x in v if x not in ks]
    def score(it):
        hay = ' '.join(str(it.get(k, '')) for k in ('id', 'code', 'name', 'use', 'props', 'tags')).lower() + ' ' + STAGES.get(it['stage'], '')
        sc = sum(hay.count(k) * (3 if k in (it['name'] or '').lower() or k in (it['use'] or '').lower()[:30] else 1) for k in ks)
        if it['src'] in ('行业包模板', '行业包动效') and sc: return sc * 2 + 5   # 装了行业包：同等匹配时包里的优先（这个行业专门做的）
        return sc * 2 + 3 if it['src'] in ('动效库', '组件') and sc else sc   # 同等匹配时优先引擎组件和动效库（能按关键词对齐、自带音效、三画幅自适应）
    import math
    def rank(it):   # 先看语义匹配，同等匹配时：成熟度（stable > candidate > experimental）> 用得多的 > 新的
        sc = score(it)
        if sc <= 0: return 0
        u = (U.get(it['id']) or {}).get('uses', 0)
        return sc + STATUS_W.get(it.get('status') or ('stable' if it['src'] in ('组件', '原卡库') else 'candidate'), 2) + min(4, math.log2(u + 1))
    hits = sorted((x for x in items if rank(x) > 0), key=lambda x: -rank(x))[:limit]
    if hits: print(f'（按匹配度 + 成熟度 + 使用次数排序，只列前 {limit} 个；要更多加 --limit）')
    if not hits: print('没有匹配：换个说法（如"数字""价格""对比""流程""聊天""手机""印章""开场"），或按 orchestration.md 第 4 节现做一个新动效'); return
    for it in hits:
        u = (U.get(it['id']) or {}).get('uses', 0); st = it.get('status')
        print(f"[{it['src']}] {('#' + it['code'] + ' ') if it.get('code') else ''}{it['id']} · {it['name']} — {STAGES.get(it['stage'], '')}" + (f"  〔{st}〕" if st else '') + (f"  用过 {u} 次" if u else '') + (f"  变体：{'、'.join(it['presets'])}" if it.get('presets') else ''))
        print(f"    用在：{it['use'][:90]}")
        if it.get('props'): print(f"    {'动作' if it['src'] == '原卡库' else '参数'}：{str(it['props'])[:90]}")
        print(f"    写法：{it['call']}")
        if it.get('sheet'): print(f"    样张：{it['sheet']}")

def write_md(path=None):
    items = everything(); path = Path(path or (ROOT / 'references' / 'catalog.md'))
    n = {k: sum(1 for x in items if x['src'] == k) for k in ('组件', '动效库', '原卡库')}
    L = ['# 动效目录（自动生成：`dms.py catalog`）', '',
         f"共 {sum(n.values())} 项：引擎组件 {n['组件']} · 动效库 {n['动效库']} · 大琰DAYAN 原卡 {n['原卡库']}。按语义分组；编排时先在对应分组里挑，"
         '找不到就 `dms.py catalog 关键词` 搜，再找不到才现做新动效（references/orchestration.md）。', '',
         '**库会越来越大：不要整份读这个文件。** 每段口播用 2–3 个关键词 `dms.py catalog 关键词` 搜，只看排在前面的几个（按匹配度 + 成熟度 + 使用次数排序）；这份目录只用来按分组浏览。★ = stable（多期真实使用验证过）。', '',
         '调用写法：组件和动效库直接 `{"c": "<id>", …}`。装了行业模板包时，`dms.py catalog 关键词` 会把包里的模板和动效一起搜出来，模板在场景上写 `"template": "<包名>:<模板 id>"`（见 references/motion-templates.md）。', '',
         ('（本机没有原卡库 `assets/dayan-library.html`：原卡不在目录里，放入后重新运行 `dms.py catalog`。）' if not n['原卡库'] else '') + '\n\n' +
         '**原卡（328 张）可以直接改来用**：卡里的文字、数字、价格、产品名都是样板。先 `dms.py card <卡号>` 看样张和卡里全部可见文字，再写 `{"c": "dayan", "box": "full", "props": {"id": "<卡号>", "replace": [["样板文字", "本期口播的内容"], …]}}`，每一条可见文字都换成本期内容（不要的换成 ""），换完再看一次样张。原卡是 1920×1080 横屏版式；原卡里的文字墙和署名会自动换成 edit.json 的 brand。', '']
    for st, title in STAGES.items():
        grp = [x for x in items if x['stage'] == st]
        if not grp: continue
        L += [f'## {st} · {title}', '', '| 来源 | id | 名称 | 用在 |', '|---|---|---|---|']
        for x in sorted(grp, key=lambda x: (['组件', '动效库', '原卡库'].index(x['src']), -STATUS_W.get(x.get('status') or 'candidate', 2))):
            cell = lambda s, n=46: str(s).replace('|', '/').replace('\n', ' ')[:n]
            L.append(f"| {x['src']} | {('#' + x['code'] + ' ') if x.get('code') else ''}`{x['id']}` | {cell(x['name'], 20)}{' ★' if x.get('status') == 'stable' else ''} | {cell(x['use'])} |")
        L.append('')
    path.write_text('\n'.join(L), encoding='utf-8')
    return n, path
