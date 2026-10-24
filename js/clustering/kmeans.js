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
   * デモ用の合成データ。いくつかの塊の周りに正規分布で点を置く。
   * 塊の数と k をずらせるので、k を人が決めることの影響を見せられる。
   */
  function makeBlobs(options) {
    var random = options.random;
    var count = options.count;
    var groups = Math.max(1, options.groups);
    var spread = options.spread === undefined ? 0.09 : options.spread;
    var width = options.width === undefined ? 1 : options.width;
    var height = options.height === undefined ? 1 : options.height;

    var centers = [];
    for (var g = 0; g < groups; g += 1) {
      centers.push([random.range(0.18, 0.82) * width,
                    random.range(0.18, 0.82) * height]);
    }

    var points = [];
    for (var i = 0; i < count; i += 1) {
      var c = centers[i % groups];
      var x = c[0] + random.normal(0, spread * width);
      var y = c[1] + random.normal(0, spread * height);
      points.push([
        Math.min(width, Math.max(0, x)),
        Math.min(height, Math.max(0, y))
      ]);
    }
    return { points: points, centers: centers };
  }

  JsDemo.KMeans = {
    create: create,
    makeBlobs: makeBlobs,
    PHASE_ASSIGN: PHASE_ASSIGN,
    PHASE_UPDATE: PHASE_UPDATE
  };
})(window);
