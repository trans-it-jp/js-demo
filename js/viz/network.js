/*!
 * js-demo / viz — network.js
 * ニューラルネットのノードと結線を描く。必要: d3 v7
 *
 * 見分け方は色だけに頼らない。いま何をしている手かをノードの上の印で出し、
 * 値はすべて画面の表にも並べる。色を区別できない条件でも追える。
 *
 * 色は既存の配色をそのまま使う（新しい意味の色を増やさない）。
 *   青 var(--bar-look)   … 順伝播。値を前へ送っている
 *   朱 var(--bar-change) … 逆伝播。傾きを後ろへ送っている
 *   紫 var(--bar-pivot)  … 答え合わせ（少し動かして順伝播をやり直す）
 *   緑 var(--bar-sorted) … 重みを更新した
 *
 * 動かすものが無いので遷移は使わない。色は必ず即時に設定する
 * （d3 は CSS 変数を補間できない。tools/check-transitions.js が点検する）。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  var VIEW_W = 720;
  var VIEW_H = 380;
  var PAD_X = 64;
  var TOP = 56;
  var BOTTOM = 348;
  var RADIUS = 17;

  var COLOR = {
    idle: "var(--surface)",
    forward: "var(--bar-look)",
    delta: "var(--bar-change)",
    grad: "var(--bar-change)",
    probe: "var(--bar-pivot)",
    update: "var(--bar-sorted)"
  };

  /* ノードの上に出す印。色が読めなくても、いまの手の種類が分かる。 */
  var MARKS = {
    forward: "▶",   /* 値を前へ送った */
    delta: "◀",     /* 傾きを後ろへ送った */
    grad: "∂",      /* その重みの傾きが出た */
    probe: "±",     /* 少し動かして試した */
    update: "↻"     /* 重みを書き換えた */
  };

  function create(options) {
    var container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + VIEW_W + " " + VIEW_H)
      .attr("role", "img")
      .attr("aria-label", (options.labels && options.labels.figure) || "ネットワーク");

    svg.append("rect")
      .attr("width", VIEW_W).attr("height", VIEW_H)
      .attr("fill", "var(--plot-bg)");

    var gEdges = svg.append("g");
    var gWeights = svg.append("g")
      .attr("text-anchor", "middle").attr("font-size", 11)
      .attr("aria-hidden", "true");
    var gNodes = svg.append("g");
    var gValues = svg.append("g")
      .attr("text-anchor", "middle").attr("font-size", 11)
      .attr("aria-hidden", "true");
    var gDeltas = svg.append("g")
      .attr("text-anchor", "middle").attr("font-size", 10)
      .attr("aria-hidden", "true");
    var gMarks = svg.append("g")
      .attr("text-anchor", "middle").attr("font-size", 13)
      .attr("aria-hidden", "true");
    var gCaptions = svg.append("g")
      .attr("text-anchor", "middle").attr("font-size", 11)
      .attr("fill", "var(--ink-muted)")
      .attr("aria-hidden", "true");

    var shapeKey = "";

    function xOf(layer, layers) {
      if (layers <= 1) { return VIEW_W / 2; }
      return PAD_X + layer * (VIEW_W - 2 * PAD_X) / (layers - 1);
    }

    function yOf(index, count) {
      var usable = BOTTOM - TOP;
      var gap = count <= 1 ? 0 : usable / (count - 1);
      var height = gap * (count - 1);
      var top = TOP + (usable - height) / 2;
      return count <= 1 ? TOP + usable / 2 : top + index * gap;
    }

    /** 形が変わったときだけ、図を組み直す。 */
    function layout(shape, captions) {
      var key = shape.join("-");
      if (key === shapeKey) { return; }
      shapeKey = key;

      var nodes = [];
      var edges = [];
      shape.forEach(function (count, layer) {
        for (var j = 0; j < count; j += 1) {
          nodes.push({
            layer: layer, node: j,
            x: xOf(layer, shape.length), y: yOf(j, count)
          });
          if (layer === 0) { continue; }
          for (var i = 0; i < shape[layer - 1]; i += 1) {
            edges.push({
              layer: layer, node: j, from: i,
              x1: xOf(layer - 1, shape.length), y1: yOf(i, shape[layer - 1]),
              x2: xOf(layer, shape.length), y2: yOf(j, count)
            });
          }
        }
      });

      gEdges.selectAll("line").data(edges).join("line")
        .attr("x1", function (d) { return d.x1; })
        .attr("y1", function (d) { return d.y1; })
        .attr("x2", function (d) { return d.x2; })
        .attr("y2", function (d) { return d.y2; });

      gNodes.selectAll("circle").data(nodes).join("circle")
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", RADIUS);

      [gValues, gDeltas, gMarks].forEach(function (group, index) {
        group.selectAll("text").data(nodes).join("text")
          .attr("x", function (d) { return d.x; })
          .attr("y", function (d) {
            if (index === 0) { return d.y + 4; }               /* 値は円の中 */
            if (index === 1) { return d.y + RADIUS + 13; }     /* δ は円の下 */
            return d.y - RADIUS - 7;                           /* 印は円の上 */
          });
      });

      gWeights.selectAll("text").data(edges).join("text")
        .attr("x", function (d) { return d.x1 + (d.x2 - d.x1) * 0.62; })
        .attr("y", function (d) { return d.y1 + (d.y2 - d.y1) * 0.62 - 4; });

      gCaptions.selectAll("text")
        .data(shape.map(function (count, layer) {
          return { layer: layer, x: xOf(layer, shape.length) };
        }))
        .join("text")
        .attr("x", function (d) { return d.x; })
        .attr("y", 22)
        .text(function (d) { return captions(d.layer, shape.length); });
    }

    function number(value) {
      if (value === undefined || value === null || !isFinite(value)) { return ""; }
      var text = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
      /* -0.00 と出さない。0 は 0 と書く。 */
      return text === "-0.00" ? "0.00" : text;
    }

    /** いまの状態を描く。active はいま進めた手。 */
    function draw(state, settings) {
      var options2 = settings || {};
      layout(state.shape, options2.captions || function () { return ""; });
      var active = state.active || {};

      /* 強調する結線。順伝播と逆伝播で向きが違うので、どちらの層かで選ぶ。 */
      function edgeHighlighted(d) {
        if (active.kind === "forward" || active.kind === "grad") {
          return d.layer === active.layer && d.node === active.node;
        }
        if (active.kind === "delta") {
          /* δ は次の層から戻ってくる。出力層には次の層が無いので何も光らない。 */
          return d.layer === active.layer + 1 && d.from === active.node;
        }
        if (active.kind === "probe") {
          return d.layer === active.layer && d.node === active.node &&
                 d.from === active.from;
        }
        if (active.kind === "update") { return d.layer === active.layer; }
        return false;
      }

      function edgeColor(d) {
        if (!edgeHighlighted(d)) { return "var(--plot-grid)"; }
        if (active.kind === "probe") { return COLOR.probe; }
        if (active.kind === "update") { return COLOR.update; }
        if (active.kind === "delta") { return COLOR.delta; }
        if (active.kind === "grad") { return COLOR.grad; }
        return COLOR.forward;
      }

      gEdges.selectAll("line")
        .attr("stroke", edgeColor)
        .attr("stroke-width", function (d) {
          return edgeHighlighted(d) ? 2.4 : 1;
        });

      gWeights.selectAll("text")
        .attr("fill", edgeColor)
        .text(function (d) {
          if (!edgeHighlighted(d)) { return ""; }
          var row = state.w[d.layer];
          return row ? number(row[d.node][d.from]) : "";
        });

      function nodeActive(d) {
        return active.layer === d.layer && active.node === d.node;
      }

      gNodes.selectAll("circle")
        .attr("fill", function (d) {
          return nodeActive(d) ? "var(--accent-wash)" : COLOR.idle;
        })
        .attr("stroke", function (d) {
          if (nodeActive(d) && COLOR[active.kind]) { return COLOR[active.kind]; }
          if (state.a[d.layer] && state.a[d.layer][d.node] !== undefined) {
            return "var(--plot-axis)";
          }
          return "var(--rule-strong)";
        })
        .attr("stroke-width", function (d) { return nodeActive(d) ? 2.5 : 1.2; });

      gValues.selectAll("text")
        .attr("fill", "var(--ink)")
        .text(function (d) {
          var row = state.a[d.layer];
          return row ? number(row[d.node]) : "";
        });

      gDeltas.selectAll("text")
        .attr("fill", COLOR.delta)
        .text(function (d) {
          var row = state.d[d.layer];
          if (!row || row[d.node] === undefined) { return ""; }
          return "δ " + number(row[d.node]);
        });

      gMarks.selectAll("text")
        .attr("fill", function (d) {
          return nodeActive(d) ? (COLOR[active.kind] || "var(--ink)") : "var(--ink)";
        })
        .text(function (d) {
          if (!nodeActive(d)) { return ""; }
          return MARKS[active.kind] || "";
        });

      if (options2.summary) {
        svg.attr("aria-label", options2.summary);
      }
    }

    return { draw: draw, element: svg.node() };
  }

  JsDemo.Network = { create: create, VIEW_W: VIEW_W, VIEW_H: VIEW_H };
})(window);
