/* =====================================================================
   大琰DAYAN 品牌文字墙（原样移植自 DAYAN 动效库 v6.1）
   两行交替：上行（品牌名，取 edit.json 的 brand.wall[0]）向右、下行（英文名/口号）向左；layout:"library" 时整面倾斜 −5°；
   16 套皮肤的字号、字距、透明度、颜色、描边、渐变、辉光、速度、底色色斑、暗角与库内完全一致。
   与库的区别只有一点：库用 CSS 动画，这里按时间 t 计算位移，任意跳帧结果一致。
   ===================================================================== */
(function () {
  'use strict';
  const DMS = window.DMS, C = DMS.components, E = DMS.ease, lerp = DMS.lerp, prog = DMS.prog, el = DMS.el, esc = DMS.esc;
  const SANS = 'var(--sans)', SERIF = 'var(--serif)';
  DMS.WALL_TXT = ['MOTION · STUDIO', 'CREATE · WITH · AI'];   // 中性占位；实际用使用者自己的品牌（timeline 的 brand.wall）
  DMS.brandWall = () => { const T = window.TIMELINE || {}; return T.brand && Array.isArray(T.brand.wall) && T.brand.wall.length ? T.brand.wall : DMS.WALL_TXT; };
const WALL16 = DMS.WALL16 = [
  { id:'pop', no:'01', name:'泡泡玛特 · 潮玩撞色', en:'POP MART / CANDY CLASH',
    base:'#170A22', sw:['#3AD2FF','#FF4FA3','#FFCE1F'],
    a:{sz:100,ls:4,op:.14,col:'#3AD2FF',wt:700,st:1.6,stc:'#3AD2FF',font:SANS,dur:52},
    b:{sz:78,ls:12,op:.19,col:'#FF4FA3',wt:700,st:1.6,stc:'#FF4FA3',font:SANS,dur:76},
    blobs:['radial-gradient(760px 620px at 16% 12%,rgba(255,79,163,.28),transparent 68%)',
           'radial-gradient(820px 660px at 86% 82%,rgba(58,210,255,.22),transparent 70%)',
           'radial-gradient(560px 460px at 62% 22%,rgba(255,206,31,.20),transparent 72%)'],
    extra:'三团色斑 · 双色实心', scene:'开箱 / 消费 / 潮玩 / Z 世代',
    note:'像潮玩盲盒的糖纸：亮蓝走上一行、玫粉走下一行，两色在深紫底上直接对撞。冷蓝压住甜粉，才不会甜到发腻。' },

  { id:'gold', no:'02', name:'香槟黑金 · 高级稳重', en:'NOIR & CHAMPAGNE',
    base:'#0A0B0E', sw:['#F0D6A0','#B08A46','#A9B7C6'],
    a:{sz:98,ls:7,op:.125,grad:['#F2DCA9','#A8823F'],wt:700,font:SERIF,dur:60},
    b:{sz:74,ls:16,op:.095,col:'#A9B7C6',wt:400,font:SANS,dur:88},
    blobs:['radial-gradient(900px 700px at 78% 8%,rgba(217,177,115,.08),transparent 68%)'],
    extra:'金属渐变字 + 弱金光', scene:'财经 / 商业 / 方法论 / 访谈',
    note:'最克制的一版：暖金走上行、冷银走下行，一暖一冷差半档。金行走竖向金属渐变，低透明度下仍亮得有厚度，不会脏成土黄。' },

  { id:'acid', no:'03', name:'电子酸性 · 大胆撞色', en:'ACID CLASH / NEON',
    base:'#06050C', sw:['#A855F7','#22E6D0','#B026FF'],
    a:{sz:116,ls:-3,op:.22,col:'#A855F7',wt:700,st:1.9,stc:'#A855F7',font:SANS,dur:50,
       sh:'0 0 26px rgba(168,85,247,.85)'},
    b:{sz:78,ls:12,op:.12,col:'#22E6D0',wt:700,font:SANS,dur:72},
    blobs:['radial-gradient(840px 640px at 48% 44%,rgba(168,85,247,.20),transparent 70%)',
           'radial-gradient(620px 480px at 88% 90%,rgba(34,230,208,.07),transparent 72%)'],
    vig:'radial-gradient(120% 90% at 50% 45%,transparent 30%,rgba(10,2,18,.66) 84%,rgba(6,0,12,.92) 100%)',
    extra:'主行辉光 · 副行去光', scene:'AI 工具 / 科技 / 快剪爆点',
    note:'单主色：紫管亮度、青光完全去光，靠明度分主次而不是两行都发光。紫行加 26px 辉光，字距收到 −3 压紧。' },

  { id:'song', no:'04', name:'宋式绢本 · 东方雅致', en:'SONG SILK / INK & CINNABAR',
    base:'#101413', sw:['#E2604A','#7FC6E8','#E4D7BC'],
    a:{sz:86,ls:14,op:.19,col:'#E2604A',wt:400,st:1.1,stc:'#E2604A',font:SERIF,dur:72},
    b:{sz:64,ls:20,op:.17,col:'#7FC6E8',wt:400,font:SERIF,dur:96},
    blobs:['radial-gradient(1000px 760px at 26% 100%,rgba(226,96,74,.12),transparent 66%)'],
    extra:'宋体 + 墨青底', scene:'人文 / 非遗 / 古风 / 慢叙事',
    note:'朱砂与石青是宋画里最经典的一对，底色用墨青而不是纯黑，才压得住矿物颜料的味道。字号收小、字距放到 14 / 20，慢是这版的性格。' },

  { id:'chrome', no:'05', name:'银盐霓虹 · 冷调都市', en:'SILVER HALIDE / NEON',
    base:'#0E1013', sw:['#E9EFF6','#FF6B35','#4A5560'],
    a:{sz:100,ls:3,op:.115,col:'#E9EFF6',wt:700,font:SANS,dur:48},
    b:{sz:78,ls:9,op:.15,col:'#FF6B35',wt:700,st:1.5,stc:'#FF6B35',font:SANS,dur:58},
    blobs:['radial-gradient(820px 640px at 88% 18%,rgba(255,107,53,.14),transparent 68%)',
           'linear-gradient(180deg,transparent 62%,rgba(255,107,53,.045) 100%)'],
    extra:'底部橙红渐隐', scene:'Vlog / 城市 / 夜经济 / 潮流',
    note:'冷银打底、橙红只做下半行的单点撞色，速度偏快，像夜里车灯扫过路面。银白刻意压到 .115，让橙红成为唯一焦点。' },

  { id:'lime', no:'06', name:'荧光黄绿 · 黑字反白', en:'ACID LIME / BLACK TYPE', light:1,
    base:'linear-gradient(150deg,#E6FC8C 0%,#CDF161 46%,#AED838 100%)',
    dark:'#141A0E', darkA:'#CDF161', darkB:'#AED838',
    sw:['#E8FF95','#CFF363','#101408'],
    a:{sz:100,ls:4,op:.19,col:'#101408',wt:700,st:1.7,stc:'#101408',font:SANS,dur:56},
    b:{sz:78,ls:11,op:.155,col:'#101408',wt:700,st:1.7,stc:'#101408',font:SANS,dur:78},
    blobs:['radial-gradient(900px 700px at 16% 6%,rgba(255,255,255,.55),transparent 64%)',
           'radial-gradient(820px 640px at 88% 90%,rgba(96,146,18,.40),transparent 70%)'],
    extra:'亮底 · 黑字 · 全站自动转暗场', scene:'潮流 / 运动 / 青年文化',
    note:'把明暗整反的一版：黄绿地 + 黑字，等于把深底白字翻过来。预览是亮底原貌；套到 130 个深色模板上时自动切成暗场荧光版，否则黑字会消失。' },

  { id:'obsidian', no:'07', name:'曜石鎏金 · 典藏级', en:'OBSIDIAN & GILT',
    base:'#07070A', sw:['#F7E8C4','#C09A4E','#9AA3AE'],
    a:{sz:104,ls:6,op:.185,grad:['#F7E8C4','#C09A4E','#8A6A2A','#E8D3A0'],wt:700,st:2.4,stc:'#C09A4E',font:SERIF,dur:96},
    b:{sz:72,ls:22,op:.10,col:'#9AA3AE',wt:400,font:SANS,dur:126},
    blobs:['radial-gradient(980px 720px at 82% 4%,rgba(192,154,78,.10),transparent 66%)',
           'radial-gradient(760px 620px at 8% 92%,rgba(154,163,174,.06),transparent 70%)'],
    grain:1, extra:'四段金属渐变 + 细颗粒', scene:'品牌片 / 年度复盘 / 高端访谈',
    note:'近黑底 + 四段金属渐变：高光→正金→暗金→回高光，模拟金属受光的暗亮节奏，所以低透明度下依旧有厚度。字号拉满、字距只给 6，靠大、稳、暗压场。' },

  { id:'platinum', no:'08', name:'雾面铂金 · 单色极简', en:'MATTE PLATINUM',
    base:'#090B0F', sw:['#E9EEF4','#9FABBA','#6E7883'],
    a:{sz:112,ls:16,op:.125,col:'#E9EEF4',wt:400,st:2.18,stc:'#E9EEF4',font:SANS,dur:104},
    b:{sz:62,ls:36,op:.105,col:'#9FABBA',wt:400,st:.99,stc:'#9FABBA',font:SANS,dur:132,
       sh:'0 1px 0 rgba(255,255,255,.20),0 -1px 0 rgba(0,0,0,.55)'},
    blobs:['radial-gradient(1000px 560px at 70% -6%,rgba(226,236,248,.05),transparent 70%)',
           'linear-gradient(180deg,rgba(255,255,255,.045) 0%,transparent 36%)'],
    grain:1, extra:'压印阴影 · 全灰阶', scene:'极简产品 / 建筑 / 设计对谈',
    note:'完全没有彩色：只有铂白、铂银、石墨三个灰阶。雅黑 400 太细、700 太浑，用 2.18 / 0.99px 同色描边把笔画吃到 semibold，边缘还是硬的。' },

  { id:'abyss', no:'09', name:'深海黄铜 · 沉静奢华', en:'ABYSS & BRASS',
    base:'#03101B', sw:['#E8CE94','#CBA45C','#8FBEDA'],
    a:{sz:90,ls:20,op:.155,grad:['#E8CE94','#CBA45C','#8E6C2E'],wt:700,font:SERIF,dur:112},
    b:{sz:80,ls:8,op:.155,col:'#8FBEDA',wt:400,font:SANS,dur:88},
    blobs:['radial-gradient(1100px 820px at 10% 92%,rgba(46,90,115,.38),transparent 68%)',
           'radial-gradient(760px 560px at 90% 6%,rgba(203,164,92,.08),transparent 70%)'],
    grain:1, extra:'冷暖错位 · 速度差 24s', scene:'财经深度 / 出海 / 战略',
    note:'深海蓝配黄铜。蓝越深铜越像真金属——冷底会把暖色里的黄往回压，只剩金属反射的那点暖。两行速度差 24s，交叉处缓慢错位，远看是织出来的网。' },

  { id:'hollow', no:'10', name:'玄青描边 · 杂志感', en:'HOLLOW SERIF / EDITORIAL',
    base:'#0A0A0B', sw:['#D8C9A8','#C9C1B0','#0A0A0B'],
    a:{sz:120,ls:10,op:.26,col:'transparent',wt:700,st:1.6,stc:'#D8C9A8',font:SERIF,dur:118},
    b:{sz:80,ls:24,op:.085,col:'#C9C1B0',wt:400,font:SANS,dur:96},
    blobs:['radial-gradient(900px 640px at 76% 20%,rgba(216,201,168,.05),transparent 70%)'],
    grain:1, extra:'1.6px 空心描边', scene:'时尚 / 杂志感 / 艺术',
    note:'空心描边字：只描 1.6px 边、字心完全透明，纸媒标题最常用的手法。描边着墨少，透明度反而能放到 .26；第二行必须配细体实心小字，否则整墙发空。' },

  { id:'satin', no:'11', name:'缎面香槟 · 柔光织物', en:'SATIN CHAMPAGNE',
    base:'linear-gradient(158deg,#1C1512 0%,#120D0B 52%,#0A0807 100%)',
    sw:['#FFF4DA','#E2C68F','#A98A50'],
    a:{sz:100,ls:12,op:.175,grad:['#FFF8E6','#D9BE8C','#9A7A44','#FFEFD0'],wt:700,font:SERIF,dur:108},
    b:{sz:70,ls:26,op:.085,col:'#DCC9A8',wt:400,font:SERIF,dur:136},
    blobs:['radial-gradient(1000px 720px at 22% 0%,rgba(255,244,218,.09),transparent 62%)'],
    grain:1, extra:'四段折光 + 暖褐底', scene:'美妆 / 珠宝 / 高客单',
    note:'缎面感来自渐变的折光带：四段色里第二段压在最亮处偏下，形成一条横向高光，移动时像丝绸反光。底色是暖褐不是纯黑，香槟才不会显冷。' },

  { id:'lacquer', no:'12', name:'朱漆描金 · 东方漆器', en:'LACQUER & GILT',
    base:'#210A0A', sw:['#F0DCA6','#C9A45C','#C4523F'],
    a:{sz:96,ls:9,op:.175,grad:['#F0DCA6','#C9A45C','#8A6A2E'],wt:700,font:SERIF,dur:100},
    b:{sz:74,ls:16,op:.125,col:'#C4523F',wt:400,font:SERIF,dur:120},
    blobs:['radial-gradient(1000px 760px at 80% 88%,rgba(196,82,63,.17),transparent 66%)'],
    grain:1, extra:'漆底 + 描金渐变', scene:'非遗 / 节庆 / 文化 IP',
    note:'朱漆描金：底是暗朱漆不是黑，上一行金、下一行朱，同一色系做深浅两档。漆器的贵气来自红得发闷、金得发暗，所以金用暗金收尾、朱压到 .125。' },

  { id:'frost', no:'13', name:'霜银星尘 · 冷调克制', en:'FROST SILVER',
    base:'#070B12', sw:['#EAF3FC','#BFD6EA','#6E8AA6'],
    a:{sz:102,ls:4,op:.115,col:'#EAF3FC',wt:700,st:1.7,stc:'#EAF3FC',font:SANS,dur:86},
    b:{sz:76,ls:20,op:.10,grad:['#BFD6EA','#6E8AA6'],wt:400,font:SERIF,dur:118},
    blobs:['radial-gradient(1100px 780px at 50% 118%,rgba(110,138,166,.16),transparent 70%)'],
    extra:'冰蓝竖向渐变', scene:'科技 / 数据 / 冷调品牌片',
    note:'上一行纯白压到 .115，是看得见但读不清的分量；下一行换冰蓝渐变，越往下越沉。底色用蓝黑而非墨绿，避免冷调发青像监控画面。' },

  { id:'porcelain', no:'14', name:'素瓷月白 · 亮底高级', en:'PORCELAIN / LIGHT', light:1,
    base:'linear-gradient(165deg,#F6F3EC 0%,#EDE9DF 48%,#E2DCCE 100%)',
    dark:'#1A1713', darkA:'#E9E2D2', darkB:'#B4AC9A',
    sw:['#F6F3EC','#DDD6C6','#2A313C'],
    a:{sz:98,ls:10,op:.13,col:'#2A313C',wt:700,st:1.4,stc:'#2A313C',font:SERIF,dur:110},
    b:{sz:74,ls:22,op:.10,col:'#5E6875',wt:400,font:SANS,dur:92},
    blobs:['radial-gradient(900px 700px at 18% 0%,rgba(255,255,255,.92),transparent 60%)',
           'radial-gradient(880px 660px at 92% 96%,rgba(180,172,152,.36),transparent 66%)'],
    grain:1, extra:'暖白瓷底 · 全站自动转暗场', scene:'家居 / 瓷器 / 茶 / 高端消费',
    note:'高级系唯一的亮底：月白瓷从 #F6F3EC 到 #E2DCCE 过渡，字用墨青不用纯黑。预览是亮底原貌；套到深色模板时自动切成暗场月白版，避免白字全丢。' },

  { id:'jade', no:'15', name:'墨玉叠金 · 静气', en:'JADE INK & GOLD',
    base:'#07120F', sw:['#CBB27A','#6AA391','#2E4A42'],
    a:{sz:100,ls:14,op:.11,col:'#CBB27A',wt:700,st:1.5,stc:'#CBB27A',font:SERIF,dur:114},
    b:{sz:78,ls:24,op:.15,col:'#6AA391',wt:400,font:SERIF,dur:94},
    blobs:['radial-gradient(1000px 780px at 84% 12%,rgba(94,140,126,.17),transparent 66%)',
           'radial-gradient(760px 600px at 10% 92%,rgba(203,178,122,.07),transparent 70%)'],
    grain:1, extra:'近色双行 · 玉质透光', scene:'玉 / 香 / 茶 / 东方生活',
    note:'墨玉配淡金，玉的绿要闷：青玉行只给 .15，几乎融进底里，只在光下泛出来——这正是玉的质感，不亮，但是透。两行一慢一快，交叉时像玉纹在走。' },

  { id:'mist', no:'16', name:'雾霭灰紫 · 极低对比', en:'MIST MAUVE',
    base:'#0E0A15', sw:['#C9B4DB','#8A76A0','#5B5366'],
    a:{sz:112,ls:18,op:.14,grad:['#E9DFF2','#A98BC4'],wt:400,st:2.18,stc:'#E9DFF2',font:SANS,dur:128},
    b:{sz:72,ls:34,op:.10,col:'#8A76A0',wt:400,st:1.08,stc:'#8A76A0',font:SANS,dur:100},
    blobs:['radial-gradient(1000px 760px at 18% 8%,rgba(150,110,178,.18),transparent 70%)',
           'radial-gradient(900px 700px at 88% 92%,rgba(93,124,147,.15),transparent 72%)'],
    grain:1, extra:'藕紫→雾青 双色斑', scene:'口播 / 访谈 / 慢综艺 / 助眠',
    note:'藕紫 + 雾青两块色斑，字面走紫白→藕紫渐变。描边加厚到 2.18 / 1.08px，否则 112px 的常规体在暗底上只剩一层雾气，连骨架都撑不起来。' }
];
  const ALIAS = { violet: 'acid', theme: 'platinum' };
  function rowsDecl(r, s) {
    const v = ['--sz-' + s + ':' + r.sz + 'px', '--ls-' + s + ':' + r.ls + 'px', '--op-' + s + ':' + r.op, '--wt-' + s + ':' + r.wt, '--wf-' + s + ':' + r.font, '--st-' + s + ':' + (r.st || 0) + 'px'];
    if (r.stc) v.push('--stc-' + s + ':' + r.stc);
    if (r.grad) { const n = Math.max(1, r.grad.length - 1); v.push('--col-' + s + ':transparent', '--gr-' + s + ':linear-gradient(180deg,' + r.grad.map((c, i) => c + ' ' + Math.round(i * 100 / n) + '%').join(',') + ')'); }
    else v.push('--col-' + s + ':' + r.col);
    if (r.sh) v.push('--sh-' + s + ':' + r.sh);
    return v.join(';');
  }
  DMS.wallSkin = function (id) { id = ALIAS[id] || id; return WALL16.find(s => s.id === id) || WALL16.find(s => s.id === 'platinum'); };

  /* ====== bg-wall：品牌文字墙
     props: skin（16 套之一，默认 platinum）· light（亮底款用原貌；默认换成暗场变体）
            text（[上行, 下行]，默认取库里的品牌字）· speed（速度倍数，默认 1）
            layout（'tight' 默认：行距收紧、字间空隙小、各行错位交叉；'library' 完全按库原版间距）
            k（亮度系数，tight 默认 1.55，library 默认 0.55）· blur（整面墙柔焦 px，tight 默认 5）
            tilt（倾斜角度，tight 默认 0，library 默认 −5）· lh（行高 = 字号 × lh，默认 1.32）
            gap（每组字后的空隙 em，tight 默认 1.6）· mainStyle（'skin' = 主标识用皮肤原配色；默认参考图的粗黑实心灰）
            mainColor / mainOp（主标识颜色 / 不透明度，默认 #ECEDEF / 0.2）· subFade（副行亮度倍数，默认 1.35）· rows（不填自动铺满）· push（{from, to, dur, blur} 入场推镜） ====== */
  const frac = v => v - Math.floor(v);
  C['bg-wall'] = {
    enter: 'none', enterSfx: null,
    build(e, p) {
      const sk = DMS.wallSkin(p.skin || 'platinum');
      const dark = sk.dark && !p.light;
      const lib = p.layout === 'library';
      const k = p.k == null ? (lib ? 0.55 : 1.55) : p.k;
      e.classList.add('b-dwall'); if (!lib) e.classList.add('tight'); e.dataset.skin = sk.id;
      e.style.cssText += ';' + rowsDecl(sk.a, 'a') + ';' + rowsDecl(sk.b, 'b') + ';--stage-bg:' + (dark ? sk.dark : sk.base) + ';--wall-bg:' + sk.blobs.join(',') + ';--grain-op:' + (sk.grain ? '.055' : '0') + ';' + (sk.vig ? '--vig:' + sk.vig + ';' : '') + '--wall-k:' + k;
      if (!lib) { e.style.setProperty('--lh', p.lh || 1.32); e.style.setProperty('--gap', (p.gap == null ? 1.6 : p.gap) + 'em'); }
      if (dark) { e.style.setProperty('--col-a', sk.darkA); e.style.setProperty('--stc-a', sk.darkA); e.style.setProperty('--col-b', sk.darkB); e.style.setProperty('--stc-b', sk.darkB); }
      // tight 版主标识（上行）：参考 风格 C 品牌文字墙——特粗黑体、实心中性灰、无描边无渐变；副行（下行）保持皮肤原样，亮度略提
      if (!lib && p.mainStyle !== 'skin') {
        const mc = p.mainColor || '#ECEDEF';
        [['--wt-a', '900'], ['--wf-a', 'var(--wall-heavy)'], ['--col-a', mc], ['--stc-a', mc], ['--st-a', '0px'], ['--gr-a', 'none'], ['--sh-a', 'none'], ['--op-a', String(p.mainOp || 0.2)]].forEach(([k, v]) => e.style.setProperty(k, v));
        e.style.setProperty('--op-b', String(+(sk.b.op * (p.subFade == null ? 1.35 : p.subFade)).toFixed(4)));
      }
      const txt = Array.isArray(p.text) && p.text.length ? p.text : DMS.brandWall();
      const wall = el('div', 'wall', '', e);
      const tilt = p.tilt == null ? (lib ? -5 : 0) : p.tilt;
      wall.style.transform = `rotate(${tilt}deg)`;
      const blur = p.blur == null ? (lib ? 0 : 5) : p.blur;
      // 行数：library 默认 10；tight 按墙高自动铺满（墙比画面大 28%，再多给 2 行保险）
      let n = p.rows;
      if (!n) {
        if (lib) n = 10;
        else { const H = (typeof DMS.H === "function" ? DMS.H() : 1080) * 1.28 + 40, lh = p.lh || 1.32; const pair = (sk.a.sz + sk.b.sz * 1.08) * lh; n = Math.ceil(H / pair) * 2 + 2; }
      }
      const rows = Array.from({ length: n }, (_, i) => {
        const r = el('div', 'wrow ' + (i % 2 ? 'b l' : 'a r'), `<span>${esc(txt[i % 2] || txt[0])}</span>`.repeat(5), wall);
        // 错位：每行不同相位（黄金分割散开），开场第一帧上下行就交叉，不会出现一整条竖向空缝
        const ph = lib ? 0 : frac(i * 0.618 + (i % 2 ? 0.5 : 0) + 0.17);
        return { r, dir: i % 2 ? 'l' : 'r', dur: (i % 2 ? sk.b.dur : sk.a.dur), w: 0, ph };
      });
      // 景深副本：同一面墙的柔焦暗化版，只在前景文字周围透出来（遮罩由 core 的景深层每帧给出）
      const soft = el('div', 'soft', '', e);
      const wall2 = wall.cloneNode(true); soft.appendChild(wall2);
      const rows2 = [...wall2.children];
      el('div', 'vig', '', e); el('div', 'grain', '', e);
      return { rows, wall, blur, soft, wall2, rows2 };
    },
    update(e, lt, p, s, L, t) {
      const sp = p.speed == null ? 1 : p.speed;
      s.rows.forEach((R, i) => {
        if (!R.w) R.w = R.r.scrollWidth || 6000;
        const step = R.w / 5;                                    // 一个周期正好移动一份文字，首尾无缝
        const m = frac((t * sp) / R.dur + R.ph) * step;
        const x = R.dir === 'r' ? -step + m : -m;
        R.r.style.transform = `translateX(${x.toFixed(2)}px)`;
        if (s.rows2) s.rows2[i].style.transform = R.r.style.transform;
      });
      let bl = s.blur;
      if (p.push) { const k = E.outExpo(prog(lt, 0, p.push.dur || 1.4)); s.wall.style.scale = lerp(p.push.from || 1.3, p.push.to || 1, k); bl += lerp(p.push.blur || 6, 0, k); }
      s.wall.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
      if (s.wall2) { s.wall2.style.scale = s.wall.style.scale; s.wall2.style.transform = s.wall.style.transform; s.wall2.dataset.bl = bl; }
    },
    depth(e, s, cl, D, info) {
      if (!s.soft) return;
      if (!cl.length || !info) { s.soft.style.display = 'none'; return; }
      s.soft.style.display = 'block';
      const m = DMS.depthMask(e, cl, info, D);
      s.soft.style.webkitMaskImage = s.soft.style.maskImage = m;
      s.wall2.style.filter = `blur(${((+s.wall2.dataset.bl || 0) + D.blur).toFixed(2)}px) brightness(${D.dim})`;
    },
  };
})();
