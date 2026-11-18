# 示例包（demo）

演示一个行业模板包该怎么写，也用来测试主技能的包机制。做自己的行业包时照着它的结构写，规范见主技能 `references/motion-templates.md`。

- `pack.json`：包说明（id、版本、行业、要求的主技能版本）
- `templates/claim-proof/`：结论 + 证据数字（role: claim，语义 number / emotion）
- `templates/follow-outro/`：结尾关注（role: outro，语义 cta）
- `effects/fx-demo-pill/`：包专属动效（id 以 `fx-demo-` 开头）

试用：`python scripts/dms.py pack install examples/packs/demo`，再 `python scripts/dms.py pack check demo --render`。
