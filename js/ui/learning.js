/*!
 * js-demo / ui — learning.js
 * 学習の流れを支える仕掛け。
 *
 *   - 予想: 動かす前に一つ選ぶ。選んだら結果と並べて見比べられる
 *   - ヒント: 段階的に開く。答えを先に見せない
 *   - 語彙: 同じ内容をやさしい言い方と詳しい言い方で出し分ける
 *
 * 決めごと:
 *   予想は**強制しない**。選ばなくても操作できる（代表者の判断、2026-10-25）。
 *   触った回数を理解度にしないという方針と、最初の一手で詰まらせないため。
 *   そのかわり、選んだ人には結果との答え合わせを返す。
 *
 *   折りたたみは <details> を使う。JavaScript が動かなくても開けるため。
 *
 * 状態は画面の中だけに持つ。誰が何を選んだかは記録も送信もしない。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  function t(key) {
    return (JsDemo.I18n && JsDemo.I18n.t) ? JsDemo.I18n.t(key) : key;
  }

  /* --- 予想 ---------------------------------------------------------- */

  /**
   * 予想の選択を配線する。
   *
   * 想定する印:
   *   <fieldset id="predict" data-answer="b">
   *     <legend>…問い…</legend>
   *     <label><input type="radio" name="predict" value="a"> …</label>
   *     <label><input type="radio" name="predict" value="b"> …</label>
   *   </fieldset>
   *   <p id="predict-result" role="status" aria-live="polite"></p>
   *
   * `data-answer` は任意。付いていれば正誤を言い、無ければ
   * 「あなたはこう予想した」とだけ返す。正解が一つに決まらない問いもあるため。
   *
   * @param {Object} options
   * @param {string} options.field   予想欄の id
   * @param {string} [options.result] 結果を書く要素の id
   * @param {Function} [options.onChange] 選ばれたときに呼ばれる
   */
  function wirePrediction(options) {
    var field = document.getElementById(options.field);
    if (!field) { return null; }
    var result = options.result ? document.getElementById(options.result) : null;
    var chosen = null;

    field.addEventListener("change", function (event) {
      var input = event.target;
      if (!input || input.type !== "radio") { return; }
      chosen = {
        value: input.value,
        /* ラベルの文字をそのまま控える。あとで結果と並べて出す。 */
        text: (input.closest("label") || input).textContent.trim()
      };
      if (result) { result.textContent = ""; }
      if (options.onChange) { options.onChange(chosen); }
    });

    return {
      /** 選ばれているか。選ばれていなくても操作は止めない。 */
      get chosen() { return chosen; },

      /**
       * 結果が出たときに答え合わせを出す。
       * 予想していなければ何も出さない。責めるような文言を出さない。
       */
      reveal: function (outcomeText) {
        if (!result) { return; }
        if (!chosen) { result.textContent = ""; return; }
        var answer = field.getAttribute("data-answer");
        var head;
        if (answer) {
          head = chosen.value === answer ? t("predict.matched") : t("predict.differed");
        } else {
          head = t("predict.yours");
        }
        result.textContent = head + " " + chosen.text +
          (outcomeText ? " / " + t("predict.outcome") + " " + outcomeText : "");
      },

      /** 別の配置にしたときなどに選択を消す */
      reset: function () {
        chosen = null;
        Array.prototype.forEach.call(
          field.querySelectorAll("input[type=radio]"),
          function (input) { input.checked = false; }
        );
        if (result) { result.textContent = ""; }
      }
    };
  }

  /* --- 段階的に開くヒント --------------------------------------------- */

  /**
   * ヒントを 1 段ずつ開く。最後まで開かないと答えに届かないようにする。
   *
   * 想定する印:
   *   <div id="hints" class="hints">
   *     <p class="hints__step" hidden>…1段目…</p>
   *     <p class="hints__step" hidden>…2段目…</p>
   *     <button type="button" class="hints__more">次のヒント</button>
   *   </div>
   *
   * JavaScript が動かない場合は、hidden を外しておけば全部読める形にする。
   */
  function wireHints(containerId) {
    var container = document.getElementById(containerId);
    if (!container) { return null; }
    var steps = Array.prototype.slice.call(
      container.querySelectorAll(".hints__step")
    );
    var button = container.querySelector(".hints__more");
    var opened = 0;

    function update() {
      steps.forEach(function (step, index) {
        if (index < opened) { step.removeAttribute("hidden"); }
        else { step.setAttribute("hidden", ""); }
      });
      if (!button) { return; }
      var left = steps.length - opened;
      button.disabled = left <= 0;
      /* 残りの数は括弧の形を言語に合わせる。英語に全角括弧は出さない。 */
      var brackets = (JsDemo.I18n && JsDemo.I18n.language === "en")
        ? [" (", ")"] : ["（", "）"];
      button.textContent = left <= 0
        ? t("hint.allShown")
        : t("hint.more") + brackets[0] + left + brackets[1];
    }

    if (button) {
      button.addEventListener("click", function () {
        if (opened < steps.length) { opened += 1; }
        update();
        /* 開いた段へ焦点を移す。読み上げでも続きが分かるように。 */
        var latest = steps[opened - 1];
        if (latest) {
          latest.setAttribute("tabindex", "-1");
          latest.focus({ preventScroll: true });
        }
      });
    }

    update();
    return {
      get opened() { return opened; },
      reset: function () { opened = 0; update(); }
    };
  }

  /* --- 語彙の切り替え -------------------------------------------------- */

  /**
   * 同じ内容を、やさしい言い方と詳しい言い方で出し分ける。
   * 小学生向けの語彙と大学の式を同じ画面に常時並べないため。
   *
   * 想定する印:
   *   <div id="wording" class="wording">
   *     <button type="button" data-level="plain" aria-pressed="true">やさしく</button>
   *     <button type="button" data-level="formal" aria-pressed="false">式で</button>
   *   </div>
   *   <p data-level="plain">…やさしい言い方…</p>
   *   <p data-level="formal">…式…</p>
   *
   * 段階の数は決め打ちしない。data-level の値を増やせば増やせる。
   * 実際にいくつ要るかは【T02】学習設計の結果で決める。
   */
  function wireWording(options) {
    var controls = document.getElementById(options.controls);
    if (!controls) { return null; }
    var scope = options.scope
      ? document.getElementById(options.scope)
      : document;
    var buttons = Array.prototype.slice.call(
      controls.querySelectorAll("button[data-level]")
    );
    if (buttons.length === 0) { return null; }

    /* 切り替え対象は、操作ボタン自身を除いた data-level を持つ要素。 */
    function targets() {
      return Array.prototype.slice.call(scope.querySelectorAll("[data-level]"))
        .filter(function (el) { return el.tagName !== "BUTTON"; });
    }

    var current = null;

    function show(level) {
      current = level;
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-level") === level));
      });
      targets().forEach(function (el) {
        if (el.getAttribute("data-level") === level) { el.removeAttribute("hidden"); }
        else { el.setAttribute("hidden", ""); }
      });
      if (options.onChange) { options.onChange(level); }
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-level")); });
    });

    show(options.initial || buttons[0].getAttribute("data-level"));
    return { get level() { return current; }, show: show };
  }

  JsDemo.Learning = {
    wirePrediction: wirePrediction,
    wireHints: wireHints,
    wireWording: wireWording
  };
})(typeof window !== "undefined" ? window : globalThis);
