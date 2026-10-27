/*!
 * js-demo / backprop — app.js
 * 順伝播と逆伝播の画面。日本語版と英語版の両方から読み込む。
 *
 * 計算は js/learning/net.js、描画は js/viz/network.js が持つ。
 * ここは**入力部品と手順の進み具合をつなぐだけ**にして、計算を持たない。
 *
 * 条件を変えたら最初からやり直す。周回の途中で形や値が変わると、
 * すでに作った手順と食い違うため。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo;
  var Net = JsDemo.Net;
  var Network = JsDemo.Network;
  var Controls = JsDemo.Controls;
  var Tables = JsDemo.Tables;
  var ShareLink = JsDemo.ShareLink;
  var Learning = JsDemo.Learning;
  var t = JsDemo.I18n.t;

  var PAIRS = ["inputs", "layers", "h1", "h2", "h3", "outputs",
               "x1", "x2", "x3", "x4", "t1", "t2", "t3",
               "rate", "speed", "seed"];

  /* URL へ載せるのは数値だけ。範囲は入力欄から読む（書き写さない）。 */
  var SHARE_FIELDS = [
    { param: "in", control: "inputs", integer: true },
    { param: "L", control: "layers", integer: true },
    { param: "h1", control: "h1", integer: true },
    { param: "h2", control: "h2", integer: true },
    { param: "h3", control: "h3", integer: true },
    { param: "out", control: "outputs", integer: true },
    { param: "x1", control: "x1" },
    { param: "x2", control: "x2" },
    { param: "x3", control: "x3" },
    { param: "x4", control: "x4" },
    { param: "t1", control: "t1" },
    { param: "t2", control: "t2" },
    { param: "t3", control: "t3" },
    { param: "lr", control: "rate" },
    { param: "seed", control: "seed", integer: true }
  ];

  /* 自動で進めたままにしない。これ以上は止める。 */
  var EPOCH_GUARD = 300;

  var pairs = null;
  var spec = null;
  var viz = null;
  var hints = null;
  var plan = null;
  var state = null;
  var cursor = 0;          /* 何手進めたか */
  var activation = "sigmoid";
  var probeChoice = "max";
  var timer = null;

  function value(name) { return pairs[name] ? pairs[name].value() : 0; }

  function hiddenCounts() {
    return [value("h1"), value("h2"), value("h3")].slice(0, value("layers"));
  }

  function config() {
    return {
      inputs: value("inputs"),
      outputs: value("outputs"),
      hidden: hiddenCounts(),
      input: [value("x1"), value("x2"), value("x3"), value("x4")],
      target: [value("t1"), value("t2"), value("t3")],
      rate: value("rate"),
      seed: value("seed"),
      activation: activation
    };
  }

  function probeTarget() {
    if (probeChoice === "max") { return "max"; }
    var parts = probeChoice.split(":").map(Number);
    return { layer: parts[0], node: parts[1], from: parts[2] };
  }

  /* --- 画面の組み立て ---------------------------------------------------- */

  function showRows() {
    var layers = value("layers");
    [1, 2, 3].forEach(function (index) {
      var row = document.getElementById("h" + index + "-row");
      if (row) { row.hidden = index > layers; }
    });
    [1, 2, 3, 4].forEach(function (index) {
      var row = document.getElementById("x" + index + "-row");
      if (row) { row.hidden = index > value("inputs"); }
    });
    [1, 2, 3].forEach(function (index) {
      var row = document.getElementById("t" + index + "-row");
      if (row) { row.hidden = index > value("outputs"); }
    });
  }

  function fillProbeOptions() {
    var select = document.getElementById("probe");
    if (!select) { return; }
    var shape = Net.shapeOf(config());
    var wanted = probeChoice;
    select.textContent = "";

    var top = document.createElement("option");
    top.value = "max";
    top.textContent = t("net.probe.max");
    select.appendChild(top);

    for (var l = 1; l < shape.length; l += 1) {
      for (var j = 0; j < shape[l]; j += 1) {
        for (var i = 0; i < shape[l - 1]; i += 1) {
          var option = document.createElement("option");
          option.value = l + ":" + j + ":" + i;
          option.textContent = t("net.probe.option", {
            layer: layerName(l, shape.length),
            node: j + 1,
            from: layerName(l - 1, shape.length) + " " + (i + 1)
          });
          select.appendChild(option);
        }
      }
    }
    /* 形が変わると選べる重みも変わる。無くなっていたら既定へ戻す。 */
    select.value = wanted;
    if (!select.value) { select.value = "max"; }
    probeChoice = select.value;
  }

  function layerName(layer, layers) {
    if (layer === 0) { return t("net.layer.input"); }
    if (layer === layers - 1) { return t("net.layer.output"); }
    return t("net.layer.hidden", { index: layer });
  }

  function rebuild() {
    stop();
    showRows();
    fillProbeOptions();
    plan = Net.run(config());
    state = plan.initial;
    cursor = 0;
    refreshShareLink();
    render(t("net.message.reset"));
  }

  /* --- 手順を進める ------------------------------------------------------ */

  function advance(count) {
    var wanted = cursor + count;
    plan.ensure(wanted, { probe: probeTarget() });
    var moved = 0;
    while (cursor < plan.steps.length && moved < count) {
      state = Net.applyStep(state, plan.steps[cursor]);
      cursor += 1;
      moved += 1;
    }
    return moved;
  }

  function stepForward() {
    if (state.epoch >= EPOCH_GUARD) { stop(); return; }
    advance(1);
    render(describe(plan.steps[cursor - 1]));
  }

  function stepBack() {
    if (cursor === 0) { return; }
    stop();
    cursor -= 1;
    /* 逆向きの計算は持たない。最初から畳み直す。手数は多くないので足りる。 */
    state = Net.replay(plan.initial, plan.steps, cursor);
    render(cursor === 0 ? t("net.message.reset")
                        : describe(plan.steps[cursor - 1]));
  }

  function epochForward() {
    stop();
    if (state.epoch >= EPOCH_GUARD) { return; }
    var guard = 0;
    do {
      advance(1);
      guard += 1;
    } while (guard < 2000 && plan.steps[cursor - 1].type !== "epochEnd");
    render(describe(plan.steps[cursor - 1]));
  }

  function play() {
    if (timer) { stop(); return; }
    var button = document.getElementById("play");
    if (button) { button.textContent = t("net.button.stop"); }
    timer = global.setInterval(function () {
      if (state.epoch >= EPOCH_GUARD) { stop(); return; }
      stepForward();
    }, value("speed"));
  }

  function stop() {
    if (timer) { global.clearInterval(timer); timer = null; }
    var button = document.getElementById("play");
    if (button) { button.textContent = t("net.button.play"); }
  }

  /* --- いまの手を言葉にする --------------------------------------------- */

  /* 表示用。負の数の符号は引き算と同じ字（−）にそろえる。
     一つの式の中で - と − が混ざると読みにくいため。 */
  function num(value2) {
    if (value2 === undefined || value2 === null) { return "—"; }
    return String(JsDemo.Numeric.round(value2, 4)).replace("-", "−");
  }

  function describe(step) {
    if (!step) { return ""; }
    var layers = state.shape.length;

    if (step.type === "forward") {
      var terms = step.terms.map(function (term) {
        return num(term.weight) + "×" + num(term.value);
      }).join(" + ");
      var sum = terms + (step.bias ? " + " + num(step.bias) : "");
      return step.output
        ? t("net.step.forwardOut", {
            where: where(step.layer, step.node, layers),
            terms: sum, z: num(step.z)
          })
        : t("net.step.forward", {
            where: where(step.layer, step.node, layers),
            terms: sum, z: num(step.z), a: num(step.a),
            name: t("net.activation." + state.activation)
          });
    }
    if (step.type === "loss") {
      var parts = step.outputs.map(function (item) {
        return "(" + num(item.y) + " − " + num(item.target) + ")²";
      }).join(" + ");
      return t("net.step.loss", { terms: parts, loss: num(step.loss) });
    }
    if (step.type === "delta") {
      if (step.output) {
        return t("net.step.deltaOut", {
          where: where(step.layer, step.node, layers),
          y: num(step.y), target: num(step.target), delta: num(step.delta)
        });
      }
      var chain = step.terms.map(function (term) {
        return num(term.weight) + "×" + num(term.delta);
      }).join(" + ");
      return t("net.step.delta", {
        where: where(step.layer, step.node, layers),
        terms: chain, sum: num(step.sum),
        slope: num(step.slope), formula: step.formula,
        delta: num(step.delta)
      });
    }
    if (step.type === "grad") {
      var list = step.weights.map(function (item) {
        return num(item.a) + "×" + num(step.delta) + " = " + num(item.grad);
      }).join(" / ");
      return t("net.step.grad", {
        where: where(step.layer, step.node, layers),
        delta: num(step.delta), list: list, bias: num(step.biasGrad)
      });
    }
    if (step.type === "probe") {
      return t("net.step.probe", {
        where: where(step.layer, step.node, layers),
        from: step.from + 1,
        weight: num(step.weight), h: step.h,
        plusWeight: num(step.plus.weight), plusLoss: num(step.plus.loss),
        minusWeight: num(step.minus.weight), minusLoss: num(step.minus.loss),
        numeric: num(step.numeric), analytic: num(step.analytic),
        gap: num(step.gap)
      });
    }
    if (step.type === "update") {
      return t("net.step.update", {
        layer: layerName(step.layer, layers),
        rate: num(step.rate), count: step.changes.length
      });
    }
    if (step.type === "epochEnd") {
      return t("net.step.epochEnd", { epoch: step.epoch, loss: num(step.loss) });
    }
    return "";
  }

  function where(layer, node, layers) {
    return t("net.where", {
      layer: layerName(layer, layers), node: node + 1
    });
  }

  /* --- 表示 -------------------------------------------------------------- */

  function render(message) {
    var shape = state.shape;

    viz.draw(state, {
      captions: function (layer) { return layerName(layer, shape.length); },
      summary: t("net.figure.summary", {
        shape: shape.join("-"), phase: t("net.phase." + state.phase)
      })
    });

    Controls.renderReadout("readout", [
      { label: t("net.readout.steps"), value: String(cursor) },
      { label: t("net.readout.epoch"), value: String(state.epoch) },
      { label: t("net.readout.phase"), value: t("net.phase." + state.phase) },
      { label: t("net.readout.loss"),
        value: state.loss === null ? "—" : num(state.loss) },
      { label: t("net.readout.probe"),
        value: state.probe ? num(state.probe.gap) : "—" }
    ]);

    var formula = document.getElementById("formula");
    if (formula && message) { formula.textContent = message; }
    if (message) { Controls.announce("live", message); }

    renderNodeTable();
    renderWeightTable();
    renderLossTable();
  }

  function renderNodeTable() {
    var rows = [];
    state.shape.forEach(function (count, layer) {
      for (var j = 0; j < count; j += 1) {
        var a = state.a[layer] ? state.a[layer][j] : undefined;
        var z = state.z[layer] ? state.z[layer][j] : undefined;
        var d = state.d[layer] ? state.d[layer][j] : undefined;
        rows.push([
          where(layer, j, state.shape.length),
          z === undefined || z === null ? "—" : num(z),
          a === undefined ? "—" : num(a),
          d === undefined ? "—" : num(d)
        ]);
      }
    });
    Tables.renderTable(document.getElementById("node-table"), {
      caption: t("net.table.nodes"),
      columns: [t("net.table.where"), "z", "a", "δ"],
      rows: rows
    });
  }

  function renderWeightTable() {
    var rows = [];
    for (var l = 1; l < state.shape.length; l += 1) {
      for (var j = 0; j < state.shape[l]; j += 1) {
        for (var i = 0; i < state.shape[l - 1]; i += 1) {
          var grad = state.gw[l] && state.gw[l][j] ? state.gw[l][j][i] : undefined;
          rows.push([
            t("net.weight.name", {
              to: where(l, j, state.shape.length),
              from: layerName(l - 1, state.shape.length) + " " + (i + 1)
            }),
            num(state.w[l][j][i]),
            grad === undefined ? "—" : num(grad)
          ]);
        }
      }
    }
    Tables.renderTable(document.getElementById("weight-table"), {
      caption: t("net.table.weights"),
      columns: [t("net.table.weight"), t("net.table.value"), t("net.table.grad")],
      rows: rows
    });
  }

  function renderLossTable() {
    var history = state.history.slice(-10);
    var start = state.history.length - history.length;
    var rows = history.map(function (loss, index) {
      return [String(start + index + 1), num(loss)];
    });
    if (rows.length === 0) { rows = [["—", "—"]]; }
    Tables.renderTable(document.getElementById("loss-table"), {
      caption: t("net.table.loss"),
      columns: [t("net.table.epoch"), t("net.table.lossValue")],
      rows: rows
    });
  }

  /* --- 共有リンク -------------------------------------------------------- */

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

  /* --- 起動 -------------------------------------------------------------- */

  function init() {
    viz = Network.create({
      container: "#plot",
      labels: { figure: t("net.figure.label") }
    });

    pairs = Controls.bindPairs(PAIRS, function () {
      /* 条件が変わったら最初からやり直す。途中の手順と食い違わせない。 */
      rebuild();
    });

    spec = ShareLink.specFromControls(SHARE_FIELDS);
    var shared = ShareLink.read(spec);
    SHARE_FIELDS.forEach(function (field) {
      if (shared[field.param] !== undefined && pairs[field.control]) {
        pairs[field.control].set(shared[field.param]);
      }
    });

    Controls.bindModeButtons("activation", activation, function (mode) {
      activation = mode;
      if (plan) { rebuild(); }
    });

    var probe = document.getElementById("probe");
    if (probe) {
      probe.addEventListener("change", function () {
        probeChoice = probe.value;
        rebuild();
      });
    }

    document.getElementById("reset").addEventListener("click", function () {
      /* 種を選び直して、別の最初の重みから始める。 */
      pairs.seed.set(1 + Math.floor(Math.random() * 999));
      rebuild();
    });
    document.getElementById("step").addEventListener("click", stepForward);
    document.getElementById("back").addEventListener("click", stepBack);
    document.getElementById("epoch").addEventListener("click", epochForward);
    document.getElementById("play").addEventListener("click", play);

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
