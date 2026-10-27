/*!
 * js-demo / ui — demos.js
 * 公開している題材の一覧。**前提概念の正本はここ。**
 *
 * なぜ 1 か所に集めるか:
 *   トップページの絞り込みと、各画面の「同じ前提を使う画面」の両方が
 *   同じ対応表を要る。カード側と画面側に分けて書くと必ず食い違うので、
 *   ここだけに書く。題名は画面の見出しと同じ文字にする（点検器が照合する）。
 *
 * 語彙:
 *   概念の ID は統制語彙（管理リポジトリの planning/LEARNING-DESIGN.md 9章）。
 *   名札と前提の文は js/ui/i18n.js の catalog.concept.* / catalog.premise.*。
 *   **先に全部作らない。** 題材を作るときに 1 語ずつ足す。
 *
 * related と conceptsOf は DOM に触らない純粋な関数なので、Node からも検証できる。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /* 並び順は目録に出す順。id はフォルダ名で、場所は <id>/index.html。 */
  var LIST = [
    {
      id: "k-means",
      title: { ja: "k-means 法", en: "k-means" },
      concepts: ["coord", "mean", "distance"]
    },
    {
      id: "linear-transformation",
      title: { ja: "2D 座標変換", en: "2D coordinate transforms" },
      concepts: ["coord", "matrix", "vector"]
    },
    {
      id: "sorting",
      title: { ja: "ソートの手順くらべ", en: "Sorting side by side" },
      concepts: ["order", "repeat", "bar"]
    }
  ];

  function get(id, list) {
    var items = list || LIST;
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].id === id) { return items[i]; }
    }
    return null;
  }

  /** その題材の前提概念。知らない id では空の並びを返す。 */
  function conceptsOf(id, list) {
    var demo = get(id, list);
    return demo ? demo.concepts.slice() : [];
  }

  /**
   * 前提概念を 1 つ以上共有する、ほかの題材。
   * 自分自身は入れない。共有が無ければ空の並び。
   * @returns {Array} [{ id, title, shared: string[] }]
   */
  function related(id, list) {
    var items = list || LIST;
    var mine = conceptsOf(id, items);
    if (mine.length === 0) { return []; }

    return items.filter(function (demo) {
      return demo.id !== id;
    }).map(function (demo) {
      return {
        id: demo.id,
        title: demo.title,
        shared: demo.concepts.filter(function (concept) {
          return mine.indexOf(concept) >= 0;
        })
      };
    }).filter(function (demo) {
      return demo.shared.length > 0;
    });
  }

  JsDemo.Demos = {
    list: LIST,
    get: get,
    conceptsOf: conceptsOf,
    related: related
  };
})(typeof window !== "undefined" ? window : globalThis);
