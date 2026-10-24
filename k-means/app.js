/*!
 * js-demo / k-means — app.js
 * k-means デモの画面側。日本語版と英語版の両方から読み込む。
 * 文言は js/ui/i18n.js が <html lang> を見て切り替えるので、このファイルは 1 つで足りる。
 */
(function () {
  "use strict";

  var Random = JsDemo.Random;
  var Numeric = JsDemo.Numeric;
  var KMeans = JsDemo.KMeans;
  var Scatter = JsDemo.Scatter;
  var Controls = JsDemo.Controls;
  var Tables = JsDemo.Tables;
  var t = JsDemo.I18n.t;

  var PARAMS = ["clusters", "points", "groups", "seed"];

  var scatter = null;
  var model = null;
  var showLinks = true;
  var lastInfo = null;
  var stepCount = 0;   /* 初期化から何手進めたか。一手戻るときに使う。 */

  function readParams() {
    return {
      k: Numeric.readNumber(Controls.byId("clusters").value,
                            { min: 1, max: 10, integer: true }),
      count: Numeric.readNumber(Controls.byId("points").value,
                                { min: 1, max: 1000, integer: true }),
      groups: Numeric.readNumber(Controls.byId("groups").value,
                                 { min: 1, max: 8, integer: true }),
      seed: Numeric.readNumber(Controls.byId("seed").value,
                               { min: 0, max: 999999, integer: true })
    };
  }

  /**
   * 設定から模型を組み直し、steps 手だけ進める。
   * 同じ種なら必ず同じ初期状態になるので、途中の状態を保存しておかなくても
   * 「最初から n 手進めた状態」をいつでも作り直せる。一手戻るはこれを使う。
   */
  function build(steps) {
    var p = readParams();
    var random = Random.create(p.seed);
    var data = KMeans.makeBlobs({
      random: random,
      count: p.count,
      groups: p.groups,
      spread: 0.07
    });
    model = KMeans.create({
      points: data.points,
      k: p.k,
      random: random,
      emptyClusterPolicy: "farthest"
    });
    lastInfo = null;
    stepCount = 0;
    for (var i = 0; i < steps; i += 1) {
      if (model.converged) { break; }
      lastInfo = model.step();
      stepCount += 1;
    }
    render();
  }

  /** 設定が変わったときは最初の状態へ戻す。 */
  function rebuild() { build(0); }

  /** 1 手戻る。種から作り直して 1 手少なく進める。 */
  function stepBack() {
    if (stepCount > 0) { build(stepCount - 1); }
  }

  function phaseText() {
    if (model.converged) { return t("phase.done"); }
    return model.phase === KMeans.PHASE_ASSIGN ? t("phase.assign") : t("phase.update");
  }

  function render() {
    scatter.render({
      points: model.points,
      assignments: model.assignments,
      centroids: model.centroids,
      showLinks: showLinks
    });

    var inertia = model.inertia();
    var rows = [
      { label: t("status.iteration"), value: String(model.iteration) },
      { label: t("phase.next"), value: phaseText() },
      {
        label: t("status.changed"),
        value: lastInfo && lastInfo.changed !== null
          ? String(lastInfo.changed) : "—"
      },
      {
        label: t("status.maxShift"),
        value: lastInfo && lastInfo.maxShift !== null
          ? Numeric.format(lastInfo.maxShift, 4) : "—"
      },
      {
        label: t("status.inertia"),
        value: inertia === null ? t("status.notStarted") : Numeric.format(inertia, 4)
      },
      {
        label: t("status.converged"),
        value: model.converged ? t("status.convergedYes") : t("status.convergedNo")
      },
      { label: t("status.seed"), value: String(readParams().seed) }
    ];
    Controls.renderReadout("readout", rows);

    renderClusterTable();
    renderLegend();

    var stepButton = Controls.byId("step");
    var runButton = Controls.byId("run");
    var backButton = Controls.byId("step-back");
    stepButton.disabled = model.converged;
    runButton.disabled = model.converged;
    backButton.disabled = stepCount === 0;
    stepButton.textContent = model.converged ? t("button.stepDone") : t("button.step");

    var message = phaseText();
    if (lastInfo && lastInfo.emptyClusters.length > 0) {
      message += " / " + t("status.emptyCluster") +
        lastInfo.emptyClusters.map(function (i) { return i + 1; }).join(", ");
    }
    Controls.announce("live", message);

    scatter.setAriaLabel(
      t("figure.scatter") + " " +
      t("status.points") + ": " + model.points.length + ", " +
      t("status.clusters") + ": " + model.k + ", " +
      t("status.iteration") + ": " + model.iteration
    );
  }

  function renderClusterTable() {
    var sizes = model.clusterSizes();
    var rows = model.centroids.map(function (c, i) {
      return [
        String(i + 1),
        String(sizes[i]),
        Numeric.format(c[0], 3),
        Numeric.format(c[1], 3)
      ];
    });
    Tables.renderTable(Controls.byId("cluster-table"), {
      caption: t("table.clusters"),
      columns: [t("table.cluster"), t("table.size"),
                t("table.centroidX"), t("table.centroidY")],
      rows: rows
    });
  }

  /** 凡例は k に合わせて作り直す。図と同じ色・形・番号を並べる。 */
  function renderLegend() {
    var list = Controls.byId("legend");
    list.textContent = "";

    model.centroids.forEach(function (centroid, i) {
      var li = document.createElement("li");
      li.appendChild(markerSwatch(i));
      var span = document.createElement("span");
      span.textContent = t("table.cluster") + " " + (i + 1) +
        " (" + model.clusterSizes()[i] + ")";
      li.appendChild(span);
      list.appendChild(li);
    });

    var centroidItem = document.createElement("li");
    centroidItem.appendChild(centroidSwatch());
    var centroidLabel = document.createElement("span");
    centroidLabel.textContent = t("legend.centroid");
    centroidItem.appendChild(centroidLabel);
    list.appendChild(centroidItem);
  }

  function svgElement(name) {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
  }

  function markerSwatch(index) {
    var svg = svgElement("svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "-9 -9 18 18");
    svg.setAttribute("aria-hidden", "true");
    var path = svgElement("path");
    path.setAttribute("d", Scatter.markerPath(index, 70));
    path.setAttribute("fill", Scatter.colorOf(index));
    svg.appendChild(path);
    return svg;
  }

  function centroidSwatch() {
    var svg = svgElement("svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "-9 -9 18 18");
    svg.setAttribute("aria-hidden", "true");
    var path = svgElement("path");
    path.setAttribute("d", Scatter.markerPath(0, 140));
    path.setAttribute("fill", "var(--surface)");
    path.setAttribute("stroke", "var(--ink-soft)");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);
    return svg;
  }

  function init() {
    scatter = Scatter.create({
      container: "#plot",
      labels: { figure: t("figure.scatter") }
    });

    Controls.bindPairs(PARAMS, rebuild);

    Controls.byId("step").addEventListener("click", function () {
      lastInfo = model.step();
      stepCount += 1;
      render();
    });

    Controls.byId("step-back").addEventListener("click", stepBack);

    Controls.byId("run").addEventListener("click", function () {
      while (!model.converged && stepCount < 400) {
        lastInfo = model.step();
        stepCount += 1;
      }
      render();
    });

    Controls.byId("reset").addEventListener("click", rebuild);

    var linkToggle = Controls.byId("toggle-links");
    linkToggle.setAttribute("aria-pressed", String(showLinks));
    linkToggle.addEventListener("click", function () {
      showLinks = !showLinks;
      linkToggle.setAttribute("aria-pressed", String(showLinks));
      render();
    });

    rebuild();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
