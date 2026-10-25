/*!
 * js-demo / ui — share-link.js
 * 画面の初期条件を URL へ載せ、授業で同じ状態を共有できるようにする。
 *
 * 決めごと:
 *   - 載せるのは「どの状態から始めるか」を決める数値だけ。
 *     自由入力の文字列は一切受け取らない。個人情報が URL に入る余地をなくす。
 *   - 読み込んだ値は必ず範囲と型を検査する。URL は誰でも書き換えられる。
 *   - 知らない名前の param は捨てる。
 *   - 履歴は replaceState で書き換える。戻るボタンが操作のたびに増えない。
 *
 * parse と build は DOM に触らない純粋な関数なので、Node からも検証できる。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;

  /**
   * クエリ文字列を仕様に従って読む。
   * @param {string} search  "?seed=42&k=3" の形（先頭の ? は有無どちらでも）
   * @param {Object} spec    { 名前: {min, max, integer, fallback} }
   * @returns {Object} 仕様にある名前だけを含む、検査済みの値
   */
  function parse(search, spec) {
    var text = String(search || "");
    if (text.charAt(0) === "?") { text = text.slice(1); }

    var found = {};
    text.split("&").forEach(function (pair) {
      if (!pair) { return; }
      var index = pair.indexOf("=");
      var key = index < 0 ? pair : pair.slice(0, index);
      var value = index < 0 ? "" : pair.slice(index + 1);
      try {
        key = decodeURIComponent(key.replace(/\+/g, " "));
        value = decodeURIComponent(value.replace(/\+/g, " "));
      } catch (error) {
        return; /* 壊れた encoding は捨てる */
      }
      found[key] = value;
    });

    var out = {};
    Object.keys(spec).forEach(function (name) {
      var rule = spec[name];
      if (!Object.prototype.hasOwnProperty.call(found, name)) {
        out[name] = rule.fallback;
        return;
      }
      /* 範囲外・空欄・数でない値は readNumber が既定値と範囲へ寄せる。
         URL の値をそのまま計算へ渡さない。 */
      out[name] = Numeric.readNumber(found[name], {
        min: rule.min,
        max: rule.max,
        integer: rule.integer,
        fallback: rule.fallback
      });
    });
    return out;
  }

  /**
   * 値からクエリ文字列を作る。既定値と同じものは省いて URL を短く保つ。
   * @param {Object} values
   * @param {Object} spec
   * @returns {string} "?seed=7&k=4"（全部が既定値なら空文字）
   */
  function build(values, spec) {
    var parts = [];
    Object.keys(spec).forEach(function (name) {
      var value = values[name];
      if (value === undefined || value === null) { return; }
      if (value === spec[name].fallback) { return; }
      parts.push(encodeURIComponent(name) + "=" + encodeURIComponent(String(value)));
    });
    return parts.length === 0 ? "" : "?" + parts.join("&");
  }

  /** いまの URL から読む */
  function read(spec) {
    return parse(global.location ? global.location.search : "", spec);
  }

  /** いまの状態を表す URL の文字列。共有欄に出す用。 */
  function currentUrl(values, spec) {
    var location = global.location;
    if (!location) { return build(values, spec); }
    return location.origin + location.pathname + build(values, spec);
  }

  /**
   * アドレス欄を書き換える。履歴は増やさない。
   * file:// で開いた場合など replaceState が使えない環境では黙って何もしない。
   */
  function sync(values, spec) {
    if (!global.history || !global.history.replaceState) { return; }
    try {
      global.history.replaceState(null, "", currentUrl(values, spec));
    } catch (error) {
      /* file:// など。URL が更新されないだけで、画面の動作には影響しない。 */
    }
  }

  JsDemo.ShareLink = {
    parse: parse,
    build: build,
    read: read,
    currentUrl: currentUrl,
    sync: sync
  };
})(typeof window !== "undefined" ? window : globalThis);
