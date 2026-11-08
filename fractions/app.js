/*!
 * js-demo / fractions — app.js
 * 分数の大きさくらべの画面。日本語版と英語版の両方から読み込む。
 *
 * 計算は js/fraction/compare.js、描画は js/viz/area.js が持つ。
 * ここは**入力部品と手順の進み具合をつなぐだけ**で、計算を持たない。
 *
 * 分数を変えたら最初からやり直す。途中で分母が変わると、すでに進めた手と
 * 食い違うため。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo;
  var Fraction = JsDemo.Fraction;
  var AreaPlot = JsDemo.AreaPlot;
  var Controls = JsDemo.Controls;
  var Tables = JsDemo.Tables;
  var ShareLink = JsDemo.ShareLink;
  var Learning = JsDemo.Learning;
  var t = JsDemo.I18n.t;

  var PAIRS = ["a-numerator", "a-denominator", "b-numerator", "b-denominator"];

  /* URL へ載せるのは数値だけ。範囲は入力欄から読む（書き写さない）。 */
  var SHARE_FIELDS = [
    { param: "an", control: "a-numerator", integer: true },
    { param: "ad", control: "a-denominator", integer: true },
    { param: "bn", control: "b-numerator", integer: true },
    { param: "bd", control: "b-denominator", integer: true }
  ];

  var pairs = null;
  var spec = null;
  var viz = null;
  var hints = null;
  var steps = [];
  var state = null;
  var cursor = 0;
  var notation = "fraction";

  function value(name) { return pairs[name] ? pairs[name].value() : 0; }

  function fractions() {
    /* 分子は分母より大きくしない（この画面は 0 以上 1 以下だけを扱う）。 */
    return {
      a: Fraction.make(value("a-numerator"), value("a-denominator")),
      b: Fraction.make(value("b-numerator"), value("b-denominator"))
    };
  }

  /* --- 数の書き方 --------------------------------------------------------- */

  function show(fraction) {
    if (notation === "decimal") { return String(Fraction.toDecimal(fraction)); }
    if (notation === "percent") { return Fraction.toPercent(fraction) + "%"; }
    return fraction.numerator + "/" + fraction.denominator;
  }

  function sideName(side) {
    return t(side === "a" ? "frac.side.left" : "frac.side.right");
  }

  /* --- 組み立て ----------------------------------------------------------- */

  function rebuild() {
    var pair = fractions();
    /* 分子が分母を超えていたら、入力欄の表示も合わせて直す。 */
    pairs["a-numerator"].set(pair.a.numerator);
    pairs["b-numerator"].set(pair.b.numerator);

    steps = Fraction.steps(pair.a, pair.b);
    state = Fraction.initial(pair.a, pair.b);
    cursor = 0;
    refreshShareLink();
    render(t("frac.message.reset"));
  }

  function stepForward() {
    if (cursor >= steps.length) { return; }
    state = Fraction.applyStep(state, steps[cursor]);
    cursor += 1;
    render(describe(steps[cursor - 1]));
  }

  function stepBack() {
    if (cursor === 0) { return; }
    cursor -= 1;
    var pair = fractions();
    state = Fraction.replay(pair.a, pair.b, steps, cursor);
    render(cursor === 0 ? t("frac.message.reset") : describe(steps[cursor - 1]));
  }

  function toEnd() {
    while (cursor < steps.length) {
      state = Fraction.applyStep(state, steps[cursor]);
      cursor += 1;
    }
    render(describe(steps[steps.length - 1]));
  }

  /* --- いまの手を言葉にする ----------------------------------------------- */

  function describe(step) {
    if (!step) { return ""; }
    if (step.type === "divide") {
      return t("frac.step.divide", {
        side: sideName(step.side), parts: step.parts
      });
    }
    if (step.type === "fill") {
      return t("frac.step.fill", {
        side: sideName(step.side), count: step.count, parts: step.parts
      });
    }
    if (step.type === "recut") {
      return step.already
        ? t("frac.step.recutSame", { denominator: step.denominator })
        : t("frac.step.recut", {
            denominator: step.denominator, a: step.a, b: step.b
          });
    }
    if (step.type === "count") {
      return t("frac.step.count", {
        a: step.a, b: step.b, denominator: step.denominator,
        result: t(resultKey(step.result))
      });
    }
    return "";
  }

  function resultKey(result) {
    if (result > 0) { return "frac.result.greater"; }
    if (result < 0) { return "frac.result.less"; }
    return "frac.result.equal";
  }

  function signText() {
    if (state.result === null) { return ""; }
    if (state.result > 0) { return ">"; }
    if (state.result < 0) { return "<"; }
    return "=";
  }

  /* --- 表示 --------------------------------------------------------------- */

  function render(message) {
    var pair = fractions();

    viz.draw(state, {
      captions: { a: show(pair.a), b: show(pair.b) },
      notes: {
        a: noteFor("a"),
        b: noteFor("b")
      },
      sign: signText(),
      summary: t("frac.figure.summary", {
        a: pair.a.numerator + "/" + pair.a.denominator,
        b: pair.b.numerator + "/" + pair.b.denominator,
        phase: t("frac.phase." + state.phase)
      })
    });

    Controls.renderReadout("readout", [
      { label: t("frac.readout.steps"), value: cursor + " / " + steps.length },
      { label: t("frac.readout.phase"), value: t("frac.phase." + state.phase) },
      { label: t("frac.readout.common"),
        value: state.common === null ? "—" : String(state.common) },
      { label: t("frac.readout.result"),
        value: state.result === null ? "—" : t(resultKey(state.result)) }
    ]);

    var formula = document.getElementById("formula");
    if (formula && message) { formula.textContent = message; }
    if (message) { Controls.announce("live", message); }

    renderTable(pair);
  }

  function noteFor(side) {
    var part = state[side];
    if (!part.cut) { return t("frac.note.whole"); }
    if (state.common === null) {
      return t("frac.note.base", { parts: part.base });
    }
    return t("frac.note.recut", { base: part.base, parts: part.parts });
  }

  function renderTable(pair) {
    var common = Fraction.common(pair.a, pair.b);
    var rows = [
      [t("frac.table.fraction"),
       pair.a.numerator + "/" + pair.a.denominator,
       pair.b.numerator + "/" + pair.b.denominator],
      [t("frac.table.decimal"),
       String(Fraction.toDecimal(pair.a)),
       String(Fraction.toDecimal(pair.b))],
      [t("frac.table.percent"),
       Fraction.toPercent(pair.a) + "%",
       Fraction.toPercent(pair.b) + "%"],
      [t("frac.table.common", { denominator: common.denominator }),
       common.a.numerator + "/" + common.denominator,
       common.b.numerator + "/" + common.denominator]
    ];
    Tables.renderTable(document.getElementById("compare-table"), {
      caption: t("frac.table.caption"),
      columns: [t("frac.table.row"), t("frac.side.left"), t("frac.side.right")],
      rows: rows
    });
  }

  /* --- 共有リンク --------------------------------------------------------- */

  function shareValues() {
    var values = {};
    SHARE_FIELDS.forEach(function (field) {
      values[field.param] = value(field.control);
    });
    return values;
  }

  function refreshShareLink() {
    var values = shareValues();
    ShareLink.sync(values, spec);
    ShareLink.refreshField("share-url", values, spec);
  }

  /* --- 起動 --------------------------------------------------------------- */

  function init() {
    viz = AreaPlot.create({
      container: "#plot",
      labels: { figure: t("frac.figure.label") }
    });

    pairs = Controls.bindPairs(PAIRS, function () { rebuild(); });

    spec = ShareLink.specFromControls(SHARE_FIELDS);
    var shared = ShareLink.read(spec);
    SHARE_FIELDS.forEach(function (field) {
      if (shared[field.param] !== undefined && pairs[field.control]) {
        pairs[field.control].set(shared[field.param]);
      }
    });

    Controls.bindModeButtons("notation", notation, function (mode) {
      notation = mode;
      if (state) { render(""); }
    });

    document.getElementById("reset").addEventListener("click", function () {
      /* 中心の問いの組へ戻す。別の組を試したあと、すぐ元へ戻れるようにする。 */
      pairs["a-numerator"].set(2);
      pairs["a-denominator"].set(3);
      pairs["b-numerator"].set(3);
      pairs["b-denominator"].set(5);
      rebuild();
    });
    document.getElementById("step").addEventListener("click", stepForward);
    document.getElementById("back").addEventListener("click", stepBack);
    document.getElementById("to-end").addEventListener("click", toEnd);

    ShareLink.wireField({
      field: "share-url", button: "share-copy", status: "share-status"
    });

    hints = Learning.wireHints("hints");
    Learning.wireWording("wording");

    rebuild();
    return hints;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
