#!/usr/bin/env node
/*!
 * js-demo / tools — check-links.js
 * サイト内のリンクが実在のファイルへ解決するか確かめる。外部パッケージは使わない。
 *
 *   node tools/check-links.js
 *
 * 見るもの:
 *   - HTML の href / src（相対パス）
 *   - Markdown の [文字](パス)（相対パス）
 *   - 各デモページから同じ言語のもう一方へ行けるか（日英の対応）
 *
 * 外部URL（http / https）は到達確認をしない。壊れていても気づけないので、
 * 公開前にはブラウザでも開いて確かめる。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var SKIP = /^(https?:)?\/\/|^mailto:|^data:|^#/;

/* templates/ は置き換え前提の雛形。{{ }} が残っていて当然なので対象外にする。 */
var EXCLUDED = ["templates/"];

function isExcluded(rel) {
  return EXCLUDED.some(function (prefix) { return rel.indexOf(prefix) === 0; });
}

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") { return; }
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); } else { out.push(full); }
  });
  return out;
}

var files = walk(ROOT, []);
var problems = [];

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

/** href / src と Markdown リンクの参照先が実在するか見る */
function checkReferences(file, pattern) {
  var text = fs.readFileSync(file, "utf8");
  var count = 0;
  var match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    var raw = match[1].split("#")[0].split(" ")[0];
    if (!raw || SKIP.test(raw)) { continue; }
    count += 1;
    var target = path.resolve(path.dirname(file), decodeURIComponent(raw));
    if (!fs.existsSync(target)) {
      problems.push(relative(file) + "  ->  " + match[1]);
    }
  }
  return count;
}

var htmlFiles = files.filter(function (f) {
  return f.endsWith(".html") && !isExcluded(relative(f));
});
var mdFiles = files.filter(function (f) {
  return f.endsWith(".md") && !isExcluded(relative(f));
});

var htmlLinks = 0;
htmlFiles.forEach(function (f) {
  htmlLinks += checkReferences(f, /(?:href|src)\s*=\s*"([^"]+)"/g);
});

var mdLinks = 0;
mdFiles.forEach(function (f) {
  mdLinks += checkReferences(f, /\]\(([^)]+)\)/g);
});

/* 日本語版と英語版が互いに行き来できるか。
   片方だけ直して対応が切れるのを防ぐ。 */
var pairProblems = [];
htmlFiles.forEach(function (file) {
  var rel = relative(file);
  if (rel.startsWith("tests/") || rel === "k-means.html") { return; }
  var isEnglish = rel.startsWith("en/");
  var counterpart = isEnglish ? rel.slice(3) : "en/" + rel;
  if (!fs.existsSync(path.join(ROOT, counterpart))) {
    pairProblems.push(rel + " に対応する " + counterpart + " が無い");
    return;
  }
  var text = fs.readFileSync(file, "utf8");
  var expected = path.relative(path.dirname(rel), counterpart).split(path.sep).join("/");
  if (text.indexOf('href="' + expected + '"') === -1) {
    pairProblems.push(rel + " から " + expected + " への言語リンクが無い");
  }
});

console.log("HTML: " + htmlFiles.length + " ファイル / 内部リンク " + htmlLinks + " 本");
console.log("Markdown: " + mdFiles.length + " ファイル / 内部リンク " + mdLinks + " 本");
console.log("日英の対応: " + (htmlFiles.length - 2) + " ページを確認");

if (problems.length === 0 && pairProblems.length === 0) {
  console.log("\nOK すべて解決した");
  process.exit(0);
}

if (problems.length > 0) {
  console.log("\n解決しないリンク " + problems.length + " 件:");
  problems.forEach(function (p) { console.log("  " + p); });
}
if (pairProblems.length > 0) {
  console.log("\n日英の対応の問題 " + pairProblems.length + " 件:");
  pairProblems.forEach(function (p) { console.log("  " + p); });
}
process.exit(1);
