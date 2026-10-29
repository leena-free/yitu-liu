---
name: 一图流
description: 输入主题和风格，一键生成精美的飞书白板并返回文档链接
metadata: { "openclaw": { "emoji": "🎨" } }
---

# 一图流 - 飞书白板生成技能

## 功能概述
输入任意主题和视觉风格，一键生成精美的飞书白板（嵌入文档），返回可访问的链接。

## 两种输出模式（先确认要哪种）

| 模式 | 产出 | 需要飞书吗 | 适用 |
|---|---|---|---|
| **白板模式** | 可编辑的飞书白板 + 文档链接 | 需要 lark-cli 授权 | 别人还要继续改、要嵌进飞书文档 |
| **纯图片模式** | 一张 PNG（可 2~3 倍图） | **完全不需要** | 贴 PPT、发群、公众号配图、终稿 |

判断一句话：**要别人接着改 → 白板；只要一张图 → 纯图片。**

### 纯图片模式（最短路径）

```bash
node scripts/render.js -i board.svg -o board.png -s 2      # 2 倍图
node scripts/render.js -i board.svg --engine chrome        # 离线 / npx 不可用时
```

只做 Step 1（画 SVG）+ 这一步，**Step 2~5 全部跳过**，不登录、不建文档、不调接口。

## 35种风格一览

**克制（Restrained）— 9种**：安静、编辑感、适合严肃汇报
Avocado Press / Grove / Jade Lens / Long Table / Macchiato / Monochrome / Papier Bleu / Reading Room / Salmon Stamp

**均衡（Balanced）— 15种**：有亮点但不过闹，通用性最强
Apricot Arc / Berry Pop / Bold Poster / Checker Bloom / Cobalt Bloom / Coral / Cut Bloom / Editorial Forest / Lime Slab / Linen Cut / Pin & Paper / Raw Grid / Riptide Cobalt / Soft Editorial / Violet Marker

**张扬（Bold）— 11种**：高饱和、视觉冲击、适合活动宣贯
BlockFrame / Burst Panel / Confetti Wedge / Court Press / Crayon Stack / Grove Block / Mint Brut / Neo-Grid Bold / Riso Brut / Specimen Bold / Stencil & Tablet

## 核心流程（白板模式）

> 只要图片的话，做完 Step 1 直接跑 `scripts/render.js`，其余步骤跳过。

### Step 1: 生成 SVG 白板图
- 使用 `references/RULES.md` 的设计硬规则
- 严格遵守 `references/RULES.md`（Noto Sans SC 字体、用 `<text>` 元素、不轮廓化、不用透明度）
- 选择合适的风格：先看 `references/STYLES.md` 索引，再读对应的 `references/styles/<slug>/design.md`
- 布局建议：1600 宽，2200 高以内

### Step 2: 渲染 PNG 预览

默认用 whiteboard-cli；如果 npx 不可用（网络受限 / 缓存目录无权限），换 `--engine chrome` 用本地浏览器渲染，效果等价。
```bash
npx -y @larksuite/whiteboard-cli@^0.2.11 -i <svg_path> --to image --output <png_path> -s 2
```

### Step 3: 转换为 OpenAPI JSON（关键！）
**必须用 Node.js 写文件，不能用 PowerShell 的 Out-File：**
```javascript
const { execSync } = require('child_process');
const fs = require('fs');

const result = execSync(
  'npx -y @larksuite/whiteboard-cli@^0.2.11 -i <svg_path> --to openapi --format json 2>&1',
  { encoding: 'utf8', maxBuffer: 50*1024*1024 }
);

let clean = result.replace(/^\uFEFF/, '');
fs.writeFileSync('<output_json_path>', clean, 'utf8');
```

### Step 4: 创建含白板块的飞书文档
```bash
lark-cli docs +create --api-version v2 --content '<title>白板标题</title><whiteboard type="blank"></whiteboard>' --as user --format json
```
从响应中提取 `new_blocks[0].block_token` 和 `document.document_id`。

### Step 5: 上传白板内容
**关键：文件路径前必须加 `@` 前缀！**
```bash
lark-cli whiteboard +update --whiteboard-token <block_token> --source @<openapi_json_path> --idempotent-token <unique_id> --overwrite --as user --format json
```

### Step 6: 返回结果
- 文档链接：`https://my.feishu.cn/docx/<document_id>`
- PNG 预览路径（如有）

## 常见错误处理

### 错误1: `invalid character 'e' in literal true`
- **原因**：PowerShell 的 `Out-File` 加了 UTF-8 BOM
- **解决**：用 Node.js 的 `fs.writeFileSync` 写文件

### 错误2: `unmarshal input json failed: invalid character '\r'`
- **原因**：通过管道传 JSON 给 lark-cli，PowerShell 注入了 `\r`
- **解决**：先写入文件，再用 `@文件路径` 方式传参

### 错误3: `invalid character 'f' after object key:value pair`
- **原因**：SVG 转 OpenAPI 时文本编码损坏（如中文变乱码）
- **解决**：用 Node.js spawn 而非 execSync 转换，或换用已验证的配置重新生成 SVG

### 错误4: `unknown subcommand "+create"` 或 `--source` 报 path not found
- **原因**：`lark-cli whiteboard` 没有 `+create` 子命令；`--source 文件` 缺少 `@` 前缀
- **解决**：用 `docs +create` 创建文档；`--source @文件路径`

## 依赖项
- `lark-cli` (@larksuite/cli) 已认证
- `@larksuite/whiteboard-cli` (npx)
- 设计规范与 31 套配色模板：已内置在 `references/`，无需额外安装

## 适用场景
- 方案宣贯、数据汇报、知识沉淀
- 任何需要快速生成精美可视化白板的场景
