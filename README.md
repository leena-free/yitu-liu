# 一图流 · 飞书白板一键生成

> 给一句话、选一个风格，直接产出一张精美的**可编辑**飞书白板，返回文档链接。

这是一个 Agent Skill（`SKILL.md`），给 Claude Code / Codex / OpenClaw 等会读 `SKILL.md` 的智能体用。

## 它解决什么

做汇报、宣贯、知识沉淀时，"这张图怎么做"通常要花掉一两个小时：找参考、配色、排版、对齐、改字体。
这个技能把这套动作固化成一条流水线 —— **主题 + 风格 → SVG → PNG 预览 → 飞书白板 → 文档链接**。

产出的是**真白板**（可在飞书里继续拖拽编辑），不是一张截图。

## 管线

```
主题 + 风格
   ↓  ① 生成 SVG（按 RULES.md 硬规则）
  SVG
   ↓  ② 渲染 PNG 预览（whiteboard-cli）
  PNG
   ↓  ③ 转 OpenAPI JSON（Node 写文件，避免 BOM/CRLF）
  JSON
   ↓  ④ 建含白板块的飞书文档
  文档 + block_token
   ↓  ⑤ 上传白板内容
  可访问链接
```

## 35 种风格

| 档位 | 数量 | 适用 | 风格 |
|---|---|---|---|
| **克制** Restrained | 9 | 安静、编辑感、严肃汇报 | Avocado Press · Grove · Jade Lens · Long Table · Macchiato · Monochrome · Papier Bleu · Reading Room · Salmon Stamp |
| **均衡** Balanced | 15 | 有亮点但不过闹，通用性最强 | Apricot Arc · Berry Pop · Bold Poster · Checker Bloom · Cobalt Bloom · Coral · Cut Bloom · Editorial Forest · Lime Slab · Linen Cut · Pin & Paper · Raw Grid · Riptide Cobalt · Soft Editorial · Violet Marker |
| **张扬** Bold | 11 | 高饱和、视觉冲击、活动宣贯 | BlockFrame · Burst Panel · Confetti Wedge · Court Press · Crayon Stack · Grove Block · Mint Brut · Neo-Grid Bold · Riso Brut · Specimen Bold · Stencil & Tablet |

选风格的偷懒法则：**汇报给领导 → 克制；对外宣发 → 张扬；拿不准 → 均衡**。

## 快速开始

```bash
# 1. 渲染预览
npx -y @larksuite/whiteboard-cli@^0.2.11 -i board.svg --to image --output board.png -s 2

# 2. 转 OpenAPI JSON（务必用 Node 写文件，不要用 PowerShell 的 Out-File）
node -e "const{execSync}=require('child_process');const fs=require('fs');const r=execSync('npx -y @larksuite/whiteboard-cli@^0.2.11 -i board.svg --to openapi --format json 2>&1',{encoding:'utf8',maxBuffer:50*1024*1024});fs.writeFileSync('board.json',r.replace(/^\uFEFF/,''),'utf8')"

# 3. 建文档
lark-cli docs +create --api-version v2 --content '<title>白板标题</title><whiteboard type="blank"></whiteboard>' --as user --format json

# 4. 上传白板（注意 @ 前缀）
lark-cli whiteboard +update --whiteboard-token <block_token> --source @board.json --idempotent-token <unique_id> --overwrite --as user --format json
```

## 依赖

| 依赖 | 说明 |
|---|---|
| `lark-cli` | 需先完成认证（`--as user`） |
| `@larksuite/whiteboard-cli` | 通过 `npx` 调用，无需预装 |
| **beautiful-feishu-whiteboard** skill | 设计规范来源：`RULES.md` 硬规则 + 35 套模板的配色与版式 |

> `beautiful-feishu-whiteboard` 不在本仓库内，作为配套技能单独维护。

## 踩坑记录（这几条值钱）

| 报错 | 原因 | 解法 |
|---|---|---|
| `invalid character 'e' in literal true` | PowerShell `Out-File` 写入 UTF-8 BOM | 用 Node 的 `fs.writeFileSync` 写文件 |
| `unmarshal input json failed: invalid character '\r'` | 管道传 JSON 时注入了 CR | 先落盘，再用 `@文件路径` 传参 |
| `invalid character 'f' after object key:value pair` | SVG 转 OpenAPI 时中文编码损坏 | 改用 Node spawn，或换已验证配置重新生成 SVG |
| `unknown subcommand "+create"` | `lark-cli whiteboard` 没有 `+create` | 用 `lark-cli docs +create` 建文档 |
| `--source` 报 path not found | 少写 `@` 前缀 | `--source @board.json` |

## 安装

```bash
git clone https://github.com/leena-free/yitu-liu.git
```

把 `SKILL.md` 放到智能体的 skills 目录（如 `~/.codex/skills/一图流/SKILL.md`），重启会话即可。

## 许可

未指定。使用前请与作者确认。