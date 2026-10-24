/*!
 * js-demo / linear-transformation — lesson.js
 * 5 つのレッスンで共通の画面側。
 *
 * どのレッスンかは <body data-lesson="..."> で決める。
 * レッスンごとに違うのは「使う入力」と「行列の組み立て方」だけなので、
 * その 2 つを LESSONS に表で持ち、残りはすべて共通にしている。
 * 文言は js/ui/i18n.js が <html lang> を見て切り替えるので、このファイルは 1 つで足りる。
 */
(function () {
  "use strict";

  var M = JsDemo.Matrix3;
  var Numeric = JsDemo.Numeric;
  var Plane = JsDemo.Plane;
  var Controls = JsDemo.Controls;
  var Tables = JsDemo.Tables;
  var t = JsDemo.I18n.t;

  var LESSONS = {
    /* 一次変換のみ。拡大縮小とせん断を 1 つの行列として見せる。 */
    "linear": {
      params: ["scale-x", "scale-y", "shear-x", "shear-y"],
      build: function (v) {
        var L = [
          [v["scale-x"], v["shear-x"], 0],
          [v["shear-y"], v["scale-y"], 0],
          [0, 0, 1]
        ];
        return { parts: [{ key: "linear", M: L }], combined: L };
      }
    },

    /* 平行移動のみ。2×2 では書けないことが 3 行目から読み取れる。 */
    "translation": {
      params: ["tx", "ty"],
      build: function (v) {
        var T = M.translation(v.tx, v.ty);
        return { parts: [{ key: "translation", M: T }], combined: T };
      }
    },

    /* 一次変換のあとに平行移動。合成の順序が効く例。 */
    "affine": {
      params: ["scale-x", "scale-y", "shear-x", "shear-y", "tx", "ty"],
      build: function (v) {
        var L = M.multiplyAll([
          M.scale(v["scale-x"], v["scale-y"]),
          M.shear(v["shear-x"], v["shear-y"])
        ]);
        var T = M.translation(v.tx, v.ty);
        return {
          parts: [{ key: "linear", M: L }, { key: "translation", M: T }],
          /* T·L なので点には L が先に効く */
          combined: M.multiplyAll([T, L])
        };
      }
    },

    /* 原点中心の回転 */
    "rotation-origin": {
      params: ["angle"],
      build: function (v) {
        var R = M.rotation(M.toRadians(v.angle));
        return { parts: [{ key: "rotation", M: R }], combined: R };
      }
    },

    /* 任意点中心の回転。T(c)·R(θ)·T(−c) の 3 つの積として見せる。 */
    "rotation-pivot": {
      params: ["pivot-x", "pivot-y", "angle"],
      build: function (v) {
        var result = M.rotationAbout(v["pivot-x"], v["pivot-y"],
                                     M.toRadians(v.angle));
        return { parts: result.parts, combined: result.combined, pivot: true };
      }
    }
  };

  var DRAW_MODES = ["none", "line", "circle", "rect", "free"];

  var plane = null;
  var lesson = null;
  var pairs = null;

  function update() {
    var values = Controls.readAll(pairs);
    var out = lesson.build(values);
    var combined = out.combined;

    plane.setMatrix(combined);
    /* グリッドは見やすさ優先で丸めた行列を使う。図形と基底は丸めない。 */
    plane.drawTransformedGrid(M.round(combined, 3));
    plane.drawShape(plane.house, M.mapPoints(combined, plane.house));
    plane.drawBasis(combined);
    plane.renderUserShapes(combined);

    if (out.pivot) {
      plane.showPivot(values["pivot-x"], values["pivot-y"]);
    } else {
      plane.hidePivot();
    }

    var items = out.parts.map(function (part) {
      return { caption: t("matrix." + part.key), M: M.round(part.M, 3) };
    });
    items.push({ caption: t("table.combined"), M: M.round(combined, 3) });
    Tables.renderMatrixList(Controls.byId("tables"), items);

    var det = M.determinant2(combined);
    Controls.renderReadout("readout", [
      { label: t("table.determinant"), value: Numeric.format(det, 3) }
    ]);

    plane.setAriaLabel(
      t("figure.plane") + " " + t("table.determinant") + ": " + Numeric.format(det, 3)
    );
  }

  function init() {
    var name = document.body.getAttribute("data-lesson");
    lesson = LESSONS[name];
    if (!lesson) {
      /* 設定漏れに気づけるよう、黙って何もしないのは避ける。 */
      throw new Error("unknown lesson: " + name);
    }

    plane = Plane.create({
      container: "#plot",
      domain: [-10, 10],
      labels: { figure: t("figure.plane") }
    });

    pairs = Controls.bindPairs(lesson.params, update);

    Controls.bindModeButtons("draw-tools", "none", function (mode) {
      if (DRAW_MODES.indexOf(mode) >= 0) { plane.setMode(mode); }
    });

    var clear = Controls.byId("clear-shapes");
    if (clear) {
      clear.addEventListener("click", function () { plane.clearUserShapes(); });
    }

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
