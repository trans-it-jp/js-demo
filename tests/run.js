#!/usr/bin/env node
/*!
 * js-demo / tests — run.js
 * tests/cases.js を Node で走らせる。外部パッケージは使わない。
 *
 *   node tests/run.js
 *
 * 1 件でも落ちたら終了コード 1 を返すので、公開前の確認にそのまま使える。
 */
"use strict";

var path = require("path");
var root = path.join(__dirname, "..");

/* 計算だけのライブラリは DOM を使わないので Node でそのまま読める。
   js/ui/share-link.js と js/ui/catalog.js は読み込み時に DOM へ触らないので、
   ここでも検証できる（parse・build・select・conceptsIn は純粋な関数）。
   描画（js/viz）と画面の配線は d3 と DOM が要るため、ここでは扱わない。
   それらは tests/index.html をブラウザで開いて確かめる。 */
[
  "js/core/seeded-random.js",
  "js/core/numeric.js",
  "js/linear-algebra/matrix3.js",
  "js/clustering/kmeans.js",
  "js/sorting/sorts.js",
  "js/learning/net.js",
  "js/ui/share-link.js",
  "js/ui/demos.js",
  "js/ui/catalog.js",
  "tests/cases.js"
].forEach(function (file) {
  require(path.join(root, file));
});

var cases = globalThis.JsDemo.Tests.cases;
var failures = [];
var group = "";

cases.forEach(function (testCase) {
  if (testCase.group !== group) {
    group = testCase.group;
    process.stdout.write("\n" + group + "\n");
  }
  try {
    testCase.run();
    process.stdout.write("  PASS  " + testCase.name + "\n");
  } catch (error) {
    failures.push({ testCase: testCase, error: error });
    process.stdout.write("  FAIL  " + testCase.name + "\n");
    process.stdout.write("        " + error.message + "\n");
  }
});

process.stdout.write("\n" + (cases.length - failures.length) + " / " + cases.length + " 件が通った\n");

if (failures.length > 0) {
  process.stdout.write("\n落ちた項目:\n");
  failures.forEach(function (f) {
    process.stdout.write("  " + f.testCase.group + " / " + f.testCase.name + "\n");
  });
  process.exit(1);
}
