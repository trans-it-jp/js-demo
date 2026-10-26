#!/usr/bin/env node
/*!
 * js-demo / tools — check-unused.js
 * 使われなくなった定義が残っていないか確かめる。外部パッケージは使わない。
 *
 *   node tools/check-unused.js
 *
 * 見るもの:
 *   - css/site.css の色トークン（--name）が、どこかで var(--name) として使われているか
 *   - css/site.css のクラス（.name）が、HTML か JavaScript に出てくるか
 *   - js/ui/i18n.js の文言の鍵が、画面側から引かれているか
 *
 * なぜ要るか:
 *   作りを変えたときに、理由が消えた設定や文言だけが残ることがある。
 *   実際に「手順を先に作らない形へ変えたのに要素数の上限が残っていた」
 *   「予想の欄を外したのに体裁と文言が残っていた」という取り残しが出たため、
 *   点検として常設した。
 *
 * 残しておきたいものは KEEP に理由付きで書く。消すのが正しいとは限らない。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");

/* 使われていなくても残すもの。理由を必ず書く。 */
var KEEP = {
  css: {
    "predict": "予想の欄は公開中のどの題材でも置いていないが、共通部品は残してある",
    "predict__question": "同上",
    "predict__choices": "同上",
    "predict__note": "同上",
    "predict__result": "同上"
  },
  i18n: {
    "predict.": "予想の欄を置く題材が出たときに使う（JsDemo.Learning.wirePrediction）"
  }
};

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") { return; }
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, out); } else { out.push(full); }
  });
  return out;
}

var files = walk(ROOT, []);
function read(file) { return fs.readFileSync(file, "utf8"); }
function matching(pattern) {
  return files.filter(function (f) { return pattern.test(f); });
}

var cssPath = path.join(ROOT, "css", "site.css");
var css = read(cssPath);
/* tools/ は公開するものではないので、使用とは数えない。
   点検器自身の注記（var(--name) のような例示）を拾わないようにする。 */
var TOOLS = path.join(ROOT, "tools");
var markup = matching(/\.(html|js)$/)
  .filter(function (f) { return f.indexOf(TOOLS) !== 0; })
  .map(read).join("\n");

var problems = [];
var counted = { tokens: 0, classes: 0, keys: 0 };

/* --- 色などのトークン ---------------------------------------------------- */

var defined = {};
var match;
var tokenPattern = /--([a-z0-9-]+)\s*:/g;
while ((match = tokenPattern.exec(css)) !== null) { defined[match[1]] = true; }

/* var(--name) の形だけを使用と数える。注記の中の var(--name-1.5) のような
   例示を拾わないよう、閉じ括弧か区切りまでを見る。 */
var usedTokens = {};
var usePattern = /var\(\s*--([a-z0-9-]+)\s*[),]/g;
var haystack = css + "\n" + markup;
while ((match = usePattern.exec(haystack)) !== null) { usedTokens[match[1]] = true; }

Object.keys(defined).forEach(function (name) {
  counted.tokens += 1;
  if (usedTokens[name]) { return; }
  /* 間隔や字など、素のまま使うものは var() を通さないので対象外にする。 */
  if (/^(s-\d|font-|measure|page|radius)/.test(name)) { return; }
  problems.push("css/site.css: 使われていないトークン --" + name);
});

Object.keys(usedTokens).forEach(function (name) {
  if (!defined[name]) {
    problems.push("定義の無いトークンを使っている --" + name);
  }
});

/* --- クラス -------------------------------------------------------------- */

var classes = {};
var classPattern = /\.([a-zA-Z][a-zA-Z0-9_-]*)(?=[\s,:{>.[])/g;
while ((match = classPattern.exec(css)) !== null) { classes[match[1]] = true; }

Object.keys(classes).forEach(function (name) {
  counted.classes += 1;
  if (KEEP.css[name]) { return; }
  var quoted = new RegExp("[\"'\\s]" + name.replace(/-/g, "\\-") + "[\"'\\s]");
  if (!quoted.test(markup)) {
    problems.push("css/site.css: 使われていないクラス ." + name);
  }
});

/* --- 文言の鍵 ------------------------------------------------------------ */

var i18nPath = path.join(ROOT, "js", "ui", "i18n.js");
var i18n = read(i18nPath);
var consumers = matching(/\.js$/)
  .filter(function (f) { return f !== i18nPath; })
  .map(read).join("\n");

var keys = {};
var keyPattern = /^\s*"([a-z][a-zA-Z0-9.]+)":/gm;
while ((match = keyPattern.exec(i18n)) !== null) { keys[match[1]] = true; }

Object.keys(keys).forEach(function (key) {
  counted.keys += 1;
  var prefix = key.replace(/[a-zA-Z0-9]+$/, "");
  if (KEEP.i18n[prefix]) { return; }
  /* そのまま書かれているか、t("前半." + 変数) の形で組み立てられているか。 */
  if (consumers.indexOf('"' + key + '"') >= 0) { return; }
  if (prefix && consumers.indexOf('"' + prefix + '" +') >= 0) { return; }
  problems.push("js/ui/i18n.js: 画面から引かれていない鍵 " + key);
});

/* --- 結果 ---------------------------------------------------------------- */

console.log("トークン " + counted.tokens + " / クラス " + counted.classes +
            " / 文言の鍵 " + counted.keys + " を確認した");

if (problems.length === 0) {
  console.log("\nOK 取り残された定義は見つからなかった");
  process.exit(0);
}

console.log("\n取り残しの疑い " + problems.length + " 件:");
problems.forEach(function (line) { console.log("  " + line); });
console.log("\n消すのが正しいとは限らない。残す理由があるものは tools/check-unused.js の KEEP へ書く。");
process.exit(1);
