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
   * 入力欄の刻みに合わせる。
   * 刻み 1 の角度欄に 37.5 を渡しても、画面には 38 しか表示できない。
   * ブラウザの丸めに任せず、ここで値を合わせて表示と URL を一致させる。
   */
  function snapToStep(value, rule) {
    if (!rule.step || !Number.isFinite(rule.step) || rule.step <= 0) { return value; }
    var base = Number.isFinite(rule.min) ? rule.min : 0;
    var snapped = base + Math.round((value - base) / rule.step) * rule.step;
    /* 刻みを足し合わせた誤差を落とす */
    var decimals = rule.decimals === undefined ? 6 : rule.decimals;
    return Numeric.round(snapped, decimals);
  }

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
      out[name] = snapToStep(Numeric.readNumber(found[name], {
        min: rule.min,
        max: rule.max,
        integer: rule.integer,
        fallback: rule.fallback
      }), rule);
    });
    return out;
  }

  /**
   * 値からクエリ文字列を作る。既定値と同じものは省いて URL を短く保つ。
   *
   * 小数は `decimals`（既定 3 桁）へ丸める。浮動小数の計算で
   * 1.2000000000000002 のような値が URL に出るのを防ぐ。
   *
   * @param {Object} values
   * @param {Object} spec
   * @returns {string} "?seed=7&k=4"（全部が既定値なら空文字）
   */
  function build(values, spec) {
    var parts = [];
    Object.keys(spec).forEach(function (name) {
      var rule = spec[name];
      var value = values[name];
      if (value === undefined || value === null) { return; }
      if (typeof value === "number" && !rule.integer) {
        value = Numeric.round(value, rule.decimals === undefined ? 3 : rule.decimals);
      }
      if (value === rule.fallback) { return; }
      parts.push(encodeURIComponent(name) + "=" + encodeURIComponent(String(value)));
    });
    return parts.length === 0 ? "" : "?" + parts.join("&");
  }

  /**
   * 共有欄（読み取り専用の入力と複写ボタン）を配線する。
   *
   * クリップボードは安全な接続でなければ使えず、権限も拒否されうる。
   * 失敗しても文字列を選択状態にして、手で複写できるようにしておく。
   *
   * @param {Object} ids  { field, button, status } の要素 id
   */
  function wireField(ids) {
    var field = document.getElementById(ids.field);
    var button = document.getElementById(ids.button);
    if (!field || !button) { return; }

    var t = (JsDemo.I18n && JsDemo.I18n.t) || function (key) { return key; };

    /* 触れたら全選択。手で複写する人の手数を減らす。 */
    field.addEventListener("focus", function () { field.select(); });

    button.addEventListener("click", function () {
      field.select();
      var status = ids.status ? document.getElementById(ids.status) : null;

      function report(message) {
        if (status) { status.textContent = message; }
      }

      function done() {
        report(t("share.copied"));
        button.textContent = t("share.copied");
        global.setTimeout(function () {
          button.textContent = t("share.copy");
        }, 2000);
      }

      function failed() {
        /* 選択は済んでいるので、そのまま手で複写できる。 */
        report(t("share.copyFailed"));
      }

      if (global.navigator && global.navigator.clipboard &&
          global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(field.value).then(done, failed);
      } else {
        failed();
      }
    });
  }

  /** 共有欄の表示を、いまの値に合わせる */
  function refreshField(fieldId, values, spec) {
    var field = document.getElementById(fieldId);
    if (field) { field.value = currentUrl(values, spec); }
  }

  /**
   * 入力欄（スライダー）から仕様を組み立てる。
   * 範囲を別の場所へ書き写すと画面と食い違い、共有した値が黙って変わる。
   * 出どころを入力欄の 1 つに保つための補助。
   *
   * @param {Array} fields  [{ param: "sx", control: "scale-x", integer: false }]
   */
  function specFromControls(fields) {
    var spec = {};
    fields.forEach(function (field) {
      var slider = document.getElementById(field.control);
      if (!slider) { return; }
      spec[field.param] = {
        min: Numeric.toFinite(slider.min, -Infinity),
        max: Numeric.toFinite(slider.max, Infinity),
        step: Numeric.toFinite(slider.step, 0),
        integer: field.integer === true,
        decimals: field.decimals,
        fallback: Numeric.toFinite(slider.defaultValue, 0)
      };
    });
    return spec;
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
    sync: sync,
    wireField: wireField,
    refreshField: refreshField,
    specFromControls: specFromControls
  };
})(typeof window !== "undefined" ? window : globalThis);
