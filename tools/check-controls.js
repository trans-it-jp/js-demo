#!/usr/bin/env node
/*!
 * js-demo / tools — check-controls.js
 * スライダーと数値入力の組が、同じ範囲・同じ刻み・同じ初期値かを確かめる。
 *
 *   node tools/check-controls.js
 *
 * なぜ要るか:
 *   `<name>` と `<name>-num` の min/max がずれていると、片方からは入るのに
 *   もう片方では弾かれる値が生まれる。共有URLの値が黙って別の値に変わる
 *   原因になったため、点検として常設した。
 *
 * あわせて、日本語版と英語版で同じ id の範囲が揃っているかも見る。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var EXCLUDED = ["templates/"];

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") { return; }
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); } else { out.push(full); }
  });
  return out;
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

/** <input ...> を属性の辞書として取り出す */
function inputs(html) {
  var found = {};
  var pattern = /<input\b([^>]*)>/g;
  var match;
  while ((match = pattern.exec(html)) !== null) {
    var attrs = {};
    var attrPattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    var attr;
    while ((attr = attrPattern.exec(match[1])) !== null) {
      attrs[attr[1]] = attr[2];
    }
    if (attrs.id) { found[attrs.id] = attrs; }
  }
  return found;
}

var problems = [];
var ranges = {};   /* "id" -> { ファイル: "min/max/step/value" } 言語間の照合用 */
var pairCount = 0;

var files = walk(ROOT, []).filter(function (f) {
  return f.endsWith(".html") && !EXCLUDED.some(function (p) {
    return relative(f).indexOf(p) === 0;
  });
});

files.forEach(function (file) {
  var rel = relative(file);
  var found = inputs(fs.readFileSync(file, "utf8"));

  Object.keys(found).forEach(function (id) {
    if (!/-num$/.test(id)) { return; }
    var base = id.replace(/-num$/, "");
    var number = found[id];
    var slider = found[base];

    if (!slider) {
      problems.push(rel + ": " + id + " に対応する " + base + " が無い");
      return;
    }
    pairCount += 1;

    ["min", "max", "step", "value"].forEach(function (key) {
      if (slider[key] !== number[key]) {
        problems.push(rel + ": " + base + " の " + key +
                      " が食い違う（range=" + slider[key] +
                      " / number=" + number[key] + "）");
      }
    });

    var signature = [slider.min, slider.max, slider.step, slider.value].join("/");
    if (!ranges[base]) { ranges[base] = {}; }
    ranges[base][rel] = signature;
  });
});

/* 日本語版と英語版で同じ id の範囲が揃っているか */
Object.keys(ranges).forEach(function (id) {
  var byFile = ranges[id];
  var signatures = {};
  Object.keys(byFile).forEach(function (file) {
    var sig = byFile[file];
    if (!signatures[sig]) { signatures[sig] = []; }
    signatures[sig].push(file);
  });
  if (Object.keys(signatures).length > 1) {
    problems.push(id + " の範囲がページ間で揃っていない:");
    Object.keys(signatures).forEach(function (sig) {
      problems.push("    " + sig + "  <-  " + signatures[sig].join(", "));
    });
  }
});

console.log("HTML: " + files.length + " ファイル / 入力の組 " + pairCount + " 件");

if (problems.length === 0) {
  console.log("\nOK スライダーと数値入力の範囲が揃っている");
  process.exit(0);
}
console.log("\n食い違い " + problems.length + " 件:");
problems.forEach(function (p) { console.log("  " + p); });
process.exit(1);
