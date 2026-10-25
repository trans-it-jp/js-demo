/*!
 * js-demo / viz — scatter.js
 * クラスタリング用の散布図。点・中心・割当線を描く。
 *
 * クラスタの区別は色・形・番号の三つで示す。色を区別できない条件でも
 * どの点がどの中心に属しているか追えるようにしてある。
 * 必要: d3 v7
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  var VIEW = 640;
  var PADDING = 18;
  var DURATION = 650;   /* 中心が動く様子を目で追える長さ */

  /* 動きを減らす設定の人には動かさない。CSS の prefers-reduced-motion と揃える。 */
  function prefersReducedMotion() {
    return !!(global.matchMedia &&
              global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /** 遷移を使うなら transition を、使わないならそのままの選択を返す */
  function maybeAnimate(selection, duration) {
    if (!duration || prefersReducedMotion()) { return selection; }
    return selection.transition().duration(duration).ease(d3.easeCubicInOut);
  }

  /* 色覚差でも区別しやすい並び（Okabe–Ito をもとに拡張） */
  var COLORS = [
    "var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)",
    "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)",
    "var(--series-9)", "var(--series-10)"
  ];

  function symbolTypes() {
    return [
      d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle, d3.symbolDiamond,
      d3.symbolCross, d3.symbolStar, d3.symbolWye
    ];
  }

  function colorOf(index) { return COLORS[index % COLORS.length]; }
  function symbolOf(index) { var t = symbolTypes(); return t[index % t.length]; }

  function create(options) {
    var container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;
    var labels = options.labels || {};

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + VIEW + " " + VIEW)
      .attr("role", "img")
      .attr("aria-label", labels.figure || "散布図");

    svg.append("rect")
      .attr("x", 0).attr("y", 0).attr("width", VIEW).attr("height", VIEW)
      .attr("fill", "var(--plot-bg)");

    var inner = VIEW - 2 * PADDING;
    var x = d3.scaleLinear().domain([0, 1]).range([PADDING, PADDING + inner]);
    var y = d3.scaleLinear().domain([0, 1]).range([PADDING + inner, PADDING]);

    /* 下地の薄い方眼。点の位置を目で追う手掛かりになる。 */
    var gGrid = svg.append("g")
      .attr("stroke", "var(--plot-grid)").attr("stroke-width", 1);
    [0.25, 0.5, 0.75].forEach(function (t) {
      gGrid.append("line").attr("x1", x(t)).attr("x2", x(t))
        .attr("y1", y(0)).attr("y2", y(1));
      gGrid.append("line").attr("x1", x(0)).attr("x2", x(1))
        .attr("y1", y(t)).attr("y2", y(t));
    });
    svg.append("rect")
      .attr("x", x(0)).attr("y", y(1))
      .attr("width", inner).attr("height", inner)
      .attr("fill", "none").attr("stroke", "var(--rule-strong)");

    var gLinks = svg.append("g").attr("stroke-width", 0.75).attr("opacity", 0.5);
    var gPoints = svg.append("g");
    var gCentroids = svg.append("g");

    var pointSymbol = d3.symbol().size(46);
    var centroidSymbol = d3.symbol().size(260);

    /**
     * @param {Object} state
     * @param {Array<Array<number>>} state.points
     * @param {Array<number>} state.assignments  各点のクラスタ番号（-1 は未割当）
     * @param {Array<Array<number>>} state.centroids
     * @param {boolean} [state.showLinks]  点と中心を結ぶ線を描くか
     * @param {boolean} [state.animate]  前の状態から動かして見せるか
     */
    function render(state) {
      var points = state.points;
      var assignments = state.assignments;
      var centroids = state.centroids;
      var duration = state.animate === false ? 0 : DURATION;

      /* 割当線。どの中心に属しているかを線でも示す。 */
      var links = [];
      if (state.showLinks) {
        for (var i = 0; i < points.length; i += 1) {
          var c = assignments[i];
          if (c < 0 || !centroids[c]) { continue; }
          links.push({ p: points[i], c: centroids[c], cluster: c });
        }
      }
      /* 線は点の側を固定したまま、中心の側だけが動く。
         どの中心へ引き寄せられたかが見て取れる。 */
      var linkSelection = gLinks.selectAll("line")
        .data(links)
        .join(
          function (enter) {
            return enter.append("line")
              .attr("x1", function (d) { return x(d.p[0]); })
              .attr("y1", function (d) { return y(d.p[1]); })
              .attr("x2", function (d) { return x(d.p[0]); })
              .attr("y2", function (d) { return y(d.p[1]); })
              .attr("stroke", function (d) { return colorOf(d.cluster); });
          },
          function (update) { return update; },
          function (exit) { return exit.remove(); }
        );
      /* 色は遷移させない。
         系列色は CSS 変数（var(--series-1)）で、d3 はこれを色として
         補間できず var(--series-1.5) のような未定義の値を作る。
         未定義になった線は描かれないので、動いて見えず
         「消えて引き直された」ように見えてしまう。
         色は即時に変え、動かすのは座標だけにする。 */
      linkSelection.attr("stroke", function (d) { return colorOf(d.cluster); });

      maybeAnimate(linkSelection, duration)
        .attr("x1", function (d) { return x(d.p[0]); })
        .attr("y1", function (d) { return y(d.p[1]); })
        .attr("x2", function (d) { return x(d.c[0]); })
        .attr("y2", function (d) { return y(d.c[1]); });

      gPoints.selectAll("path")
        .data(points.map(function (p, i) { return { p: p, cluster: assignments[i] }; }))
        .join("path")
        .attr("transform", function (d) {
          return "translate(" + x(d.p[0]) + "," + y(d.p[1]) + ")";
        })
        /* 点の見た目は形も色も即時に差し替える。
           色を時間をかけて変えると、途中でどのクラスタの色でもない中間色を通る。
           形は瞬時に変わるので、形と色が食い違った姿が見えてしまう。
           「この点はもうこちらのクラスタ」と言い切り、
           どこへ移ったかは線の動きで見せる。 */
        .attr("d", function (d) {
          return pointSymbol.type(d.cluster < 0 ? d3.symbolCircle : symbolOf(d.cluster))();
        })
        .attr("fill", function (d) {
          return d.cluster < 0 ? "none" : colorOf(d.cluster);
        })
        .attr("stroke", function (d) {
          return d.cluster < 0 ? "var(--ink-muted)" : "none";
        })
        .attr("stroke-width", 1);

      /* 中心は大きい記号＋白い縁取り＋番号。点と見間違えないようにする。 */
      var centroidData = centroids.map(function (c, i) { return { c: c, index: i }; });
      var groups = gCentroids.selectAll("g")
        .data(centroidData)
        .join(function (enter) {
          var g = enter.append("g");
          g.append("path").attr("class", "halo");
          g.append("path").attr("class", "mark");
          g.append("text").attr("class", "tag");
          return g;
        })
        .call(function (selection) {
          maybeAnimate(selection, duration)
            .attr("transform", function (d) {
              return "translate(" + x(d.c[0]) + "," + y(d.c[1]) + ")";
            });
        });

      groups.select("path.halo")
        .attr("d", function (d) { return centroidSymbol.type(symbolOf(d.index))(); })
        .attr("fill", "none")
        .attr("stroke", "var(--surface)")
        .attr("stroke-width", 6);

      groups.select("path.mark")
        .attr("d", function (d) { return centroidSymbol.type(symbolOf(d.index))(); })
        .attr("fill", "var(--surface)")
        .attr("stroke", function (d) { return colorOf(d.index); })
        .attr("stroke-width", 3);

      groups.select("text.tag")
        .attr("x", 0).attr("y", -16)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", 13)
        .attr("font-weight", 600)
        .attr("paint-order", "stroke")
        .attr("stroke", "var(--surface)")
        .attr("stroke-width", 3.5)
        .attr("fill", function (d) { return colorOf(d.index); })
        .text(function (d) { return d.index + 1; });
    }

    return {
      svg: svg,
      render: render,
      setAriaLabel: function (text) { svg.attr("aria-label", text); }
    };
  }

  /** 凡例などで同じ記号を使えるよう、SVG パスの文字列を返す。 */
  function markerPath(index, size) {
    return d3.symbol().type(symbolOf(index)).size(size === undefined ? 46 : size)();
  }

  JsDemo.Scatter = {
    create: create,
    colorOf: colorOf,
    symbolOf: symbolOf,
    markerPath: markerPath,
    VIEW: VIEW
  };
})(window);
