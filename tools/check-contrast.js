#!/usr/bin/env node
/*!
 * js-demo / tools — check-contrast.js
 * css/site.css の色トークンを読み、文字と背景のコントラスト比を計算する。
 *
 *   node tools/check-contrast.js
 *
 * WCAG 2.2 の 1.4.3（本文 4.5:1、大きい文字 3:1）と 1.4.11（部品 3:1）を
 * 判定の目安に使う。ここが通ることは適合の証明ではない。実際の配色は
 * 重なりや不透明度でも変わるため、画面でも確かめる。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var css = fs.readFileSync(path.join(__dirname, "..", "css", "site.css"), "utf8");

/* :root のトークンを拾う */
var tokens = {};
var pattern = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
var match;
while ((match = pattern.exec(css)) !== null) {
  tokens[match[1]] = match[2];
}

function toRgb(hex) {
  var h = hex.slice(1);
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

/* WCAG の相対輝度 */
function luminance(hex) {
  var channels = toRgb(hex).map(function (value) {
    var c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a, b) {
  var la = luminance(a);
  var lb = luminance(b);
  var light = Math.max(la, lb);
  var dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/* 組み合わせ: [前景, 背景, 用途, 必要な比] */
var checks = [
  ["ink", "paper", "本文（地の上）", 4.5],
  ["ink", "surface", "本文（面の上）", 4.5],
  ["ink-soft", "paper", "補助の文（地の上）", 4.5],
  ["ink-soft", "surface", "補助の文（面の上）", 4.5],
  ["ink-muted", "paper", "見出しラベル（地の上）", 4.5],
  ["ink-muted", "surface", "見出しラベル（面の上）", 4.5],
  ["ink-muted", "surface-sunk", "表の見出し", 4.5],
  ["accent", "paper", "リンク（地の上）", 4.5],
  ["accent", "surface", "リンク（面の上）", 4.5],
  ["accent-ink", "accent-wash", "選択中のボタンの文字", 4.5],
  ["control-border", "surface", "入力欄とボタンの枠", 3],
  ["accent", "surface", "操作部品の枠", 3],
  ["plot-axis", "plot-bg", "図の軸", 3],
  ["series-1", "plot-bg", "系列 1", 3],
  ["series-2", "plot-bg", "系列 2", 3],
  ["series-3", "plot-bg", "系列 3", 3],
  ["series-4", "plot-bg", "系列 4", 3],
  ["series-5", "plot-bg", "系列 5", 3],
  ["series-6", "plot-bg", "系列 6", 3],
  ["series-7", "plot-bg", "系列 7", 3],
  ["series-8", "plot-bg", "系列 8", 3],
  ["series-9", "plot-bg", "系列 9", 3],
  ["series-10", "plot-bg", "系列 10", 3]
];

var failures = [];
var rows = [];

checks.forEach(function (check) {
  var fg = tokens[check[0]];
  var bg = tokens[check[1]];
  if (!fg || !bg) {
    failures.push(check[2] + " — トークンが見つからない (" + check[0] + " / " + check[1] + ")");
    return;
  }
  var value = ratio(fg, bg);
  var ok = value >= check[3];
  if (!ok) { failures.push(check[2] + " — " + value.toFixed(2) + ":1（必要 " + check[3] + ":1）"); }
  rows.push([
    (ok ? "OK  " : "NG  ") + check[2],
    fg + " / " + bg,
    value.toFixed(2) + ":1",
    "必要 " + check[3] + ":1"
  ]);
});

var width = Math.max.apply(null, rows.map(function (r) { return r[0].length; }));
rows.forEach(function (r) {
  console.log(r[0].padEnd(width + 2) + r[1].padEnd(20) + r[2].padStart(9) + "   " + r[3]);
});

/* 系列色どうしの見分け。色だけに頼らない設計なので判定はしないが、
   近い組み合わせを把握しておく。 */
console.log("\n系列色どうしのコントラスト比（1.5 未満は色だけでは紛らわしい）:");
var series = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var close = [];
series.forEach(function (a) {
  series.forEach(function (b) {
    if (a >= b) { return; }
    var value = ratio(tokens["series-" + a], tokens["series-" + b]);
    if (value < 1.5) { close.push("  系列 " + a + " と " + b + ": " + value.toFixed(2) + ":1"); }
  });
});
if (close.length === 0) {
  console.log("  近すぎる組み合わせは無い");
} else {
  close.forEach(function (line) { console.log(line); });
  console.log("  → 形と番号での区別が効いているか画面で確かめる");
}

console.log("");
if (failures.length === 0) {
  console.log("OK すべての組み合わせが目安を満たした");
  process.exit(0);
}
console.log("目安を下回った組み合わせ " + failures.length + " 件:");
failures.forEach(function (f) { console.log("  " + f); });
process.exit(1);
