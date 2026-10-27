/*!
 * js-demo / ui — related-page.js
 * 各デモ画面の末尾に「同じ前提を使う画面」を出す。
 * 日本語版と英語版の両方から読み込む（文言は <html lang> で切り替わる）。
 *
 * 決めごと:
 *   - **手書きのリンクは作らない。** 共有する前提概念から作る
 *     （正本は js/ui/demos.js、決めごとは管理リポジトリの planning/LEARNING-DESIGN.md 9章）。
 *   - 共有する概念が無い題材では、枠ごと出さない。
 *     「関連なし」と書いて場所を取らない。
 *   - 行き先は同じ言語の中（日本語版からは日本語版へ）。
 */
(function (global) {
  "use strict";

  function start() {
    var JsDemo = global.JsDemo;
    var host = document.getElementById("related");
    if (!host || !JsDemo || !JsDemo.Demos) { return; }

    var items = JsDemo.Demos.related(host.dataset.demo);
    if (items.length === 0) { return; }

    var t = (JsDemo.I18n && JsDemo.I18n.t) || function (key) { return key; };
    var lang = (JsDemo.I18n && JsDemo.I18n.language) || "ja";
    var list = host.querySelector(".related__list");
    if (!list) { return; }

    items.forEach(function (item) {
      var line = document.createElement("li");

      var link = document.createElement("a");
      link.href = "../" + item.id + "/index.html";
      link.textContent = item.title[lang] || item.title.ja;
      line.appendChild(link);

      /* どの前提を共有しているかを書く。「関連」とだけ言わない。 */
      var shared = document.createElement("span");
      shared.className = "related__shared";
      shared.textContent = t("related.shared", {
        premise: item.shared.map(function (concept) {
          return t("catalog.premise." + concept);
        }).join(" / ")
      });
      line.appendChild(shared);

      list.appendChild(line);
    });

    host.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
