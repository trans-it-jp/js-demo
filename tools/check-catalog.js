#!/usr/bin/env node
/*!
 * js-demo / tools — check-catalog.js
 * 題材の一覧（js/ui/demos.js）と公開ページが食い違っていないか確かめる。
 * 外部パッケージは使わない。
 *
 *   node tools/check-catalog.js
 *
 * 見るもの:
 *   - 一覧の題材に、日本語版と英語版のページが実在するか
 *   - 題名が各ページの <h1> と、トップページのカードの文字と一致するか
 *   - 各デモ画面に「同じ前提を使う画面」の枠があり、data-demo が一覧の id と合うか
 *   - その画面が demos.js と related-page.js を読み込んでいるか
 *   - 使っている前提概念に、日英それぞれの名札と前提の文があるか
 *
 * なぜ要るか:
 *   前提概念の正本を js/ui/demos.js へ移したので、題名だけが HTML 側にある。
 *   題名を直したときに一覧が取り残されると、目録と画面で違う名前になる。
 *   人が気づきにくい食い違いなので、点検として常設する。
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");

require(path.join(ROOT, "js", "ui", "demos.js"));
var LIST = globalThis.JsDemo.Demos.list;

var i18n = fs.readFileSync(path.join(ROOT, "js", "ui", "i18n.js"), "utf8");

var problems = [];
var counted = { demos: 0, pages: 0, concepts: 0 };

function read(file) {
  var full = path.join(ROOT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function headingOf(html) {
  var found = /<h1>([^<]*)<\/h1>/.exec(html);
  return found ? found[1].trim() : null;
}

/** トップページのカードから、その行き先の題名を取る。 */
function cardTitle(html, id) {
  var pattern = new RegExp(
    '<a href="' + id + '/index\\.html">([^<]*)</a>'
  );
  var found = pattern.exec(html);
  return found ? found[1].trim() : null;
}

var tops = {
  ja: read("index.html"),
  en: read("en/index.html")
};

LIST.forEach(function (demo) {
  counted.demos += 1;

  [
    { lang: "ja", page: demo.id + "/index.html", scripts: "../js/ui/" },
    { lang: "en", page: "en/" + demo.id + "/index.html", scripts: "../../js/ui/" }
  ].forEach(function (target) {
    var html = read(target.page);
    if (html === null) {
      problems.push(target.page + ": 一覧にあるページが無い");
      return;
    }
    counted.pages += 1;

    var title = demo.title[target.lang];
    var heading = headingOf(html);
    if (heading !== title) {
      problems.push(target.page + ": 見出しが一覧と違う（一覧「" + title +
                    "」/ ページ「" + heading + "」）");
    }

    var card = tops[target.lang] ? cardTitle(tops[target.lang], demo.id) : null;
    if (card === null) {
      problems.push("目録に " + demo.id + " のカードが無い（" + target.lang + "）");
    } else if (card !== title) {
      problems.push("目録のカードが一覧と違う（一覧「" + title + "」/ カード「" +
                    card + "」、" + target.lang + "）");
    }

    if (html.indexOf('id="related"') < 0) {
      problems.push(target.page + ": 「同じ前提を使う画面」の枠が無い");
    } else if (html.indexOf('data-demo="' + demo.id + '"') < 0) {
      problems.push(target.page + ": data-demo が一覧の id と合わない");
    }

    ["demos.js", "related-page.js"].forEach(function (file) {
      if (html.indexOf(target.scripts + file) < 0) {
        problems.push(target.page + ": " + file + " を読み込んでいない");
      }
    });
  });
});

/* 使っている概念には、日英それぞれの名札と前提の文が要る。
   辞書は ja と en の 2 つなので、鍵はちょうど 2 回ずつ出る。 */
var seen = {};
LIST.forEach(function (demo) {
  demo.concepts.forEach(function (concept) {
    if (seen[concept]) { return; }
    seen[concept] = true;
    counted.concepts += 1;
    ["catalog.concept.", "catalog.premise."].forEach(function (prefix) {
      var key = '"' + prefix + concept + '":';
      var times = i18n.split(key).length - 1;
      if (times !== 2) {
        problems.push("js/ui/i18n.js: " + prefix + concept +
                      " が日英そろっていない（" + times + " 件）");
      }
    });
  });
});

console.log("題材 " + counted.demos + " / ページ " + counted.pages +
            " / 前提概念 " + counted.concepts + " を確認した");

if (problems.length === 0) {
  console.log("\nOK 一覧とページは一致している");
  process.exit(0);
}

console.log("\n食い違い " + problems.length + " 件:");
problems.forEach(function (line) { console.log("  " + line); });
process.exit(1);
