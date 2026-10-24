/*!
 * js-demo / viz — plane.js
 * 座標平面の描画。元のグリッドと変換後のグリッド、軸、基底ベクトル、
 * 図形、任意の点（回転の中心）、利用者が描いた線・円・四角形・自由曲線を扱う。
 *
 * 表示は viewBox で組むので、小画面でも拡大表示でも図が破綻しない。
 * 必要: d3 v7
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Matrix3 = JsDemo.Matrix3;

  var VIEW = 640;     /* viewBox の一辺。実際の表示幅は CSS が決める。 */
  var PADDING = 24;

  /* 既定の図形。家の形は上下左右の区別がつくので、反転や回転が読み取れる。 */
  var HOUSE = [[-1, -1], [1, -1], [1, 1], [0, 2], [-1, 1]];

  function create(options) {
    var container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;
    var domain = options.domain || [-10, 10];
    var labels = options.labels || {};

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + VIEW + " " + VIEW)
      .attr("role", "img")
      .attr("aria-label", labels.figure || "座標平面")
      .style("touch-action", "none"); /* ドラッグ描画で画面がスクロールしないように */

    var side = VIEW - 2 * PADDING;
    /* x も y も同じ縮尺にして、正方形のマスを保つ。 */
    var x = d3.scaleLinear().domain(domain).range([PADDING, PADDING + side]);
    var y = d3.scaleLinear().domain(domain).range([PADDING + side, PADDING]);

    svg.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", VIEW).attr("height", VIEW)
      .attr("fill", "var(--plot-bg)");

    /* 重ね順: 変換後グリッド → 元グリッド → 軸 → 図形 → 利用者の図 → 基底 → 中心 */
    var gWarp   = svg.append("g").attr("fill", "none")
                     .attr("stroke", "var(--plot-grid-warp)").attr("stroke-width", 1.25);
    var gGrid   = svg.append("g").attr("stroke", "var(--plot-grid)").attr("stroke-width", 1);
    var gAxis   = svg.append("g").attr("stroke", "var(--plot-axis)").attr("stroke-width", 1.5);
    var gShapes = svg.append("g").attr("fill", "none").attr("stroke-width", 2);
    var gUser   = svg.append("g").attr("fill", "none").attr("stroke-width", 2);
    var gBasis  = svg.append("g").attr("stroke-width", 2.5);
    var gPivot  = svg.append("g");

    var ticks = d3.range(Math.ceil(domain[0]), Math.floor(domain[1]) + 1, 1);
    var verticals = ticks.map(function (t) {
      return [[t, domain[0]], [t, domain[1]]];
    });
    var horizontals = ticks.map(function (t) {
      return [[domain[0], t], [domain[1], t]];
    });
    var line = d3.line().x(function (p) { return x(p[0]); }).y(function (p) { return y(p[1]); });

    verticals.concat(horizontals).forEach(function (seg) {
      gGrid.append("line")
        .attr("x1", x(seg[0][0])).attr("y1", y(seg[0][1]))
        .attr("x2", x(seg[1][0])).attr("y2", y(seg[1][1]));
    });

    gAxis.append("line")
      .attr("x1", x(domain[0])).attr("x2", x(domain[1]))
      .attr("y1", y(0)).attr("y2", y(0));
    gAxis.append("line")
      .attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", y(domain[0])).attr("y2", y(domain[1]));

    /* 軸の目盛り数値。図の状態を数値でも読めるようにする。 */
    var gTickLabels = svg.append("g")
      .attr("fill", "var(--ink-muted)")
      .attr("font-size", 11)
      .attr("font-family", "var(--font-mono)");
    ticks.forEach(function (t) {
      if (t === 0 || t % 5 !== 0) { return; }
      gTickLabels.append("text")
        .attr("x", x(t)).attr("y", y(0) + 14)
        .attr("text-anchor", "middle").text(t);
      gTickLabels.append("text")
        .attr("x", x(0) - 6).attr("y", y(t) + 4)
        .attr("text-anchor", "end").text(t);
    });

    svg.append("defs").append("marker")
      .attr("id", "plane-arrow").attr("viewBox", "0 0 10 10")
      .attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto-start-reverse")
      .append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "context-stroke");

    var closedPath = function (pts) { return line(pts.concat([pts[0]])); };

    /* 元の図形は破線、変換後は実線。色が区別できない条件でも違いが分かる。 */
    var shapeOriginal = gShapes.append("path")
      .attr("stroke", "var(--plot-shape)")
      .attr("stroke-dasharray", "5 4")
      .attr("stroke-width", 1.5);
    var shapeTransformed = gShapes.append("path")
      .attr("stroke", "var(--plot-shape-alt)");

    var basisX = gBasis.append("line")
      .attr("stroke", "var(--series-2)").attr("marker-end", "url(#plane-arrow)");
    var basisY = gBasis.append("line")
      .attr("stroke", "var(--series-1)").attr("marker-end", "url(#plane-arrow)");

    var pivot = gPivot.append("g").style("display", "none");
    pivot.append("circle").attr("r", 5)
      .attr("fill", "var(--surface)").attr("stroke", "var(--ink)").attr("stroke-width", 2);
    pivot.append("circle").attr("r", 1.5).attr("fill", "var(--ink)");

    /* --- 利用者が描いた図 --- */

    var userShapes = [];
    var currentMatrix = Matrix3.identity();
    var mode = "none";
    var pending = null;   /* 確定前の 1 つ */
    var dragging = false;

    var gUserOriginal = gUser.append("g")
      .attr("stroke", "var(--plot-shape)")
      .attr("stroke-dasharray", "5 4").attr("stroke-width", 1.5);
    var gUserTransformed = gUser.append("g").attr("stroke", "var(--plot-shape-alt)");
    var gPending = gUser.append("g")
      .attr("stroke", "var(--accent)").attr("stroke-dasharray", "3 3")
      .attr("pointer-events", "none");

    function circlePolygon(center, radius, segments) {
      var n = segments === undefined ? 72 : segments;
      var pts = [];
      for (var i = 0; i < n; i += 1) {
        var t = (2 * Math.PI * i) / n;
        pts.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)]);
      }
      return pts;
    }

    function rectPolygon(p1, p2) {
      var x1 = Math.min(p1[0], p2[0]);
      var x2 = Math.max(p1[0], p2[0]);
      var y1 = Math.min(p1[1], p2[1]);
      var y2 = Math.max(p1[1], p2[1]);
      return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    }

    /** 図形を点列に直す。変換も描画も点列だけで扱えるようにする。 */
    function toPolyline(shape) {
      if (shape.type === "line") { return { pts: [shape.p1, shape.p2], closed: false }; }
      if (shape.type === "free") { return { pts: shape.pts, closed: false }; }
      if (shape.type === "circle") { return { pts: circlePolygon(shape.c, shape.r), closed: true }; }
      return { pts: rectPolygon(shape.p1, shape.p2), closed: true };
    }

    function renderUserShapes(M) {
      var matrix = M || currentMatrix;
      var originals = userShapes.map(toPolyline);
      var transformed = originals.map(function (o) {
        return { pts: Matrix3.mapPoints(matrix, o.pts), closed: o.closed };
      });

      [[gUserOriginal, originals], [gUserTransformed, transformed]].forEach(function (pair) {
        pair[0].selectAll("path")
          .data(pair[1])
          .join("path")
          .attr("d", function (d) { return d.closed ? closedPath(d.pts) : line(d.pts); });
      });
    }

    function renderPending() {
      gPending.selectAll("*").remove();
      if (!pending) { return; }
      var o = toPolyline(pending);
      gPending.append("path").attr("d", o.closed ? closedPath(o.pts) : line(o.pts));
    }

    function pointerPosition(event) {
      var p = d3.pointer(event, svg.node());
      return [x.invert(p[0]), y.invert(p[1])];
    }

    svg.on("pointerdown", function (event) {
      if (mode === "none") { return; }
      event.preventDefault();
      var p = pointerPosition(event);

      if (mode === "free") {
        dragging = true;
        pending = { type: "free", pts: [p] };
      } else if (!pending) {
        if (mode === "line") { pending = { type: "line", p1: p, p2: p }; }
        else if (mode === "circle") { pending = { type: "circle", c: p, r: 0 }; }
        else if (mode === "rect") { pending = { type: "rect", p1: p, p2: p }; }
      } else {
        if (mode === "line" || mode === "rect") { pending.p2 = p; }
        else if (mode === "circle") { pending.r = Math.hypot(p[0] - pending.c[0], p[1] - pending.c[1]); }
        userShapes.push(pending);
        pending = null;
        renderUserShapes(currentMatrix);
      }
      renderPending();
    });

    svg.on("pointermove", function (event) {
      if (!pending) { return; }
      var p = pointerPosition(event);
      if (mode === "free" && dragging) {
        var last = pending.pts[pending.pts.length - 1];
        /* 近すぎる点は捨てる。点が増えすぎると変換のたびに重くなる。 */
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.03) { pending.pts.push(p); }
      } else if (mode === "line" || mode === "rect") {
        pending.p2 = p;
      } else if (mode === "circle") {
        pending.r = Math.hypot(p[0] - pending.c[0], p[1] - pending.c[1]);
      }
      renderPending();
    });

    function finishFreehand() {
      if (mode !== "free" || !dragging || !pending) { return; }
      dragging = false;
      if (pending.pts.length > 1) {
        userShapes.push(pending);
        renderUserShapes(currentMatrix);
      }
      pending = null;
      renderPending();
    }
    svg.on("pointerup", finishFreehand);
    svg.on("pointerleave", finishFreehand);

    return {
      svg: svg,
      x: x,
      y: y,
      house: HOUSE,

      setMatrix: function (M) { currentMatrix = M; },

      drawTransformedGrid: function (M) {
        var segments = verticals.concat(horizontals).map(function (seg) {
          return Matrix3.mapPoints(M, seg);
        });
        gWarp.selectAll("path")
          .data(segments)
          .join("path")
          .attr("d", function (d) { return line(d); });
      },

      drawShape: function (original, transformed) {
        shapeOriginal.attr("d", closedPath(original));
        shapeTransformed.attr("d", closedPath(transformed));
      },

      drawBasis: function (M) {
        var ex = Matrix3.applyToPoint(M, [1, 0]);
        var ey = Matrix3.applyToPoint(M, [0, 1]);
        basisX.attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(ex[0])).attr("y2", y(ex[1]));
        basisY.attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(ey[0])).attr("y2", y(ey[1]));
      },

      showPivot: function (px, py) {
        pivot.style("display", null).attr("transform", "translate(" + x(px) + "," + y(py) + ")");
      },
      hidePivot: function () { pivot.style("display", "none"); },

      renderUserShapes: renderUserShapes,
      setMode: function (next) { mode = next; pending = null; dragging = false; renderPending(); },
      getMode: function () { return mode; },
      clearUserShapes: function () {
        userShapes.length = 0;
        pending = null;
        dragging = false;
        renderPending();
        renderUserShapes(currentMatrix);
      },
      countUserShapes: function () { return userShapes.length; },
      setAriaLabel: function (text) { svg.attr("aria-label", text); }
    };
  }

  JsDemo.Plane = { create: create, HOUSE: HOUSE, VIEW: VIEW };
})(window);
