/*!
 * js-demo / learning — net.js
 * 小さなニューラルネットの順伝播・逆伝播・重みの更新を「手順」として出す。
 *
 * 決めごと:
 *   - **描画も DOM も扱わない。** 手順の列を返すだけなので、Node でそのまま照合できる。
 *   - 1 手は**ノード 1 つ分**。どのノードの、どの値が、どの式で決まったかを 1 手で言える
 *     粒度にする。層ごとにまとめると「どこから来た値か」が追えなくなる。
 *   - **逆伝播は連鎖律で解く。** 数値微分（少し動かして順伝播をやり直す）は
 *     答え合わせとして別に出す。逆伝播そのものを試行錯誤に見せない。
 *   - 中間層の活性化は sigmoid か ReLU、**出力層は恒等**、損失は二乗誤差（係数 1/2）。
 *     係数 1/2 は ∂L/∂y = y − t を余計な 2 無しで書けるようにするため。
 *   - 初期の重みは**種から決める**ので、同じ種なら何度でも同じ実験になる。
 *     読める桁にしたいので小数 2 桁へ丸める。偏りは 0 から始める。
 *
 * 用語の対応:
 *   a[l]       層 l の出力（a[0] は入力）
 *   z[l]       層 l の重み付き和（l は 1 以上）
 *   w[l][j][i] 層 l-1 の i 番から層 l の j 番への重み
 *   d[l][j]    層 l の j 番の δ（∂L/∂z）
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;
  var Random = JsDemo.Random;

  /* 数値微分の刻み幅。中心差分で使う。
     小さくしすぎると桁落ちで荒れる。限界としてページにも書く。 */
  var PROBE_H = 1e-3;

  var ACTIVATIONS = {
    sigmoid: {
      of: function (z) { return 1 / (1 + Math.exp(-z)); },
      /* 出力 a から傾きを出せる。画面で a と並べて書けるのでこの形にする。 */
      slopeFrom: function (a) { return a * (1 - a); },
      formula: "a(1-a)"
    },
    relu: {
      of: function (z) { return z > 0 ? z : 0; },
      slopeFrom: function (a) { return a > 0 ? 1 : 0; },
      formula: "a>0 ? 1 : 0"
    }
  };

  function activation(name) {
    return ACTIVATIONS[name] || ACTIVATIONS.sigmoid;
  }

  function round(value) { return Numeric.round(value, 6); }

  function copyMatrix(rows) {
    return rows.map(function (row) { return row.slice(); });
  }

  /* 層 0（入力）には重みが無いので、その場所は null のまま持つ。 */
  function copyWeights(w) {
    return w.map(function (rows) { return rows ? copyMatrix(rows) : rows; });
  }

  /** 層の形を決める。[入力, 中間…, 出力] の並びにする。 */
  function shapeOf(config) {
    var hidden = (config.hidden || []).filter(function (count) {
      return count > 0;
    });
    return [config.inputs].concat(hidden, [config.outputs]);
  }

  /**
   * 初期の状態。重みは種から決める（同じ種なら同じ実験になる）。
   * 偏りは 0 から始める。最初に見る式を短くするため。
   */
  function initial(config) {
    var shape = shapeOf(config);
    var random = Random.create(config.seed || 1);
    var w = [null];
    var b = [null];

    for (var l = 1; l < shape.length; l += 1) {
      var rows = [];
      var bias = [];
      for (var j = 0; j < shape[l]; j += 1) {
        var row = [];
        for (var i = 0; i < shape[l - 1]; i += 1) {
          /* -1 〜 1 の読める桁。手で検算できるようにする。 */
          row.push(Numeric.round(random.next() * 2 - 1, 2));
        }
        rows.push(row);
        bias.push(0);
      }
      w.push(rows);
      b.push(bias);
    }

    return {
      shape: shape,
      activation: config.activation === "relu" ? "relu" : "sigmoid",
      rate: config.rate,
      input: config.input.slice(0, shape[0]),
      target: config.target.slice(0, shape[shape.length - 1]),
      w: w,
      b: b,
      a: [config.input.slice(0, shape[0])],
      z: [null],
      d: [],
      gw: [],
      gb: [],
      loss: null,
      epoch: 0,
      phase: "start",
      active: null,
      probe: null,
      history: []
    };
  }

  /** 重みと偏りから、入力に対する出力と損失をまとめて出す（答え合わせ用）。 */
  function forward(state, w, b) {
    var act = activation(state.activation);
    var a = [state.input.slice()];
    var z = [null];

    for (var l = 1; l < state.shape.length; l += 1) {
      var last = l === state.shape.length - 1;
      var zs = [];
      var as = [];
      for (var j = 0; j < state.shape[l]; j += 1) {
        var sum = b[l][j];
        for (var i = 0; i < state.shape[l - 1]; i += 1) {
          sum += w[l][j][i] * a[l - 1][i];
        }
        zs.push(sum);
        /* 出力層は恒等。回帰として読めるようにするため。 */
        as.push(last ? sum : act.of(sum));
      }
      z.push(zs);
      a.push(as);
    }
    return { a: a, z: z, loss: lossOf(a[a.length - 1], state.target) };
  }

  /** 二乗誤差（係数 1/2）。**丸めない。**
     答え合わせの数値微分は損失の差を刻み幅で割るので、ここで丸めると
     その誤差が 1000 倍に拡大して「一致しない」ように見えてしまう。
     表示のための丸めは手順を作るときに行う。 */
  function lossOf(outputs, target) {
    var sum = 0;
    outputs.forEach(function (y, j) {
      var diff = y - target[j];
      sum += diff * diff;
    });
    return sum / 2;
  }

  /** 勾配がいちばん大きい重み。「答え合わせ」の既定の相手にする。 */
  function strongestWeight(gw) {
    var best = null;
    gw.forEach(function (rows, l) {
      if (!rows) { return; }
      rows.forEach(function (row, j) {
        row.forEach(function (value, i) {
          if (!best || Math.abs(value) > Math.abs(best.value)) {
            best = { layer: l, node: j, from: i, value: value };
          }
        });
      });
    });
    return best;
  }

  /**
   * 1 周分（順伝播 → 損失 → 逆伝播 → 答え合わせ → 更新）の手順を作る。
   * 状態は変えない。返した手順を applyStep で畳むと次の状態になる。
   *
   * @param {Object} state
   * @param {Object} [options]  { probe: {layer,node,from} | "max" | null }
   */
  function epochSteps(state, options) {
    var settings = options || {};
    var act = activation(state.activation);
    var steps = [];
    var shape = state.shape;
    var depth = shape.length - 1;

    /* --- 順伝播。1 手 = ノード 1 つ分 ------------------------------------ */
    var pass = forward(state, state.w, state.b);
    for (var l = 1; l <= depth; l += 1) {
      for (var j = 0; j < shape[l]; j += 1) {
        var terms = [];
        for (var i = 0; i < shape[l - 1]; i += 1) {
          terms.push({
            from: i,
            value: round(pass.a[l - 1][i]),
            weight: round(state.w[l][j][i])
          });
        }
        steps.push({
          type: "forward",
          layer: l,
          node: j,
          terms: terms,
          bias: round(state.b[l][j]),
          z: round(pass.z[l][j]),
          a: round(pass.a[l][j]),
          output: l === depth
        });
      }
    }

    /* --- 損失 ------------------------------------------------------------ */
    var outputs = pass.a[depth];
    steps.push({
      type: "loss",
      outputs: outputs.map(function (y, j) {
        return { node: j, y: round(y), target: state.target[j],
                 diff: round(y - state.target[j]) };
      }),
      loss: round(pass.loss)
    });

    /* --- 逆伝播。連鎖律で δ を出し、続けてその層の勾配を出す -------------- */
    var d = [];
    for (var k = 0; k <= depth; k += 1) { d.push(null); }

    for (var layer = depth; layer >= 1; layer -= 1) {
      var deltas = [];
      for (var node = 0; node < shape[layer]; node += 1) {
        if (layer === depth) {
          /* 出力層は恒等なので δ = ∂L/∂y = y − t。 */
          var diff = round(outputs[node] - state.target[node]);
          deltas.push(diff);
          steps.push({
            type: "delta",
            layer: layer,
            node: node,
            output: true,
            y: round(outputs[node]),
            target: state.target[node],
            delta: diff
          });
        } else {
          var terms2 = [];
          var sum = 0;
          for (var next = 0; next < shape[layer + 1]; next += 1) {
            var weight = state.w[layer + 1][next][node];
            sum += weight * d[layer + 1][next];
            terms2.push({
              to: next,
              weight: round(weight),
              delta: round(d[layer + 1][next])
            });
          }
          var slope = act.slopeFrom(pass.a[layer][node]);
          var value = round(sum * slope);
          deltas.push(value);
          steps.push({
            type: "delta",
            layer: layer,
            node: node,
            output: false,
            terms: terms2,
            sum: round(sum),
            a: round(pass.a[layer][node]),
            slope: round(slope),
            formula: act.formula,
            delta: value
          });
        }
      }
      d[layer] = deltas;

      /* δ が出たら、その層へ入る重みの勾配はその場で決まる。 */
      for (var g = 0; g < shape[layer]; g += 1) {
        var weights = [];
        for (var from = 0; from < shape[layer - 1]; from += 1) {
          weights.push({
            from: from,
            a: round(pass.a[layer - 1][from]),
            grad: round(pass.a[layer - 1][from] * deltas[g])
          });
        }
        steps.push({
          type: "grad",
          layer: layer,
          node: g,
          delta: round(deltas[g]),
          weights: weights,
          biasGrad: round(deltas[g])
        });
      }
    }

    /* 勾配をまとめた形も作る（更新と答え合わせで使う）。 */
    var gw = [null];
    var gb = [null];
    for (var gl = 1; gl <= depth; gl += 1) {
      var rows = [];
      var biases = [];
      for (var gj = 0; gj < shape[gl]; gj += 1) {
        var row = [];
        for (var gi = 0; gi < shape[gl - 1]; gi += 1) {
          row.push(round(pass.a[gl - 1][gi] * d[gl][gj]));
        }
        rows.push(row);
        biases.push(round(d[gl][gj]));
      }
      gw.push(rows);
      gb.push(biases);
    }

    /* --- 答え合わせ（数値微分） ------------------------------------------ */
    var probe = settings.probe === null ? null : pickProbe(settings.probe, gw);
    if (probe) {
      steps.push(probeStep(state, probe, gw));
    }

    /* --- 更新。1 手 = 層 1 つ分 ------------------------------------------ */
    for (var ul = 1; ul <= depth; ul += 1) {
      var changes = [];
      for (var uj = 0; uj < shape[ul]; uj += 1) {
        for (var ui = 0; ui < shape[ul - 1]; ui += 1) {
          changes.push({
            node: uj,
            from: ui,
            before: round(state.w[ul][uj][ui]),
            grad: gw[ul][uj][ui],
            after: round(state.w[ul][uj][ui] - state.rate * gw[ul][uj][ui])
          });
        }
      }
      steps.push({
        type: "update",
        layer: ul,
        rate: state.rate,
        changes: changes,
        biasChanges: gb[ul].map(function (value, index) {
          return {
            node: index,
            before: round(state.b[ul][index]),
            grad: value,
            after: round(state.b[ul][index] - state.rate * value)
          };
        })
      });
    }

    steps.push({ type: "epochEnd", epoch: state.epoch + 1, loss: round(pass.loss) });
    return steps;
  }

  function pickProbe(request, gw) {
    if (!request || request === "max") { return strongestWeight(gw); }
    return request;
  }

  /**
   * 選んだ重みを少しだけ動かして、順伝播をやり直す。
   * 中心差分（+h と −h）で傾きを出し、逆伝播の値と並べる。
   */
  function probeStep(state, target, gw) {
    var up = copyWeights(state.w);
    var down = copyWeights(state.w);
    up[target.layer][target.node][target.from] += PROBE_H;
    down[target.layer][target.node][target.from] -= PROBE_H;

    var plus = forward(state, up, state.b);
    var minus = forward(state, down, state.b);
    var numeric = (plus.loss - minus.loss) / (2 * PROBE_H);
    var analytic = gw[target.layer][target.node][target.from];

    return {
      type: "probe",
      layer: target.layer,
      node: target.node,
      from: target.from,
      h: PROBE_H,
      weight: round(state.w[target.layer][target.node][target.from]),
      plus: {
        weight: round(state.w[target.layer][target.node][target.from] + PROBE_H),
        outputs: plus.a[plus.a.length - 1].map(round),
        loss: round(plus.loss)
      },
      minus: {
        weight: round(state.w[target.layer][target.node][target.from] - PROBE_H),
        outputs: minus.a[minus.a.length - 1].map(round),
        loss: round(minus.loss)
      },
      numeric: round(numeric),
      analytic: round(analytic),
      gap: round(Math.abs(numeric - analytic))
    };
  }

  /** 手順を 1 つ畳む。state は変えず、新しい state を返す。 */
  function applyStep(state, step) {
    var next = {
      shape: state.shape,
      activation: state.activation,
      rate: state.rate,
      input: state.input,
      target: state.target,
      w: state.w,
      b: state.b,
      a: state.a.map(function (row) { return row ? row.slice() : row; }),
      z: state.z.map(function (row) { return row ? row.slice() : row; }),
      d: state.d.map(function (row) { return row ? row.slice() : row; }),
      gw: state.gw,
      gb: state.gb,
      loss: state.loss,
      epoch: state.epoch,
      phase: state.phase,
      active: null,
      probe: state.probe,
      history: state.history.slice()
    };

    if (step.type === "forward") {
      /* 周回の 1 手目で、前の周回の δ・傾き・答え合わせを片付ける。
         周回の終わりで消すと、1 周進めたあとに傾きの表が空になり、
         「1 周進めて傾きを見る」ができなくなる。 */
      if (step.layer === 1 && step.node === 0) {
        next.d = [];
        next.gw = [];
        next.probe = null;
      }
      while (next.a.length <= step.layer) { next.a.push([]); }
      while (next.z.length <= step.layer) { next.z.push([]); }
      next.a[step.layer][step.node] = step.a;
      next.z[step.layer][step.node] = step.z;
      next.phase = "forward";
      next.active = { kind: "forward", layer: step.layer, node: step.node };
    } else if (step.type === "loss") {
      next.loss = step.loss;
      next.phase = "loss";
      next.active = { kind: "loss" };
    } else if (step.type === "delta") {
      while (next.d.length <= step.layer) { next.d.push([]); }
      if (!next.d[step.layer]) { next.d[step.layer] = []; }
      next.d[step.layer][step.node] = step.delta;
      next.phase = "backward";
      next.active = { kind: "delta", layer: step.layer, node: step.node };
    } else if (step.type === "grad") {
      next.gw = setGrad(next.gw, step);
      next.phase = "backward";
      next.active = { kind: "grad", layer: step.layer, node: step.node };
    } else if (step.type === "probe") {
      next.phase = "probe";
      next.probe = step;
      next.active = {
        kind: "probe", layer: step.layer, node: step.node, from: step.from
      };
    } else if (step.type === "update") {
      next.w = copyWeights(next.w);
      next.b = next.b.map(function (row) { return row ? row.slice() : row; });
      step.changes.forEach(function (change) {
        next.w[step.layer][change.node][change.from] = change.after;
      });
      step.biasChanges.forEach(function (change) {
        next.b[step.layer][change.node] = change.after;
      });
      next.phase = "update";
      next.active = { kind: "update", layer: step.layer };
    } else if (step.type === "epochEnd") {
      next.epoch = step.epoch;
      next.phase = "epochEnd";
      next.history = next.history.concat([step.loss]);
      /* δ・傾き・答え合わせはここで消さない。
         1 周進めたあとに表で見返せるようにして、
         次の周回の 1 手目（順伝播）で片付ける。 */
    }

    return next;
  }

  function setGrad(gw, step) {
    var copy = gw.map(function (rows) { return rows ? copyMatrix(rows) : rows; });
    while (copy.length <= step.layer) { copy.push([]); }
    if (!copy[step.layer]) { copy[step.layer] = []; }
    copy[step.layer][step.node] = step.weights.map(function (item) {
      return item.grad;
    });
    return copy;
  }

  /** 手順を n 件だけ畳んだ状態。巻き戻しは最初から畳み直す。 */
  function replay(state, steps, count) {
    var current = state;
    for (var i = 0; i < Math.min(count, steps.length); i += 1) {
      current = applyStep(current, steps[i]);
    }
    return current;
  }

  /**
   * 手順を**先に全部は作らない**。周回ごとに作り、求められた分だけ伸ばす。
   * 学習は何周でも続けられるので、終わりまでの手数は存在しない。
   */
  function run(config) {
    var state = initial(config);
    var steps = [];
    var cursor = state;   /* 生成の先頭（作り終えた周回の末尾の状態） */

    var plan = {
      initial: state,
      steps: steps,
      epochs: 0,
      /** 少なくとも count 件になるまで周回を作る。 */
      ensure: function (count, options) {
        var guard = 0;
        while (steps.length < count && guard < 1000) {
          var made = epochSteps(cursor, options);
          made.forEach(function (step) {
            steps.push(step);
            cursor = applyStep(cursor, step);
          });
          plan.epochs += 1;
          guard += 1;
        }
        return steps;
      }
    };
    return plan;
  }

  JsDemo.Net = {
    ACTIVATIONS: ACTIVATIONS,
    PROBE_H: PROBE_H,
    shapeOf: shapeOf,
    initial: initial,
    forward: forward,
    lossOf: lossOf,
    epochSteps: epochSteps,
    applyStep: applyStep,
    replay: replay,
    run: run,
    strongestWeight: strongestWeight
  };
})(typeof window !== "undefined" ? window : globalThis);
