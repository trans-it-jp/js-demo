/*!
 * js-demo / viz — area.js
 * 同じ大きさの正方形を分けて、分数を面積で見せる。必要: d3 v7
 *
 * 決めごと:
 *   - **2 つの全体はいつも同じ大きさ。** 枠の大きさを変える操作は用意しない。
 *     違う全体どうしを比べる誤解（学習設計 A-4）を画面で起こさせないため。
 *   - もとの分け方（分母）は**太い線**、そろえ直して増えた分け方は**細い線**で描く。
 *     そろえ直しても塗った面積が動いていないことを、線の太さで追える。
 *   - 塗るのは列ごと。もとの 1 つ分が、そろえ直すと何個分になるかが見える。
 *   - 色は既存の配色をそのまま使う。塗った部分は朱（var(--bar-change)）、
 *     そろえ直した直後だけ枠を緑（var(--bar-sorted)）にして「同じ分け方になった」を示す。
 *
 * 動かすものが無いので遷移は使わない。色は必ず即時に設定する
 * （d3 は CSS 変数を補間できない。tools/check-transitions.js が点検する）。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  var VIEW_W = 720;
  var VIEW_H = 330;
  var SIDE = 230;          /* 正方形の一辺 */
  var TOP = 56;
  var LEFT_X = 72;
  var RIGHT_X = VIEW_W - 72 - SIDE;

  function create(options) {
    var container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + VIEW_W + " " + VIEW_H)
      .attr("role", "img")
      .attr("aria-label", (options.labels && options.labels.figure) || "面積で比べる図");

    svg.append("rect")
      .attr("width", VIEW_W).attr("height", VIEW_H)
      .attr("fill", "var(--plot-bg)");

    var groups = {};
    ["a", "b"].forEach(function (side) {
      var x = side === "a" ? LEFT_X : RIGHT_X;
      var g = svg.append("g");
      groups[side] = {
        x: x,
        cells: g.append("g"),
        thin: g.append("g"),
        thick: g.append("g"),
        frame: g.append("rect")
          .attr("x", x).attr("y", TOP)
          .attr("width", SIDE).attr("height", SIDE)
          .attr("fill", "none")
          .attr("stroke", "var(--plot-axis)")
          .attr("stroke-width", 2),
        caption: svg.append("text")
          .attr("x", x + SIDE / 2).attr("y", TOP - 22)
          .attr("text-anchor", "middle")
          .attr("font-size", 15)
          .attr("font-weight", "600")
          .attr("fill", "var(--ink)")
          .attr("aria-hidden", "true"),
        note: svg.append("text")
          .attr("x", x + SIDE / 2).attr("y", TOP + SIDE + 26)
          .attr("text-anchor", "middle")
          .attr("font-size", 12)
          .attr("fill", "var(--ink-muted)")
          .attr("aria-hidden", "true")
      };
    });

    /* 真ん中の記号（<・>・=）。数えたあとだけ出す。 */
    var sign = svg.append("text")
      .attr("x", VIEW_W / 2).attr("y", TOP + SIDE / 2 + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 34)
      .attr("font-weight", "700")
      .attr("aria-hidden", "true")
      .text("");

    /** 1 つの正方形を描く。列 = もとの分け方、行 = そろえ直しで増えた分。 */
    function drawSide(side, part, highlight) {
      var group = groups[side];
      var columns = Math.max(1, part.base);
      var rows = Math.max(1, Math.round(part.parts / columns));
      var cellW = SIDE / columns;
      var cellH = SIDE / rows;

      /* 塗りは列ごとに詰める。もとの 1 列分が何個に分かれたかが見える。 */
      var cells = [];
      for (var c = 0; c < columns; c += 1) {
        for (var r = 0; r < rows; r += 1) {
          var index = c * rows + r;
          cells.push({
            x: group.x + c * cellW,
            y: TOP + r * cellH,
            w: cellW, h: cellH,
            on: index < part.filled
          });
        }
      }

      var rects = group.cells.selectAll("rect").data(cells);
      rects.exit().remove();
      rects.enter().append("rect").merge(rects)
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return d.y; })
        .attr("width", function (d) { return d.w; })
        .attr("height", function (d) { return d.h; })
        .attr("fill", function (d) {
          return d.on ? "var(--bar-change)" : "var(--surface)";
        });

      /* そろえ直して増えた分け方（細い線） */
      var thin = [];
      for (var i = 1; i < rows; i += 1) { thin.push(TOP + i * cellH); }
      var thinLines = group.thin.selectAll("line").data(thin);
      thinLines.exit().remove();
      thinLines.enter().append("line").merge(thinLines)
        .attr("x1", group.x).attr("x2", group.x + SIDE)
        .attr("y1", function (d) { return d; })
        .attr("y2", function (d) { return d; })
        .attr("stroke", "var(--plot-bg)")
        .attr("stroke-width", 1);

      /* もとの分け方（太い線） */
      var thick = [];
      for (var j = 1; j < columns; j += 1) { thick.push(group.x + j * cellW); }
      var thickLines = group.thick.selectAll("line").data(thick);
      thickLines.exit().remove();
      thickLines.enter().append("line").merge(thickLines)
        .attr("x1", function (d) { return d; })
        .attr("x2", function (d) { return d; })
        .attr("y1", TOP).attr("y2", TOP + SIDE)
        .attr("stroke", "var(--plot-bg)")
        .attr("stroke-width", 3);

      group.frame
        .attr("stroke", highlight ? "var(--bar-sorted)" : "var(--plot-axis)")
        .attr("stroke-width", highlight ? 3.5 : 2);
    }

    /**
     * いまの状態を描く。
     * @param {Object} state  JsDemo.Fraction の state
     * @param {Object} settings  { captions: {a,b}, notes: {a,b}, sign: string }
     */
    function draw(state, settings) {
      var options2 = settings || {};
      var highlight = state.phase === "recut";

      ["a", "b"].forEach(function (side) {
        drawSide(side, state[side], highlight);
        groups[side].caption.text(
          options2.captions ? (options2.captions[side] || "") : ""
        );
        groups[side].note
          .text(options2.notes ? (options2.notes[side] || "") : "");
      });

      sign.text(options2.sign || "")
        .attr("fill", state.result === 0 ? "var(--bar-sorted)" : "var(--ink)");

      if (options2.summary) { svg.attr("aria-label", options2.summary); }
    }

    return { draw: draw, element: svg.node() };
  }

  JsDemo.AreaPlot = { create: create, VIEW_W: VIEW_W, VIEW_H: VIEW_H };
})(window);
