/*!
 * js-demo / fraction — compare.js
 * 2 つの分数を「同じ全体」で比べる手順を作る。
 *
 * 決めごと:
 *   - **描画も DOM も扱わない。** 手順の列を返すだけなので、Node でそのまま照合できる。
 *   - 1 手は「全体を分ける」「分子だけ塗る」「同じ分け方へそろえ直す」「数える」。
 *     そろえ直す手を**必ず通す**ので、「同じ全体にそろえてから比べる」が飛ばせない。
 *   - 扱うのは **0 以上 1 以下の分数**だけ（分子 ≤ 分母）。仮分数・帯分数・負の分数、
 *     加減乗除、約分の練習は初期に含めない（学習設計 3 章）。
 *   - **基準の全体は変えない。** 2 つの正方形はいつも同じ大きさで、
 *     違う全体どうしを比べる操作は用意しない（誤解 A-4）。
 *   - 既約化はしない。見せたいのは「分け方をそろえると数えられる」ことで、
 *     約分の手続きではない。等しい分数（1/2 と 2/4）は**同じ面積**として出る。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;

  /* 画面で読める範囲。これより細かく分けると、面積の違いが目で分からない。 */
  var MAX_DENOMINATOR = 12;

  function gcd(a, b) {
    var x = Math.abs(Math.round(a));
    var y = Math.abs(Math.round(b));
    while (y !== 0) {
      var t = x % y;
      x = y;
      y = t;
    }
    return x;
  }

  function lcm(a, b) {
    var divisor = gcd(a, b);
    return divisor === 0 ? 0 : Math.abs(a * b) / divisor;
  }

  /**
   * 分数を 1 つ作る。範囲の外は中へ寄せる。
   * 分母 0 は作らせない（1 にする）。分子は 0 から分母までに収める。
   */
  function make(numerator, denominator) {
    var den = Numeric.readNumber(denominator, {
      min: 1, max: MAX_DENOMINATOR, integer: true, fallback: 1
    });
    var num = Numeric.readNumber(numerator, {
      min: 0, max: den, integer: true, fallback: 0
    });
    return { numerator: num, denominator: den };
  }

  function value(fraction) {
    return fraction.numerator / fraction.denominator;
  }

  /** 同じ分け方にそろえる。分母の最小公倍数で分け直す。 */
  function common(a, b) {
    var denominator = lcm(a.denominator, b.denominator);
    return {
      denominator: denominator,
      a: {
        numerator: a.numerator * (denominator / a.denominator),
        denominator: denominator
      },
      b: {
        numerator: b.numerator * (denominator / b.denominator),
        denominator: denominator
      }
    };
  }

  /** -1 なら a が小さい、0 なら同じ、1 なら a が大きい。 */
  function compare(a, b) {
    var pair = common(a, b);
    if (pair.a.numerator === pair.b.numerator) { return 0; }
    return pair.a.numerator > pair.b.numerator ? 1 : -1;
  }

  function equals(a, b) { return compare(a, b) === 0; }

  function toDecimal(fraction, digits) {
    return Numeric.round(value(fraction), digits === undefined ? 3 : digits);
  }

  function toPercent(fraction, digits) {
    return Numeric.round(value(fraction) * 100, digits === undefined ? 1 : digits);
  }

  /**
   * 比べる手順。1 手 = 1 つの動き。
   * @param {Object} a 左の分数
   * @param {Object} b 右の分数
   */
  function steps(a, b) {
    var pair = common(a, b);
    var list = [];

    ["a", "b"].forEach(function (side) {
      var fraction = side === "a" ? a : b;
      list.push({
        type: "divide", side: side, parts: fraction.denominator
      });
      list.push({
        type: "fill", side: side,
        count: fraction.numerator, parts: fraction.denominator
      });
    });

    /* そろえ直す手。分け方が最初から同じなら、何も変わらないことを示す。 */
    list.push({
      type: "recut",
      denominator: pair.denominator,
      a: pair.a.numerator,
      b: pair.b.numerator,
      already: a.denominator === b.denominator
    });

    list.push({
      type: "count",
      denominator: pair.denominator,
      a: pair.a.numerator,
      b: pair.b.numerator,
      result: compare(a, b)
    });

    return list;
  }

  /** 最初の状態。どちらもまだ分けていない。 */
  function initial(a, b) {
    return {
      /* base は最初に分けた数（もとの分母）。そろえ直しても変えない。
         もとの分け方を図に残し、「面積は変わっていない」ことを見せるため。 */
      a: { fraction: a, parts: 1, base: 1, filled: 0, cut: false },
      b: { fraction: b, parts: 1, base: 1, filled: 0, cut: false },
      common: null,
      result: null,
      phase: "start",
      active: null
    };
  }

  /** 手順を 1 つ畳む。state は変えず、新しい state を返す。 */
  function applyStep(state, step) {
    var next = {
      a: { fraction: state.a.fraction, parts: state.a.parts,
           base: state.a.base, filled: state.a.filled, cut: state.a.cut },
      b: { fraction: state.b.fraction, parts: state.b.parts,
           base: state.b.base, filled: state.b.filled, cut: state.b.cut },
      common: state.common,
      result: state.result,
      phase: state.phase,
      active: null
    };

    if (step.type === "divide") {
      next[step.side].parts = step.parts;
      next[step.side].base = step.parts;
      next[step.side].cut = true;
      next.phase = "divide";
      next.active = { kind: "divide", side: step.side };
    } else if (step.type === "fill") {
      next[step.side].filled = step.count;
      next.phase = "fill";
      next.active = { kind: "fill", side: step.side };
    } else if (step.type === "recut") {
      next.a.parts = step.denominator;
      next.a.filled = step.a;
      next.b.parts = step.denominator;
      next.b.filled = step.b;
      next.common = step.denominator;
      next.phase = "recut";
      next.active = { kind: "recut" };
    } else if (step.type === "count") {
      next.result = step.result;
      next.phase = "count";
      next.active = { kind: "count" };
    }

    return next;
  }

  function replay(a, b, list, upTo) {
    var count = upTo === undefined ? list.length : upTo;
    var state = initial(a, b);
    for (var i = 0; i < count && i < list.length; i += 1) {
      state = applyStep(state, list[i]);
    }
    return state;
  }

  JsDemo.Fraction = {
    MAX_DENOMINATOR: MAX_DENOMINATOR,
    gcd: gcd,
    lcm: lcm,
    make: make,
    value: value,
    common: common,
    compare: compare,
    equals: equals,
    toDecimal: toDecimal,
    toPercent: toPercent,
    steps: steps,
    initial: initial,
    applyStep: applyStep,
    replay: replay
  };
})(typeof window !== "undefined" ? window : globalThis);
