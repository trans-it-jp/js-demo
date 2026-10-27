/*!
 * js-demo / ui — catalog-page.js
 * トップページの目録に、想定学年／分野の切替をつなぐ。
 * 日本語版と英語版の両方から読み込む（文言は <html lang> で切り替わる）。
 */
(function () {
  "use strict";

  function start() {
    JsDemo.Catalog.create({
      list: "catalog",
      controls: "catalog-modes",
      initial: "stage"
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
