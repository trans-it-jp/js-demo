/*!
 * js-demo / ui — tables.js
 * 図の内容を数値の表としても読めるようにする。
 *
 * 図を目で追えない場合や、値そのものを確かめたい場合のための代替表示。
 * 図と同じ数値を出すので、見た目と計算が食い違っていれば表で気づける。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;

  function element(tag, text) {
    var el = document.createElement(tag);
    if (text !== undefined) { el.textContent = text; }
    return el;
  }

  /**
   * 3×3 行列を表にする。
   * @param {Element} container  差し込み先（中身は置き換える）
   * @param {Array<Array<number>>} matrix
   * @param {string} caption
   * @param {number} [digits]
   */
  function renderMatrix(container, matrix, caption, digits) {
    var d = digits === undefined ? 3 : digits;
    container.textContent = "";

    var table = element("table");
    if (caption) { table.appendChild(element("caption", caption)); }

    var thead = element("thead");
    var headRow = element("tr");
    headRow.appendChild(element("th", ""));
    ["c1", "c2", "c3"].forEach(function (label) {
      var th = element("th", label);
      th.setAttribute("scope", "col");
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = element("tbody");
    matrix.forEach(function (row, i) {
      var tr = element("tr");
      var th = element("th", "r" + (i + 1));
      th.setAttribute("scope", "row");
      tr.appendChild(th);
      row.forEach(function (value) {
        tr.appendChild(element("td", Numeric.format(value, d)));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * 見出し付きの行列表を並べる。
   * @param {Element} container
   * @param {Array<{caption:string, M:Array<Array<number>>}>} items
   */
  function renderMatrixList(container, items) {
    container.textContent = "";
    items.forEach(function (item) {
      var cell = element("div");
      renderMatrix(cell, item.M, item.caption);
      container.appendChild(cell);
    });
  }

  /**
   * 一般の表。列定義と行データから組む。
   * @param {Element} container
   * @param {Object} spec
   * @param {string} [spec.caption]
   * @param {Array<string>} spec.columns  列見出し
   * @param {Array<Array<string>>} spec.rows  1 列目は行見出しとして扱う
   */
  function renderTable(container, spec) {
    container.textContent = "";
    var table = element("table");
    if (spec.caption) { table.appendChild(element("caption", spec.caption)); }

    var thead = element("thead");
    var headRow = element("tr");
    spec.columns.forEach(function (label) {
      var th = element("th", label);
      th.setAttribute("scope", "col");
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = element("tbody");
    spec.rows.forEach(function (row) {
      var tr = element("tr");
      row.forEach(function (value, i) {
        if (i === 0) {
          var th = element("th", value);
          th.setAttribute("scope", "row");
          tr.appendChild(th);
        } else {
          tr.appendChild(element("td", value));
        }
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  JsDemo.Tables = {
    renderMatrix: renderMatrix,
    renderMatrixList: renderMatrixList,
    renderTable: renderTable
  };
})(window);
