# 可编辑动效规范：剪辑台能改，改了不坏

用户 2026-11-20 要求。工程导出后要在剪辑台里继续改：改字（内容、字号、颜色）、改配色、拖动 / 缩放 / 隐藏卡里任意一个元素、整张卡移动缩放。所以每个动效都必须做到：**怎么改都不错位、不断开、不出框，动画照常播放。**

适用范围：

- 所有新做的动效（`dms.py effect new` 出来的，以及剪辑时现做、自动沉淀的）；
- 用户丢过来要入库的动效、卡片（HTML、截图参考、视频参考都一样）：**先按本规范升级成可编辑动效再入库，不原样嵌入**；
- 大琰DAYAN 原卡（334 张）和动效库里的老动效：按文末体检结果分批升级，改到哪个就顺手升级哪个。

## 十条硬规则

1. **连线、箭头、流程线、树枝线：两端绑在元素上，自动跟随。**
   用引擎的 `DMS.link(根元素, 起点元素, 终点元素, 选项)` 画，`update` 里每帧调用 `ln.update(k)`（k 是画线进度 0–1）。它每帧按两端元素当前的真实位置重画：起点或终点被拖动、缩放、文字变长撑大，线都接得上；接口方向（上下左右）自动选朝向对方的一边；画线动画按真实路径长度算，线变长变短都完整画完；箭头方向跟着线走。
   不许手画固定坐标的 `<line>` / `<path>` / 细长 div 去“对准”某个元素。
   ```js
   build(e, p) { const a = el('div', 'nd', p.from, e), b = el('div', 'nd', p.to, e);
     return { a, b, ln: DMS.link(e, a, b, { arrow: true, curve: 0.35, from: 'auto', to: 'auto' }) }; },
   update(e, lt, p, s) { s.ln.update(E.inOutCubic(prog(lt, 0.6, 0.5))); }
   ```
   选项：`from` / `to`（`auto` 自动选边，或 `t` `b` `l` `r` `c`）、`curve`（0 直线 – 1 大弧）、`arrow`、`color`、`width`、`gap`（离元素边的距离）、`dash`（虚线，如 `'8 8'`）。

2. **附着装饰跟着它装饰的东西走。**
   圈注、高亮框、荧光笔底、光环、冲击环、扫光、角标、徽章、光标指向点……做成**被装饰元素的子元素**（`position: absolute` 相对它定位，尺寸用 `%` / `em`），这样那个元素被拖动、放大，装饰一起动。确实要单独放的，写 `data-attach="目标的 data-edit"`，并在 `update` 里按目标当前位置摆放。

3. **一个东西一组。** 图标 + 名字 + 数值这类属于同一个节点的内容，放进同一个容器，`data-edit` 写在容器上；剪辑台拖的是整组，不会出现“图标走了、名字留在原地”。

4. **文字自适应，改长改短都不出框。** 卡片的宽高跟着文字走（padding + `auto` / `min-width` / `max-width`）；单行大字用 `DMS.fitText` 按可用宽度自动缩字；多行文字写清最多几行。不许“固定宽高 + `overflow: hidden`”把字裁掉（跑马灯这类故意裁切的，在容器上写 `data-clip`）。

5. **排版用 flex / grid，同组元素互相让位。** 一段字变长，后面的元素自动往后、往下让；不给每段文字各自写死 `left` / `top` 坐标。

6. **数据驱动：数字和图形用同一个参数。** 柱子长度、进度条、环形比例、图表点位、地图热点都从参数里的数值算出来，改数字图形跟着变。数字滚动从目标值生成数字条，不手写固定的滚动序列。

7. **逐字动画、跑马灯副本、倒影都在运行时从文字参数生成。** 不在 HTML 里手写拆好的单字，也不手写多份相同的文字——否则只改到其中一份。

8. **动画不占用 `translate` / `scale` / `rotate` 这三个独立属性。** 它们留给剪辑台做位移和缩放（剪辑台叠加在上面，动画照常在新位置播放）。动画用 `transform`（或内层元素的 `transform`）、`opacity`、`filter`。

9. **颜色走 CSS 变量**（`--accent`、`--card-bg`、`--fg` 等），颜色动画也引用变量；剪辑台改配色时动画不会丢。

10. **可编辑元素有稳定编号。** 每个用户可能想改的元素写 `data-edit="名字"`（如 `title`、`price`、`node-2`），剪辑台按这个编号记录修改；动效以后升级，编号不变，旧工程里的修改照样对得上。不靠元素在页面里的先后顺序。

另外：`effect.json` 写 `params`（机器可读的参数表：每项的类型、名称、分组），剪辑台按它自动生成右侧属性面板，格式见剪辑台设计稿。

## 体检：`dms.py effect editcheck <id>`

`dms.py effect check` 最后会自动跑一遍，也可以单独跑。它用示例参数建一个 16:9 工程，再把所有文字参数加长 60% 建第二个，然后按剪辑台的改法动一动：

| 查什么 | 怎么查 | 级别 |
|---|---|---|
| 第 1 条 · 手画连线 | 细线 / 路径的一端贴着另一个元素，又不是 `DMS.link` 画的 | error |
| 第 1 条 · 连线跟随 | 每条 `DMS.link` 的终点元素挪开 120px，重画一帧，线头必须还接在它身上 | error |
| 第 2 条 · 附着装饰 | 无字的绝对定位装饰压在某个元素上，却不是它的子元素、也没写 `data-attach` | warn |
| 第 4 条 · 文字出框 | 加长后冲出画面、冲出自己的卡片、被裁掉（加长前就有的不算） | error |
| 第 5 条 · 文字压字 | 加长后两段原本不挨着的字压在一起 | error |

- 2026-11-20 以后新建的动效：有 error 就不能入库（不分配编号、不进索引），改好再查。
- 之前的老动效：不拦，结果记进 `effect.json` 的 `editable` 字段当“待升级”清单；改到它时顺手按本规范升级。
- 第 3、6、7、8、9、10 条体检只能查到一部分，做完对照上面十条自己过一遍。

## 2026-11-20 全库体检结果

用自动体检把动效库全部扫了一遍：原卡 334 张、动效库 77 个。每张卡挪动元素、把所有文字加长 60%，看哪里会坏。有的线是装饰性的速度线、刻度线，不一定要绑两端，升级时逐个确认。

| 问题 | 原卡 | 动效库 |
|---|---|---|
| 1 连线 / 箭头不跟随 | 74 | 23 |
| 2 附着装饰不跟随（圈注、高亮、光环、角标、扫光） | 38 | 25 |
| 3 文字变长：冲出卡片 / 画面、被裁 | 31 | 17 |
| 4 文字变长：和别的字压在一起 | 33 | 19 |
| 5 数字和图形脱节（柱子、进度条长度写死） | 28 | — |
| 6 数字滚动停在写死的数字序列 | 2 | — |
| 7 逐字拆开的标题写死在 HTML 里 | 3 | — |
| 8 同一段字有多份副本（跑马灯、倒影） | 21 | — |
| 9 坐标图点位写死（折线、地图热点） | 4 | — |
| 10 颜色本身带动画 | 1 | — |
| 至少有一类问题 | 162 / 334 | 52 / 77 |

动效库里第 5–10 类是按参数生成的，改参数会重建，不算问题。原卡全部是写死坐标的 HTML，第 10 条（稳定编号）334 张都要补。

逐张清单：

- **1 连线**：T01、T02、T03、T04、T08、T13、T15、T18、T21、T23、T24、T28、T32、T35、T47、T50、T54、T55、T74–T83、T87、T88、T89、T99、T100、M04·1–4、M06·1、M06·2、M06·3、M06·5、M07·3、M08·2、M09·4、M11·1、M11·4、M12·4、M13·3、M13·4、M16·5、P02·4、P03·2、P03·3、P03·4、P05·3、P06·1–4、P07·1–3、P09·1–3、P11·2、P11·3、P13·3、P13·5、P13·6、M25·1–4；动效库 fx-analogy-map、fx-app-gen、fx-aspect-drop、fx-bg-blueprint、fx-comment-ask、fx-conveyor、fx-cta-buttons、fx-deliver-fan、fx-director-scan、fx-editor-timeline、fx-film-grain、fx-follow-card、fx-impact-title、fx-line-chart、fx-mind-tree、fx-play-sprite、fx-price-card、fx-raw-clip、fx-scale-balance、fx-shutter、fx-sound-desk、fx-step-pager、fx-storyboard
- **2 附着装饰**：T05、T12、T13、T15、T19、T23、T27、T28、T31、T38、T39、T41、T58、T92、T93、M01·1、M01·4、M02·3、M02·5、M05·3、M12·2、M13·3、M13·4、M16·1、M16·2、M16·4、M16·5、P05·1、P05·2、P05·4、P08·2、P09·3、M25·1–4、P25·1、P25·3；动效库 fx-analogy-map、fx-app-gen、fx-aspect-drop、fx-collab-badge、fx-cta-buttons、fx-cursor-tour、fx-cycle、fx-deliver-fan、fx-director-scan、fx-editor-timeline、fx-end-brand、fx-float-shot、fx-follow-card、fx-funnel、fx-impact-title、fx-keyword-pop、fx-magnify、fx-next-episode、fx-play-sprite、fx-price-card、fx-raw-clip、fx-sound-desk、fx-station-strip、fx-vs-split、fx-word-tape
- **3 文字出框 / 被裁**：T01、T09、T11、T14、T24、T33、T54、T55、M01·1、M02·1、M02·2、M02·3、M11·4、M15·1、M15·2、M15·5、P01·1、P07·4、P08·1、P08·2、P12·3、P13·1–6、M31·1–3、P21·4；动效库 fx-app-gen、fx-bg-tilt-words、fx-browser-shot、fx-collab-badge、fx-comment-ask、fx-comment-pick、fx-editor-timeline、fx-end-brand、fx-hot-list、fx-magnify、fx-phone-comments、fx-rank-bars、fx-series-list、fx-settings-toggle、fx-side-caption、fx-sound-desk、fx-tag-callout
- **4 文字压字**：T01、T09、T29、T31、T33、T43、T54、T55、T62、T63、T64、T70、T71、T87、M01·2、M01·3、M02·2、M09·2、M10·1、M13·1、M13·2、M14·2、M14·3、M14·5、P01·1、P06·1、P13·1–6、M30·1；动效库 fx-analogy-map、fx-app-gen、fx-bg-tilt-words、fx-chapter-tag、fx-comment-pick、fx-cycle、fx-depth-word、fx-director-scan、fx-editor-timeline、fx-follow-card、fx-hook-question、fx-myth-fact、fx-settings-toggle、fx-side-caption、fx-speaker-quote、fx-stack-shots、fx-sticker-pop、fx-storyboard、fx-tag-callout
- **5 数字和图形脱节**：T10、T26、T59、T60、T61、T62、T63、M03·3、M03·4、M06·1、M06·4、M07·2、M07·4、M11·3、M11·4、M13·1、M13·2、M13·5、M14·2、M15·3、M15·4、P02·1、P03·4、P04·3、P05·1、P05·3、P05·4、P10·4
- **6 数字滚动写死**：M03·1、M15·2
- **7 逐字写死**：M03·1、M08·5、M15·2
- **8 多份副本**：T16、T21、T92、T93、M01·4、M07·4、M11·1、M14·5、M15·1、M15·5、P04·3、P06·3、P10·1、P13·2、P13·5、M30·1–3、M31·1–3
- **9 坐标写死**：T12、T64、T65、M11·5
- **10 颜色动画**：M16·4
