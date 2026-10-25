/*!
 * js-demo / clustering — kmeans.js
 * k-means 法を「割当」と「中心の更新」の二段階に分けて 1 手ずつ進める。
 * 描画も DOM も扱わないので、ブラウザなしで既知値と照合できる。
 *
 * 気をつけている点:
 *   - 空クラスタ（どの点も割り当てられない中心）で平均が 0/0 = NaN に
 *     ならないよう、方針を選べるようにしてある
 *   - 乱数は呼び出し側から渡す。種を固定すれば同じ実験を再現できる
 *   - 収束は「割当が変化しなくなったこと」で判定する
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});
  var Numeric = JsDemo.Numeric;

  var PHASE_ASSIGN = "assign";
  var PHASE_UPDATE = "update";

  /**
   * @param {Object} options
   * @param {Array<Array<number>>} options.points  [[x,y], ...]
   * @param {number} options.k  クラスタ数。点の数より多い場合は点の数に合わせる。
   * @param {Object} options.random  JsDemo.Random.create() が返す生成器
   * @param {Array<Array<number>>} [options.centroids]  初期中心を直接与える
   * @param {string} [options.emptyClusterPolicy]
   *        "farthest"（既定）… 空になった中心を、割当中心から最も遠い点へ移す
   *        "keep"            … 空になった中心は動かさない（空のまま残る様子を見せる）
   * @param {number} [options.tolerance]  中心の移動量をこれ未満なら動いていないとみなす
   */
  function create(options) {
    var points = options.points.map(function (p) { return [p[0], p[1]]; });
    var random = options.random;
    var policy = options.emptyClusterPolicy || "farthest";
    var tolerance = options.tolerance === undefined ? 1e-9 : options.tolerance;

    /* 中心が点より多いと必ず空クラスタが出る。上限を点の数に合わせる。 */
    var k = Math.max(1, Math.min(Math.round(options.k), points.length));

    var centroids = options.centroids
      ? options.centroids.slice(0, k).map(function (c) { return [c[0], c[1]]; })
      : pickInitialCentroids(points, k, random);

    var assignments = points.map(function () { return -1; });
    var phase = PHASE_ASSIGN;
    var iteration = 0;
    var converged = false;
    var lastChanged = null;   /* 直前の割当で変わった点の数 */
    var lastMaxShift = null;  /* 直前の更新で中心が動いた最大距離 */
    var lastEmpty = [];       /* 直前の更新で空だったクラスタの番号 */

    /* 相異なる点から k 個選ぶ（Forgy 法）。同じ点を 2 回選ばない。 */
    function pickInitialCentroids(pts, count, rnd) {
      var unique = [];
      var seen = Object.create(null);
      for (var i = 0; i < pts.length; i += 1) {
        var key = pts[i][0] + "," + pts[i][1];
        if (!seen[key]) { seen[key] = true; unique.push(pts[i]); }
      }
      var pool = rnd.shuffle(unique.length >= count ? unique : pts);
      return pool.slice(0, count).map(function (p) { return [p[0], p[1]]; });
    }

    /** 点 i に最も近い中心の番号。距離は 2 乗のまま比べる。 */
    function nearestCentroid(point) {
      var best = 0;
      var bestDist = Infinity;
      for (var j = 0; j < centroids.length; j += 1) {
        var d = Numeric.distanceSquared(point, centroids[j]);
        if (d < bestDist) { bestDist = d; best = j; }
      }
      return best;
    }

    /** 各点を最も近い中心へ割り当てる。変わった点の数を返す。 */
    function assign() {
      var changed = 0;
      for (var i = 0; i < points.length; i += 1) {
        var next = nearestCentroid(points[i]);
        if (next !== assignments[i]) { changed += 1; }
        assignments[i] = next;
      }
      lastChanged = changed;
      return changed;
    }

    /**
     * 各中心をクラスタの平均へ移す。
     * 空クラスタはここで平均が計算できない。0 で割って NaN にせず、方針に従う。
     */
    function update() {
      var sums = [];
      var counts = [];
      var j;
      for (j = 0; j < centroids.length; j += 1) { sums.push([0, 0]); counts.push(0); }

      for (var i = 0; i < points.length; i += 1) {
        var c = assignments[i];
        if (c < 0) { continue; }
        sums[c][0] += points[i][0];
        sums[c][1] += points[i][1];
        counts[c] += 1;
      }

      var empty = [];
      var maxShift = 0;
      for (j = 0; j < centroids.length; j += 1) {
        if (counts[j] === 0) {
          empty.push(j);
          continue; /* 移動は空クラスタの処理でまとめて行う */
        }
        var target = [sums[j][0] / counts[j], sums[j][1] / counts[j]];
        var shift = Numeric.distance(centroids[j], target);
        if (shift > maxShift) { maxShift = shift; }
        centroids[j] = target;
      }

      if (empty.length > 0 && policy === "farthest") {
        var moved = reseedEmptyClusters(empty);
        if (moved > maxShift) { maxShift = moved; }
      }

      lastEmpty = empty;
      lastMaxShift = maxShift;
      iteration += 1;
      return { maxShift: maxShift, emptyClusters: empty.slice() };
    }

    /**
     * 空になった中心を、割り当て先の中心から最も遠い点へ移す。
     * 同じ点を二つの中心に割り当てないよう、選んだ点は候補から外す。
     */
    function reseedEmptyClusters(emptyIndexes) {
      var used = Object.create(null);
      var maxShift = 0;
      for (var n = 0; n < emptyIndexes.length; n += 1) {
        var farthestIndex = -1;
        var farthestDist = -1;
        for (var i = 0; i < points.length; i += 1) {
          if (used[i]) { continue; }
          var c = assignments[i];
          if (c < 0) { continue; }
          var d = Numeric.distanceSquared(points[i], centroids[c]);
          if (d > farthestDist) { farthestDist = d; farthestIndex = i; }
        }
        if (farthestIndex < 0) { break; } /* 移せる点がない */
        used[farthestIndex] = true;
        var j = emptyIndexes[n];
        var shift = Numeric.distance(centroids[j], points[farthestIndex]);
        if (shift > maxShift) { maxShift = shift; }
        centroids[j] = [points[farthestIndex][0], points[farthestIndex][1]];
      }
      return maxShift;
    }

    /**
     * 次の 1 手を進める。
     * @returns {{phase:string, changed:number|null, maxShift:number|null,
     *            emptyClusters:Array<number>, iteration:number, converged:boolean}}
     */
    function step() {
      if (converged) {
        return snapshotResult(phase, true);
      }
      var done = phase;
      if (phase === PHASE_ASSIGN) {
        var changed = assign();
        /* 2 回目以降の割当で 1 点も動かなければ、もう中心も動かない。 */
        if (iteration > 0 && changed === 0) { converged = true; }
        phase = PHASE_UPDATE;
      } else {
        var info = update();
        if (info.maxShift <= tolerance && info.emptyClusters.length === 0) {
          converged = true;
        }
        phase = PHASE_ASSIGN;
      }
      return snapshotResult(done, converged);
    }

    function snapshotResult(donePhase, isConverged) {
      return {
        phase: donePhase,
        nextPhase: phase,
        changed: lastChanged,
        maxShift: lastMaxShift,
        emptyClusters: lastEmpty.slice(),
        iteration: iteration,
        converged: isConverged
      };
    }

    /** 収束するまで進める。回りすぎないよう上限を置く。 */
    function run(maxIterations) {
      var limit = maxIterations === undefined ? 100 : maxIterations;
      while (!converged && iteration < limit) { step(); }
      return snapshotResult(phase, converged);
    }

    /** 各点から割当中心までの距離の 2 乗和。反復ごとに減る（増えない）。 */
    function inertia() {
      var total = 0;
      for (var i = 0; i < points.length; i += 1) {
        var c = assignments[i];
        if (c < 0) { return null; } /* 未割当があるうちは定義しない */
        total += Numeric.distanceSquared(points[i], centroids[c]);
      }
      return total;
    }

    /** クラスタごとの点の数 */
    function clusterSizes() {
      var sizes = centroids.map(function () { return 0; });
      for (var i = 0; i < points.length; i += 1) {
        if (assignments[i] >= 0) { sizes[assignments[i]] += 1; }
      }
      return sizes;
    }

    return {
      get points() { return points; },
      get centroids() { return centroids; },
      get assignments() { return assignments; },
      get phase() { return phase; },
      get iteration() { return iteration; },
      get converged() { return converged; },
      get k() { return k; },
      step: step,
      run: run,
      inertia: inertia,
      clusterSizes: clusterSizes
    };
  }

  /**
   * デモ用の合成データ。いくつかの塊の周りに点を置く。
   * 塊の数と k をずらせるので、k を人が決めることの影響を見せられる。
   *
   * 見た目が作り物にならないよう、塊ごとに次を変える。
   * 同じ大きさの真円が等間隔に並ぶと、人が置いた図に見えてしまう。
   *   - 広がり（縦横で別々）と向き
   *   - 含まれる点の数
   *   - 塊どうしが重なりすぎない位置
   * さらに、どの塊にも属さない点を少し混ぜる。
   */
  function makeBlobs(options) {
    var random = options.random;
    var count = Math.max(1, Math.round(options.count));
    var groups = Math.max(1, Math.round(options.groups));
    var spread = options.spread === undefined ? 0.09 : options.spread;
    var width = options.width === undefined ? 1 : options.width;
    var height = options.height === undefined ? 1 : options.height;
    /* どの塊にも属さない点の割合。少し混ぜると現実のデータらしくなる。 */
    var noise = options.noise === undefined ? 0.06 : options.noise;

    var centers = pickCenters(random, groups, width, height);
    var shapes = centers.map(function () {
      return {
        /* 縦横で広がりを変え、向きも回す。真円が並ばないようにする。 */
        sx: spread * random.range(0.55, 1.75),
        sy: spread * random.range(0.55, 1.75),
        angle: random.range(0, Math.PI),
        weight: random.range(0.55, 1.7)
      };
    });

    var noiseCount = Math.min(count - groups, Math.round(count * noise));
    if (noiseCount < 0) { noiseCount = 0; }
    var sizes = shareOut(count - noiseCount, shapes.map(function (s) {
      return s.weight;
    }));

    var points = [];
    centers.forEach(function (center, index) {
      var shape = shapes[index];
      var cos = Math.cos(shape.angle);
      var sin = Math.sin(shape.angle);
      for (var i = 0; i < sizes[index]; i += 1) {
        points.push(samplePoint(random, center, shape, cos, sin, width, height));
      }
    });
    for (var n = 0; n < noiseCount; n += 1) {
      points.push([random.range(0.04, 0.96) * width,
                   random.range(0.04, 0.96) * height]);
    }

    return { points: random.shuffle(points), centers: centers };
  }

  /**
   * 塊の中心を選ぶ。近すぎる位置は選び直す。
   * 中心が重なると、別々の塊が 1 つの塊に見えてしまう。
   */
  function pickCenters(random, groups, width, height) {
    /* 塊が増えるほど間隔は詰まるので、必要な距離を緩める。 */
    var needed = 0.52 / Math.sqrt(groups);
    var centers = [];
    for (var g = 0; g < groups; g += 1) {
      var best = null;
      var bestDistance = -1;
      /* 何度か試して、既存の中心から最も離れた候補を採る。
         試行を打ち切っても必ず 1 つは返るので、無限に回らない。 */
      for (var attempt = 0; attempt < 40; attempt += 1) {
        var candidate = [random.range(0.16, 0.84) * width,
                         random.range(0.16, 0.84) * height];
        var nearest = Infinity;
        for (var i = 0; i < centers.length; i += 1) {
          var d = Numeric.distance(candidate, centers[i]);
          if (d < nearest) { nearest = d; }
        }
        if (nearest > bestDistance) { bestDistance = nearest; best = candidate; }
        if (nearest >= needed) { break; }
      }
      centers.push(best);
    }
    return centers;
  }

  /**
   * 合計 total を重みの比で割り振る。各塊に最低 1 点は入れる。
   * 端数は大きい重みから配り、合計が total に一致するようにする。
   */
  function shareOut(total, weights) {
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var sizes = weights.map(function (w) {
      return Math.max(1, Math.floor((total * w) / sum));
    });
    var assigned = sizes.reduce(function (a, b) { return a + b; }, 0);
    var order = weights.map(function (w, i) { return { w: w, i: i }; })
      .sort(function (a, b) { return b.w - a.w; });
    var cursor = 0;
    while (assigned < total) {
      sizes[order[cursor % order.length].i] += 1;
      assigned += 1;
      cursor += 1;
    }
    while (assigned > total) {
      var index = order[cursor % order.length].i;
      if (sizes[index] > 1) { sizes[index] -= 1; assigned -= 1; }
      cursor += 1;
    }
    return sizes;
  }

  /**
   * 塊の中から 1 点を取る。
   * 外へ出た点は切り詰めずに取り直す。切り詰めると縁に点が並んで不自然になる。
   */
  function samplePoint(random, center, shape, cos, sin, width, height) {
    var x = 0;
    var y = 0;
    for (var attempt = 0; attempt < 12; attempt += 1) {
      var u = random.normal(0, shape.sx) * width;
      var v = random.normal(0, shape.sy) * height;
      x = center[0] + u * cos - v * sin;
      y = center[1] + u * sin + v * cos;
      if (x >= 0 && x <= width && y >= 0 && y <= height) { return [x, y]; }
    }
    /* 取り直しても収まらない場合だけ、範囲へ収める。 */
    return [Math.min(width, Math.max(0, x)), Math.min(height, Math.max(0, y))];
  }

  JsDemo.KMeans = {
    create: create,
    makeBlobs: makeBlobs,
    PHASE_ASSIGN: PHASE_ASSIGN,
    PHASE_UPDATE: PHASE_UPDATE
  };
})(typeof window !== "undefined" ? window : globalThis);
