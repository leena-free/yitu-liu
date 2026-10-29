#!/usr/bin/env node
/**
 * render.js — SVG 直接出图，不经过飞书白板
 *
 * 用法:
 *   node scripts/render.js -i board.svg                       # 输出 board.png（2 倍图）
 *   node scripts/render.js -i board.svg -s 3                  # 3 倍图
 *   node scripts/render.js -i board.svg -o out/cover.png      # 指定输出
 *   node scripts/render.js -i board.svg --engine chrome       # 用浏览器截图（离线可用）
 *
 * 引擎:
 *   wb      whiteboard-cli（默认，和飞书白板渲染一致，风格不会跑偏）
 *   chrome  本地 Chrome / Edge headless 截图（离线、无 npx 也能跑）
 *   auto    先试 wb，失败回退 chrome
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PKG = '@larksuite/whiteboard-cli@^0.2.11';

function arg(name, def) {
  const i = process.argv.indexOf('-' + name);
  const j = process.argv.indexOf('--' + name);
  const k = i > -1 ? i : j;
  return k > -1 && process.argv[k + 1] ? process.argv[k + 1] : def;
}

const input = arg('i', arg('input', ''));
const engine = arg('engine', 'wb');
const scale = arg('s', arg('scale', '2'));
if (!input) {
  console.log('用法: node scripts/render.js -i board.svg [-o out.png] [-s 2] [--engine wb|chrome|auto]');
  process.exit(1);
}
const svg = path.resolve(input);
if (!fs.existsSync(svg)) {
  console.error('✗ 找不到文件: ' + svg);
  process.exit(1);
}
const out = path.resolve(arg('o', arg('output', svg.replace(/\.svg$/i, '') + '.png')));
fs.mkdirSync(path.dirname(out), { recursive: true });

function svgSize(file) {
  const t = fs.readFileSync(file, 'utf8').slice(0, 2000);
  const w = (t.match(/width="(\d+(?:\.\d+)?)/) || [])[1];
  const h = (t.match(/height="(\d+(?:\.\d+)?)/) || [])[1];
  return { w: Math.round(w ? +w : 1600), h: Math.round(h ? +h : 1200) };
}

function findChrome() {
  const cands = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  return cands.find((p) => fs.existsSync(p)) || null;
}

function runWb() {
  const cmd = `npx -y "${PKG}" -i "${svg}" --to image --output "${out}" -s ${scale}`;
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0 && fs.existsSync(out);
  return { ok, log: ((r.stdout || '') + (r.stderr || '')).trim() };
}

function runChrome() {
  const exe = findChrome();
  if (!exe) return { ok: false, log: '没找到 Chrome / Edge' };
  const { w, h } = svgSize(svg);
  const url = 'file:///' + svg.replace(/\\/g, '/');
  const tmp = out.replace(/\.png$/i, '') + '.chrome.png';
  const cmd = `"${exe}" --headless --disable-gpu --no-sandbox --hide-scrollbars --force-device-scale-factor=${scale} --window-size=${w},${h} --screenshot="${tmp}" "${url}"`;
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (!fs.existsSync(tmp)) return { ok: false, log: 'chrome 没有产出截图' };
  fs.renameSync(tmp, out);
  return { ok: true, log: 'chrome headless ' + w + '×' + h + ' @' + scale + 'x' };
}

let res;
if (engine === 'chrome') res = runChrome();
else if (engine === 'auto') {
  res = runWb();
  if (!res.ok) {
    console.log('  whiteboard-cli 失败，回退到 chrome…');
    res = runChrome();
  }
} else res = runWb();

if (!res.ok) {
  console.error('✗ 渲染失败');
  console.error(res.log.split('\n').slice(-8).join('\n'));
  console.error('  提示: 加 --engine chrome 可改用本地浏览器渲染');
  process.exit(1);
}

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log('✓ ' + out + '  (' + kb + ' KB)');
console.log('  引擎: ' + engine + '  倍率: ' + scale + 'x');
console.log('  纯本地渲染，未调用任何飞书接口');