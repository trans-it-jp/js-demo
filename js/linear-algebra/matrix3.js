/*!
 * js-demo / linear-algebra — matrix3.js
 * 同次座標（3×3 行列）による 2D 座標変換。
 *
 * 約束ごと:
 *   - 点は列ベクトル v = [x, y, 1]^T。変換は左から掛ける: v' = M·v
 *   - 合成 M = A·B を点に適用すると v' = A(Bv) なので、右の行列が先に効く
 *   - 行列は行優先の二次元配列 [[r1c1,r1c2,r1c3],[...],[...]]
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  function identity() {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }

  /** 平行移動 */
  function translation(tx, ty) {
    return [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
  }

  /** 拡大縮小。負の値を与えると反転になる。 */
  function scale(sx, sy) {
    return [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
  }

  /** せん断。x ← x + shx·y、y ← y + shy·x */
  function shear(shx, shy) {
    return [[1, shx, 0], [shy, 1, 0], [0, 0, 1]];
  }

  /** 原点中心の回転。theta はラジアン。 */
  function rotation(theta) {
    var c = Math.cos(theta);
    var s = Math.sin(theta);
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  }

  /** 度をラジアンへ */
  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function multiply(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i += 1) {
      for (var j = 0; j < 3; j += 1) {
        C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
      }
    }
    return C;
  }

  /**
   * 並びの順に左から掛ける。multiplyAll([T, R, S]) は T·R·S。
   * 点に適用すると S → R → T の順に効く。
   */
  function multiplyAll(list) {
    return list.reduce(function (acc, M) {
      return multiply(acc, M);
    }, identity());
  }

  /** 1 点に適用する。w 成分は 1 のまま（アフィン変換のみ扱う）。 */
  function applyToPoint(M, point) {
    var x = point[0];
    var y = point[1];
    return [
      M[0][0] * x + M[0][1] * y + M[0][2],
      M[1][0] * x + M[1][1] * y + M[1][2]
    ];
  }

  function mapPoints(M, points) {
    return points.map(function (p) { return applyToPoint(M, p); });
  }

  /** 表示用に各要素を丸める。計算には丸めた行列を使わない。 */
  function roundMatrix(M, digits) {
    var d = digits === undefined ? 3 : digits;
    var f = Math.pow(10, d);
    return M.map(function (row) {
      return row.map(function (v) {
        var r = Math.round(v * f) / f;
        return r === 0 ? 0 : r;
      });
    });
  }

  /** 左上 2×2 の行列式。面積が何倍になるか、符号で向きが反転するかを表す。 */
  function determinant2(M) {
    return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  }

  /**
   * 任意点 c を中心にした回転を T(c)·R(θ)·T(-c) として組む。
   * 3 行列の積であることを画面で示せるよう、成分も一緒に返す。
   */
  function rotationAbout(cx, cy, theta) {
    var toCenter = translation(-cx, -cy);
    var rotate = rotation(theta);
    var back = translation(cx, cy);
    return {
      parts: [
        { key: "translateBack", M: back },
        { key: "rotate", M: rotate },
        { key: "translateToOrigin", M: toCenter }
      ],
      combined: multiplyAll([back, rotate, toCenter])
    };
  }

  JsDemo.Matrix3 = {
    identity: identity,
    translation: translation,
    scale: scale,
    shear: shear,
    rotation: rotation,
    rotationAbout: rotationAbout,
    toRadians: toRadians,
    multiply: multiply,
    multiplyAll: multiplyAll,
    applyToPoint: applyToPoint,
    mapPoints: mapPoints,
    round: roundMatrix,
    determinant2: determinant2
  };
})(window);
