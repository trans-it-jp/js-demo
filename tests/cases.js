/*!
 * js-demo / tests — cases.js
 * 計算部分の検証。既知値・境界値・乱数の再現・データの単調性を照合する。
 *
 * 描画も DOM も使わないので、Node とブラウザの両方で同じものが走る。
 *   Node:     node tests/run.js
 *   ブラウザ: tests/index.html を開く
 *
 * 画面に絵が出たことを正確さの合格にしない。ここが通らなければ公開しない。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo;
  if (!JsDemo) { throw new Error("先に js/core, js/linear-algebra, js/clustering を読み込む"); }

  var Random = JsDemo.Random;
  var Numeric = JsDemo.Numeric;
  var Matrix3 = JsDemo.Matrix3;
  var KMeans = JsDemo.KMeans;
  var Catalog = JsDemo.Catalog;

  /* --- 照合の道具 ------------------------------------------------------- */

  function fail(message) { throw new Error(message); }

  function isTrue(value, message) {
    if (value !== true) { fail(message + " — 実際: " + value); }
  }

  function equal(actual, expected, message) {
    if (actual !== expected) {
      fail(message + " — 期待 " + expected + " / 実際 " + actual);
    }
  }

  /** 浮動小数は厳密一致しないので、許容誤差を明示して比べる。 */
  function near(actual, expected, tolerance, message) {
    if (!(Math.abs(actual - expected) <= tolerance)) {
      fail(message + " — 期待 " + expected + " ±" + tolerance + " / 実際 " + actual);
    }
  }

  function nearMatrix(actual, expected, tolerance, message) {
    for (var i = 0; i < 3; i += 1) {
      for (var j = 0; j < 3; j += 1) {
        if (!(Math.abs(actual[i][j] - expected[i][j]) <= tolerance)) {
          fail(message + " — [" + i + "][" + j + "] 期待 " + expected[i][j] +
               " ±" + tolerance + " / 実際 " + actual[i][j]);
        }
      }
    }
  }

  var cases = [];
  function test(group, name, run) { cases.push({ group: group, name: name, run: run }); }

  /* --- core: 乱数 ------------------------------------------------------- */

  test("core/random", "同じ種なら同じ列になる", function () {
    var a = Random.create("demo");
    var b = Random.create("demo");
    for (var i = 0; i < 100; i += 1) {
      equal(a.next(), b.next(), "i=" + i + " で食い違った");
    }
  });

  test("core/random", "種が違えば違う列になる", function () {
    isTrue(Random.create(1).next() !== Random.create(2).next(), "同じ値が出た");
  });

  test("core/random", "reset で先頭へ戻る", function () {
    var r = Random.create(99);
    var first = r.next();
    r.next();
    r.reset();
    equal(r.next(), first, "reset 後の 1 つ目が変わった");
  });

  test("core/random", "next は [0,1) に収まる", function () {
    var r = Random.create("range");
    for (var i = 0; i < 2000; i += 1) {
      var v = r.next();
      isTrue(v >= 0 && v < 1, "範囲外: " + v);
    }
  });

  test("core/random", "int は両端を含む整数を返す", function () {
    var r = Random.create(7);
    var seen = {};
    for (var i = 0; i < 2000; i += 1) {
      var v = r.int(2, 5);
      isTrue(Number.isInteger(v), "整数でない: " + v);
      isTrue(v >= 2 && v <= 5, "範囲外: " + v);
      seen[v] = true;
    }
    isTrue(!!(seen[2] && seen[5]), "両端が出なかった");
  });

  test("core/random", "shuffle は元の配列を変えない", function () {
    var source = [1, 2, 3, 4, 5];
    var copy = source.slice();
    Random.create(1).shuffle(source);
    equal(source.join(","), copy.join(","), "元の配列が変わった");
  });

  test("core/random", "normal の平均と標準偏差がおおよそ合う", function () {
    var r = Random.create("normal");
    var n = 20000;
    var sum = 0;
    var values = [];
    for (var i = 0; i < n; i += 1) { var v = r.normal(5, 2); values.push(v); sum += v; }
    var mean = sum / n;
    near(mean, 5, 0.05, "平均がずれた");
    var sq = 0;
    for (var j = 0; j < n; j += 1) { sq += (values[j] - mean) * (values[j] - mean); }
    near(Math.sqrt(sq / n), 2, 0.05, "標準偏差がずれた");
  });

  /* --- core: 数値 ------------------------------------------------------- */

  test("core/numeric", "全角数字と全角マイナスを読む", function () {
    equal(Numeric.toFinite("１２.５", 0), 12.5, "全角数字");
    equal(Numeric.toFinite("−３", 0), -3, "全角マイナス");
  });

  test("core/numeric", "数にできない値は既定値になる", function () {
    equal(Numeric.toFinite("", 7), 7, "空欄");
    equal(Numeric.toFinite("abc", 7), 7, "文字");
    equal(Numeric.toFinite(NaN, 7), 7, "NaN");
    equal(Numeric.toFinite(Infinity, 7), 7, "Infinity");
    equal(Numeric.toFinite(null, 7), 7, "null");
  });

  test("core/numeric", "readNumber が範囲と整数化を守る", function () {
    equal(Numeric.readNumber("99", { min: 2, max: 10 }), 10, "上限");
    equal(Numeric.readNumber("-99", { min: 2, max: 10 }), 2, "下限");
    equal(Numeric.readNumber("3.7", { integer: true }), 4, "整数化");
  });

  test("core/numeric", "空配列の平均は null（0 と区別する）", function () {
    equal(Numeric.mean([]), null, "空配列");
    equal(Numeric.mean([1, 2, 3]), 2, "通常");
    equal(Numeric.mean([0, 0]), 0, "合計 0 は 0");
  });

  test("core/numeric", "距離の既知値", function () {
    equal(Numeric.distance([0, 0], [3, 4]), 5, "3-4-5");
    equal(Numeric.distanceSquared([0, 0], [3, 4]), 25, "2 乗");
  });

  test("core/numeric", "format は桁を揃え -0 を作らない", function () {
    equal(Numeric.format(1 / 3), "0.333", "3 桁");
    equal(Numeric.format(-0.0001, 3), "0.000", "-0 を出さない");
    equal(Numeric.format(NaN), "—", "数でない場合");
  });

  /* --- linear-algebra --------------------------------------------------- */

  test("matrix3", "90度回転で e₁ が (0,1) へ移る", function () {
    var p = Matrix3.applyToPoint(Matrix3.rotation(Matrix3.toRadians(90)), [1, 0]);
    near(p[0], 0, 1e-15, "x");
    near(p[1], 1, 1e-15, "y");
  });

  test("matrix3", "行列式が面積比と向きを表す", function () {
    near(Matrix3.determinant2(Matrix3.scale(2, 3)), 6, 1e-15, "拡大");
    near(Matrix3.determinant2(Matrix3.rotation(1.2)), 1, 1e-15, "回転は面積を変えない");
    near(Matrix3.determinant2(Matrix3.scale(-1, 1)), -1, 1e-15, "反転は負");
    near(Matrix3.determinant2(Matrix3.shear(0.7, 0)), 1, 1e-15, "せん断は面積を変えない");
  });

  test("matrix3", "合成は右の行列が先に効く", function () {
    var M = Matrix3.multiplyAll([Matrix3.translation(3, 0), Matrix3.scale(2, 2)]);
    var p = Matrix3.applyToPoint(M, [1, 1]);
    near(p[0], 5, 1e-15, "x（2 倍してから +3）");
    near(p[1], 2, 1e-15, "y");
  });

  test("matrix3", "積は一般に非可換", function () {
    var a = Matrix3.multiply(Matrix3.translation(3, 0), Matrix3.scale(2, 2));
    var b = Matrix3.multiply(Matrix3.scale(2, 2), Matrix3.translation(3, 0));
    isTrue(a[0][2] !== b[0][2], "入れ替えても同じになった");
  });

  test("matrix3", "平行移動の逆は符号を反転した平行移動", function () {
    var M = Matrix3.multiplyAll([Matrix3.translation(3, -2), Matrix3.translation(-3, 2)]);
    nearMatrix(M, Matrix3.identity(), 1e-15, "単位行列にならない");
  });

  test("matrix3", "任意点中心の回転が一般式と一致する", function () {
    var cx = 2;
    var cy = 1;
    var th = Matrix3.toRadians(60);
    var c = Math.cos(th);
    var s = Math.sin(th);
    /* Readme の一般式。実装と別経路で組み立てて照合する。 */
    var expected = [
      [c, -s, cx * (1 - c) + cy * s],
      [s, c, -cx * s + cy * (1 - c)],
      [0, 0, 1]
    ];
    nearMatrix(Matrix3.rotationAbout(cx, cy, th).combined, expected, 1e-12, "一般式と違う");
  });

  test("matrix3", "回転の中心は動かない", function () {
    var M = Matrix3.rotationAbout(2, 1, Matrix3.toRadians(37)).combined;
    var p = Matrix3.applyToPoint(M, [2, 1]);
    near(p[0], 2, 1e-12, "x");
    near(p[1], 1, 1e-12, "y");
  });

  test("matrix3", "中心が原点なら原点中心の回転に一致", function () {
    var th = Matrix3.toRadians(23);
    nearMatrix(Matrix3.rotationAbout(0, 0, th).combined, Matrix3.rotation(th),
               1e-15, "一致しない");
  });

  test("matrix3", "逆回転との合成が単位行列", function () {
    var th = Matrix3.toRadians(41);
    var M = Matrix3.multiplyAll([
      Matrix3.rotationAbout(2, 1, -th).combined,
      Matrix3.rotationAbout(2, 1, th).combined
    ]);
    nearMatrix(M, Matrix3.identity(), 1e-12, "元に戻らない");
  });

  test("matrix3", "丸めが -0 を作らない", function () {
    var M = Matrix3.round([[-0.0001, 0, 0], [0, 0, 0], [0, 0, 1]], 3);
    isTrue(Object.is(M[0][0], 0), "-0 が残った");
  });

  /* --- clustering ------------------------------------------------------- */

  test("kmeans", "離れた 2 点を k=2 で 1 点ずつに分ける", function () {
    var m = KMeans.create({ points: [[0, 0], [1, 1]], k: 2, random: Random.create(1) });
    m.run();
    equal(m.clusterSizes().join(","), "1,1", "内訳");
    equal(m.inertia(), 0, "2 乗和");
  });

  test("kmeans", "k が点の数を超えたら点の数へ丸める", function () {
    equal(KMeans.create({ points: [[0, 0]], k: 5, random: Random.create(1) }).k, 1, "k");
  });

  test("kmeans", "空クラスタでも中心が NaN にならない", function () {
    /* 2 つの中心は絶対に空になる配置を直接与える。 */
    var m = KMeans.create({
      points: [[0, 0], [0, 0.01], [0.02, 0]],
      k: 3,
      centroids: [[0, 0], [50, 50], [-50, -50]],
      random: Random.create(1)
    });
    m.step();
    m.step();
    m.centroids.forEach(function (p, i) {
      isTrue(Number.isFinite(p[0]) && Number.isFinite(p[1]),
             "中心 " + (i + 1) + " が有限でない: " + p);
    });
  });

  test("kmeans", "境界値（点 1 個・全点同座標・k=1）で壊れない", function () {
    var one = KMeans.create({ points: [[0.5, 0.5]], k: 1, random: Random.create(1) });
    one.run();
    equal(one.inertia(), 0, "1 点の 2 乗和");

    var same = KMeans.create({
      points: [[0.2, 0.2], [0.2, 0.2], [0.2, 0.2]], k: 2, random: Random.create(1)
    });
    same.run();
    same.centroids.forEach(function (p) {
      isTrue(Number.isFinite(p[0]) && Number.isFinite(p[1]), "全点同座標で NaN");
    });

    var k1 = KMeans.create({
      points: [[0, 0], [1, 0], [0, 1]], k: 1, random: Random.create(1)
    });
    k1.run();
    near(k1.centroids[0][0], 1 / 3, 1e-12, "k=1 の中心 x は平均");
    near(k1.centroids[0][1], 1 / 3, 1e-12, "k=1 の中心 y は平均");
  });

  test("kmeans", "2 乗和は反復のたびに増えない", function () {
    var points = KMeans.makeBlobs({
      random: Random.create(7), count: 200, groups: 4
    }).points;
    var m = KMeans.create({ points: points, k: 4, random: Random.create(7) });
    var previous = Infinity;
    var guard = 0;
    while (!m.converged && guard < 500) {
      m.step();
      m.step();
      var value = m.inertia();
      isTrue(value <= previous + 1e-12,
             "2 乗和が増えた: " + previous + " → " + value);
      previous = value;
      guard += 1;
    }
    isTrue(m.converged, "収束しなかった（反復 " + m.iteration + "）");
  });

  test("kmeans", "いくつかの種で必ず収束する", function () {
    [1, 7, 42, 99, 2026].forEach(function (seed) {
      var points = KMeans.makeBlobs({
        random: Random.create(seed), count: 200, groups: 4
      }).points;
      var m = KMeans.create({ points: points, k: 4, random: Random.create(seed) });
      m.run(500);
      isTrue(m.converged, "種 " + seed + " で収束しなかった（反復 " + m.iteration + "）");
    });
  });

  test("kmeans", "同じ種なら同じ結果になる", function () {
    function build() {
      var points = KMeans.makeBlobs({
        random: Random.create(2026), count: 120, groups: 3
      }).points;
      var m = KMeans.create({ points: points, k: 3, random: Random.create(2026) });
      m.run(200);
      return m;
    }
    var a = build();
    var b = build();
    equal(a.iteration, b.iteration, "反復数");
    equal(a.inertia(), b.inertia(), "2 乗和");
    equal(a.centroids.join(";"), b.centroids.join(";"), "中心");
  });

  test("kmeans", "k が塊より多くても収束し中心が有限", function () {
    var points = KMeans.makeBlobs({
      random: Random.create(3), count: 200, groups: 4
    }).points;
    var m = KMeans.create({ points: points, k: 10, random: Random.create(3) });
    m.run(500);
    isTrue(m.converged, "収束しなかった");
    m.centroids.forEach(function (p, i) {
      isTrue(Number.isFinite(p[0]) && Number.isFinite(p[1]), "中心 " + (i + 1) + " が有限でない");
    });
  });

  test("kmeans", "割当は必ずいずれかのクラスタに入る", function () {
    var points = KMeans.makeBlobs({
      random: Random.create(5), count: 50, groups: 2
    }).points;
    var m = KMeans.create({ points: points, k: 3, random: Random.create(5) });
    m.run(200);
    m.assignments.forEach(function (c, i) {
      isTrue(c >= 0 && c < m.k, "点 " + i + " の割当が範囲外: " + c);
    });
    equal(m.clusterSizes().reduce(function (a, b) { return a + b; }, 0),
          points.length, "内訳の合計が点の数と合わない");
  });

  test("kmeans", "makeUniform は点をちょうどの数だけ範囲内に置く", function () {
    [1, 50, 300, 1000].forEach(function (count) {
      var data = KMeans.makeUniform({ random: Random.create(count), count: count });
      equal(data.points.length, count, "count=" + count + " の点の数");
      equal(data.centers.length, 0, "塊は無い");
      data.points.forEach(function (p) {
        isTrue(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1, "範囲外: " + p);
      });
    });
  });

  test("kmeans", "makeUniform に偏りが無い", function () {
    /* 一様なら、四分割した各領域にだいたい同じ数が入る。
       塊を作っていないこと（＝最初から分かれて見えないこと）の確認。 */
    var data = KMeans.makeUniform({ random: Random.create(99), count: 4000 });
    var quads = [0, 0, 0, 0];
    data.points.forEach(function (p) {
      quads[(p[0] > 0.5 ? 1 : 0) + (p[1] > 0.5 ? 2 : 0)] += 1;
    });
    var expected = 1000;
    quads.forEach(function (n, i) {
      isTrue(Math.abs(n - expected) < 150,
             "四分割 " + i + " の点が偏っている: " + n + "（目安 " + expected + "±150）");
    });
  });

  test("kmeans", "一様な点でも必ず k 個に分かれる", function () {
    /* まとまりが無くても手順は k 個に分ける。デモで伝えたい点なので、
       実際にそうなることを確かめておく。 */
    [2, 3, 5].forEach(function (k) {
      var data = KMeans.makeUniform({ random: Random.create(k * 7), count: 400 });
      var m = KMeans.create({ points: data.points, k: k, random: Random.create(k * 7) });
      m.run(300);
      isTrue(m.converged, "k=" + k + " で収束しなかった");
      var sizes = m.clusterSizes();
      equal(sizes.length, k, "k=" + k + " のクラスタ数");
      sizes.forEach(function (n, i) {
        isTrue(n > 0, "k=" + k + " のクラスタ " + (i + 1) + " が空");
      });
    });
  });

  test("kmeans", "makeBlobs は範囲内の点を作る", function () {
    var data = KMeans.makeBlobs({
      random: Random.create(11), count: 300, groups: 3
    });
    equal(data.points.length, 300, "点の数");
    equal(data.centers.length, 3, "塊の数");
    data.points.forEach(function (p) {
      isTrue(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1, "範囲外: " + p);
    });
  });

  test("kmeans", "makeBlobs は点の数をちょうど返す", function () {
    [1, 7, 50, 301, 1000].forEach(function (count) {
      [1, 3, 8].forEach(function (groups) {
        if (count < groups) { return; }
        var data = KMeans.makeBlobs({
          random: Random.create(count * 31 + groups), count: count, groups: groups
        });
        equal(data.points.length, count,
              "count=" + count + " groups=" + groups + " の点の数");
        equal(data.centers.length, groups,
              "count=" + count + " groups=" + groups + " の塊の数");
      });
    });
  });

  test("kmeans", "塊の点数が均等に割り切れない", function () {
    /* 完全に同数だと人が置いた図に見える。重みで散らしていることを確かめる。 */
    var data = KMeans.makeBlobs({
      random: Random.create(5), count: 300, groups: 3, noise: 0
    });
    var sizes = data.centers.map(function () { return 0; });
    data.points.forEach(function (p) {
      var best = 0;
      var bestDistance = Infinity;
      data.centers.forEach(function (c, i) {
        var d = Numeric.distance(p, c);
        if (d < bestDistance) { bestDistance = d; best = i; }
      });
      sizes[best] += 1;
    });
    isTrue(new Set(sizes).size > 1, "すべて同数になった: " + sizes);
  });

  test("kmeans", "塊の中心が近づきすぎない", function () {
    /* 中心が重なると、別々の塊が 1 つに見えてしまう。 */
    [2, 3, 4, 5].forEach(function (groups) {
      for (var seed = 1; seed <= 20; seed += 1) {
        var data = KMeans.makeBlobs({
          random: Random.create(seed * 97 + groups), count: 200, groups: groups
        });
        var nearest = Infinity;
        for (var i = 0; i < data.centers.length; i += 1) {
          for (var j = i + 1; j < data.centers.length; j += 1) {
            var d = Numeric.distance(data.centers[i], data.centers[j]);
            if (d < nearest) { nearest = d; }
          }
        }
        isTrue(nearest > 0.1,
               "groups=" + groups + " seed=" + seed + " で中心が近すぎる: " +
               nearest.toFixed(3));
      }
    });
  });

  test("kmeans", "塊ごとに広がりと向きが違う", function () {
    /* 同じ大きさの真円が並ぶと作り物に見える。
       各塊の点の広がりを測り、すべて同じにはならないことを確かめる。 */
    var data = KMeans.makeBlobs({
      random: Random.create(13), count: 600, groups: 3, noise: 0
    });
    var spreads = data.centers.map(function (c) {
      var sum = 0;
      var n = 0;
      data.points.forEach(function (p) {
        var nearest = 0;
        var best = Infinity;
        data.centers.forEach(function (other, i) {
          var d = Numeric.distanceSquared(p, other);
          if (d < best) { best = d; nearest = i; }
        });
        if (data.centers[nearest] === c) { sum += Math.sqrt(best); n += 1; }
      });
      return n === 0 ? 0 : Numeric.round(sum / n, 3);
    });
    isTrue(new Set(spreads).size > 1, "広がりがすべて同じ: " + spreads);
  });

  test("kmeans", "どの塊にも属さない点が混ざる", function () {
    var withNoise = KMeans.makeBlobs({
      random: Random.create(21), count: 300, groups: 3, noise: 0.1, spread: 0.04
    });
    var withoutNoise = KMeans.makeBlobs({
      random: Random.create(21), count: 300, groups: 3, noise: 0, spread: 0.04
    });
    /* 離れた点の数で見る。ノイズを入れたほうが必ず多くなる。 */
    function farCount(data) {
      var far = 0;
      data.points.forEach(function (p) {
        var best = Infinity;
        data.centers.forEach(function (c) {
          var d = Numeric.distance(p, c);
          if (d < best) { best = d; }
        });
        if (best > 0.2) { far += 1; }
      });
      return far;
    }
    isTrue(farCount(withNoise) > farCount(withoutNoise),
           "ノイズ有り " + farCount(withNoise) +
           " / 無し " + farCount(withoutNoise));
  });

  /* --- ui: 共有用の URL --------------------------------------------------- */

  var ShareLink = JsDemo.ShareLink;
  /* 画面の入力欄と同じ範囲。app.js は入力欄から読むが、ここでは
     parse / build の挙動そのものを確かめるため値を書いてある。 */
  var SHARE_SPEC = {
    seed: { min: 0, max: 9999, integer: true, fallback: 42 },
    k: { min: 1, max: 10, integer: true, fallback: 3 },
    n: { min: 1, max: 1000, integer: true, fallback: 300 },
    groups: { min: 1, max: 8, integer: true, fallback: 3 }
  };

  test("share-link", "指定が無ければ既定値になる", function () {
    var v = ShareLink.parse("", SHARE_SPEC);
    equal(v.seed, 42, "seed");
    equal(v.k, 3, "k");
    equal(v.n, 300, "n");
    equal(v.groups, 3, "groups");
  });

  test("share-link", "指定した値を読む", function () {
    var v = ShareLink.parse("?seed=7&k=5&n=120&groups=2", SHARE_SPEC);
    equal(v.seed, 7, "seed");
    equal(v.k, 5, "k");
    equal(v.n, 120, "n");
    equal(v.groups, 2, "groups");
  });

  test("share-link", "先頭の ? は有無どちらでも読める", function () {
    equal(ShareLink.parse("seed=9", SHARE_SPEC).seed, 9, "? 無し");
    equal(ShareLink.parse("?seed=9", SHARE_SPEC).seed, 9, "? 有り");
  });

  test("share-link", "範囲外の値は範囲へ収める", function () {
    var v = ShareLink.parse("?seed=99999&k=99&n=-5&groups=1000", SHARE_SPEC);
    equal(v.seed, 9999, "seed の上限");
    equal(v.k, 10, "k の上限");
    equal(v.n, 1, "n の下限");
    equal(v.groups, 8, "groups の上限");
  });

  test("share-link", "数でない値は既定値になる", function () {
    var v = ShareLink.parse("?seed=abc&k=&n=%20&groups=null", SHARE_SPEC);
    equal(v.seed, 42, "文字");
    equal(v.k, 3, "空欄");
    equal(v.n, 300, "空白");
    equal(v.groups, 3, "null という文字列");
  });

  test("share-link", "小数は整数へ丸める", function () {
    equal(ShareLink.parse("?k=3.7", SHARE_SPEC).k, 4, "k");
  });

  test("share-link", "知らない名前は捨てる", function () {
    var v = ShareLink.parse("?seed=7&name=%E5%B1%B1%E7%94%B0&email=a%40b.example", SHARE_SPEC);
    equal(v.seed, 7, "既知の値は読む");
    equal(Object.keys(v).sort().join(","), "groups,k,n,seed", "仕様にある名前だけが残る");
    equal(v.name, undefined, "name は取り込まない");
    equal(v.email, undefined, "email は取り込まない");
  });

  test("share-link", "壊れた encoding でも落ちない", function () {
    var v = ShareLink.parse("?seed=7&%E4%=1&bad=%", SHARE_SPEC);
    equal(v.seed, 7, "読める分は読む");
  });

  test("share-link", "既定値と同じものは URL へ出さない", function () {
    equal(ShareLink.build({ seed: 42, k: 3, n: 300, groups: 3 }, SHARE_SPEC), "",
          "すべて既定なら空");
    equal(ShareLink.build({ seed: 7, k: 3, n: 300, groups: 3 }, SHARE_SPEC), "?seed=7",
          "違うものだけ出す");
  });

  test("share-link", "作った URL をそのまま読み戻せる", function () {
    var original = { seed: 123, k: 6, n: 50, groups: 2 };
    var restored = ShareLink.parse(ShareLink.build(original, SHARE_SPEC), SHARE_SPEC);
    equal(restored.seed, 123, "seed");
    equal(restored.k, 6, "k");
    equal(restored.n, 50, "n");
    equal(restored.groups, 2, "groups");
  });

  /* 2D 座標変換のレッスンは小数を扱う。整数前提の扱いと分けて確かめる。 */
  var LESSON_SPEC = {
    sx: { min: -3, max: 3, integer: false, fallback: 1 },
    sy: { min: -3, max: 3, integer: false, fallback: 1 },
    shx: { min: -2, max: 2, integer: false, fallback: 0 },
    deg: { min: -180, max: 180, integer: false, fallback: 0 },
    cx: { min: -10, max: 10, integer: false, fallback: 2 }
  };

  test("share-link", "小数をそのまま読み書きできる", function () {
    var v = ShareLink.parse("?sx=1.5&shx=-0.7&deg=37.5", LESSON_SPEC);
    equal(v.sx, 1.5, "sx");
    equal(v.shx, -0.7, "shx");
    equal(v.deg, 37.5, "deg");
  });

  test("share-link", "小数は丸めて URL へ出す", function () {
    /* 0.1 を足し合わせると 1.2000000000000002 のような値が出る。
       そのまま URL に出すと読みにくく、共有した値も揺れる。 */
    equal(ShareLink.build({ sx: 1.2000000000000002 }, LESSON_SPEC), "?sx=1.2", "丸め");
    equal(ShareLink.build({ deg: 0.1 + 0.2 }, LESSON_SPEC), "?deg=0.3", "0.1+0.2");
  });

  test("share-link", "小数でも範囲へ収める", function () {
    var v = ShareLink.parse("?sx=99.9&shx=-50&deg=1000", LESSON_SPEC);
    equal(v.sx, 3, "sx の上限");
    equal(v.shx, -2, "shx の下限");
    equal(v.deg, 180, "deg の上限");
  });

  test("share-link", "小数の既定値は URL へ出さない", function () {
    equal(ShareLink.build({ sx: 1, sy: 1, shx: 0, deg: 0, cx: 2 }, LESSON_SPEC), "",
          "すべて既定なら空");
    equal(ShareLink.build({ sx: 1, sy: 1, shx: 0, deg: 45, cx: 2 }, LESSON_SPEC), "?deg=45",
          "違うものだけ出す");
  });

  test("share-link", "小数でも往復で一致する", function () {
    var original = { sx: -1.4, sy: 2.3, shx: 0.6, deg: -112.5, cx: -7.8 };
    var restored = ShareLink.parse(ShareLink.build(original, LESSON_SPEC), LESSON_SPEC);
    Object.keys(original).forEach(function (key) {
      equal(restored[key], original[key], key);
    });
  });

  test("share-link", "入力欄の刻みに合わせる", function () {
    /* 刻み 1 の角度欄に 37.5 は入らない。画面に出せない値を URL が
       持ったままにならないよう、読み込んだ時点で刻みへ合わせる。 */
    var stepped = {
      deg: { min: -180, max: 180, step: 1, integer: false, fallback: 0 },
      sx: { min: -3, max: 3, step: 0.1, integer: false, fallback: 1 }
    };
    equal(ShareLink.parse("?deg=37.5", stepped).deg, 38, "刻み 1");
    equal(ShareLink.parse("?sx=1.23", stepped).sx, 1.2, "刻み 0.1");
    equal(ShareLink.parse("?sx=1.2", stepped).sx, 1.2, "刻みに乗る値はそのまま");
    equal(ShareLink.parse("?deg=-60", stepped).deg, -60, "負の値");
  });

  test("share-link", "刻みに合わせても範囲を超えない", function () {
    var stepped = { deg: { min: -180, max: 180, step: 7, integer: false, fallback: 0 } };
    var v = ShareLink.parse("?deg=179", stepped).deg;
    isTrue(v >= -180 && v <= 180, "範囲外になった: " + v);
  });

  test("share-link", "小数の値で同じ行列になる", function () {
    var v = ShareLink.parse("?deg=37.5&cx=2.5", LESSON_SPEC);
    var a = Matrix3.rotationAbout(v.cx, 1, Matrix3.toRadians(v.deg)).combined;
    var b = Matrix3.rotationAbout(2.5, 1, Matrix3.toRadians(37.5)).combined;
    nearMatrix(a, b, 1e-15, "URL から作った行列が一致しない");
  });

  test("share-link", "URL から作った条件で同じ結果になる", function () {
    var v = ShareLink.parse("?seed=777&k=4&n=150&groups=4", SHARE_SPEC);

    function runFrom(values) {
      var points = KMeans.makeBlobs({
        random: Random.create(values.seed),
        count: values.n,
        groups: values.groups,
        spread: 0.07
      }).points;
      var m = KMeans.create({
        points: points, k: values.k, random: Random.create(values.seed)
      });
      m.run(300);
      return m;
    }

    var a = runFrom(v);
    var b = runFrom(v);
    equal(a.inertia(), b.inertia(), "2 乗和");
    equal(a.centroids.join(";"), b.centroids.join(";"), "中心");
  });


  /* --- ソート ----------------------------------------------------------- */

  var Sorts = JsDemo.Sorts;

  /* 手法ごとに「どう終われば正しいか」を先に書く。
     冗談の手法は「そろわないのが正しい」ので、まとめて合格にしない。 */
  var SORT_EXPECT = {
    bubble: "sorted", cocktail: "sorted", gnome: "sorted", comb: "sorted",
    pancake: "sorted", insertion: "sorted", binary: "sorted", shell: "sorted",
    selection: "sorted", heap: "sorted", cycle: "sorted", merge: "sorted",
    quick: "sorted", stooge: "sorted", counting: "sorted", radix: "sorted",
    bucket: "sorted", sleep: "sorted",
    stalin: "lossy", thanos: "lossy",
    /* 終わりが分からない手法。そろうことを期待しない。 */
    bogo: "openEnded", bozo: "openEnded",
    quantum: "unchangedOrSorted", miracle: "untouched", design: "untouched"
  };

  /* 終わりが分からない手法は手順を作り置きしないので、見る分だけ作る。 */
  var LAZY_BUDGET = 300;

  function sortRun(id, count, seed) {
    var algorithm = Sorts.get(id);
    var n = Math.min(count, algorithm.maxCount);
    var values = Sorts.values({ count: n, random: Random.create(seed) });
    var plan = Sorts.run({ id: id, values: values, random: Random.create(seed + 1) });
    if (plan.lazy) { plan.ensure(LAZY_BUDGET); }
    var state = Sorts.replay({ values: values, steps: plan.steps });
    return { values: values, plan: plan, state: state, n: n };
  }

  function multiset(list) { return list.slice().sort(function (p, q) { return p - q; }).join(","); }

  Sorts.ALGORITHMS.forEach(function (algorithm) {
    test("ソート", algorithm.id + " が期待どおりに終わる", function () {
      var out = sortRun(algorithm.id, 16, 97);
      var visible = Sorts.visibleValues(out.state);
      var expect = SORT_EXPECT[algorithm.id];

      if (!out.plan.lazy) {
        isTrue(out.plan.finished, algorithm.id + " が上限で打ち切られていない");
      }

      if (expect === "openEnded") {
        /* 終わるかどうかは分からない。確かめるのは「値を失っていない」こと。 */
        equal(visible.length, out.n, algorithm.id + " の要素数");
        equal(multiset(visible), multiset(out.values), algorithm.id + " が値を変えていない");
        isTrue(out.plan.steps.length > 0, algorithm.id + " の手順が作られている");
      } else if (expect === "sorted") {
        isTrue(Sorts.isSorted(visible), algorithm.id + " の結果がそろっている");
        equal(visible.length, out.n, algorithm.id + " の要素数");
        equal(multiset(visible), multiset(out.values), algorithm.id + " が値を変えていない");
      } else if (expect === "lossy") {
        isTrue(Sorts.isSorted(visible), algorithm.id + " の残りがそろっている");
        isTrue(visible.length < out.n, algorithm.id + " で要素が減っている");
      } else if (expect === "untouched") {
        equal(out.state.main.map(function (c) { return c.value; }).join(","),
              out.values.join(","),
              algorithm.id + " が並びを変えていない");
      } else if (expect === "unchangedOrSorted") {
        equal(multiset(visible), multiset(out.values), algorithm.id + " が値を増減させていない");
      }
    });
  });

  test("ソート", "手順から数えた比較・交換が状態と一致する", function () {
    var out = sortRun("bubble", 20, 11);
    var compares = 0;
    var swaps = 0;
    out.plan.steps.forEach(function (step) {
      if (step.type === "compare") { compares += 1; }
      if (step.type === "swap") { swaps += 1; }
    });
    equal(out.state.counts.compare, compares, "比較の数");
    equal(out.state.counts.swap, swaps, "交換の数");
  });

  test("ソート", "1 手ずつ進めた状態と、畳み込んだ状態が一致する", function () {
    var out = sortRun("quick", 18, 23);
    var stepwise = Sorts.initial(out.values);
    for (var i = 0; i < out.plan.steps.length; i += 1) {
      Sorts.applyStep(stepwise, out.plan.steps[i]);
    }
    equal(stepwise.main.map(function (c) { return c.value; }).join(","),
          out.state.main.map(function (c) { return c.value; }).join(","),
          "並び");
    equal(stepwise.counts.compare, out.state.counts.compare, "比較の数");
    equal(stepwise.cursor, out.plan.steps.length, "進めた手順の数");
  });

  test("ソート", "途中の状態は、どこから作っても同じになる", function () {
    var out = sortRun("merge", 16, 31);
    var half = Math.floor(out.plan.steps.length / 2);
    var once = Sorts.replay({ values: out.values, steps: out.plan.steps, upTo: half });
    var twice = Sorts.initial(out.values);
    for (var i = 0; i < half; i += 1) { Sorts.applyStep(twice, out.plan.steps[i]); }
    equal(once.main.map(function (c) { return c.value; }).join(","),
          twice.main.map(function (c) { return c.value; }).join(","),
          half + " 手目の並び");
  });

  test("ソート", "バブルソートは隣どうししか入れ替えない", function () {
    var out = sortRun("bubble", 24, 7);
    out.plan.steps.forEach(function (step) {
      if (step.type === "swap") {
        equal(Math.abs(step.i - step.j), 1, "入れ替えた 2 つの距離");
      }
    });
  });

  test("ソート", "そろった列を挿入ソートに渡すと一度も入れ替えない", function () {
    var sorted = [];
    for (var i = 1; i <= 16; i += 1) { sorted.push(i); }
    var plan = Sorts.run({ id: "insertion", values: sorted });
    var state = Sorts.replay({ values: sorted, steps: plan.steps });
    equal(state.counts.swap, 0, "交換の数");
    equal(state.counts.compare, 15, "比較の数（n − 1 回）");
  });

  test("ソート", "二分挿入ソートは挿入ソートより比較が少ない", function () {
    var values = Sorts.values({ count: 32, random: Random.create(2026) });
    var plain = Sorts.replay({
      values: values, steps: Sorts.run({ id: "insertion", values: values }).steps
    });
    var binary = Sorts.replay({
      values: values, steps: Sorts.run({ id: "binary", values: values }).steps
    });
    isTrue(binary.counts.compare < plain.counts.compare,
           "比較: 二分 " + binary.counts.compare + " < 挿入 " + plain.counts.compare);
    /* ずらす回数は変わらない。ここがこの手法の要点。 */
    equal(binary.counts.swap, plain.counts.swap, "ずらした回数");
  });

  test("ソート", "計数ソートと基数ソートは一度も比べない", function () {
    ["counting", "radix"].forEach(function (id) {
      var out = sortRun(id, 24, 41);
      equal(out.state.counts.compare, 0, id + " の比較の数");
      isTrue(out.state.counts.read > 0, id + " は値を読んでいる");
    });
  });

  test("ソート", "スターリンソートの結果は増える一方で、元より短い", function () {
    var out = sortRun("stalin", 24, 53);
    var visible = Sorts.visibleValues(out.state);
    isTrue(Sorts.isSorted(visible), "増える一方になっている");
    isTrue(visible.length < out.n, "要素が減っている");
    equal(out.state.counts.remove, out.n - visible.length, "取り除いた数");
  });

  test("ソート", "ミラクルソートは一つも動かさない", function () {
    var out = sortRun("miracle", 16, 61);
    equal(out.state.counts.swap, 0, "交換の数");
    equal(out.state.counts.write, 0, "書き込みの数");
    equal(out.state.main.map(function (c) { return c.value; }).join(","),
          out.values.join(","), "並び");
  });

  test("ソート", "同じ種を渡せばボゴソートの手順が再現する", function () {
    var values = Sorts.values({ count: 6, random: Random.create(77) });
    var first = Sorts.run({ id: "bogo", values: values, random: Random.create(99) });
    var second = Sorts.run({ id: "bogo", values: values, random: Random.create(99) });
    first.ensure(120);
    second.ensure(120);
    equal(first.steps.length, second.steps.length, "手順の数");
    equal(first.result.join(","), second.result.join(","), "結果");
  });

  test("ソート", "終わりが分からない手法は、作る前に走らせない", function () {
    /* 画面に出す前に最後まで走らせてしまうと、終わりの手数が分かってしまい、
       「終わる保証がない」という性質が画面から消える。
       run() の時点で手順が 0 件であることを確かめる。 */
    ["bogo", "bozo", "miracle"].forEach(function (id) {
      var n = Sorts.get(id).maxCount;
      var values = Sorts.values({ count: n, random: Random.create(404) });
      var plan = Sorts.run({ id: id, values: values, random: Random.create(405) });
      isTrue(plan.lazy === true, id + " は作り置きしない");
      equal(plan.steps.length, 0, id + " の run() 直後の手順の数");
      equal(plan.finished, false, id + " は終わっていない");

      /* 求めた分だけ増える。求めなければ増えない。 */
      plan.ensure(10);
      isTrue(plan.steps.length >= 10, id + " が 10 手ぶん作られた");
      var held = plan.steps.length;
      plan.ensure(5);
      equal(plan.steps.length, held, id + " は求めた分より多く作らない");
    });
  });

  test("ソート", "終わりが分からない手法に要素数の制限を付けない", function () {
    /* 1 周ずつしか作らないので、終わらなくても待たされない。
       制限していたのは手順を先に全部作っていたときの名残。 */
    ["bogo", "bozo", "miracle"].forEach(function (id) {
      equal(Sorts.get(id).maxCount, 64, id + " の上限");
    });
    var values = Sorts.values({ count: 64, random: Random.create(7) });
    var plan = Sorts.run({ id: "bogo", values: values, random: Random.create(8) });
    plan.ensure(400);
    var state = Sorts.replay({ values: values, steps: plan.steps });
    equal(multiset(Sorts.visibleValues(state)), multiset(values), "値の集まり");
    isTrue(state.counts.shuffle > 0, "混ぜ直している");
    isTrue(!plan.finished, "64 個では終わっていない");
  });

  test("ソート", "要素数の上限を超えない範囲で手順が打ち切られない", function () {
    ["bubble", "quick", "merge", "heap", "stooge", "cycle", "radix"].forEach(function (id) {
      var out = sortRun(id, Sorts.get(id).maxCount, 13);
      isTrue(out.plan.finished, id + " が上限 " + Sorts.get(id).maxCount + " 個で終わる");
    });
  });

  test("ソート", "確定の印が付いた要素は、そのあと位置が動かない", function () {
    /* ✓ は「この位置はもう変わらない」という意味で使っている。
       途中でそろっているだけの範囲に付けると意味が崩れるので、全手法で見る。
       挿入ソートでこれが崩れていたため、不変条件として残す。 */
    Sorts.ALGORITHMS.forEach(function (algorithm) {
      var out = sortRun(algorithm.id, 14, 29);
      var state = Sorts.initial(out.values);
      var fixed = {};   /* 確定した要素の id → そのときの位置 */

      out.plan.steps.forEach(function (step, index) {
        Sorts.applyStep(state, step);
        state.main.forEach(function (cell, position) {
          if (!cell.sorted) { return; }
          if (fixed[cell.id] === undefined) {
            fixed[cell.id] = position;
          } else if (fixed[cell.id] !== position) {
            fail(algorithm.id + ": 確定した要素が " + (index + 1) + " 手目で " +
                 fixed[cell.id] + " から " + position + " へ動いた");
          }
        });
      });
    });
  });

  test("ソート", "終わりが分からない手法に印が付いている", function () {
    ["bogo", "bozo", "miracle"].forEach(function (id) {
      isTrue(Sorts.get(id).unbounded === true, id + " は unbounded");
    });
    ["bubble", "quick", "merge", "counting"].forEach(function (id) {
      isTrue(Sorts.get(id).unbounded !== true, id + " は unbounded ではない");
    });
  });

  test("ソート", "スリープソートは要素を消さず、結果を 1 段目へ戻す", function () {
    var out = sortRun("sleep", 12, 17);
    equal(out.state.counts.remove, 0, "取り除いた数");

    /* 途中では 2 段目へ出ていっている。 */
    var lastEmit = -1;
    out.plan.steps.forEach(function (step, index) {
      if (step.type === "emit") { lastEmit = index; }
    });
    isTrue(lastEmit >= 0, "出ていく手順がある");
    var mid = Sorts.replay({
      values: out.values, steps: out.plan.steps, upTo: lastEmit + 1
    });
    equal(mid.main.filter(function (c) { return c.departed; }).length, out.n,
          "全部が出ていった時点の数");
    isTrue(mid.aux !== null && mid.aux.length === out.n, "2 段目に並んでいる");

    /* 最後は 1 段目に結果がある。2 段目は片付いている。 */
    var expected = out.values.slice().sort(function (p, q) { return p - q; });
    equal(out.state.main.map(function (c) { return c.value; }).join(","),
          expected.join(","), "1 段目の並び");
    equal(out.state.main.filter(function (c) { return c.departed; }).length, 0,
          "1 段目に出ていったままの要素は無い");
    isTrue(out.state.aux === null, "2 段目は片付いている");
  });

  test("ソート", "控えの行を使う手法に印が付いている", function () {
    /* 図の高さを最初から 2 段ぶん取るために使う印。
       実際に控えを使うのに印が無いと、途中で図の高さが変わって下がずれる。 */
    ["merge", "counting", "radix", "bucket", "sleep"].forEach(function (id) {
      isTrue(Sorts.get(id).aux === true, id + " に aux の印がある");
      var out = sortRun(id, 16, 71);
      var used = out.plan.steps.some(function (step) {
        /* emit も控えの行を作る（スリープソートの出力）。 */
        return step.type === "aux" || step.type === "auxInit" ||
               step.type === "emit";
      });
      isTrue(used, id + " は実際に控えの行を使う");
    });
    ["bubble", "quick", "heap", "stalin"].forEach(function (id) {
      isTrue(Sorts.get(id).aux !== true, id + " に aux の印は無い");
      var out = sortRun(id, 16, 71);
      var used = out.plan.steps.some(function (step) {
        return step.type === "aux" || step.type === "auxInit" ||
               step.type === "emit";
      });
      isTrue(!used, id + " は控えの行を使わない");
    });
  });

  test("ソート", "手順はすべて、どこかの 1 回ぶんに属する", function () {
    /* 回数は「1 周」で数える。切れ目の印が付いていない手順が末尾に残ると、
       進めても回数が増えないまま図だけ動く状態になる。 */
    Sorts.ALGORITHMS.forEach(function (algorithm) {
      var out = sortRun(algorithm.id, 12, 83);
      var steps = out.plan.steps;
      isTrue(steps.length > 0, algorithm.id + " の手順がある");
      isTrue(steps[steps.length - 1].endRound === true,
             algorithm.id + " の最後の手順に切れ目がある");
      var rounds = Sorts.countRounds(steps);
      isTrue(rounds > 0, algorithm.id + " に 1 回以上ある");
      isTrue(rounds <= steps.length, algorithm.id + " の回数は手順以下");
    });
  });

  test("ソート", "1 回ぶんには必ず 1 回以上の比較がある（比べる手法）", function () {
    /* 「1 回進めるのに最低 1 回は比べるはず」という読み方と、画面の数が
       食い違わないようにする。比べない手法（計数・基数・スリープ等）は除く。 */
    /* 動かす手が必ず比較のあとに来る手法だけを見る。
       パンケーキの反転、二分挿入のずらし、ヒープの取り出し、マージの
       書き写し、クイックの基準の置き直しは、比較を伴わない動きなので除く。
       計数・基数・バケツ・スリープ・デザインはそもそも比べない。 */
    ["bubble", "cocktail", "gnome", "comb", "insertion", "shell", "selection",
     "cycle", "stooge", "stalin", "thanos", "bogo", "bozo", "quantum", "miracle"]
      .forEach(function (id) {
        var out = sortRun(id, 10, 91);
        var rounds = Sorts.countRounds(out.plan.steps);
        var state = Sorts.replay({ values: out.values, steps: out.plan.steps });
        isTrue(state.counts.compare >= rounds,
               id + ": 比較 " + state.counts.compare + " >= 回数 " + rounds);
      });
  });

  test("ソート", "1 回ずつ進めた結果は、まとめて畳み込んだ結果と一致する", function () {
    ["bubble", "merge", "quick", "counting", "sleep"].forEach(function (id) {
      var out = sortRun(id, 12, 37);
      var rounds = Sorts.countRounds(out.plan.steps);
      var stepwise = Sorts.initial(out.values);
      var at = 0;
      for (var i = 0; i < rounds; i += 1) {
        at = Sorts.applyRound(stepwise, out.plan.steps, at);
      }
      var whole = Sorts.replayRounds({
        values: out.values, steps: out.plan.steps, rounds: rounds
      });
      equal(stepwise.main.map(function (c) { return c.value; }).join(","),
            whole.main.map(function (c) { return c.value; }).join(","),
            id + " の並び");
      equal(at, whole.at, id + " の位置");
    });
  });

  test("ソート", "並びは 1 から n までを 1 回ずつ使う", function () {
    var values = Sorts.values({ count: 40, random: Random.create(5) });
    equal(values.length, 40, "要素数");
    var expected = [];
    for (var i = 1; i <= 40; i += 1) { expected.push(i); }
    equal(multiset(values), expected.join(","), "値の集まり");
  });

  test("ソート", "種が違えば並びも変わる", function () {
    var a = Sorts.values({ count: 24, random: Random.create(1) });
    var b = Sorts.values({ count: 24, random: Random.create(2) });
    isTrue(a.join(",") !== b.join(","), "別の種で別の並びになる");
  });

  /* --- 目録の絞り込み --------------------------------------------------- */

  /* 画面のカードの代わりに、同じ形の並びで確かめる。
     DOM を使わない select と conceptsIn だけを対象にする。 */
  var CATALOG = [
    { id: "D01", concepts: ["coord", "mean", "distance"] },
    { id: "D02", concepts: ["coord", "matrix", "vector"] },
    { id: "D03", concepts: ["order", "repeat", "bar"] }
  ];

  function ids(items) {
    return items.map(function (item) { return item.id; }).join(",");
  }

  test("目録", "概念を選ばなければ全部残る", function () {
    equal(ids(Catalog.select(CATALOG, "")), "D01,D02,D03", "空の指定");
    equal(ids(Catalog.select(CATALOG, null)), "D01,D02,D03", "指定なし");
  });

  test("目録", "選んだ概念を前提にするものだけ残る", function () {
    equal(ids(Catalog.select(CATALOG, "coord")), "D01,D02", "座標");
    equal(ids(Catalog.select(CATALOG, "order")), "D03", "大小の順序");
    equal(ids(Catalog.select(CATALOG, "mean")), "D01", "平均");
  });

  test("目録", "知らない概念では何も残らない", function () {
    /* URL は誰でも書き換えられる。知らない値で例外にせず、空振りで済ませる。 */
    equal(Catalog.select(CATALOG, "fraction").length, 0, "まだ無い概念");
    equal(Catalog.select(CATALOG, "../etc").length, 0, "でたらめな値");
  });

  test("目録", "概念の一覧は出現順で重複しない", function () {
    equal(Catalog.conceptsIn(CATALOG).join(","),
          "coord,mean,distance,matrix,vector,order,repeat,bar",
          "選択肢の並び");
  });

  test("目録", "概念を持たないものは絞り込みで必ず外れる", function () {
    var items = CATALOG.concat([{ id: "D04" }]);
    equal(Catalog.conceptsIn(items).indexOf("undefined"), -1, "一覧に入らない");
    equal(ids(Catalog.select(items, "coord")), "D01,D02", "絞り込みに出ない");
    equal(ids(Catalog.select(items, "")).split(",").length, 4, "全件には出る");
  });

  JsDemo.Tests = { cases: cases };
})(typeof window !== "undefined" ? window : globalThis);
