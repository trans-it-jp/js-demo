/*!
 * js-demo / viz — bars.js
 * ソートの様子を棒グラフで描く。必要: d3 v7
 *
 * 見分け方は色だけに頼らない。棒の下に印（比較・交換・書込・基準・確定）を出し、
 * 値そのものも並べる。色を区別できない条件でも、どの要素に何が起きたか追える。
 *
 * 動かすのは**位置と高さだけ**。色は遷移させずに即時設定する。
 *   d3 は CSS 変数（var(--bar)）を色として補間できず、var(--bar-1.5) のような
 *   未定義の値を作ってしまう。以前それで図形が描かれない不具合を出したため、
 *   色に関わる属性は必ず遷移の外で設定する（tools/check-transitions.js が点検する）。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  var VIEW_W = 720;
  var MAIN_TOP = 16;
  var MAIN_BOTTOM = 232;      /* 主の行の棒の足もと */
  var MARK_Y = 250;           /* 印の行 */
  var LABEL_Y = 272;          /* 値の行 */
  var AUX_TOP = 312;
  var AUX_BOTTOM = 404;
  var AUX_MARK_Y = 420;
  var VIEW_H_PLAIN = 288;
  var VIEW_H_AUX = 432;
  var PAD_X = 12;
  var GAP_RATIO = 0.18;       /* 棒の間の空き（棒幅に対する比） */
  var LABEL_MAX = 28;         /* これより多いと値の文字は出さない */

  /* 色は 2 系統だけ。見ただけの手は青、中身を動かした手は朱。
     どの種類の手かは MARKS の印で分ける。
     「比べただけで何も変わっていない」のか「実際に動いた」のかを、
     色で一目で分けられるようにするため。 */
  var FILL = {
    idle: "var(--bar)",
    read: "var(--bar-look)",
    compare: "var(--bar-look)",
    swap: "var(--bar-change)",
    shuffle: "var(--bar-change)",
    write: "var(--bar-change)",
    pivot: "var(--bar-pivot)",
    sorted: "var(--bar-sorted)",
    departed: "var(--bar-removed)",
    removed: "var(--bar-removed)"
  };

  /* 印は文字で出す。読み上げには使わない（aria-hidden）。 */
  var MARKS = {
    read: "◇",      /* 値を見ただけ。比べてはいない */
    compare: "▲",   /* 2 つを比べている */
    swap: "⇄",      /* 入れ替えた */
    shuffle: "↺",   /* 全部まとめて混ぜ直した */
    write: "▼",     /* 書き込んだ */
    pivot: "P",     /* 基準 */
    sorted: "✓",    /* 位置が確定した */
    departed: "→",  /* 出ていった。消えてはいない */
    removed: "✕"    /* 取り除かれて消えた */
  };

  function prefersReducedMotion() {
    return !!(global.matchMedia &&
              global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function maybeAnimate(selection, duration) {
    if (!duration || prefersReducedMotion()) { return selection; }
    return selection.transition().duration(duration).ease(d3.easeCubicOut);
  }

  /** 棒の状態（色と印をどれにするか）を 1 つに決める。優先順位はこの順。 */
  function statusOf(cell, pivotId) {
    if (cell.removed) { return "removed"; }
    if (cell.departed) { return "departed"; }
    /* 基準は比較の印より先に見る。
       クイックソートは**毎回その基準と比べる**ので、比較の印を優先すると
       基準にいつも比較の印が付き、P が一度も出なくなる。
       基準は位置が決まるまで役割が続くので、そのあいだ P を出す。 */
    if (pivotId && cell.id === pivotId) { return "pivot"; }
    if (cell.mark === "shuffle") { return "shuffle"; }
    if (cell.mark === "swap") { return "swap"; }
    if (cell.mark === "write") { return "write"; }
    if (cell.mark === "compare") { return "compare"; }
    if (cell.mark === "read") { return "read"; }
    if (cell.sorted) { return "sorted"; }
    return "idle";
  }

  function create(options) {
    var container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;
    var labels = options.labels || {};

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + VIEW_W + " " + VIEW_H_PLAIN)
      .attr("role", "img")
      .attr("aria-label", labels.figure || "棒グラフ");

    var background = svg.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", VIEW_W).attr("height", VIEW_H_AUX)
      .attr("fill", "var(--plot-bg)");

    /* いま見ている範囲の下敷き（クイック・マージで使う） */
    var gRange = svg.append("g");
    var rangeRect = gRange.append("rect")
      .attr("fill", "var(--accent-wash)")
      .attr("opacity", 0);

    var baseline = svg.append("line")
      .attr("x1", PAD_X).attr("x2", VIEW_W - PAD_X)
      .attr("y1", MAIN_BOTTOM + 0.5).attr("y2", MAIN_BOTTOM + 0.5)
      .attr("stroke", "var(--plot-axis)").attr("stroke-width", 1);

    var gMain = svg.append("g");
    var gMarks = svg.append("g")
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("aria-hidden", "true");
    var gLabels = svg.append("g")
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "var(--ink-soft)")
      .attr("aria-hidden", "true");

    var auxTitle = svg.append("text")
      .attr("x", PAD_X).attr("y", AUX_TOP - 10)
      .attr("font-size", 12)
      .attr("fill", "var(--ink-muted)")
      .attr("aria-hidden", "true")
      .text("");
    var auxBaseline = svg.append("line")
      .attr("x1", PAD_X).attr("x2", VIEW_W - PAD_X)
      .attr("y1", AUX_BOTTOM + 0.5).attr("y2", AUX_BOTTOM + 0.5)
      .attr("stroke", "var(--plot-axis)").attr("stroke-width", 1)
      .attr("opacity", 0);
    /* バケツの境目。棒の手前に描く。棒どうしの隙間に落ちるので重ならない。 */
    var gAuxBounds = svg.append("g");
    var gAux = svg.append("g");
    var gAuxMarks = svg.append("g")
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("aria-hidden", "true");

    /**
     * 1 つの行を描く。
     * @param {Object} group    描く先の g
     * @param {Array} cells     {id, value, sorted, removed, mark}
     * @param {Object} geometry  top / bottom / slots / maxValue
     */
    function drawRow(group, marksGroup, cells, geometry, settings) {
      var slots = geometry.slots;
      var step = (VIEW_W - 2 * PAD_X) / Math.max(1, slots);
      var width = Math.max(2, step * (1 - GAP_RATIO));
      var height = geometry.bottom - geometry.top;
      var maxValue = Math.max(1, geometry.maxValue);
      var duration = settings.duration;

      function xOf(index) { return PAD_X + index * step + (step - width) / 2; }
      function hOf(value) { return Math.max(2, (value / maxValue) * height); }

      var bars = group.selectAll("rect").data(cells, function (d) { return d.id; });

      bars.exit().remove();

      var entered = bars.enter().append("rect")
        .attr("x", function (d, i) { return xOf(i); })
        .attr("width", width)
        .attr("y", function (d) { return geometry.bottom - hOf(d.value); })
        .attr("height", function (d) { return hOf(d.value); });

      var all = entered.merge(bars);

      /* 色は遷移させない。即時に設定する（冒頭の注意を参照）。 */
      all
        .attr("fill", function (d) {
          return FILL[statusOf(d, settings.pivotId)];
        })
        .attr("stroke", function (d) {
          var status = statusOf(d, settings.pivotId);
          /* 消えたもの・出ていったものは、薄い地に薄い枠だけ。
             「一応見えるが、もう居ない」という見え方にする。
             何が起きたかは棒の下の印（✕ / →）と表で読める。 */
          if (status === "removed" || status === "departed") {
            return "var(--bar-removed-edge)";
          }
          if (status === "compare" || status === "read" ||
              status === "swap" || status === "shuffle" || status === "write") {
            return "var(--ink)";
          }
          return "none";
        })
        .attr("stroke-width", 1);

      /* 位置と高さだけ動かす。入れ替えが「動いて見える」のはここ。 */
      maybeAnimate(all, duration)
        .attr("x", function (d, i) { return xOf(i); })
        .attr("width", width)
        .attr("y", function (d) { return geometry.bottom - hOf(d.value); })
        .attr("height", function (d) { return hOf(d.value); });

      /* 印の行。色を区別できなくても何が起きたか分かるようにする。 */
      var marks = marksGroup.selectAll("text").data(cells, function (d) { return d.id; });
      marks.exit().remove();
      marks.enter().append("text")
        .merge(marks)
        .attr("x", function (d, i) { return xOf(i) + width / 2; })
        .attr("y", geometry.markY)
        .attr("fill", function (d) {
          var status = statusOf(d, settings.pivotId);
          /* 棒そのものは薄くするが、印は読める濃さを保つ。 */
          if (status === "idle" || status === "removed" || status === "departed") {
            return "var(--ink-muted)";
          }
          return FILL[status];
        })
        .text(function (d) {
          var status = statusOf(d, settings.pivotId);
          return MARKS[status] || "";
        });

      return { xOf: xOf, width: width, step: step };
    }

    function render(state, settings) {
      var opts = settings || {};
      var duration = opts.animate === false ? 0 : (opts.duration || 200);
      var cells = state.main;
      var hasAux = !!(state.aux && state.aux.length > 0);

      /* 控えの行を使う手法では、**最初から 2 段ぶんの高さを取る**。
         途中で段が増えるたびに図の高さが変わると、その下にある図の位置が
         ずれて読みにくい（代表者の指摘、2026-10-26）。 */
      var tall = hasAux || opts.reserveAux === true;
      svg.attr("viewBox", "0 0 " + VIEW_W + " " +
               (tall ? VIEW_H_AUX : VIEW_H_PLAIN));

      var maxValue = 1;
      cells.forEach(function (c) { maxValue = Math.max(maxValue, c.value); });

      /* 控えの行の高さの基準。
         値を並べる行（控え・出力・桁・バケツ）は主の行と同じ基準にそろえる。
         度数の行だけは意味が違う（高さが個数）ので、その行の中の最大で割る。
         同じ基準にすると、個数 1 の棒が主の行の最大に対して潰れて見えない。 */
      var auxMax = maxValue;
      if (hasAux) {
        var auxPeak = 1;
        state.aux.forEach(function (c) { auxPeak = Math.max(auxPeak, c.value); });
        auxMax = (state.auxLabel && state.auxLabel.kind === "counts")
          ? auxPeak
          : Math.max(maxValue, auxPeak);
      }

      var geo = drawRow(gMain, gMarks, cells, {
        top: MAIN_TOP, bottom: MAIN_BOTTOM, markY: MARK_Y,
        slots: cells.length, maxValue: maxValue
      }, { duration: duration, pivotId: state.pivotId });

      /* 値の文字。多すぎると読めないので、少ないときだけ出す。 */
      var labelData = cells.length <= LABEL_MAX ? cells : [];
      var texts = gLabels.selectAll("text").data(labelData, function (d) { return d.id; });
      texts.exit().remove();
      texts.enter().append("text")
        .merge(texts)
        .attr("x", function (d, i) { return geo.xOf(i) + geo.width / 2; })
        .attr("y", LABEL_Y)
        .text(function (d) { return d.value; });

      /* いま見ている範囲 */
      if (state.range) {
        rangeRect
          .attr("x", geo.xOf(state.range.lo) - (geo.step - geo.width) / 2)
          .attr("y", MAIN_TOP - 8)
          .attr("width", (state.range.hi - state.range.lo + 1) * geo.step)
          .attr("height", MAIN_BOTTOM - MAIN_TOP + 16)
          .attr("opacity", 1);
      } else {
        rangeRect.attr("opacity", 0);
      }

      /* 控えの行。マージソートの作業用か、スリープソートの出力。 */
      if (hasAux) {
        auxBaseline.attr("opacity", 1);
        auxTitle.text(opts.auxLabel || "");
        var auxGeo = drawRow(gAux, gAuxMarks, state.aux, {
          top: AUX_TOP, bottom: AUX_BOTTOM, markY: AUX_MARK_Y,
          slots: Math.max(cells.length, state.aux.length), maxValue: auxMax
        }, { duration: duration, pivotId: null });
        drawBounds(state, auxGeo);
      } else {
        auxBaseline.attr("opacity", 0);
        auxTitle.text("");
        gAux.selectAll("rect").remove();
        gAuxMarks.selectAll("text").remove();
        gAuxBounds.selectAll("line").remove();
      }
    }

    /**
     * 控えの行の区切りを描く（いまはバケットソートのバケツの境目）。
     * 空のバケツは幅が 0 になるため線が重なる。同じ位置は 1 本にまとめる。
     */
    function drawBounds(state, geometry) {
      var label = state.auxLabel;
      var raw = (label && label.bounds) ? label.bounds : [];
      var positions = [];
      raw.forEach(function (at) {
        if (at > 0 && at < state.aux.length && positions.indexOf(at) < 0) {
          positions.push(at);
        }
      });

      var lines = gAuxBounds.selectAll("line").data(positions);
      lines.exit().remove();
      lines.enter().append("line")
        .merge(lines)
        .attr("x1", function (at) { return PAD_X + at * geometry.step; })
        .attr("x2", function (at) { return PAD_X + at * geometry.step; })
        .attr("y1", AUX_TOP - 10)
        .attr("y2", AUX_BOTTOM + 6)
        .attr("stroke", "var(--ink-muted)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 3");
    }

    function setAriaLabel(text) { svg.attr("aria-label", text); }

    return {
      render: render,
      setAriaLabel: setAriaLabel,
      svg: svg,
      background: background,
      baseline: baseline
    };
  }

  JsDemo.Bars = {
    create: create,
    statusOf: statusOf,
    FILL: FILL,
    MARKS: MARKS
  };
})(window);
