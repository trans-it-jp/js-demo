/*!
 * js-demo / core — numeric.js
 * 数値の丸め・範囲制限・表示整形。
 * 入力欄から来た値は文字列で、空欄や全角、範囲外もありうるため、
 * 計算へ渡す前にここで必ず有限な数へ直す。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /** 小数 digits 桁へ丸める（既定 4 桁） */
  function round(value, digits) {
    var d = digits === undefined ? 4 : digits;
    var f = Math.pow(10, d);
    return Math.round(value * f) / f;
  }

  /** min 以上 max 以下に収める */
  function clamp(value, min, max) {
    if (value < min) { return min; }
    if (value > max) { return max; }
    return value;
  }

  /**
   * 入力値を有限な数にする。数にできなければ fallback を返す。
   * 全角数字と全角マイナスも受け付ける（日本語入力のままでも通るように）。
   */
  function toFinite(value, fallback) {
    var alt = fallback === undefined ? 0 : fallback;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : alt;
    }
    if (value === null || value === undefined) { return alt; }
    var text = String(value)
      .replace(/[０-９]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
      })
      .replace(/[−–—ー]/g, "-")
      .replace(/[．]/g, ".")
      .trim();
    if (text === "") { return alt; }
    var n = Number(text);
    return Number.isFinite(n) ? n : alt;
  }

  /** toFinite してから範囲に収める。入力欄の値をそのまま渡す用。 */
  function readNumber(value, options) {
    var o = options || {};
    var n = toFinite(value, o.fallback === undefined ? 0 : o.fallback);
    if (o.integer) { n = Math.round(n); }
    if (o.min !== undefined || o.max !== undefined) {
      n = clamp(n, o.min === undefined ? -Infinity : o.min,
                   o.max === undefined ? Infinity : o.max);
    }
    return n;
  }

  /** 表示用。桁数を揃え、-0 を 0 にする。 */
  function format(value, digits) {
    var d = digits === undefined ? 3 : digits;
    if (!Number.isFinite(value)) { return "—"; }
    var r = round(value, d);
    if (r === 0) { r = 0; }
    return r.toFixed(d);
  }

  /** 1.5 を "1.5"、2 を "2" のように、余分な 0 を落として表示する。 */
  function formatShort(value, digits) {
    if (!Number.isFinite(value)) { return "—"; }
    var r = round(value, digits === undefined ? 3 : digits);
    if (r === 0) { r = 0; }
    return String(r);
  }

  /** 2 点間のユークリッド距離の 2 乗。平方根を取らない比較に使う。 */
  function distanceSquared(a, b) {
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  /** 2 点間のユークリッド距離 */
  function distance(a, b) {
    return Math.sqrt(distanceSquared(a, b));
  }

  /** 平均。空配列では null を返す（0 と区別するため）。 */
  function mean(values) {
    if (values.length === 0) { return null; }
    var sum = 0;
    for (var i = 0; i < values.length; i += 1) { sum += values[i]; }
    return sum / values.length;
  }

  JsDemo.Numeric = {
    round: round,
    clamp: clamp,
    toFinite: toFinite,
    readNumber: readNumber,
    format: format,
    formatShort: formatShort,
    distance: distance,
    distanceSquared: distanceSquared,
    mean: mean
  };
})(typeof window !== "undefined" ? window : globalThis);
