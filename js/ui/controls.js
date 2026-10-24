/*!
 * js-demo / ui — controls.js
 * 入力部品のつなぎ込み。
 *
 * どの値もスライダーとドラッグ以外に数値入力で変えられるようにしてある。
 * 細かい操作が難しい場合やキーボードだけの場合でも同じ学習ができるため。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;

  function byId(id) { return document.getElementById(id); }

  /**
   * スライダーと数値入力を双方向に同期する。
   * @param {string} name  id の接頭辞。<name> と <name>-num を組にする。
   * @param {Function} [onChange]  値が変わったときに呼ばれる
   * @returns {{value:Function, set:Function, slider:Element, number:Element}|null}
   */
  function bindPair(name, onChange) {
    var slider = byId(name);
    var number = byId(name + "-num");
    if (!slider || !number) { return null; }

    var min = Numeric.toFinite(slider.min, -Infinity);
    var max = Numeric.toFinite(slider.max, Infinity);

    function notify() { if (onChange) { onChange(read()); } }

    function read() {
      return Numeric.readNumber(slider.value, { min: min, max: max });
    }

    slider.addEventListener("input", function () {
      number.value = slider.value;
      notify();
    });

    /* 数値入力は入力途中（空欄や "-" だけ）もありうるので、
       スライダーへ写すときに範囲へ収める。 */
    number.addEventListener("input", function () {
      var v = Numeric.readNumber(number.value, { min: min, max: max });
      slider.value = v;
      notify();
    });

    /* 入力欄を離れたとき、丸めた値を表示へ戻す。 */
    number.addEventListener("change", function () {
      number.value = Numeric.readNumber(number.value, { min: min, max: max });
      slider.value = number.value;
      notify();
    });

    return {
      slider: slider,
      number: number,
      value: read,
      set: function (v) {
        var clamped = Numeric.clamp(v, min, max);
        slider.value = clamped;
        number.value = clamped;
      }
    };
  }

  /**
   * 複数の組をまとめてつなぐ。
   * @param {Array<string>} names
   * @param {Function} onChange
   * @returns {Object} name をキーにした組の辞書
   */
  function bindPairs(names, onChange) {
    var map = {};
    names.forEach(function (name) {
      var pair = bindPair(name, onChange);
      if (pair) { map[name] = pair; }
    });
    return map;
  }

  /** 組の辞書から現在値をまとめて読む */
  function readAll(pairs) {
    var out = {};
    Object.keys(pairs).forEach(function (name) {
      out[name] = pairs[name].value();
    });
    return out;
  }

  /**
   * aria-pressed で押されている状態を持つボタン群。
   * 色だけでなく枠と印でも示すのは CSS 側で行う。
   * @param {string} containerId
   * @param {string} initial  最初に押された状態にする data-mode の値
   * @param {Function} onSelect
   */
  function bindModeButtons(containerId, initial, onSelect) {
    var container = byId(containerId);
    if (!container) { return null; }
    var buttons = Array.prototype.slice.call(
      container.querySelectorAll("button[data-mode]")
    );

    function select(mode) {
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode));
      });
      if (onSelect) { onSelect(mode); }
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        select(b.getAttribute("data-mode"));
      });
    });

    select(initial);
    return { select: select, buttons: buttons };
  }

  /**
   * 定義リスト（dt/dd）に現在の状態を書き出す。
   * @param {string} containerId
   * @param {Array<{label:string, value:string}>} rows
   */
  function renderReadout(containerId, rows) {
    var container = byId(containerId);
    if (!container) { return; }
    container.textContent = "";
    rows.forEach(function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row.label;
      var dd = document.createElement("dd");
      dd.textContent = row.value;
      container.appendChild(dt);
      container.appendChild(dd);
    });
  }

  /**
   * 画面読み上げ等へ変化を伝える領域の文字列を差し替える。
   * 要素には aria-live="polite" を付けておく。
   */
  function announce(containerId, text) {
    var container = byId(containerId);
    if (!container) { return; }
    container.textContent = text;
  }

  JsDemo.Controls = {
    byId: byId,
    bindPair: bindPair,
    bindPairs: bindPairs,
    readAll: readAll,
    bindModeButtons: bindModeButtons,
    renderReadout: renderReadout,
    announce: announce
  };
})(window);
