#!/usr/bin/env node
/*!
 * js-demo / tools — check-transitions.js
 * 色に関わる属性をアニメーションで変えていないかを調べる。
 *
 *   node tools/check-transitions.js
 *
 * なぜ要るか:
 *   このリポジトリの系列色は CSS 変数（var(--series-1)）で書いてある。
 *   d3 はこれを色として補間できず、var(--series-1.5) のような
 *   未定義の値を作る。未定義の色になった図形は描かれないので、
 *   「動いて見えず、消えて引き直されたように見える」不具合になる。
 *   実際にこれで割当線が消えていたため、点検として常設した。
 *
 * 見るもの:
 *   maybeAnimate(...) や .transition() に続けて設定している属性のうち、
 *   fill / stroke / color を禁止する。これらは即時に設定する。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var COLOR_ATTRS = ["fill", "stroke", "color", "stop-color", "flood-color"];

/**
 * 位置 start から、括弧の外側にある最初の ; までを返す。
 * 文字列の中の記号は数えない。
 */
function statementAfter(text, start) {
  var depth = 0;
  var quote = null;
  for (var i = start; i < text.length; i += 1) {
    var ch = text[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { quote = null; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "(" || ch === "{" || ch === "[") { depth += 1; continue; }
    if (ch === ")" || ch === "}" || ch === "]") { depth -= 1; continue; }
    if (ch === ";" && depth <= 0) { return text.slice(start, i); }
  }
  return text.slice(start);
}

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") { return; }
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); } else { out.push(full); }
  });
  return out;
}

var files = walk(ROOT, []).filter(function (f) {
  return f.endsWith(".js") && f.indexOf(path.join(ROOT, "tools")) !== 0;
});

var problems = [];
var chains = 0;

files.forEach(function (file) {
  var rel = path.relative(ROOT, file).split(path.sep).join("/");
  var text = fs.readFileSync(file, "utf8");

  /* 遷移を始める呼び出しのあとに続く .attr("...") の並びを拾う */
  var starter = /(maybeAnimate\s*\([^)]*\)|\.transition\s*\([^)]*\)(?:\s*\.duration\([^)]*\))?(?:\s*\.ease\([^)]*\))?)/g;
  var match;
  while ((match = starter.exec(text)) !== null) {
    /* `function maybeAnimate(selection, duration)` のような**定義**は呼び出しでは
       ないので飛ばす。定義を連鎖の始まりと見なすと、関数本体を越えて先の
       コードまで読んでしまい、関係のない .attr("fill") を拾ってしまう。 */
    if (/function\s+$/.test(text.slice(0, match.index))) { continue; }
    chains += 1;
    /* その位置から文の終わりまでを 1 つの連鎖とみなす。
       関数本体の中にも ; があるので、括弧の深さが 0 のところで切る。
       単純に最初の ; で切ると連鎖の途中で読み終えてしまう。 */
    var chain = statementAfter(text, match.index + match[0].length);

    var attrPattern = /\.attr\(\s*"([a-zA-Z-]+)"/g;
    var attr;
    while ((attr = attrPattern.exec(chain)) !== null) {
      if (COLOR_ATTRS.indexOf(attr[1]) >= 0) {
        var line = text.slice(0, match.index).split("\n").length;
        problems.push(rel + ":" + line + " で " + attr[1] +
                      " を遷移させている（CSS変数は補間できず図形が消える）");
      }
    }
  }
});

console.log("JavaScript: " + files.length + " ファイル / 遷移の連鎖 " + chains + " 件");

if (problems.length === 0) {
  console.log("\nOK 色に関わる属性を遷移させていない");
  process.exit(0);
}
console.log("\n問題 " + problems.length + " 件:");
problems.forEach(function (p) { console.log("  " + p); });
process.exit(1);
